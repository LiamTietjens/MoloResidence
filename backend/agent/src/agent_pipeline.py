"""Pipeline (STT->LLM->TTS) variant of the Molo voice agent.

Separate worker from agent.py (which is imported, never edited). Fixes the
speech-to-speech silence-during-tool-calls issue by letting LiveKit's framework
govern turn-taking. All three model legs run through LiveKit Inference (one
LiveKit API key, no extra provider accounts/plugins).
"""
from __future__ import annotations

import asyncio
import logging
import os
import time

from livekit import agents, rtc
from livekit.agents import (AgentServer, AgentSession, room_io, inference,
                            BackgroundAudioPlayer, BuiltinAudioClip, AudioConfig)
from livekit.api import LiveKitAPI
from livekit.plugins import noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

# Import from the live agent — NEVER edit agent.py.
from agent import MoloAgent, GREETING, _now_warsaw, _now_iso  # noqa
import molo_supabase as db
from pipeline_prompt import PIPELINE_INSTRUCTIONS, render_instructions
from thinking_filter import strip_thinking_tokens

logger = logging.getLogger("molo-agent-pipeline")

PIPELINE_AGENT_NAME = "molo-gemma"
PIPELINE_INSTRUCTIONS_TEXT = PIPELINE_INSTRUCTIONS

# Model config — all env-tunable so they can be changed without a rebuild.
# STT: Cartesia Ink-Whisper — Whisper-based, AUTO-detects language (handles EN+PL
# in one stream) and is robust on plain English words (Nova-3 mis-heard "carpet"
# as "car get"/"car page"). Whisper needs no language hint, so STT_LANGUAGE is
# empty by default and only passed when set. (This is Cartesia's speech-to-TEXT,
# unrelated to the Cartesia TTS voice the client moved off; the voice is ElevenLabs.)
# To A/B back to Deepgram: STT_MODEL=deepgram/nova-3 STT_LANGUAGE=multi.
STT_MODEL = os.getenv("STT_MODEL", "cartesia/ink-whisper")
STT_LANGUAGE = os.getenv("STT_LANGUAGE", "")
LLM_MODEL = os.getenv("LLM_MODEL", "google/gemma-4-31b-it")
# TTS: Cartesia Sonic-3.5. MIGRATED OFF ElevenLabs — every ElevenLabs model on the
# LiveKit Inference gateway (flash/turbo/multilingual_v2/v3) is deprecated and
# RETIRES 2026-08-31, so eleven_multilingual_v2 would simply stop producing audio.
# Sonic-3.5 covers 39 languages incl. Polish and has the lowest time-to-first-byte
# on the gateway, which also helps the end-of-turn feel. The voice is a Cartesia
# voice id — "Katie" (female, natural), the voice this agent used before the
# ElevenLabs detour (commit 16b6b53). Swap via CARTESIA_VOICE_ID.
TTS_MODEL = os.getenv("TTS_MODEL", "cartesia/sonic-3.5")
TTS_VOICE = os.getenv("CARTESIA_VOICE_ID", "f786b574-daa5-4673-aa0c-cbe3e8534c02")

# Cartesia generation config — forwarded to the LiveKit Inference gateway via
# inference.TTS(extra_kwargs=...). NOTE this is a COMPLETELY DIFFERENT parameter
# set to ElevenLabs' voice_settings (stability / similarity_boost / style /
# use_speaker_boost). Those keys are meaningless to Cartesia and are gone; leaving
# them in would silently drop all the anti-robotic tuning. Both knobs are
# env-tunable so the voice can be adjusted by ear without a rebuild.
#   speed:   numeric multiplier, valid range [0.6, 1.5] — same scale as the
#            ElevenLabs value it replaces, so the tuned 1.1 ports across directly
#            (1.0 read too slow/scripted).
#   emotion: Cartesia emotion string (neutral/calm/content/happy/excited/...).
#            "content" = warm and pleasant without the over-eager sales lilt that
#            "happy"/"excited" give a hotel concierge. Available on sonic-3+.
TTS_SPEED = float(os.getenv("TTS_SPEED", "1.1"))
TTS_EMOTION = os.getenv("TTS_EMOTION", "content")

# Turn-taking — env-tunable to balance "cutting in" vs "dead air" by ear without a
# rebuild. Earlier these were 0.8/4.0/0.75 to stop cut-in, which added noticeable
# silence after every caller turn; moderated here to cut dead air while still
# giving the caller a beat to keep talking.
MIN_ENDPOINTING_DELAY = float(os.getenv("MIN_ENDPOINTING_DELAY", "0.6"))   # silence after caller stops before agent speaks
MAX_ENDPOINTING_DELAY = float(os.getenv("MAX_ENDPOINTING_DELAY", "2.0"))   # cap when EOU is unsure — was 4.0s = the 4s dead-air gaps
VAD_MIN_SILENCE = float(os.getenv("VAD_MIN_SILENCE", "0.6"))               # Silero end-of-speech window

