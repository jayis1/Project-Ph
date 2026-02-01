# Self-Provisioning Bot Deployment Guide

This guide explains how to deploy the Matrix AI Scam-Baiting Crew using the new **self-provisioning** architecture, where each bot LXC automatically creates its own extension on FreePBX.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Fresh FreePBX Server                                        │
│  - SIP Trunk configured                                      │
│  - No extensions pre-configured                              │
│  - MySQL accessible from bot LXCs                            │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ MySQL
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
│ Bot LXC 1    │    │ Bot LXC 2   │    │ Bot LXC 9   │
│ (Morpheus)   │    │ (Trinity)   │    │ (Cypher)    │
│              │    │             │    │             │
│ 1. Setup     │    │ 1. Setup    │    │ 1. Setup    │
│ 2. Provision │    │ 2. Provision│    │ 2. Provision│
│ 3. Start     │    │ 3. Start    │    │ 3. Start    │
└──────────────┘    └─────────────┘    └─────────────┘
```

**Benefits:**

- ✅ No manual FreePBX configuration
- ✅ Bots are self-contained and autonomous
- ✅ Easy to add/remove bots
- ✅ Survives FreePBX reinstalls
- ✅ Scalable to hundreds of bots

## Prerequisites

### 1. Fresh FreePBX Server

```bash
# Install FreePBX 17
# Note the IP address (e.g., 172.16.1.100)
# Configure SIP trunk (Redspot or your provider)
```

### 2. MySQL Access from Bot LXCs

```bash
# On FreePBX, allow remote MySQL connections
mysql -u root -p

# Create user for bot provisioning
CREATE USER 'botprov'@'172.16.1.%' IDENTIFIED BY 'STRONG_PASSWORD_HERE';
GRANT SELECT, INSERT, UPDATE, DELETE ON asterisk.* TO 'botprov'@'172.16.1.%';
FLUSH PRIVILEGES;
```

### 3. Bot LXC Containers

You need 9 LXC containers (or VMs) for the AI crew:

- Morpheus (9000) - Leader
- Trinity (9001) - Hacker
- Neo (9002) - The One
- Tank (9003) - Operator
- Dozer (9004) - Operator
- Apoc (9005) - Tech Support
- Switch (9006) - Tech Support
- Mouse (9007) - Tech Support
- Cypher (9008) - Security

## Deployment Steps

### Step 1: Configure FreePBX Connection

On **each bot LXC**, create a config file with FreePBX credentials:

```bash
# On each bot LXC
mkdir -p ~/.gemini-phone
cat > ~/.gemini-phone/.env << 'EOF'
# FreePBX Database Connection
FREEPBX_HOST=172.16.1.100
FREEPBX_DB_USER=botprov
FREEPBX_DB_PASS=STRONG_PASSWORD_HERE

# SIP Settings
SIP_DOMAIN=172.16.1.100
SIP_REGISTRAR=172.16.1.100:5060

# Bot-specific settings (CHANGE FOR EACH BOT!)
SIP_EXTENSION=9000
SIP_PASSWORD=GENERATE_RANDOM_PASSWORD
DEVICE_NAME=Morpheus

# API Keys
ELEVENLABS_API_KEY=your_elevenlabs_key
OPENAI_API_KEY=your_openai_key
GEMINI_API_URL=http://localhost:3333

# Optional
VOICEMAIL_EMAIL=morpheus@example.com
EOF
```

**Important:** Change `SIP_EXTENSION`, `SIP_PASSWORD`, `DEVICE_NAME`, and `VOICEMAIL_EMAIL` for each bot!

| Bot | Extension | Name | Email |
|-----|-----------|------|-------|
| 1 | 9000 | Morpheus | <morpheus@example.com> |
| 2 | 9001 | Trinity | <trinity@example.com> |
| 3 | 9002 | NEO | <neo@example.com> |
| 4 | 9003 | TANK | <tank@example.com> |
| 5 | 9004 | DOZER | <dozer@example.com> |
| 6 | 9005 | APOC | <apoc@example.com> |
| 7 | 9006 | SWITCH | <switch@example.com> |
| 8 | 9007 | MOUSE | <mouse@example.com> |
| 9 | 9008 | CYPHER | <cypher@example.com> |

### Step 2: Install Gemini Phone on Each Bot

```bash
# On each bot LXC
curl -sSL https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/install.sh | bash
```

### Step 3: Run Setup on Each Bot

```bash
# On each bot LXC
gemini-phone setup

# Follow the prompts to configure:
# - API keys (ElevenLabs, OpenAI)
# - FreePBX connection
# - SIP credentials
# - Device name and persona
```

### Step 4: Self-Provision Extension

This is the **magic step** - each bot creates its own extension on FreePBX:

```bash
# On each bot LXC
gemini-phone provision-extension
```

**What this does:**

1. Connects to FreePBX MySQL database
2. Creates PJSIP endpoint with bot's extension number
3. Sets up authentication with bot's password
4. Creates AOR (Address of Record) for registration
5. Configures device entry
6. Sets up voicemail (if email provided)

**Output:**

```
🤖 Self-Provisioning Extension on FreePBX...

