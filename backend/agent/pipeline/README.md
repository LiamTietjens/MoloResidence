# Pipeline agent (deploy files)

Deploy artifacts for the STT->LLM->TTS pipeline agent. The agent's Python lives
in `../src/` (`agent_pipeline.py`, `pipeline_prompt.py`, `thinking_filter.py`) —
it imports `agent.py` (MoloAgent, INSTRUCTIONS) and must stay there, single-sourced.

- `Dockerfile`  — launches `src/agent_pipeline.py` (build context = repo root).
- `livekit.toml`— standalone config for when a 3rd LiveKit agent slot is available.

## Current deployment
The LiveKit plan caps at 2 agents (both slots full), so the pipeline is deployed
onto the existing agent slot `CA_9A3cUKL9gVwz` (see repo-root `livekit.toml`),
replacing the speech-to-speech image. Roll back with `lk agent rollback`.

Deploy/refresh the swap from the repo root:
    cp pipeline/Dockerfile Dockerfile && lk agent deploy && git checkout Dockerfile
