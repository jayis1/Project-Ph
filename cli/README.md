# AI Phone CLI

Command-line interface for AI Phone. Single-command setup and management.

## Installation

### One-Line Install

```bash
curl -sSL https://raw.githubusercontent.com/jayis1/Project-Ph/main/install.sh | bash
```

### Manual Install

```bash
git clone https://github.com/jayis1/Project-Ph.git
cd Project-Ph/cli
npm install
npm link
```

## Setup Wizard

```bash
ai-phone setup
```

The wizard guides you through configuration:

**What it asks for:**

1. FreePBX SIP domain and registrar
2. Local AI Ollama API URL
3. Local Whisper STT API URL
4. Local TTS API URL
5. Device configuration (name, extension, auth, voice, prompt)
6. Infrastructure Deployment (select exactly which containers run on this host)
7. Server LAN IP (for RTP audio routing)

**What `ai-phone start` does:**

- Generates an isolated `docker-compose.yml` tailored to the selected components.
- Starts Docker containers (drachtio, freeswitch, voice-app, whisper-stt, kokoro-tts).
- Connects them to your local Ollama server over the network.

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
ai-phone start              # Start all configured Docker services
ai-phone start <services>   # Start explicitly named services (e.g. drachtio)
ai-phone stop               # Stop all services
ai-phone stop <services>    # Stop specific services
ai-phone status             # Show overview of SIP and container state
ai-phone doctor             # Health check for dependencies and services
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
└── backups/              # Configuration backups
```

### Config Structure

```json
{
  "version": "1.0.0",
  "api": {
    "ollama": { "apiUrl": "http://127.0.0.1:11434" },
    "localSttUrl": "http://127.0.0.1:8080",
    "localTtsUrl": "http://127.0.0.1:5002"
  },
  "sip": {
    "domain": "pbx.example.com",
    "registrar": "192.168.1.100",
    "transport": "udp"
  },
  "server": {
    "httpPort": 3000, 
    "externalIp": "192.168.1.50"
  },
  "devices": [{
    "name": "Morpheus",
    "extension": "9000",
    "authId": "9000",
    "password": "***",
    "voiceId": "1",
    "prompt": "You are Morpheus..."
  }]
}
```

## Requirements

- **Node.js 18+** - Required for CLI
- **Docker** - Required for Voice App

## Development

```bash
# Run tests
npm test

# Lint
npm run lint
```

## License

MIT
