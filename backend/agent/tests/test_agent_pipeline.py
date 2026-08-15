# tests/test_agent_pipeline.py
import asyncio
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))


def _run_clean_stream(ap, deltas):
    """Drive ap._clean_stream over `deltas` and collect the yielded chunks."""
    async def _collect():
        async def _src():
            for d in deltas:
                yield d
        return [c async for c in ap._clean_stream(_src())]
    return asyncio.run(_collect())


def test_module_imports_and_uses_pipeline_prompt():
    import agent_pipeline as ap
    import pipeline_prompt
    assert ap.PIPELINE_INSTRUCTIONS_TEXT == pipeline_prompt.PIPELINE_INSTRUCTIONS


def test_model_constants_are_the_verified_strings():
    import agent_pipeline as ap
    # STT: Deepgram Nova-3 in MULTILINGUAL mode. language="multi" is the whole point
    # — it makes Nova-3 detect the language per segment so a caller switching EN<->PL
    # mid-call is transcribed correctly. Dropping the hint silently degrades to
    # English-only, which is the failure this assertion exists to catch.
    assert ap.STT_MODEL == "deepgram/nova-3"
    assert ap.STT_LANGUAGE == "multi"
    assert ap.LLM_MODEL == "google/gemma-4-31b-it"
    # TTS: Cartesia Sonic-3, the client's voice, rendering Polish.
    assert ap.TTS_MODEL == "cartesia/sonic-3.5"
    assert ap.TTS_VOICE == "43e52207-96fc-4e01-aaf8-cae317e43fdb"
    assert ap.TTS_LANGUAGE == "pl"
    # Known-good floor: the pair the agent ran on before 2026-08-15.
    assert ap.TTS_FLOOR_MODEL == "cartesia/sonic-3.5"
    assert ap.TTS_FLOOR_VOICE == "f786b574-daa5-4673-aa0c-cbe3e8534c02"  # "Katie"


def test_the_floor_uses_a_different_voice_than_the_primary():
    # The floor exists to survive an unresolvable primary voice id. Pointing both
    # legs at the same voice makes the fallback fail for the identical reason and
    # silently reinstates the 2026-08-15 outage.
    import agent_pipeline as ap
    assert ap.TTS_VOICE != ap.TTS_FLOOR_VOICE


def test_no_elevenlabs_references_remain():
    # Moved off ElevenLabs entirely on 2026-08-15: the client's voices were
    # community-library ones, which LiveKit Inference cannot resolve, and every
    # elevenlabs/* gateway model retires 2026-08-31 anyway.
    import agent_pipeline as ap
    assert not hasattr(ap, "ELEVEN_VOICE_ID")
    assert not hasattr(ap, "ELEVEN_MODEL")
    assert "elevenlabs" not in ap.TTS_MODEL.lower()
    assert "elevenlabs" not in ap.TTS_FLOOR_MODEL.lower()


def test_cartesia_speed_is_within_the_documented_range():
    # Cartesia rejects speed outside [0.6, 1.5]; 1.1 ports the tuned ElevenLabs pace
    # (1.0 read "too slow/scripted") onto Cartesia's identical multiplier scale.
    import agent_pipeline as ap
    assert 0.6 <= ap.TTS_SPEED <= 1.5
    assert ap.TTS_EMOTION                       # a warm emotion, not flat/neutral-by-default


