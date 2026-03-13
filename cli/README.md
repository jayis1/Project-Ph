# AI Phone CLI

Command-line interface for AI Phone. Single-command setup and management.

## Installation

### One-Line Install

```bash
curl -sSL https://raw.githubusercontent.com/theNetworkChuck/ai-phone/main/install.sh | bash
```

### Manual Install

```bash
git clone https://github.com/theNetworkChuck/ai-phone.git
cd ai-phone/cli
npm install
npm link
```

## Setup Wizard

```bash
ai-phone setup
```

The wizard guides you through configuration based on your deployment type:

### Voice Server

Select this when setting up a Raspberry Pi or dedicated voice box that connects to a remote API server.

**What it asks for:**

1. FreePBX SIP domain and registrar
2. API server IP and port (where gemini-api-server runs)
3. ElevenLabs API key and default voice ID
4. OpenAI API key (for Whisper STT)
5. Device configuration (name, extension, auth, voice, prompt)
6. Server LAN IP (for RTP audio routing)

**What `ai-phone start` does:**

- Starts Docker containers (drachtio, freeswitch, voice-app)
- Connects to the remote API server you specified

### API Server

Select this when setting up the Gemini API wrapper on a machine with Gemini Code CLI.

**What it asks for:**

- API server port (default: 3333)

**What `ai-phone start` does:**

- Starts gemini-api-server on the configured port

**Note:** You can also just run `ai-phone api-server` without setup - it defaults to port 3333.

### Both (All-in-One)

Select this for a single machine running everything.

**What it asks for:**

1. ElevenLabs API key and default voice ID
2. OpenAI API key
3. FreePBX SIP domain and registrar
4. Device configuration
5. Server LAN IP, API port, and HTTP port

**What `ai-phone start` does:**

- Starts Docker containers (drachtio, freeswitch, voice-app)
- Starts gemini-api-server

### Pi Auto-Detection

On Raspberry Pi, the setup wizard:

- Recommends "Voice Server" mode if you select "Both"
- Checks for an existing SBC on port 5060 and auto-configures drachtio to use 5070 to avoid conflicts
- Uses optimized settings for Pi hardware

## Commands

### Setup & Configuration

```bash
ai-phone setup              # Interactive configuration wizard
ai-phone setup --skip-prereqs   # Skip prerequisite checks
ai-phone config show        # Display config (secrets redacted)
ai-phone config path        # Show config file location (~/.ai-phone/config.json)
ai-phone config reset       # Reset config (creates backup first)
```

### Service Management

```bash
ai-phone start              # Start services based on installation type
ai-phone stop               # Stop all services
ai-phone status             # Show service status
ai-phone doctor             # Health check for dependencies and services
ai-phone api-server         # Start API server standalone (default port 3333)
ai-phone api-server -p 4000 # Start on custom port
```



### Logs

```bash
ai-phone logs               # Tail all service logs
ai-phone logs voice-app     # Voice app only
ai-phone logs drachtio      # SIP server only
ai-phone logs freeswitch    # Media server only
```

### Backup & Recovery

```bash
ai-phone backup             # Create timestamped backup
ai-phone restore            # Restore from backup (interactive)
```

### Maintenance

```bash
ai-phone update             # Update AI Phone to latest
ai-phone uninstall          # Complete removal
```

## Configuration Files

All configuration is stored in `~/.ai-phone/`:

```
~/.ai-phone/
├── config.json           # Main configuration (chmod 600)
├── docker-compose.yml    # Generated Docker config
├── .env                  # Generated environment file
├── server.pid            # API server process ID
└── backups/              # Configuration backups
```

### Config Structure

```json
{
  "version": "1.0.0",
  "installationType": "both",
  "api": {
    "elevenlabs": { "apiKey": "...", "defaultVoiceId": "...", "validated": true },
    "openai": { "apiKey": "...", "validated": true }
  },
  "sip": {
    "domain": "pbx.example.com",
    "registrar": "192.168.1.100",
    "transport": "udp"
  },
  "server": {
    "geminiApiPort": 3333,
    "httpPort": 3000, 
    "externalIp": "192.168.1.50"
  },
  "devices": [{
    "name": "Morpheus",
    "extension": "9000",
    "authId": "9000",
    "password": "***",
    "voiceId": "elevenlabs-voice-id",
    "prompt": "You are Morpheus..."
  }],
  "deployment": {
    "mode": "both"
  }
}
```

## Split Deployment Example

### On Raspberry Pi (Voice Server)

```bash
# Install
curl -sSL https://raw.githubusercontent.com/theNetworkChuck/ai-phone/main/install.sh | bash

# Setup - select "Voice Server"
# Enter your Mac's IP when prompted for API server
ai-phone setup

# Start voice services
ai-phone start
```

### On Mac (API Server)

```bash
# Install (if not already)
curl -sSL https://raw.githubusercontent.com/theNetworkChuck/ai-phone/main/install.sh | bash

# Start API server (no setup needed)
ai-phone api-server

# Or on a custom port
ai-phone api-server --port 4000
```

## Requirements

- **Node.js 18+** - Required for CLI
- **Docker** - Required for Voice Server or Both modes
- **Gemini Code CLI** - Required for API Server or Both modes

## Development

```bash
# Run tests
npm test

# Lint
npm run lint
```

## License

MIT
