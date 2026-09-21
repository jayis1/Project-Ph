# Local AI Phone

Voice interface for Local AI (Ollama) via SIP/FreePBX. Call your AI, and your AI can call you.

## Project Overview

AI Phone gives your local AI installation a phone number through FreePBX integration:

- **Inbound**: Call an extension and talk to your AI - run commands, check status, ask questions
- **Outbound**: Your server can call YOU with alerts, then have a conversation about what to do

## Tech Stack

| Component | Technology |
|-----------|------------|
| Language | Node.js (ES modules for CLI, CommonJS for voice-app) |
| SIP Server | drachtio-srf |
| Media Server | FreeSWITCH (via drachtio-fsmrf) |
| STT | Whisper.cpp (faster-whisper) |
| TTS | Kokoro TTS via FastAPI — runs on CPU or GPU (CUDA) |
| AI Backend | Ollama |
| PBX | FreePBX (any SIP-compatible works) |
| Container | Docker Compose |

## Distributed Enterprise Architecture (3-Node Topology)

To completely eliminate hardware bottlenecks, the system is designed to flawlessly distribute intensive VoIP components and massive AI models across dedicated hardware.

![AI Phone Architecture](docs/images/ai-phone-architecture.png)

```text
┌──────────────────────────────────────────────────────────────┐
│                     Enterprise LAN                           │
│                                                              │
│  ┌──────────────────────────────────────────────────┐        │
│  │ Server 1: The PBX Core (Modern AVX CPU Required) │        │
│  │ Handles raw SIP routing and media bridging.      │        │
│  │ - FreePBX (SIP Gatekeeper)                       │        │
│  │ - Drachtio (SIP Signalling)                      │        │
│  │ - FreeSWITCH (Real-Time Audio Engine)            │        │
│  │ - VoiceApp (Mission Control & Call Logic)        │        │
│  │ Note: VoiceApp & FreeSWITCH must share a unified │        │
│  │ local disk-mount to bypass HTTP media latency.   │        │
│  └───────────────────────┬──────────────────────────┘        │
│                          │ HTTP APIs over local network      │
│            ┌─────────────┴─────────────┐                     │
│            ↓                           ↓                     │
│  ┌────────────────────┐   ┌───────────────────────────┐      │
│  │ Server 2: Brains   │   │ Server 3: Ears & Voice    │      │
│  │ (Nvidia GPU #1)    │   │ (Nvidia GPU #2)           │      │
│  │ - Ollama (LLMs)    │   │ - Whisper STT (CUDA)      │      │
│  │                    │   │ - Kokoro TTS (CUDA)       │      │
│  └────────────────────┘   └───────────────────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
ai-phone/
├── GEMINI.md                 # This file
├── CONSTITUTION.md           # DevFlow 2.0 development principles
├── README.md                 # User-facing documentation
├── install.sh                # One-command installer
├── package.json              # Root package (hooks, linting, tests)
├── eslint.config.js          # ESLint configuration
├── docker-compose.yml        # Multi-container orchestration
├── .env.example              # Environment template
│
├── .gemini/commands/         # DevFlow slash commands
│   ├── feature.md            # /feature spec|start|ship
│   ├── test.md               # /test
│   ├── fix.md                # /fix [N]
│   ├── issues.md             # /issues
│   ├── investigate.md        # /investigate
│   ├── project.md            # /project
│   ├── batch.md              # /batch
│   └── design.md             # /design
│
├── cli/                      # Unified CLI tool
│   ├── package.json
│   ├── README.md
│   ├── bin/
│   │   ├── ai-phone.js   # CLI entry point
│   │   └── cli-main.js       # Command definitions
│   ├── lib/
│   │   ├── commands/         # Command implementations
│   │   │   ├── setup.js      # Interactive setup wizard
│   │   │   ├── start.js      # Start services
│   │   │   ├── stop.js       # Stop services
│   │   │   ├── status.js     # Service status
│   │   │   ├── doctor.js     # Health checks
│   │   │   ├── api-server.js # Start API server standalone
│   │   │   ├── logs.js       # Tail service logs
│   │   │   ├── backup.js     # Create backups
│   │   │   ├── restore.js    # Restore backups
│   │   │   ├── update.js     # Self-update
│   │   │   ├── uninstall.js  # Clean removal
│   │   │   ├── config/       # Config subcommands
│   │   │   │   ├── show.js
│   │   │   │   ├── path.js
│   │   │   │   └── reset.js
│   │   │   └── device/       # Device subcommands
│   │   │       ├── add.js
│   │   │       ├── list.js
│   │   │       └── remove.js
│   │   ├── config.js         # Config read/write
│   │   ├── docker.js         # Docker compose wrapper
│   │   ├── network.js        # Network utilities
│   │   ├── platform.js       # Platform detection
│   │   ├── port-check.js     # Port availability checks
│   │   ├── prereqs.js        # Prerequisite checks
│   │   ├── prerequisites.js  # Pi-specific prereqs
│   │   ├── process-manager.js# PID-based process management
│   │   ├── utils.js          # Shared utilities
│   │   └── validators.js     # API key validation
│   └── test/                 # Test suite
│
├── voice-app/                # Docker container for voice handling
│   ├── Dockerfile
│   ├── package.json
│   ├── index.js              # Main entry point
│   ├── config/
│   │   └── devices.json      # Device configurations
│   ├── lib/
│   │   ├── audio-fork.js     # WebSocket audio streaming
│   │   ├── ai-bridge.js      # HTTP client for Ollama API
│   │   ├── connection-retry.js # Connection retry logic
│   │   ├── conversation-loop.js  # Core conversation flow
│   │   ├── device-registry.js    # Multi-device management
│   │   ├── http-server.js    # Express server for audio/API
│   │   ├── logger.js         # Logging utility
│   │   ├── multi-registrar.js    # Multi-extension SIP registration
│   │   ├── outbound-handler.js   # Outbound call logic
│   │   ├── outbound-routes.js    # Outbound API endpoints
│   │   ├── outbound-session.js   # Outbound call sessions
│   │   ├── query-routes.js   # Query API endpoints
│   │   ├── registrar.js      # Single SIP registration
│   │   ├── sip-handler.js    # Inbound call handling
│   │   ├── tts-service.js    # ElevenLabs TTS
│   │   └── whisper-client.js # OpenAI Whisper STT
│   ├── DEPLOYMENT.md         # Production deployment guide
│   ├── README-OUTBOUND.md    # Outbound calling API docs
│   └── API-QUERY-CONTRACT.md # Query API specification
│

├── docs/
│   └── TROUBLESHOOTING.md    # Troubleshooting guide
│
└── src/features/             # DevFlow feature specs (planning docs)
    └── */SPEC.md, PLAN.md, TASKS.md
```