✓ Connected to FreePBX database
Creating new extension 9000...
  ✓ Created user entry
  ✓ Created PJSIP endpoint
  ✓ Created AOR
  ✓ Created authentication
  ✓ Created device entry
  ✓ Created voicemail (morpheus@example.com)

✅ Extension 9000 (Morpheus) provisioned successfully!
   Password: ••••••••
   Voicemail: morpheus@example.com
```

### Step 5: Start Voice App

```bash
# On each bot LXC
gemini-phone start
```

The bot will:

1. Start voice-app Docker container
2. Register to FreePBX as its extension
3. Begin listening for calls

### Step 6: Verify Registration

```bash
# On FreePBX
asterisk -rx "pjsip show endpoints" | grep 900

# You should see all 9 bots registered:
# 9000 Morpheus   Avail
# 9001 Trinity    Avail
# 9002 Neo        Avail
# ... etc
```

## Admin Node: Provision IVR System

On **one bot (Trinity recommended)**, provision the IVR system, conferences, and queues:

```bash
# On Trinity (or any admin bot)
cd ~/Documents/gemini-phoneq/cli/mysql-provisioner

# Run the complete provisioning
./install-all-features.sh
```

This creates:

- **IVR System** (4 levels: Main, Departments, Conferences, Agents)
- **Conference Rooms** (8101-8105) with 2 AI agents per room
- **Queue 8001** for all-crew simultaneous ringing
- **Ring Groups** for departments
- **Scammer Maze** for sequential time wasting

## Testing

### 1. Check All Bots Registered

```bash
# On FreePBX
asterisk -rx "pjsip show endpoints" | grep -c "Avail"
# Should show: 9
```

### 2. Test Individual Extension

```bash
# From any phone, dial extension 9000
# Should reach Morpheus
```

### 3. Test Main IVR

```bash
# Call your main DID
# Should hear: "Welcome to the Nebuchadnezzar..."
# Press 0 → All Crew Queue
# Press 1 → Departments Menu
# Press 2 → Conference Rooms
# Press 3 → Individual Agents
# Press 9 → Scammer Maze
```

## Troubleshooting

### Bot Can't Connect to FreePBX MySQL

```bash
# On FreePBX, check firewall
firewall-cmd --list-all

# Allow MySQL from bot subnet
firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="172.16.1.0/24" port port="3306" protocol="tcp" accept'
firewall-cmd --reload
```

### Extension Already Exists

If you run `provision-extension` twice, it will **update** the existing extension instead of creating a new one. This is safe and idempotent.

### Bot Not Registering

```bash
# On bot LXC, check voice-app logs
docker logs voice-app

# Look for SIP registration errors
# Common issues:
# - Wrong SIP_PASSWORD
# - Wrong FREEPBX_HOST
# - Firewall blocking SIP (port 5060)
```

### IVR Not Working

```bash
# On FreePBX, check if IVR exists
asterisk -rx "dialplan show ivr-1"

# Check inbound route
mysql -u freepbxuser -p asterisk -e "SELECT * FROM incoming;"

# Should route to ivr-1,s,1
```

## Scaling Beyond 9 Bots

To add more bots:

1. Create new LXC container
2. Choose extension number (e.g., 9009, 9010, etc.)
3. Follow Steps 1-5 above
4. Bot will self-provision and register automatically

**No FreePBX manual configuration needed!**

## Backup and Recovery

### Backup Bot Configuration

```bash
# On each bot
gemini-phone backup

# Saves to ~/.gemini-phone/backups/
```

### Restore After FreePBX Reinstall

1. Install fresh FreePBX
2. Configure MySQL access (Step 2 above)
3. On each bot, run:

   ```bash
   gemini-phone provision-extension
   gemini-phone start
   ```

4. Bots will re-create their extensions automatically!

## Security Best Practices

1. **Use strong passwords** for SIP extensions (20+ random characters)
2. **Restrict MySQL access** to bot subnet only
3. **Enable Fail2Ban** on FreePBX to block brute-force attacks
4. **Use firewall rules** to limit SIP access to known IPs
5. **Rotate passwords** periodically

## Summary

**Self-provisioning architecture:**

- ✅ Each bot creates its own extension
- ✅ No manual FreePBX configuration
- ✅ Scalable and autonomous
- ✅ Survives FreePBX reinstalls
- ✅ Easy to add/remove bots

**Commands:**

```bash
# On each bot LXC
gemini-phone setup                # Configure bot
gemini-phone provision-extension  # Create extension on FreePBX
gemini-phone start                # Start voice app

# On admin bot (Trinity)
./install-all-features.sh         # Provision IVR system
```

**Your Matrix AI Scam-Baiting Crew is ready to waste scammers' time 24/7!** 🎉