# Dead-air / duration guards — copied from agent.py so behaviour matches.
DEAD_AIR_CHECKIN = 25
DEAD_AIR_HANGUP = 40
MAX_CALL_DURATION = 7 * 60


def _stt_kwargs() -> dict:
    """STT kwargs — pass `language` only when set. Whisper auto-detects (EN+PL) with
    no language, whereas Deepgram nova-3 needs language="multi" (set STT_LANGUAGE)."""
    kw = {"model": STT_MODEL}
    if STT_LANGUAGE:
        kw["language"] = STT_LANGUAGE
    return kw


def build_pipeline_session() -> AgentSession:
    """The one real difference from agent.py: a pipeline session instead of the
    native-audio RealtimeModel. VAD + turn detection + interruption knobs match
    agent.py — but here they are ACTIVE (they were inert with native audio)."""
    tts_kwargs = {"model": TTS_MODEL}
    if TTS_VOICE:
        tts_kwargs["voice"] = TTS_VOICE
    # Cartesia generation config rides through the LiveKit Inference gateway as
    # extra_kwargs (inference.TTS forwards this dict verbatim).
    tts_kwargs["extra_kwargs"] = {
        "speed": TTS_SPEED,
        "emotion": TTS_EMOTION,
    }
    return AgentSession(
        # Silero VAD: widen the silence window 0.55 -> 0.75 so brief mid-sentence
        # pauses aren't read as end-of-turn. This is the ONLY end-of-turn guard on
        # Polish speech — the turn-detector model below has no Polish support.
        vad=silero.VAD.load(min_silence_duration=VAD_MIN_SILENCE),
        turn_detection=MultilingualModel(),
        # Turn-taking (env-tunable) — balanced to reduce dead air while still giving
        # the caller a beat before the agent speaks:
        min_endpointing_delay=MIN_ENDPOINTING_DELAY,
        max_endpointing_delay=MAX_ENDPOINTING_DELAY,
        min_interruption_words=2,       # was 10 — 10 made the agent almost impossible to barge in on
        min_interruption_duration=0.8,  # filters brief phone-line noise
        false_interruption_timeout=2.0, # telephony: resume after a brief false trip
        resume_false_interruption=True,
        stt=inference.STT(**_stt_kwargs()),   # Cartesia Ink-Whisper (auto-detect EN+PL)
        llm=inference.LLM(model=LLM_MODEL),
        tts=inference.TTS(**tts_kwargs),
    )


# Marker tokens whose PRESENCE in a chunk means it carries Gemma-4 reasoning and
# must be run through the whole-message stripper. A chunk WITHOUT any of these is
# ordinary speech and must pass through untouched.
_MARKER_TOKENS = ("<think>", "<|channel|>")


def _clean_chunk(chunk: str) -> str:
    """Clean a SINGLE streaming LLM delta on its way to TTS.

    The framework feeds `tts_node` the raw per-delta text stream (the sentence
    tokenizer runs downstream), so deltas are word fragments like "Your", " Wi",
    "-Fi". `strip_thinking_tokens` is a WHOLE-MESSAGE cleaner: it ends with
    `re.sub(r"\\s+", " ", out).strip()`, which would strip the leading/trailing
    space off every delta and glue words together ("YourWi-Fi..."). So we only
    invoke it when a delta actually contains a reasoning marker; a marker-free
    delta is returned BYTE-FOR-BYTE UNCHANGED (spacing preserved). This keeps the
    safety-net intent (issue #6375) without corrupting normal speech."""
    low = chunk.lower()
    if any(tok in low for tok in _MARKER_TOKENS):
        return strip_thinking_tokens(chunk)
    return chunk


async def _clean_stream(source):
    """Async-generator wrapper over `_clean_chunk` for a delta stream.

    Every chunk is yielded (including lone-whitespace deltas) so inter-word
    spacing survives; only marker-bearing chunks are transformed."""
    async for chunk in source:
        yield _clean_chunk(chunk)