## CLI Commands

```bash
# One-line install
curl -sSL https://raw.githubusercontent.com/jayis1/claude-phone-but-for-Gemini-and-freepbx/2.1.6/install.sh | bash

# Setup and run
ai-phone setup    # Interactive configuration
ai-phone start    # Launch services
ai-phone stop     # Stop services
ai-phone status   # Check status
ai-phone doctor   # Health checks
```

## Development

### Running Tests

```bash
npm test              # All tests
npm run test:cli      # CLI tests only
npm run test:voice-app # Voice app tests only
```

### Linting

```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
```

### DevFlow Commands

| Command | Purpose |
|---------|---------|
| `/feature spec [name]` | Create feature spec |
| `/feature start [name]` | Build with TDD |
| `/feature ship` | Review and merge |
| `/test` | Run tests |
| `/fix [N]` | Fix GitHub issue #N |
| `/investigate [problem]` | Debug without changing code |

## API Endpoints

### Voice App (port 3000)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/outbound-call` | Initiate outbound call |
| GET | `/api/call/:callId` | Get call status |
| GET | `/api/calls` | List active calls |
| POST | `/api/query` | Query device programmatically |
| GET | `/api/devices` | List configured devices |



## Key Design Decisions

1. **CommonJS for voice-app** - Compatibility with drachtio ecosystem
2. **ES Modules for CLI** - Modern Node.js tooling
3. **Host networking mode** - Required for FreeSWITCH RTP natively communicating with FreePBX
4. **Direct Disk Audio Handoff** - VoiceApp saves TTS files identically to the FreeSWITCH LXC disk volume to systematically sidestep unreliable HTTP network streaming/latency.
5. **Session-per-call** - Each call gets a unique conversation session context
6. **Distributed AI Topology** - Microservices elegantly split workloads between CPUs strictly possessing **AVX Instructions** (for FreeSWITCH RTP audio calculations) and Nvidia GPUs (for STT/TTS and Ollama matrices).
7. **Privileged LXC Hypervisors** - The Core Media server fundamentally strictly requires Proxmox to run in a *Privileged* LXC format so FreeSWITCH's internal SQLite database gracefully bypasses container sandboxing permission crashes.

## Environment Variables

See `.env.example` for all variables. Key ones:

| Variable | Purpose |
|----------|---------|
| `EXTERNAL_IP` | Server LAN IP for RTP routing |
| `OLLAMA_API_URL` | URL to Ollama instance |
| `LOCAL_TTS_URL` | TTS API proxy |
| `LOCAL_STT_URL` | Whisper STT API proxy |
| `SIP_DOMAIN` | FreePBX server FQDN |
| `SIP_REGISTRAR` | SIP registrar address |

## FreePBX Configuration (Critical)

1. **RTP Timeout (Prevents 32-Second Call Drops)**: FreePBX defaults `rtp_timeout=30`, killing AI calls during processing. Disable it:
   ```bash
   echo -e "rtp_timeout=0\nrtp_timeout_hold=0" >> /etc/asterisk/pjsip.endpoint_custom.conf
   asterisk -rx "module reload res_pjsip.so"
   ```

2. **Direct Media**: For the AI extension (e.g. 9001), set `Direct Media = No` to ensure FreePBX bridges audio properly.

3. **SIP Trunk Settings**: For outbound PSTN calls, your SIP trunk needs `from_user` and `from_domain` set in **pjsip Settings → Advanced**.

## Documentation

- [README.md](README.md) - User quickstart
- [cli/README.md](cli/README.md) - CLI reference
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Common issues
- [voice-app/DEPLOYMENT.md](voice-app/DEPLOYMENT.md) - Production deployment
- [voice-app/README-OUTBOUND.md](voice-app/README-OUTBOUND.md) - Outbound API
- [CONSTITUTION.md](CONSTITUTION.md) - DevFlow principles
