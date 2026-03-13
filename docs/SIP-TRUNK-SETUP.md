# SIP Trunk Configuration Guide

## Overview

The "Outside World" trunk connects your FreePBX to your SIP provider (Redspot) for inbound PSTN calls.

## Configuration Methods

### Method 1: Environment Variables (Recommended)

Add to your `~/.ai-phone/config.json`:

```json
{
  "sipTrunk": {
    "username": "88707695",
    "password": "your_trunk_password_here",
    "server": "voice.redspot.dk",
    "port": "5060"
  }
}
```

### Method 2: System Environment

```bash
export SIP_TRUNK_USERNAME=88707695
export SIP_TRUNK_PASSWORD=your_password_here
export SIP_TRUNK_SERVER=voice.redspot.dk
export SIP_TRUNK_PORT=5060
```

## Running the Script

```bash
cd ~/.ai-phone-cli
git pull
cd cli/mysql-provisioner
node create-outside-world-trunk.js
```

## What It Does

1. Creates PJSIP endpoint "outsideworld"
2. Configures authentication with your provider
3. Sets up registration to voice.redspot.dk
4. Reloads FreePBX configuration

## Verification

After running, check registration:

```bash
sshpass -p "Jumbo2601" ssh root@172.16.1.143 "asterisk -rx 'pjsip show registrations'"
```

You should see:

- Redspot trunk registered ✓
- Outside World trunk registered ✓

## Testing

Call **88707695** from your cell phone. The call should:

1. Route through Redspot
2. Arrive at FreePBX
3. Go to IVR 7000
4. Let you select crew member (0-8)

## Troubleshooting

**Registration fails:**

- Check credentials in config.json
- Verify voice.redspot.dk is reachable
- Check FreePBX firewall allows UDP 5060

**Calls don't arrive:**

- Verify DID 88707695 is configured on Redspot portal
- Check inbound route exists in FreePBX
- Monitor Asterisk logs: `asterisk -rvvv`