class PipelineMoloAgent(MoloAgent):
    """Same tools/prompt as MoloAgent; only the TTS text is cleaned.

    Overrides `tts_node` to strip Gemma-4 reasoning markers before synthesis
    (LiveKit issue #6375). The base `Agent.tts_node(self, text, model_settings)`
    returns an `AsyncIterable[AudioFrame]` (or a coroutine resolving to one); the
    framework awaits a coroutine result if needed, then iterates it. We insert a
    per-chunk cleaning stage (`_clean_stream`) in front of the incoming text
    stream and delegate the actual synthesis to the base implementation, matching
    that contract exactly."""

    async def tts_node(self, text, model_settings):
        return super().tts_node(_clean_stream(text), model_settings)

    # Fixed, non-interruptible spoken filler per tool. Covers the tool-call gap
    # with a consistent phrase (this replaces the removed typing sound). Spoken
    # with allow_interruptions=False so a fast tool return can't cut it off; the
    # tool's result speech queues after it. Overrides the no-op hook on MoloAgent,
    # so only the pipeline speaks fillers (the native-audio agent is unaffected).
    # Varied phrasings that do NOT all open with the same acknowledgement word
    # ("Sure/Okay/Great/Perfect"): the model tends to open its own reply with
    # "Sure thing!" too, and stacking those read as robotic "sure … sure".
    _TOOL_FILLERS = {
        "identify_guest":         "One moment while I pull up your reservation.",
        "search_kb":              "Let me check that for you.",
        "suggest_available_rooms":"Checking availability for those dates now.",
        "send_booking_link":      "I'll send that booking link over to you now.",
        "raise_maintenance_ticket":"Getting that ticket raised for you now.",
    }

    # When the model chains tools in one turn (e.g. identify_guest -> search_kb),
    # each tool would otherwise speak its filler ~3s apart, stacking two canned
    # lines back-to-back. Speak at most one filler per this window so only the
    # first of a rapid chain is heard. Fillers across separate caller turns are
    # always many seconds apart, so ordinary use is unaffected.
    _FILLER_COOLDOWN_S = 8.0

    # Dynamic slow-tool cover: a soft keyboard-typing sound that fills dead air ONLY
    # when a tool runs longer than _COVER_AFTER_S. Armed from _before_tool, so it can
    # ONLY fire during a tool call — never on a plain turn (that every-turn typing is
    # what the client removed). Low volume so it sits UNDER the voice. Env-tunable.
    _COVER_AFTER_S = float(os.getenv("COVER_AFTER_S", "2.0"))     # fast tools (<2s) never trigger it
    _COVER_VOLUME = float(os.getenv("COVER_VOLUME", "0.25"))      # subtle, under the speech
    _COVER_CLIP = BuiltinAudioClip.KEYBOARD_TYPING2              # shorter/lighter of the two clips

    def _stop_cover(self) -> None:
        """Stop any playing cover and invalidate a pending cover timer. Called when
        the agent leaves 'thinking' (result audio is starting) — idempotent."""
        self._cover_gen = getattr(self, "_cover_gen", 0) + 1
        h = getattr(self, "_cover_handle", None)
        if h is not None and not h.done():
            h.stop()
        self._cover_handle = None

    async def _start_cover_after_delay(self, gen: int) -> None:
        """After _COVER_AFTER_S, start the typing cover IFF this is still the current
        tool phase and the agent is still thinking (i.e. the tool is genuinely slow)."""
        try:
            await asyncio.sleep(self._COVER_AFTER_S)
        except asyncio.CancelledError:
            return
        bg = getattr(self, "_bg", None)
        if bg is None or gen != getattr(self, "_cover_gen", 0):
            return  # a newer tool phase superseded this, or no player wired
        try:
            if self.session.agent_state != "thinking":
                return  # fast tool already returned — no dead air to cover
            h = getattr(self, "_cover_handle", None)
            if h is None or h.done():
                self._cover_handle = bg.play(
                    AudioConfig(self._COVER_CLIP, volume=self._COVER_VOLUME), loop=True,
                )
        except Exception as exc:  # noqa: BLE001
            logger.warning("slow-tool cover failed: %s", exc)

    async def _before_tool(self, context, key):
        # 1) Fixed spoken filler (unchanged) — one per 8s cooldown, audio-only.
        phrase = self._TOOL_FILLERS.get(key)
        if phrase:
            now = time.monotonic()
            if now - getattr(self, "_last_filler_at", 0.0) >= self._FILLER_COOLDOWN_S:
                self._last_filler_at = now
                # add_to_chat_ctx=False: audio-only, else the LLM parrots the filler
                # ("Let me check that for you.Hmm, I'm sorry…").
                context.session.say(phrase, allow_interruptions=False, add_to_chat_ctx=False)
        # 2) Arm the dynamic slow-tool cover; it self-cancels if the tool is fast.
        self._cover_gen = getattr(self, "_cover_gen", 0) + 1
        asyncio.create_task(self._start_cover_after_delay(self._cover_gen))