def test_build_session_wires_all_three_legs(monkeypatch):
    import agent_pipeline as ap
    seen = {}

    class FakeSTT:  # noqa: D401
        def __init__(self, model=None, language=None, **kw): seen["stt"] = (model, language)
    class FakeLLM:
        def __init__(self, model=None, **kw): seen["llm"] = model
    class FakeTTS:
        def __init__(self, model=None, voice=None, extra_kwargs=None, **kw):
            seen.setdefault("tts_all", []).append((model, voice))
            seen["tts"] = (model, voice); seen["tts_extra"] = extra_kwargs

    monkeypatch.setattr(ap.inference, "STT", FakeSTT)
    monkeypatch.setattr(ap.inference, "LLM", FakeLLM)
    monkeypatch.setattr(ap.inference, "TTS", FakeTTS)
    monkeypatch.setattr(ap.tts_api, "FallbackAdapter", lambda c, **kw: c)
    # silero.VAD.load / MultilingualModel are heavyweight; stub them too.
    # VAD.load now takes min_silence_duration, so the stub must accept kwargs.
    monkeypatch.setattr(ap.silero.VAD, "load", staticmethod(lambda **kw: object()))
    monkeypatch.setattr(ap, "MultilingualModel", lambda: object())

    ap.build_pipeline_session()
    # Nova-3 needs the explicit "multi" hint to transcribe EN+PL in one stream.
    assert seen["stt"] == ("deepgram/nova-3", "multi")
    assert seen["llm"] == "google/gemma-4-31b-it"
    # Two Cartesia legs: the client's Sonic-3 voice first, known-good floor last.
    assert seen["tts_all"] == [
        ("cartesia/sonic-3.5", "43e52207-96fc-4e01-aaf8-cae317e43fdb"),
        ("cartesia/sonic-3.5", "f786b574-daa5-4673-aa0c-cbe3e8534c02"),
    ]


def test_primary_leads_and_the_floor_backs_it(monkeypatch):
    import agent_pipeline as ap

    monkeypatch.setattr(ap.inference, "TTS", lambda **kw: kw)
    monkeypatch.setattr(ap.tts_api, "FallbackAdapter", lambda c, **kw: c)

    candidates, _legs = ap._build_tts()
    # Both legs run the same model, so VOICE is what distinguishes them: the
    # client's verified voice leads, stock "Katie" backs it up.
    assert [c["voice"] for c in candidates] == [
        "43e52207-96fc-4e01-aaf8-cae317e43fdb",
        "f786b574-daa5-4673-aa0c-cbe3e8534c02",
    ]
    assert all(c["model"] == "cartesia/sonic-3.5" for c in candidates)
    # Polish must reach the gateway — without it Cartesia renders with the model
    # default (English) phonetics, which is audibly wrong on Polish replies.
    assert candidates[0]["language"] == "pl"


def test_tts_failover_happens_at_synthesis_not_construction(monkeypatch):
    # THE REGRESSION THIS GUARDS (live outage 2026-08-15): an unusable voice does
    # NOT raise at construction. inference.TTS builds fine and only errors on the
    # first real synthesis ("A voice with voice_id ... does not exist",
    # retryable:false), so a construction-time try/except ladder never fires and
    # the caller hears silence for the entire call. The candidates must therefore
    # be handed to a FallbackAdapter, which fails over per-utterance.
    import agent_pipeline as ap

    monkeypatch.setattr(ap.inference, "TTS", lambda **kw: kw)

    wrapped = {}

    def fake_adapter(candidates, **kw):
        wrapped["candidates"] = candidates
        wrapped["kw"] = kw
        return "adapter"

    monkeypatch.setattr(ap.tts_api, "FallbackAdapter", fake_adapter)
    adapter, legs = ap._build_tts()
    assert adapter == "adapter"
    # More than one candidate, or there is nothing to fail over TO.
    assert len(wrapped["candidates"]) >= 2
    # The Cartesia floor must be last so it catches everything above it.
    assert wrapped["candidates"][-1]["model"] == "cartesia/sonic-3.5"
    # retryable:false errors gain nothing from retries — they just add dead air.
    assert wrapped["kw"]["max_retry_per_tts"] == 1


def test_cartesia_floor_keeps_its_tuning(monkeypatch):
    import agent_pipeline as ap

    monkeypatch.setattr(ap.inference, "TTS", lambda **kw: kw)
    monkeypatch.setattr(ap.tts_api, "FallbackAdapter", lambda c, **kw: c)

    floor = ap._build_tts()[0][-1]
    assert floor["model"] == "cartesia/sonic-3.5"
    assert floor["extra_kwargs"]["speed"] == 1.1
    assert floor["extra_kwargs"]["emotion"] == "content"


def test_welcome_message_is_spoken_verbatim_and_carries_the_disclosures():
    # The opening carries two compliance statements — that this is an AI, and that
    # the call is transcribed. It is spoken with session.say (not generate_reply)
    # precisely so the model cannot reword either one.
    #
    # The data-deletion contact moved OUT of the greeting (client, 2026-08-15) and
    # into the system prompt, so the agent offers it when asked rather than
    # reciting it up front. Don't re-assert it here.
    import agent_pipeline as ap
    w = ap.WELCOME_MESSAGE
    assert "Molo Residence" in w
    assert "AI agent" in w            # AI disclosure
    assert "transcribed" in w         # transcription notice
    # Guard the mis-transcribed spellings from the dictation ("Moller", "AR agent").
    assert "Moller" not in w and "Mola" not in w
    assert "AR agent" not in w


