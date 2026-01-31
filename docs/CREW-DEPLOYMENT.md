# Nebuchadnezzar Crew Deployment Guide

## Architecture Overview

The Nebuchadnezzar crew uses a distributed architecture:

- **Admin LXC (fucktard2)**: FreePBX server + Morpheus & Trinity
- **Crew LXCs**: Individual containers for Neo, Tank, Dozer, Apoc, Switch, Mouse, Cypher

## Admin LXC Setup (fucktard2) ✅ COMPLETE

The admin LXC has been fully configured with:

- ✅ FreePBX with all 9 extensions (9000-9008)
- ✅ IVR 7000 with digit mappings
- ✅ Inbound route: 88707695 (Redspot) → IVR 7000
- ✅ Ring Group 8000 (all extensions)
- ✅ Morpheus (9000) & Trinity (9001) registered

## Deploying Additional Crew Members

### Prerequisites

For each new crew member LXC, you need:

1. Fresh Proxmox LXC container (Debian/Ubuntu)
2. Network access to FreePBX server (172.16.1.143)
3. ElevenLabs API key
4. OpenAI API key

### Quick Deploy

On each new LXC, run:

```bash
curl -sSL https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/install-device.sh | sudo bash
```

The script will:

1. Prompt you to select a crew member (2-8)
2. Ask for FreePBX server IP (default: 172.16.1.143)
3. Ask for extension password (default: GeminiPhone123!)
4. Ask for API keys
5. Install Gemini Phone
6. Create device-only config
7. Start services
8. Register to FreePBX

### Crew Member Details

| Number | Name | Extension | Voice | Description |
|--------|------|-----------|-------|-------------|
| 2 | Neo | 9002 | Adam (male) | The One, learning to believe |
| 3 | Tank | 9003 | Adam (male) | Operator, born free in Zion |
| 4 | Dozer | 9004 | Adam (male) | Pilot and engineer |
| 5 | Apoc | 9005 | Adam (male) | Loyal crew member |
| 6 | Switch | 9006 | Rachel (female) | Sharp instincts |
| 7 | Mouse | 9007 | Adam (male) | Youngest, programmer |
| 8 | Cypher | 9008 | Adam (male) | Cynical, questions reality |

### Example: Deploying Neo

1. Create new LXC in Proxmox
2. SSH into the LXC
3. Run the install script:

   ```bash
   curl -sSL https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/install-device.sh | sudo bash
   ```

4. Select option `2` for Neo
5. Provide FreePBX IP: `172.16.1.143`
6. Provide password: `GeminiPhone123!`
7. Provide API keys
8. Wait for registration

### Verification

After deployment, verify the crew member is registered:

```bash
gemini-phone status
```

You should see:

- ✓ Gemini API Server running
- ✓ Docker containers running
- ✓ Configured device: [Crew Member Name]

On the admin LXC (fucktard2), check FreePBX Statistics:

- **Users Online** should increase by 1

### Testing

1. **Direct call**: Dial the extension (e.g., 9002 for Neo)
2. **IVR**: Call 88707695, press the digit (e.g., 2 for Neo)
3. **Ring Group**: Call 88707695, wait for timeout (rings all)

## Call Flow

```
Cell Phone → 88707695 (Redspot)
    ↓
IVR 7000 (Nebuchadnezzar Crew)
    ↓
Press digit 0-8 → Route to extension
    ↓
Voice-app answers → AI conversation
    ↓
No answer → Voicemail
```

## Troubleshooting

### Extension not registering

Check SIP credentials:

```bash
cat ~/.gemini-phone/config.json | grep -A 5 password
```

Check Docker logs:

```bash
docker logs voice-app 2>&1 | tail -50
```

### Can't reach FreePBX

Verify network connectivity:

```bash
ping 172.16.1.143
```

Check SIP port:

```bash
nc -zv 172.16.1.143 5060
```

### API errors

Verify API keys in config:

```bash
cat ~/.gemini-phone/config.json | grep -i api
```

Run health check:

```bash
gemini-phone doctor
```

## Maintenance

### Restart a crew member

```bash
gemini-phone stop
gemini-phone start
```

### View logs

```bash
docker logs voice-app -f
```

### Update to latest version

**For existing crew members that are already online:**

```bash
# SSH into the crew member's LXC
ssh root@<crew-lxc-ip>

# Navigate to installation directory
cd ~/.gemini-phone-cli

# Pull latest changes from GitHub
git pull origin main

# Restart services to apply updates
gemini-phone stop
sleep 2
gemini-phone start

# Verify update
gemini-phone status
gemini-phone doctor
```

**Batch update script for all online crew:**

```bash
#!/bin/bash
# update-all-crew.sh - Update all deployed crew members

# List of crew LXC IPs (update as crew members are deployed)
CREW_NODES=(
    "root@<trinity-ip>"      # Trinity (fucktard2)
    "root@<morpheus-ip>"     # Morpheus (if separate)
    "root@<neo-ip>"          # Neo
    # Add more as they come online
)

for node in "${CREW_NODES[@]}"; do
    echo "========================================="
    echo "Updating: $node"
    echo "========================================="
    
    ssh "$node" << 'EOF'
        cd ~/.gemini-phone-cli
        git pull origin main
        gemini-phone stop
        sleep 2
        gemini-phone start
        sleep 3
        echo ""
        echo "Status:"
        gemini-phone status
EOF
    
    echo ""
    echo "✅ $node updated"
    echo ""
done

echo "========================================="
echo "✅ All crew members updated!"
echo "========================================="
```

**Usage:**

```bash
chmod +x update-all-crew.sh
./update-all-crew.sh
```

**What gets updated:**

- Scheduled callback feature
- IVR improvements
- Bug fixes
- New features
- Documentation updates

## Network Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  FreePBX Server (172.16.1.143)                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Extensions: 9000-9008                               │   │
│  │  IVR: 7000                                           │   │
│  │  Ring Group: 8000                                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ SIP (port 5060)
                           │
        ┌──────────────────┴──────────────────┬─────────────┐
        │                  │                  │             │
┌───────▼────────┐ ┌───────▼────────┐ ┌───────▼────────┐   ...
│ LXC: fucktard2 │ │ LXC: neo       │ │ LXC: tank      │
│ (Admin)        │ │ (Device)       │ │ (Device)       │
│                │ │                │ │                │
│ • Morpheus     │ │ • Neo (9002)   │ │ • Tank (9003)  │
│ • Trinity      │ │                │ │                │
│ • FreePBX Mgmt │ │                │ │                │
└────────────────┘ └────────────────┘ └────────────────┘
```

## Status

- ✅ Admin LXC (fucktard2): Operational
- ⏳ Neo LXC: Ready to deploy
- ⏳ Tank LXC: Ready to deploy
- ⏳ Dozer LXC: Ready to deploy
- ⏳ Apoc LXC: Ready to deploy
- ⏳ Switch LXC: Ready to deploy
- ⏳ Mouse LXC: Ready to deploy
- ⏳ Cypher LXC: Ready to deploy