server = AgentServer()


# EXPLICIT dispatch: the worker registers under agent_name "molo-pipeline", and
# the number's SIP dispatch rule (molo-inbound) names it via room_config.agents.
# This is LiveKit's recommended pattern for SIP inbound on Cloud — auto-dispatch
# (empty name) does not reliably provision a scaled-to-zero agent for SIP calls,
# so the call dropped with no room/job. Keep this name in sync with the dispatch
# rule's agent_name.
@server.rtc_session(agent_name=PIPELINE_AGENT_NAME)
async def molo_pipeline_session(ctx: agents.JobContext):
    # === BEGIN runner copied from agent.py molo_session (lines ~620-851) ===
    # Copied VERBATIM except: (a) instructions base is PIPELINE_INSTRUCTIONS,
    # (b) session = build_pipeline_session(), (c) agent = PipelineMoloAgent(...).
    await ctx.connect()
    participant = await ctx.wait_for_participant()

    caller_phone = participant.attributes.get("sip.phoneNumber", "")

    # Preload the default general KB so general questions work before the guest
    # is identified (guarded — a DB hiccup must never block the greeting).
    try:
        default_kb = db.get_default_general_kb()
    except Exception as exc:  # noqa: BLE001
        logger.warning("default KB load failed: %s", exc)
        default_kb = ""

    # Front-desk transfer number is configured by staff in the dashboard
    # (agent_settings.transfer_default_phone). Loaded once at call start (guarded).
    try:
        transfer_phone = (db.get_agent_settings() or {}).get("transfer_default_phone")
    except Exception as exc:  # noqa: BLE001
        logger.warning("agent_settings load failed: %s", exc)
        transfer_phone = None

    # NOTE: the general KB is intentionally NOT appended to the system prompt — it
    # bloated time-to-first-token and pulled the model toward Polish. It's loaded
    # into the agent's kb_content below and served only via search_kb.
    # Give the live model the current LOCAL (Poland) date & time so it can reason
    # about relative dates the caller uses ("tonight", "tomorrow", "next Monday").
    # Substituted fresh per call into the prompt's inline sentinel (see
    # pipeline_prompt.CURRENT_TIME_TOKEN) so it's always accurate.
    _now_local = _now_warsaw()
    _current_time = (
        f"{_now_local.strftime('%A, %d %B %Y, %H:%M')} local time "
        f"(today's date is {_now_local.date().isoformat()}) — always use THIS as "
        "\"now\" for relative dates like \"tonight\", \"today\", \"tomorrow\", or \"next Monday\"."
    )
    instructions = render_instructions(_current_time)

    session = build_pipeline_session()

    # Initial call_logs row (insert_call_log is internally guarded — returns None
    # on any error, so a logging hiccup never blocks the call).
    call_id = db.insert_call_log({
        "started_at": _now_iso(),
        "direction": "inbound",
        "from_number": caller_phone or None,
        "mode": "unknown",
        "tool_calls": [],
    })

    agent = PipelineMoloAgent(instructions=instructions, default_kb_content=default_kb,
                              from_number=caller_phone, call_id=call_id, room_name=ctx.room.name,
                              transfer_phone=transfer_phone)

    # Capture the full ordered transcript for the call_logs summary, so a wrong
    # answer can be reviewed against what was actually asked.
    transcript_log: list[str] = []

    @session.on("conversation_item_added")
    def _on_item(ev):
        try:
            item = ev.item
            role = getattr(item, "role", "?")
            text = getattr(item, "text_content", None) or getattr(item, "text", "") or ""
            if text:
                transcript_log.append(f"{role}: {text}")
        except Exception:  # noqa: BLE001
            pass

    call_start = time.time()

    await session.start(
        room=ctx.room,
        agent=agent,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=noise_cancellation.BVCTelephony(),
            ),
        ),
    )

    # Dynamic slow-tool cover: a soft keyboard-typing track that fills dead air ONLY
    # when a tool runs longer than PipelineMoloAgent._COVER_AFTER_S. It is armed in
    # _before_tool (so it can only ever fire during a tool call, never on a plain
    # turn — that every-turn typing was what the client removed) and stopped the
    # instant the agent leaves "thinking" (the answer audio is starting).
    # We deliberately do NOT pass thinking_sound= to BackgroundAudioPlayer: that
    # built-in fires on EVERY turn's thinking phase, which is the spam we're avoiding.
    bg = BackgroundAudioPlayer()
    try:
        await bg.start(room=ctx.room, agent_session=session)
        agent._bg = bg
    except Exception as exc:  # noqa: BLE001 — never let audio setup block the call
        logger.warning("BackgroundAudioPlayer start failed: %s", exc)

    @session.on("agent_state_changed")
    def _stop_cover_on_state(ev):
        if getattr(ev, "new_state", None) != "thinking":
            agent._stop_cover()

    # ── Start the conversation ──────────────────────────────
    await session.generate_reply(instructions=GREETING)

    # ── Wait for the call to end (disconnect / dead air / max duration) ──────
    disconnect_event = asyncio.Event()
    end_reason = "caller_hangup"

    @ctx.room.on("participant_disconnected")
    def on_participant_left(p: rtc.RemoteParticipant):
        nonlocal end_reason
        if p.identity == participant.identity:
            logger.info("Caller %s disconnected", caller_phone)
            end_reason = "caller_hangup"
            disconnect_event.set()

    async def call_monitor():
        nonlocal end_reason
        last_activity = time.time()
        checkin_sent = False

        def _reset_activity():
            nonlocal last_activity, checkin_sent
            last_activity = time.time()
            checkin_sent = False

        @session.on("user_input_transcribed")
        def on_user_input(*args, **kwargs):
            _reset_activity()

        @session.on("agent_speech_started")
        def on_agent_speech_start(*args, **kwargs):
            _reset_activity()

        while not disconnect_event.is_set():
            await asyncio.sleep(2)

            if time.time() - call_start >= MAX_CALL_DURATION:
                end_reason = "max_duration"
                try:
                    await session.generate_reply(
                        instructions="We've been on the call for a while now. Warmly wrap up — it was great chatting, and they can always call back. Say goodbye."
                    )
                    await asyncio.sleep(4)
                except Exception:  # noqa: BLE001
                    pass
                disconnect_event.set()
                break

            silence_duration = time.time() - last_activity

            if silence_duration >= DEAD_AIR_HANGUP:
                end_reason = "dead_air"
                try:
                    await session.generate_reply(
                        instructions="The caller hasn't responded. Say goodbye warmly and let them know they can call back anytime."
                    )
                    await asyncio.sleep(4)
                except Exception:  # noqa: BLE001
                    pass
                disconnect_event.set()
                break

            if silence_duration >= DEAD_AIR_CHECKIN and not checkin_sent:
                checkin_sent = True
                try:
                    await session.generate_reply(
                        instructions="The line has been quiet. Say ONLY a brief presence check and nothing about any previous topic — exactly like: 'Hello — are you still there?'"
                    )
                except Exception:  # noqa: BLE001
                    pass

    monitor_task = asyncio.create_task(call_monitor())
    try:
        await disconnect_event.wait()
    finally:
        monitor_task.cancel()
        try:
            await monitor_task
        except asyncio.CancelledError:
            pass
        agent._stop_cover()
        try:
            await bg.aclose()
        except Exception:  # noqa: BLE001
            pass

    call_duration = int(time.time() - call_start)
    logger.info("Call ended: duration=%ss caller=%s reason=%s", call_duration, caller_phone, end_reason)

    # Persist the call for review (transcript + tool trace incl. which KB answered).
    if call_id:
        transcript = "\n".join(transcript_log) if transcript_log else None
        if agent.outcome_hint:
            outcome = agent.outcome_hint
        elif not agent.tool_calls and end_reason in ("dead_air", "caller_hangup"):
            outcome = "abandoned"
        else:
            outcome = "other"
        try:
            db.update_call_log(call_id, {
                "ended_at": _now_iso(),
                "duration_seconds": call_duration,
                "summary": (transcript or "")[:4000] or None,
                "tool_calls": agent.tool_calls,
                "mode": agent.mode,
                "outcome": outcome,
                "property_id": agent.property_id,
                "room_number": agent.room_number,
            })
        except Exception as exc:  # noqa: BLE001
            logger.warning("update_call_log failed: %s", exc)

    # If we ended the call ourselves, remove the SIP participant and disconnect.
    if end_reason != "caller_hangup":
        try:
            from livekit.protocol.room import RoomParticipantIdentity
            async with LiveKitAPI() as lk:
                await lk.room.remove_participant(
                    RoomParticipantIdentity(room=ctx.room.name, identity=participant.identity)
                )
        except Exception as e:  # noqa: BLE001
            logger.warning("Failed to remove SIP participant: %s", e)
        try:
            await ctx.room.disconnect()
        except Exception:  # noqa: BLE001
            pass
    # === END copied runner ===


if __name__ == "__main__":
    agents.cli.run_app(server)