def test_data_deletion_contact_is_in_the_prompt():
    # It left the greeting, so it must still be somewhere the agent can reach it.
    import pipeline_prompt
    assert "info at molo residence dot pl" in pipeline_prompt.PIPELINE_INSTRUCTIONS


def test_welcome_is_spoken_as_english_regardless_of_tts_language():
    # TTS_LANGUAGE is "pl", but the greeting is English text. Speaking it under a
    # Polish voice model gives English words Polish phonetics. The runner pins the
    # greeting to English and only then follows the caller.
    import agent_pipeline as ap
    assert ap.WELCOME_LANGUAGE == "en"


def test_build_session_tunes_turn_taking(monkeypatch):
    # The turn-taking knobs that stop the agent cutting in must reach AgentSession.
    import agent_pipeline as ap
    captured = {}

    class FakeSession:
        def __init__(self, **kw): captured.update(kw)

    monkeypatch.setattr(ap.inference, "STT", lambda **kw: object())
    monkeypatch.setattr(ap.inference, "LLM", lambda **kw: object())
    monkeypatch.setattr(ap.inference, "TTS", lambda **kw: object())
    # The real FallbackAdapter validates that it was handed genuine TTS instances,
    # which the bare object() stubs above are not — stub it out too.
    monkeypatch.setattr(ap.tts_api, "FallbackAdapter", lambda c, **kw: object())
    monkeypatch.setattr(ap.silero.VAD, "load", staticmethod(lambda **kw: object()))
    monkeypatch.setattr(ap, "MultilingualModel", lambda: object())
    monkeypatch.setattr(ap, "AgentSession", FakeSession)

    ap.build_pipeline_session()
    assert captured["min_endpointing_delay"] == 0.6      # balanced: less dead air, still a beat
    assert captured["max_endpointing_delay"] == 2.0      # capped to kill the 4s dead-air gaps
    assert captured["min_interruption_words"] == 2       # was 10
    assert captured["false_interruption_timeout"] == 2.0
    assert captured["resume_false_interruption"] is True


def test_clean_stream_preserves_word_spacing():
    # REGRESSION: marker-free deltas must pass through byte-for-byte so word
    # boundaries survive. Previously each delta was whitespace-normalized and
    # lone-space chunks dropped, gluing the utterance into "YourWi-Fipassword...".
    import agent_pipeline as ap
    deltas = ["Your", " Wi", "-Fi", " password", " is", " swan", "2026", "."]
    out = _run_clean_stream(ap, deltas)
    assert "".join(out) == "Your Wi-Fi password is swan2026."


def test_clean_stream_still_strips_thinking_marker_chunk():
    # A chunk carrying a reasoning marker is still cleaned (safety net, issue #6375).
    import agent_pipeline as ap
    out = _run_clean_stream(ap, ["Answer: ", "here <think>secret reasoning</think>is the code", " 1234"])
    joined = "".join(out)
    assert "<think>" not in joined
    assert "secret" not in joined
    assert "Answer:" in joined and "is the code" in joined and "1234" in joined


def test_clean_chunk_passes_marker_free_text_unchanged():
    # Marker-free chunk returned identically (no strip/collapse), incl. lone space.
    import agent_pipeline as ap
    assert ap._clean_chunk(" Wi") == " Wi"
    assert ap._clean_chunk(" ") == " "
    assert ap._clean_chunk("swan2026.") == "swan2026."


class _FakeSession:
    def __init__(self): self.said = None
    def say(self, text, allow_interruptions=None, **kw):
        self.said = (text, allow_interruptions)


class _FakeCtx:
    def __init__(self): self.session = _FakeSession()


