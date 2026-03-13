# AI Phone

Voice interface via SIP — call your local AI, and your AI can call you. **100% private. No cloud APIs required.**

## What is this?

AI Phone gives your local AI a phone number through FreePBX:

- **Inbound**: Call an extension and talk to your local AI
- **Outbound**: Your server calls YOU with alerts, then has a conversation

## How it works

```
Phone Call → FreePBX → voice-app (Docker)
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
           Ollama LLM   Local STT   Local TTS
           (any model) (Whisper.cpp) (Coqui/Piper)
```

## Prerequisites

| Component | Software |
|-----------|----------|
| PBX | [FreePBX](https://www.freepbx.org/) or any SIP provider |
| LLM | [Ollama](https://ollama.com/) with any chat model (e.g. `llama3`) |
| STT | Local Whisper server (e.g. [whisper.cpp](https://github.com/ggerganov/whisper.cpp) server mode) |
| TTS | Local TTS server (e.g. [Coqui TTS](https://github.com/coqui-ai/TTS), [Piper](https://github.com/rhasspy/piper), or any OpenAI-compatible `/audio/speech` endpoint) |
| Runtime | Docker + Node.js 18+ |

> **No API keys needed.** No data ever leaves your machine.

## Quick Start

```bash
# 1. Install
curl -sSL https://raw.githubusercontent.com/jayis1/Project-Ph/main/install.sh | bash

# 2. Configure
ai-phone setup   # Enter SIP credentials + local AI endpoints

# 3. Run
ai-phone start
```

## Setup Wizard prompts

| Prompt | Example |
|--------|---------|
| SIP Domain | `172.16.1.33` |
| Extension | `9001` |
| SIP Password | `mysecret` |
| External IP | `192.168.1.100` |
| Ollama API URL | `http://host.docker.internal:11434` |
| Ollama Model | `llama3` |
| Local Whisper URL | `http://host.docker.internal:8080/v1` |
| Local TTS URL | `http://host.docker.internal:5002/api/tts` |
| Bot Name | `Trinity` |
| System Prompt | `You are Trinity...` |

## CLI Commands

```bash
ai-phone setup    # Interactive configuration
ai-phone start    # Launch Docker containers
ai-phone stop     # Stop services
ai-phone status   # Check status
ai-phone doctor   # Health checks
ai-phone logs     # Tail logs
```

## Local AI Setup Tips

### Ollama
```bash
ollama pull llama3
ollama serve   # Already runs on :11434 by default
```

### Whisper.cpp (STT)
```bash
./server -m models/ggml-base.bin --port 8080
```
The voice app will POST audio to `/audio/transcriptions` (OpenAI-compatible format).

### Coqui TTS
```bash
tts-server --model_name tts_models/en/ljspeech/vits --port 5002
```
The voice app will POST `{"text": "..."}` to the URL you configured.

Or use any OpenAI-compatible TTS endpoint by setting the URL to end with `/audio/speech`.

## Documentation

- [cli/README.md](cli/README.md) - CLI reference
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Common issues
- [voice-app/DEPLOYMENT.md](voice-app/DEPLOYMENT.md) - Production deployment
- [voice-app/README-OUTBOUND.md](voice-app/README-OUTBOUND.md) - Outbound call API
