# Crew Configuration Fixer

## Purpose

This script fixes common configuration issues on crew member LXCs, particularly:

- Missing or invalid ElevenLabs API keys
- Missing FreePBX M2M API credentials
- Empty or incorrect GraphQL URLs

## Usage

### On Mouse's LXC (or any crew member with config issues)

```bash
curl -sSL https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/fix-crew-config.sh | bash
```

### What It Does

1. **Checks Configuration** - Scans `~/.gemini-phone/config.json` for common issues
2. **Prompts for Fixes** - Asks for missing API keys and credentials
3. **Backs Up Config** - Creates a timestamped backup before making changes
4. **Updates Config** - Uses `jq` (if available) or `sed` to update the configuration
5. **Restarts Services** - Stops and starts Gemini Phone services
6. **Verifies Fix** - Runs `gemini-phone doctor` to confirm everything works

### Example Session

```bash
root@Mouse:~# curl -sSL https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/fix-crew-config.sh | bash

🔧 Gemini Phone Configuration Fixer

📋 Current configuration status:

⚠️  ElevenLabs API key is empty

🔧 Fixing configuration...

Enter ElevenLabs API key (or press Enter to skip): sk_xxxxxxxxxxxxx
Enter FreePBX Client ID (or press Enter to skip): 
Enter FreePBX Client Secret (or press Enter to skip): 
Enter FreePBX GraphQL URL (default: http://172.16.1.143:83/admin/api/api/gql): 

📝 Updating configuration...
✓ Backup created
✓ Configuration updated

🔄 Restarting services...
✓ All services running!

🔍 Running health check...
✓ 9/9 checks passed

✅ Configuration fix complete!
```

## Manual Fix

If you prefer to fix the configuration manually:

```bash
# Edit the config file
nano ~/.gemini-phone/config.json

# Find and update these sections:
{
  "elevenlabs": {
    "apiKey": "sk_your_elevenlabs_key_here"
  },
  "api": {
    "freepbx": {
      "clientId": "your_client_id",
      "clientSecret": "your_client_secret",
      "graphqlUrl": "http://172.16.1.143:83/admin/api/api/gql"
    }
  }
}

# Restart services
gemini-phone stop
gemini-phone start

# Verify
gemini-phone doctor
```

## Troubleshooting

### Script says "jq not found"

The script will fall back to `sed`, but for best results install `jq`:

```bash
# Debian/Ubuntu
apt-get install -y jq

# Then run the script again
```

### Config still has issues after running

Check the backup file:

```bash
ls -la ~/.gemini-phone/config.json.backup.*
```

Restore if needed:

```bash
cp ~/.gemini-phone/config.json.backup.TIMESTAMP ~/.gemini-phone/config.json
```

### Services won't restart

Check Docker status:

```bash
docker ps
docker logs voice-app
```

## Current Crew Status

After running the fix script on Mouse, all crew members should be fully operational:

| Extension | Name     | Status | Health Check |
|-----------|----------|--------|--------------|
| 9000      | Morpheus | ✅     | 8/9 or 9/9   |
| 9001      | Trinity  | ✅     | 8/9 or 9/9   |
| 9002      | Neo      | ✅     | 8/9 or 9/9   |
| 9003      | Tank     | ✅     | 8/9 or 9/9   |
| 9004      | Dozer    | ✅     | 8/9 or 9/9   |
| 9005      | Apoc     | ✅     | 8/9 or 9/9   |
| 9006      | Switch   | ✅     | 8/9 or 9/9   |
| 9007      | Mouse    | ⚠️     | 7/9 → 9/9    |
| 9008      | Cypher   | ✅     | 9/9          |

**Note:** The "API server not responding" warning (8/9 instead of 9/9) is harmless on device-only nodes.