def test_before_tool_speaks_a_variant_noninterruptibly():
    import agent_pipeline as ap
    agent = ap.PipelineMoloAgent(instructions="x", default_kb_content="")
    ctx = _FakeCtx()
    asyncio.run(agent._before_tool(ctx, "suggest_available_rooms"))
    text, allow = ctx.session.said
    assert text in ap.PipelineMoloAgent._TOOL_FILLERS["suggest_available_rooms"].values()
    assert allow is False   # non-interruptible: a fast tool return can't cut it off




def test_before_tool_noop_for_unknown_tool():
    import agent_pipeline as ap
    agent = ap.PipelineMoloAgent(instructions="x", default_kb_content="")
    ctx = _FakeCtx()
    asyncio.run(agent._before_tool(ctx, "not_a_tool"))
    assert ctx.session.said is None   # nothing spoken


def test_base_agent_before_tool_is_noop():
    import agent as agent_mod
    a = agent_mod.MoloAgent(instructions="x", default_kb_content="")
    ctx = _FakeCtx()
    asyncio.run(a._before_tool(ctx, "search_kb"))   # base = no-op
    assert ctx.session.said is None


def test_chained_second_filler_is_suppressed():
    # When the model chains tools in one turn (identify_guest -> search_kb), the
    # second filler must be suppressed so two canned lines don't stack ("sure sure").
    import agent_pipeline as ap
    agent = ap.PipelineMoloAgent(instructions="x", default_kb_content="")
    ctx = _FakeCtx()
    asyncio.run(agent._before_tool(ctx, "identify_guest"))
    assert ctx.session.said is not None                 # first filler speaks
    ctx.session.said = None
    asyncio.run(agent._before_tool(ctx, "suggest_available_rooms"))  # chained immediately
    assert ctx.session.said is None                     # suppressed (no stacking)




class _FakeCoverHandle:
    def __init__(self): self._stopped = False
    def stop(self): self._stopped = True
    def done(self): return self._stopped


class _FakeBg:
    def __init__(self): self.played = []
    def play(self, cfg, loop=False):
        h = _FakeCoverHandle(); self.played.append((cfg, loop, h)); return h


def _agent_with_state(monkeypatch, state):
    import agent_pipeline as ap
    a = ap.PipelineMoloAgent(instructions="x", default_kb_content="")

    class _S:
        agent_state = state
        def say(self, *a, **k): pass

    monkeypatch.setattr(ap.PipelineMoloAgent, "session", property(lambda self: _S()), raising=False)
    a._COVER_AFTER_S = 0.0   # don't actually wait in tests
    a._bg = _FakeBg()
    return a


def test_cover_constants_sane():
    import agent_pipeline as ap
    assert ap.PipelineMoloAgent._COVER_CLIP.name == "KEYBOARD_TYPING2"
    assert 0 < ap.PipelineMoloAgent._COVER_VOLUME <= 1.0
    assert ap.PipelineMoloAgent._COVER_AFTER_S > 0   # a real threshold => fast tools skip


def test_stop_cover_stops_handle_and_invalidates_timer():
    import agent_pipeline as ap
    a = ap.PipelineMoloAgent(instructions="x", default_kb_content="")
    a._cover_gen = 3
    h = _FakeCoverHandle(); a._cover_handle = h
    a._stop_cover()
    assert h.done() is True and a._cover_handle is None and a._cover_gen == 4


def test_slow_tool_plays_looping_cover_when_still_thinking(monkeypatch):
    a = _agent_with_state(monkeypatch, "thinking")
    a._cover_gen = 7
    asyncio.run(a._start_cover_after_delay(7))
    assert len(a._bg.played) == 1
    assert a._bg.played[0][1] is True             # loop=True (clip is short)


def test_fast_tool_skips_cover_when_not_thinking(monkeypatch):
    # tool already returned (state left "thinking") -> no dead air to cover
    a = _agent_with_state(monkeypatch, "speaking")
    a._cover_gen = 7
    asyncio.run(a._start_cover_after_delay(7))
    assert a._bg.played == []


def test_superseded_tool_phase_skips_cover(monkeypatch):
    # a newer tool phase bumped _cover_gen; the stale timer must not play
    a = _agent_with_state(monkeypatch, "thinking")
    a._cover_gen = 9
    asyncio.run(a._start_cover_after_delay(7))    # stale gen
    assert a._bg.played == []


