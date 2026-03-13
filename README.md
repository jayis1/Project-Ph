# AI Phone

Voice interface via SIP — call your local AI, and your AI can call you. **100% private. No cloud APIs required.**

## What is this?

AI Phone gives your local AI a phone number through FreePBX:

- **Inbound**: Call an extension and talk to your local AI
- **Outbound**: Your server calls YOU with alerts, then has a conversation
- **Mission Control**: Web dashboard at `localhost:3030` to monitor status and initiate calls

## How it works

```
Phone Call → FreePBX → voice-app (Docker)
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
           Ollama LLM   Local STT   Local TTS
        (deepseek-r1)  (Whisper)  (OpenedAI Speech)
```

## Prerequisites

| Component | Software |
|-----------|----------|
| PBX | [FreePBX](https://www.freepbx.org/) or any SIP provider |
| LLM | [Ollama](https://ollama.com/) with a chat model (default: `deepseek-r1:8b`) |
| STT | Local Whisper server (e.g. [faster-whisper](https://github.com/SYSTRAN/faster-whisper) or [whisper.cpp](https://github.com/ggerganov/whisper.cpp)) |
| TTS | Local TTS server (e.g. [OpenedAI Speech](https://github.com/matatonic/openedai-speech) or any OpenAI-compatible `/v1/audio/speech` endpoint) |
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

# 4. Open Mission Control
# Navigate to http://<your-server-ip>:3030
```

## Setup Wizard prompts

| Prompt | Example |
|--------|---------|
| SIP Domain | `172.16.1.33` |
| Extension | `9001` |
| SIP Password | `mysecret` |
| External IP | `192.168.1.100` |
| Ollama API URL | `http://host.docker.internal:11434` |
| Ollama Model | `deepseek-r1:8b` |
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

## Mission Control

A web dashboard is served at **port 3030** when the voice-app is running. It provides:

- **System Status** — live view of Drachtio (SIP) and FreeSWITCH (media) connectivity
- **Device List** — all registered extensions and their voice configs
- **Outbound Calls** — initiate outbound calls directly from the browser

## Local AI Setup Tips

### Ollama
```bash
ollama pull deepseek-r1:8b
ollama serve   # Already runs on :11434 by default
```

### Whisper (STT)
```bash
# faster-whisper server
docker run -p 8080:8000 fedirz/faster-whisper-server
```
The voice app will POST audio to `/v1/audio/transcriptions` (OpenAI-compatible format).

### OpenedAI Speech (TTS)
```bash
docker run -p 8000:8000 ghcr.io/matatonic/openedai-speech
```
The voice app will POST to the configured `LOCAL_TTS_URL` using the OpenAI `/v1/audio/speech` format.

## Environment Variables

See [`.env.example`](.env.example) for all configurable variables. Key ones:

| Variable | Purpose |
|----------|---------|
| `EXTERNAL_IP` | Server LAN IP for RTP routing |
| `OLLAMA_API_URL` | URL to Ollama instance |
| `OLLAMA_MODEL` | Chat model to use (default: `deepseek-r1:8b`) |
| `LOCAL_TTS_URL` | TTS API endpoint |
| `LOCAL_STT_URL` | Whisper STT API endpoint |
| `SIP_DOMAIN` | FreePBX server FQDN or IP |
| `SIP_REGISTRAR` | SIP registrar address |

## Documentation

- [cli/README.md](cli/README.md) - CLI reference
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Common issues
- [voice-app/DEPLOYMENT.md](voice-app/DEPLOYMENT.md) - Production deployment
- [voice-app/README-OUTBOUND.md](voice-app/README-OUTBOUND.md) - Outbound call API
