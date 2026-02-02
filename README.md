# Gemini Phone

Voice interface for Gemini CLI via SIP - Call your AI, and your AI can call you.

## What is this?

Gemini Phone gives your Gemini CLI installation a phone number. You can:

- **Inbound**: Call an extension and talk to Gemini - run commands, check status, ask questions  
- **Outbound**: Your server can call YOU with alerts, then have a conversation about what to do

## Prerequisites

- [FreePBX](https://www.freepbx.org/) or any SIP provider  
- [ElevenLabs](https://elevenlabs.io/) - Text-to-speech  
- [OpenAI](https://platform.openai.com/) - Whisper speech-to-text  
- [Gemini CLI](https://github.com/google-gemini/gemini-cli) - AI backend

## Quick Start

### 1. Install

```bash
curl -sSL https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/install.sh | bash
```

The installer will:

- Check for Node.js 18+, Docker, and git (offers to install if missing)
- Clone the repository to `~/.gemini-phone-cli`
- Install dependencies
- Create the `gemini-phone` command

### 2. Setup

```bash
gemini-phone setup
```

The setup wizard asks what you're installing:

- **Both** (recommended) - Voice app + API server on same machine
- **Voice Server Only** - For Pi/dedicated voice server
- **API Server Only** - For machine running Gemini CLI

### 3. Start

```bash
gemini-phone start
```

## Deployment Modes

### All-in-One (Single Machine)

**Best for:** Mac or Linux server that's always on and has Gemini CLI installed.

```
┌─────────────────────────────────────────────────────────────┐
│  Your Phone                                                  │
│      │                                                       │
│      ↓ Call extension 9000                                  │
│  ┌─────────────┐                                            │
│  │   FreePBX   │  ← Your PBX                                │
│  └──────┬──────┘                                            │
│         │                                                    │
│         ↓                                                    │
│  ┌─────────────────────────────────────────────┐           │
│  │          Single Server (Mac/Linux)           │           │
│  │  ┌───────────┐    ┌───────────────────┐    │           │
│  │  │ voice-app │ ←→ │ gemini-api-server │    │           │
│  │  │ (Docker)  │    │  (Gemini CLI)     │    │           │
│  │  └───────────┘    └───────────────────┘    │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

**Setup:**

```bash
gemini-phone setup  # Select "Both"
gemini-phone start  # Launches Docker + API server
```

### Split Mode (Pi + API Server)

**Best for:** Dedicated Pi for voice services, Gemini running on your main machine.

```
┌─────────────────────────────────────────────────────────────┐
│  Your Phone                                                  │
│      │                                                       │
│      ↓ Call extension 9000                                  │
│  ┌─────────────┐                                            │
│  │   FreePBX   │  ← Your PBX                                │
│  └──────┬──────┘                                            │
│         │                                                    │
│         ↓                                                    │
│  ┌─────────────┐      ┌─────────────────────┐             │
│  │ Raspberry Pi│ ←──→ │ Mac/Linux with      │             │
│  │ (voice-app) │ HTTP │ Gemini CLI          │             │
│  └─────────────┘      │ (gemini-api-server) │             │
│                        └─────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

**On your Pi (Voice Server):**

```bash
gemini-phone setup  # Select "Voice Server", enter API server IP
gemini-phone start  # Launches Docker containers
```

**On your Mac/Linux (API Server):**

```bash
gemini-phone api-server  # Starts Gemini API wrapper on port 3333
```

## CLI Commands

```bash
gemini-phone setup        # Interactive configuration wizard
gemini-phone start        # Start all services
gemini-phone stop         # Stop all services
gemini-phone status       # Check service status
gemini-phone doctor       # Run health checks
gemini-phone api-server   # Start API server only (standalone)
gemini-phone config show  # Show current config
```

## API Endpoints

### Voice App (port 3000)

- `POST /api/outbound-call` - Initiate outbound call
- `GET /api/call/:callId` - Get call status
- `GET /api/calls` - List active calls
- `POST /api/query` - Query Gemini programmatically
- `GET /api/devices` - List configured extensions

### Gemini API Server (port 3333)

- `POST /ask` - Send prompt to Gemini
- `POST /ask-structured` - Send prompt, return JSON
- `POST /end-session` - Clean up session
- `GET /health` - Health check

## Troubleshooting

### Quick Diagnostics

```bash
gemini-phone doctor  # Runs all checks
gemini-phone status  # Service status
```

### Common Issues

**Voice app won't start:**

- Check Docker is running: `docker ps`
- Check ports 3000, 3001 available
- View logs: `docker logs voice-app`

**Bot won't register:**

- Check SIP credentials in config
- Verify PBX IP/hostname reachable
- Check firewall allows UDP 5060

**No audio in calls:**

- Verify EXTERNAL_IP set correctly
- Check RTP ports (30000-30100) open
- Confirm ElevenLabs/OpenAI keys valid

## Configuration

Config stored in: `~/.config/gemini-phone/config.json`

View with: `gemini-phone config show`

## Development

```bash
git clone https://github.com/jayis1/2fast2dumb2fun.git
cd 2fast2dumb2fun
npm install
npm run dev
```

## Documentation

- [CLI README](cli/README.md) - Command reference
- [Voice App Deployment](voice-app/DEPLOYMENT.md) - Production guide
- [Outbound Calling API](voice-app/README-OUTBOUND.md) - API docs

## License

MIT

## About

Gemini Phone is inspired by [NetworkChuck's claude-phone](https://github.com/theNetworkChuck/claude-phone).

Talk to your AI. Have your AI call you. It's that simple.