def test_filler_speaks_again_after_cooldown():
    # After the cooldown elapses, a later tool speaks its filler again.
    import time as _t
    import agent_pipeline as ap
    agent = ap.PipelineMoloAgent(instructions="x", default_kb_content="")
    ctx = _FakeCtx()
    asyncio.run(agent._before_tool(ctx, "identify_guest"))
    assert ctx.session.said is not None
    ctx.session.said = None
    agent._last_filler_at = _t.monotonic() - (ap.PipelineMoloAgent._FILLER_COOLDOWN_S + 1)
    asyncio.run(agent._before_tool(ctx, "identify_guest"))
    assert ctx.session.said is not None


# ── Localized fillers ────────────────────────────────────────────────────────

def test_search_kb_speaks_nothing():
    # Client instruction 2026-08-15: say nothing at all while the knowledge base is
    # queried. None (not "") is the sentinel — an empty string would still take the
    # cooldown slot and suppress a legitimate filler on a chained tool.
    import agent_pipeline as ap
    assert ap.PipelineMoloAgent._TOOL_FILLERS["search_kb"] is None
    agent = ap.PipelineMoloAgent(instructions="x", default_kb_content="")
    ctx = _FakeCtx()
    asyncio.run(agent._before_tool(ctx, "search_kb"))
    assert ctx.session.said is None


def test_every_speaking_tool_has_both_languages():
    # session.say() speaks the literal string — nothing translates it. A tool with
    # only an English filler would talk English at a Polish caller.
    import agent_pipeline as ap
    for key, variants in ap.PipelineMoloAgent._TOOL_FILLERS.items():
        if variants is None:
            continue
        assert set(variants) >= {"en", "pl"}, f"{key} is missing a language"
        assert all(v.strip() for v in variants.values()), f"{key} has an empty phrase"


def test_filler_follows_the_callers_language():
    import agent_pipeline as ap
    agent = ap.PipelineMoloAgent(instructions="x", default_kb_content="")
    ctx = _FakeCtx()

    asyncio.run(agent._before_tool(ctx, "identify_guest"))
    assert ctx.session.said[0] == ap.PipelineMoloAgent._TOOL_FILLERS["identify_guest"]["en"]

    agent.caller_language = "pl"
    agent._last_filler_at = 0.0          # clear the cooldown
    ctx.session.said = None
    asyncio.run(agent._before_tool(ctx, "identify_guest"))
    assert ctx.session.said[0] == ap.PipelineMoloAgent._TOOL_FILLERS["identify_guest"]["pl"]


def test_unknown_language_falls_back_to_english_rather_than_silence():
    # Deepgram can report a language we hold no translation for. Speaking English is
    # a small wrong; speaking nothing is dead air mid-tool.
    import agent_pipeline as ap
    agent = ap.PipelineMoloAgent(instructions="x", default_kb_content="")
    agent.caller_language = "de"
    assert agent._filler_for("identify_guest") == \
        ap.PipelineMoloAgent._TOOL_FILLERS["identify_guest"]["en"]


def test_region_qualified_language_tags_are_normalized(monkeypatch):
    # Deepgram may report "en-US"/"pl-PL"; TTS wants the base tag.
    import agent_pipeline as ap
    agent = ap.PipelineMoloAgent(instructions="x", default_kb_content="")
    monkeypatch.setattr(ap, "_set_tts_language", lambda legs, lang: None)
    agent._on_caller_language("pl-PL")
    assert agent.caller_language == "pl"


# ── Front-desk opening hours ─────────────────────────────────────────────────

def test_front_desk_hours_boundaries():
    # Half-open [open, close): 17:00 is CLOSED, not "just closing".
    from datetime import datetime
    import agent_pipeline as ap
    at = lambda h: datetime(2026, 8, 17, h, 0)
    assert not ap._front_desk_is_open(at(ap.FRONT_DESK_OPEN_HOUR - 1))
    assert ap._front_desk_is_open(at(ap.FRONT_DESK_OPEN_HOUR))
    assert ap._front_desk_is_open(at(ap.FRONT_DESK_CLOSE_HOUR - 1))
    assert not ap._front_desk_is_open(at(ap.FRONT_DESK_CLOSE_HOUR))
    assert not ap._front_desk_is_open(at(3))


