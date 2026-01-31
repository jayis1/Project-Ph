![Gemini Phone Classic](assets/logo.png) ![Gemini Phone 2.0](assets/gemini-logo-v2.png)

# Gemini Phone

Voice interface for Gemini Code via SIP/FreePBX. Call your AI, and your AI can call you.

## What is this?

Gemini Phone gives your Gemini Code installation a phone number. You can:

- **Inbound**: Call an extension and talk to Gemini - run commands, check status, ask questions
- **Outbound**: Your server can call YOU with alerts, then have a conversation about what to do

## Prerequisites

| Requirement            | Where to Get It                                      | Notes                        |
| ---------------------- | ---------------------------------------------------- | ---------------------------- |
| **FreePBX Account**    | [freepbx.org](https://www.freepbx.org/)              | Free tier works              |
| **ElevenLabs API Key** | [elevenlabs.io](https://elevenlabs.io/)              | For text-to-speech           |
| **OpenAI API Key**     | [platform.openai.com](https://platform.openai.com/)  | For Whisper speech-to-text   |
| **Gemini Code CLI**    | [geminicli.com](https://geminicli.com/)              | Requires Gemini subscription |

## Platform Support

| Platform    | Status                                   |
| ----------- | ---------------------------------------- |
| **macOS**   | Fully supported                          |
| **Linux**   | Fully supported (including Raspberry Pi) |
| **Windows** | Not supported (may work with WSL)        |

## Quick Start

### 1. Install

```bash
# Usage: curl -sSL https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/install.sh | bash
```

The installer will:

- Check for Node.js 18+, Docker, and git (offers to install if missing)
- Clone the repository to `~/.gemini-phone-cli`
- Install dependencies
- Create the `gemini-phone` command

### Architecture

![Gemini Phone Architecture](docs/images/gemini-phone-architecture.png)

### 2. Setup

```bash
gemini-phone setup
```

The setup wizard asks what you're installing:

| Type             | Use Case                    | What It Configures                               |
| ---------------- | --------------------------- | ------------------------------------------------ |
| **Voice Server** | Pi or dedicated voice box   | Docker containers, connects to remote API server |
| **API Server**   | Mac/Linux with Gemini Code  | Just the Gemini API wrapper                      |
| **Both**         | All-in-one single machine   | Everything on one box                            |

### 3. Start

```bash
gemini-phone start
```

## Deployment Modes

### All-in-One (Single Machine)

Best for: Mac or Linux server that's always on and has Gemini Code installed.

```text
┌─────────────────────────────────────────────────────────────┐
│  Your Phone                                                  │
│      │                                                       │
│      ↓ Call extension 9000                                  │
│  ┌─────────────┐                                            │
│  │   FreePBX   │  ← Cloud PBX                               │
│  └──────┬──────┘                                            │
│         │                                                    │
│         ↓                                                    │
│  ┌─────────────────────────────────────────────┐           │
│  │     Single Server (Mac/Linux)                │           │
│  │  ┌───────────┐    ┌───────────────────┐    │           │
│  │  │ voice-app │ ←→ │ gemini-api-server │    │           │
│  │  │ (Docker)  │    │ (Gemini Code CLI) │    │           │
│  │  └───────────┘    └───────────────────┘    │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

**Setup:**

```bash
gemini-phone setup    # Select "Both"
gemini-phone start    # Launches Docker + API server
```

### Distributed (Nebuchadnezzar Crew Architecture)

Best for: Multiple AI personalities on separate LXC containers or servers, each with unique identities.

The **Nebuchadnezzar** is a distributed AI crew system with 9 AI members accessible via IVR or direct dial:

```text
┌─────────────────────────────────────────────────────────────┐
│  FreePBX Server (172.16.1.143)                              │
│  - IVR 7000: Crew selection menu (DTMF 0-9)                 │
│  - Extensions: 9000-9008 (9 crew members)                   │
│  - Automated provisioning via MySQL                         │
└─────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────────────────┐
          │                                           │
┌─────────▼─────────┐                     ┌───────────▼──────────┐
│ Admin Node        │                     │ Device Nodes (1-8)   │
│ (Trinity/fucktard2)│                     │ (Morpheus, Neo, etc.)│
│                   │                     │                      │
│ • Extension 9001  │                     │ • Extensions 9000-08 │
│ • FreePBX Admin   │                     │ • Device-Only Mode   │
│ • MySQL Provision │                     │ • Standalone AI      │
│ • IVR Management  │                     │ • Unique Personas    │
│ • Crew Sync       │                     │ • Auto-Register      │
└───────────────────┘                     └──────────────────────┘
```

#### Nebuchadnezzar Crew Members

| Extension | Name     | IVR Option | Role                    |
|-----------|----------|------------|-------------------------|
| 9000      | Morpheus | 0, 1       | Primary Contact/Leader  |
| 9001      | Trinity  | 2          | Admin Node/Hacker       |
| 9002      | Neo      | 3          | The One                 |
| 9003      | Tank     | 4          | Operator                |
| 9004      | Dozer    | 5          | Pilot                   |
| 9005      | Apoc     | 6          | Crew Member             |
| 9006      | Switch   | 7          | Crew Member             |
| 9007      | Mouse    | 8          | Crew Member             |
| 9008      | Cypher   | 9          | Crew Member             |

#### Admin Node Setup (Trinity)

The admin node handles centralized provisioning and FreePBX management:

```bash
# On Trinity's LXC (fucktard2)
curl -sSL https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/install.sh | bash
gemini-phone setup    # Select "Both", configure Trinity (ext 9001)
gemini-phone start

# Provision the entire crew via MySQL
cd ~/.gemini-phone-cli/cli/mysql-provisioner
node provision-ivr-mysql.js    # Creates IVR 7000 + all crew routes
```

**Admin Node Capabilities:**

- Direct MySQL provisioning (bypasses FreePBX API)
- IVR 7000 management (DTMF routing for 0-9)
- Centralized secret management for all extensions
- FreePBX dialplan reload automation
- Crew member enrollment and updates

#### Device Node Setup (Crew Members)

Each crew member runs on their own LXC/server:

```bash
# On each device node (Morpheus, Neo, Tank, etc.)
curl -sSL https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/install.sh | bash
gemini-phone setup    # Select "Both", configure crew member identity
gemini-phone start
```

**Device Node Characteristics:**

- Single AI personality per node
- Unique voice and system prompt
- Auto-registers to FreePBX
- No provisioning capabilities needed
- Receives calls via IVR or direct dial

#### Updating the System

**Push-Before-Pull Protocol** (prevents logic desync):

```bash
# 1. On your local dev machine
cd /path/to/gemini-phoneq
git add -A
git commit -m "Update feature X"
git push origin main

# 2. On admin node (Trinity)
cd ~/.gemini-phone-cli
git pull origin main
gemini-phone stop
gemini-phone start

# 3. On device nodes (optional, if changes affect voice-app)
cd ~/.gemini-phone-cli
git pull origin main
gemini-phone stop
gemini-phone start
```

**Automated Crew Provisioning:**

```bash
# On admin node only
cd ~/.gemini-phone-cli/cli/mysql-provisioner

# Provision IVR + all crew extensions
node provision-ivr-mysql.js

# Verify extensions exist
bash verify-extensions.sh

# Update crew passwords (if needed)
bash set-crew-passwords.sh
```

### Split Mode (Pi + API Server)

Best for: Dedicated Pi for voice services, Gemini running on your main machine.

```text
┌─────────────────────────────────────────────────────────────┐
│  Your Phone                                                 │
│      │                                                      │
│      ↓ Call extension 9000                                  │
│  ┌─────────────┐                                            │
│  │   FreePBX   │  ← Cloud PBX                               │
│  └──────┬──────┘                                            │
│         │                                                   │
│         ↓                                                   │
│  ┌─────────────┐         ┌─────────────────────┐            │
│  │ Raspberry Pi │   ←→   │ Mac/Linux with      │            │
│  │ (voice-app)  │  HTTP  │ Gemini_CLI          │            │
│  │              │        │ (gemini-api-server) │            │
│  └─────────────┘         └─────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

**On your Pi (Voice Server):**

```bash
gemini-phone setup    # Select "Voice Server", enter API server IP when prompted
gemini-phone start    # Launches Docker containers
```

**On your Mac/Linux (API Server):**

```bash
gemini-phone api-server    # Starts Gemini API wrapper on port 3333
```

Note: On the API server machine, you don't need to run `gemini-phone setup` first if you use `gemini login`. If you prefer using an API key, run `gemini-phone setup` and provide your `GEMINI_API_KEY`.

## CLI Commands

| Command                              | Description                                  |
| ------------------------------------ | -------------------------------------------- |
| `gemini-phone setup`                 | Interactive configuration wizard             |
| `gemini-phone start`                 | Start services based on installation type    |
| `gemini-phone stop`                  | Stop all services                            |
| `gemini-phone status`                | Show service status                          |
| `gemini-phone doctor`                | Health check for dependencies and services   |
| `gemini-phone api-server [--port N]` | Start API server standalone (default: 3333)  |
| `gemini-phone device add`            | Add a new device/extension                   |
| `gemini-phone device list`           | List configured devices                      |
| `gemini-phone device remove <name>`  | Remove a device                              |
| `gemini-phone logs [service]`        | Tail logs (voice-app, drachtio, freeswitch)  |
| `gemini-phone config show`           | Display configuration (secrets redacted)     |
| `gemini-phone config path`           | Show config file location                    |
| `gemini-phone config reset`          | Reset configuration                          |
| `gemini-phone backup`                | Create configuration backup                  |
| `gemini-phone restore`               | Restore from backup                          |
| `gemini-phone update`                | Update Gemini Phone                          |
| `gemini-phone uninstall`             | Complete removal                             |

## Device Personalities

Each SIP extension can have its own identity with a unique name, voice, and personality prompt:

```bash
gemini-phone device add
```

Example devices:

- **Morpheus** (ext 9000) - General assistant
- **Cephanie** (ext 9002) - Storage monitoring bot
- **Trinity**   (ext 9001) - Matrix Hacker

## API Endpoints

The voice-app exposes these endpoints on port 3000:

| Method | Endpoint              | Purpose                         |
| ------ | --------------------- | ------------------------------- |
| POST   | `/api/outbound-call`  | Initiate an outbound call       |
| GET    | `/api/call/:callId`   | Get call status                 |
| GET    | `/api/calls`          | List active calls               |
| POST   | `/api/query`          | Query a device programmatically |
| GET    | `/api/devices`        | List configured devices         |

See [Outbound API Reference](voice-app/README-OUTBOUND.md) for details.

## Troubleshooting

### Quick Diagnostics

```bash
gemini-phone doctor    # Automated health checks
gemini-phone status    # Service status
gemini-phone logs      # View logs
```

### Common Issues

| Problem                       | Likely Cause           | Solution                               |
| ----------------------------- | ---------------------- | -------------------------------------- |
| Calls connect but no audio    | Wrong external IP      | Re-run `gemini-phone setup`, verify IP |
| Extension not registering     | SBC/Proxy not running  | Check FreePBX admin panel              |
| "Sorry, something went wrong" | API server unreachable | Check `gemini-phone status`            |
| Port conflict on startup      | SBC using port 5060    | Setup auto-detects this; re-run setup  |

See [Troubleshooting Guide](docs/TROUBLESHOOTING.md) for more.

## Configuration

Configuration is stored in `~/.gemini-phone/config.json` with restricted permissions (chmod 600).

```bash
gemini-phone config show    # View config (secrets redacted)
gemini-phone config path    # Show file location
```

## Development

```bash
# Run tests
npm test

# Lint
npm run lint
npm run lint:fix
```

## Documentation

- [CLI Reference](cli/README.md) - Detailed CLI documentation
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Outbound API](voice-app/README-OUTBOUND.md) - Outbound calling API reference
- [Deployment](voice-app/DEPLOYMENT.md) - Production deployment guide
- [Gemini Code Skill](docs/GEMINI-CODE-SKILL.md) - Build a "call me" skill for Gemini Code

## License

MIT

```text
    .-----------------.
    |  Hi, I'm Gemini |
    |      Phone!     |
    |  .-----------.  |
    |  |  /*\\  _  |  |
    |  | |   | | | |  |
    |  | \\*/  |*| |  |
    |  '-----------'  |
    | [1] [2] [3] |\\  |
    | [4] [5] [6] | | |
    | [7] [8] [9] | | |
    | [*] [0] [#] | | |
    '-------------' | |
      |*______**|**/


    .-----------------.
    |                 |
    |   (o)   (o)     |
    |      <          |
    |    \\___/        |
    |                 |
    |   CHILL MODE    |
    |      ON         |
    |                 |
    '-----------------'
       _||_//__
      /        \\
      |  🌿    |
      \\________/

               .
              . .
             . . .
            . . . .
           . . . . .
           . . . . .
          .   . .   .
         .     .     .
        .       .       .
       .        |        .
                |
                |




                    ,
                   dM
                   MMr
                  4MMML                  .
                  MMMMM.                xf

.                "M6MMM               .MM-
   Mh..          +MM5MMM            .MMMM
   .MMM.         .MMMMML.          MMMMMh
    )MMMh.        MM5MMM         MMMMMMM
     3MMMMx.     'MMM3MMf      xnMMMMMM"
     '*MMMMM      MMMMMM.     nMMMMMMP"
       *MMMMMx    "MMM5M\\    .MMMMMMM=
        *MMMMMh   "MMMMM"   JMMMMMMP
          MMMMMM   GMMMM.  dMMMMMM            .
           MMMMMM  "MMMM  .MMMMM(        .nnMP"
..          *MMMMx  MMM"  dMMMM"    .nnMMMMM*
 "MMn...     'MMMMr 'MM   MMM"   .nMMMMMMM*"
  "4MMMMnn..   *MMM  MM  MMP"  .dMMMMMMM""
    ^MMMMMMMMx.  *ML "M .M*  .MMMMMM**"
       *PMMMMMMhn. *x > M  .MMMM**""
          ""**MMMMhx/.h/ .=*"
                   .3P"%....
                nP"     "*MMnx
----------------------------------------------
```
