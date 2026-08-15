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

    candidates = ap._build_tts()
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
    assert ap._build_tts() == "adapter"
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

    floor = ap._build_tts()[-1]
    assert floor["model"] == "cartesia/sonic-3.5"
    assert floor["extra_kwargs"]["speed"] == 1.1
    assert floor["extra_kwargs"]["emotion"] == "content"


def test_welcome_message_is_spoken_verbatim_and_carries_the_disclosures():
    # The opening is a compliance line, not flavour text: it must state that Mili is
    # an AI, that the call is transcribed, and how to get data deleted. It is spoken
    # with session.say (not generate_reply) precisely so the model cannot reword it.
    import agent_pipeline as ap
    w = ap.WELCOME_MESSAGE
    assert "Molo Residence" in w
    assert "Mili" in w
    assert "AI agent" in w                    # AI disclosure
    assert "transcribed" in w                 # recording/transcription notice
    assert "hang up at any point" in w        # right to end the call
    assert "info@moloresidence.pl" in w       # data-deletion contact
    # Guard the mis-transcribed spellings from the original dictation.
    assert "Mola" not in w and "morlo" not in w.lower()


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
    assert text in ap.PipelineMoloAgent._TOOL_FILLERS["suggest_available_rooms"]
    assert allow is False   # non-interruptible: a fast tool return can't cut it off


def test_every_tool_has_several_filler_variants():
    # A single fixed phrase per tool made guests hear the IDENTICAL sentence on
    # every call — the clearest "robot" tell in the whole conversation.
    import agent_pipeline as ap
    for key, variants in ap.PipelineMoloAgent._TOOL_FILLERS.items():
        assert isinstance(variants, tuple), f"{key} must hold a tuple of variants"
        assert len(variants) >= 3, f"{key} has too few variants to sound varied"
        assert len(set(variants)) == len(variants), f"{key} has duplicate variants"


def test_repeated_calls_to_same_tool_vary_the_phrasing():
    # The behaviour that actually fixes the robot tell: calling the same tool
    # repeatedly must not produce the same sentence every time.
    import time as _t
    import agent_pipeline as ap
    agent = ap.PipelineMoloAgent(instructions="x", default_kb_content="")
    ctx = _FakeCtx()
    heard = set()
    for _ in range(40):
        agent._last_filler_at = _t.monotonic() - (ap.PipelineMoloAgent._FILLER_COOLDOWN_S + 1)
        asyncio.run(agent._before_tool(ctx, "search_kb"))
        heard.add(ctx.session.said[0])
    assert len(heard) > 1, f"filler never varied across 40 calls: {heard}"


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
    asyncio.run(agent._before_tool(ctx, "search_kb"))   # chained immediately
    assert ctx.session.said is None                     # suppressed (no stacking)


def test_filler_fillers_have_no_shared_leading_word():
    # No two fillers — across ALL tools and ALL variants — open with the same word,
    # so whichever pair happens to land back-to-back can never sound like "sure … sure".
    import agent_pipeline as ap
    firsts = [v.split()[0].lower()
              for variants in ap.PipelineMoloAgent._TOOL_FILLERS.values()
              for v in variants]
    dupes = {w for w in firsts if firsts.count(w) > 1}
    assert not dupes, f"fillers share a leading word: {sorted(dupes)}"


def test_fillers_avoid_the_acknowledgement_words_the_model_uses():
    # The model tends to open its own reply with "Sure thing!"; a filler opening the
    # same way stacks into "Sure … sure" and reads as robotic.
    import agent_pipeline as ap
    banned = {"sure", "okay", "ok", "great", "perfect"}
    for key, variants in ap.PipelineMoloAgent._TOOL_FILLERS.items():
        for v in variants:
            assert v.split()[0].lower().strip(",") not in banned, f"{key}: {v!r}"


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
    asyncio.run(agent._before_tool(ctx, "search_kb"))
    assert ctx.session.said is not None
    ctx.session.said = None
    agent._last_filler_at = _t.monotonic() - (ap.PipelineMoloAgent._FILLER_COOLDOWN_S + 1)
    asyncio.run(agent._before_tool(ctx, "search_kb"))
    assert ctx.session.said is not None