def test_closed_message_speaks_the_email_not_the_address():
    # TTS mangles "info@moloresidence.pl" into a URL-ish noise. The client writes it
    # out phonetically on purpose; keep it that way in both languages.
    import agent_pipeline as ap
    for lang in ("en", "pl"):
        msg = ap._closed_message(lang)
        assert "info at molo residence dot pl" in msg
        assert "@" not in msg


def test_closed_message_states_the_actual_hours():
    import agent_pipeline as ap
    msg = ap._closed_message("en")
    assert ap._spoken_hour(ap.FRONT_DESK_OPEN_HOUR) in msg
    assert ap._spoken_hour(ap.FRONT_DESK_CLOSE_HOUR) in msg


def test_spoken_hour_reads_naturally():
    import agent_pipeline as ap
    assert ap._spoken_hour(8) == "8 AM"
    assert ap._spoken_hour(17) == "5 PM"
    assert ap._spoken_hour(12) == "12 PM"
    assert ap._spoken_hour(0) == "12 AM"


def test_transfer_is_refused_out_of_hours_without_dialling(monkeypatch):
    # The point of the gate: outside hours the caller must be TOLD, not dialled into
    # a phone nobody answers. super().transfer_call must never run.
    import agent_pipeline as ap
    agent = ap.PipelineMoloAgent(instructions="x", default_kb_content="")
    monkeypatch.setattr(ap, "_front_desk_is_open", lambda now=None: False)

    called = {"super": False}
    async def _boom(self, context):
        called["super"] = True
        return "DIALLED"
    monkeypatch.setattr(ap.MoloAgent, "transfer_call", _boom)

    out = asyncio.run(ap.PipelineMoloAgent.transfer_call.__wrapped__(agent, _FakeCtx()))
    assert not called["super"], "dialled the front desk while closed"
    assert "only available" in out
    assert "info at molo residence dot pl" in out


def test_transfer_proceeds_during_hours(monkeypatch):
    import agent_pipeline as ap
    agent = ap.PipelineMoloAgent(instructions="x", default_kb_content="")
    monkeypatch.setattr(ap, "_front_desk_is_open", lambda now=None: True)

    async def _ok(self, context):
        return "DIALLED"
    monkeypatch.setattr(ap.MoloAgent, "transfer_call", _ok)

    out = asyncio.run(ap.PipelineMoloAgent.transfer_call.__wrapped__(agent, _FakeCtx()))
    assert out == "DIALLED"


# ── Weekday gate ─────────────────────────────────────────────────────────────

def test_front_desk_is_closed_all_weekend():
    # A Saturday inside business hours is still closed. Before the weekday gate
    # existed, 11am Saturday dialled an empty office.
    from datetime import datetime
    import agent_pipeline as ap
    mid = (ap.FRONT_DESK_OPEN_HOUR + ap.FRONT_DESK_CLOSE_HOUR) // 2
    saturday, sunday = datetime(2026, 8, 22, mid), datetime(2026, 8, 23, mid)
    assert saturday.weekday() == 5 and sunday.weekday() == 6   # sanity-check the dates
    assert not ap._front_desk_is_open(saturday)
    assert not ap._front_desk_is_open(sunday)


def test_front_desk_is_open_every_weekday_in_hours():
    from datetime import datetime
    import agent_pipeline as ap
    mid = (ap.FRONT_DESK_OPEN_HOUR + ap.FRONT_DESK_CLOSE_HOUR) // 2
    for day in range(17, 22):                     # Mon 2026-08-17 .. Fri 2026-08-21
        when = datetime(2026, 8, day, mid)
        assert when.weekday() < 5
        assert ap._front_desk_is_open(when), f"closed on weekday {when:%A}"


def test_weekday_and_hour_are_both_required():
    # Right day + wrong hour, and right hour + wrong day, must BOTH be closed.
    from datetime import datetime
    import agent_pipeline as ap
    assert not ap._front_desk_is_open(datetime(2026, 8, 17, ap.FRONT_DESK_CLOSE_HOUR))  # Mon, too late
    assert not ap._front_desk_is_open(datetime(2026, 8, 22, ap.FRONT_DESK_OPEN_HOUR))   # Sat, good hour


def test_closed_message_names_the_open_days():
    import agent_pipeline as ap
    assert "Monday to Friday" in ap._closed_message("en")
    assert "poniedziałku do piątku" in ap._closed_message("pl")


def test_spoken_days_is_derived_not_hardcoded(monkeypatch):
    # The sentence must stay truthful if FRONT_DESK_DAYS is changed via env,
    # otherwise the agent confidently announces the wrong days.
    import agent_pipeline as ap
    monkeypatch.setattr(ap, "FRONT_DESK_DAYS", frozenset({0, 1, 2, 3, 4, 5}))
    assert _days_en(ap) == "Monday to Saturday"
    monkeypatch.setattr(ap, "FRONT_DESK_DAYS", frozenset({0, 4}))
    assert _days_en(ap) == "Monday, Friday"


def _days_en(ap):
    return ap._spoken_days("en")


# ── "already said this" injection (fixes the double-up) ──────────────────────

def _notes(ap, agent):
    return [i for i in agent.chat_ctx.items
            if str(getattr(i, "id", "")).startswith(ap.PipelineMoloAgent._SPOKEN_NOTE_ID)]


def test_spoken_filler_is_announced_to_the_model():
    # The filler plays with add_to_chat_ctx=False, so without this note the model
    # cannot know it was said and narrates the same action again — the observed
    # send_booking_link double-up.
    import agent_pipeline as ap
    agent = ap.PipelineMoloAgent(instructions="x", default_kb_content="")
    asyncio.run(agent._note_already_spoken("I'll send that booking link over to you now."))
    notes = _notes(ap, agent)
    assert len(notes) == 1
    assert "booking link" in str(notes[0].content)


def test_the_note_is_a_system_message_not_an_assistant_turn():
    # THE POINT OF THE DESIGN: injecting it as assistant text is what
    # add_to_chat_ctx=True does, and that made the model continue straight on from
    # the filler ("Let me check that for you.Hmm, I'm sorry…"). A system note reads
    # as an instruction, not as a sentence to finish.
    import agent_pipeline as ap
    agent = ap.PipelineMoloAgent(instructions="x", default_kb_content="")
    asyncio.run(agent._note_already_spoken("anything"))
    assert _notes(ap, agent)[0].role == "system"


def test_notes_replace_rather_than_accumulate():
    # A 7-minute call can fire many fillers; stale "you already said…" lines would
    # pile up and start describing things said minutes ago.
    import agent_pipeline as ap
    agent = ap.PipelineMoloAgent(instructions="x", default_kb_content="")
    for phrase in ("first", "second", "third"):
        asyncio.run(agent._note_already_spoken(phrase))
    notes = _notes(ap, agent)
    assert len(notes) == 1
    assert "third" in str(notes[0].content)
    assert "first" not in str(notes[0].content)


def test_silent_tool_injects_no_note():
    # search_kb speaks nothing, so there is nothing to tell the model about.
    import agent_pipeline as ap
    agent = ap.PipelineMoloAgent(instructions="x", default_kb_content="")
    ctx = _FakeCtx()
    asyncio.run(agent._before_tool(ctx, "search_kb"))
    assert ctx.session.said is None
    assert _notes(ap, agent) == []


def test_note_failure_never_breaks_the_call(monkeypatch):
    # This runs mid-call on the hot path. If context injection ever fails, the
    # caller must still get their tool — a duplicated sentence beats a dropped call.
    import agent_pipeline as ap
    agent = ap.PipelineMoloAgent(instructions="x", default_kb_content="")

    def _boom(self):
        raise RuntimeError("no chat ctx")
    monkeypatch.setattr(type(agent), "chat_ctx", property(_boom))

    ctx = _FakeCtx()
    asyncio.run(agent._before_tool(ctx, "identify_guest"))   # must not raise
    assert ctx.session.said is not None                      # filler still spoken


def test_prompt_carries_the_new_client_sections():
    import pipeline_prompt as pp
    p = pp.PIPELINE_INSTRUCTIONS
    assert "You speak only english and polish fluently." in p
    assert "Early Checkin / Late Checkout" in p
    assert "thirty minutes" in p
    assert "## Transfer Call" in p
    # The prompt's stated transfer hours must match the code gate, or the agent
    # promises availability the gate then refuses.
    assert "mon - friday from 8 in the morning to 5 in the afternoon" in p
