#!/bin/bash

# Fix Trinity SIP Registration
# Updates FreePBX PJSIP password to plaintext and restarts services

echo "🔧 Fixing Trinity SIP Registration..."

# Update password in FreePBX database
echo "1. Updating FreePBX password to plaintext..."
sshpass -p "Jumbo2601" ssh -o StrictHostKeyChecking=no root@172.16.1.143 \
  "mysql -u freepbxuser -prCK+gZBKfILF asterisk -e \"UPDATE sip SET data='GeminiPhone123!' WHERE id='9001' AND keyword='secret';\""

# Reload FreePBX
echo "2. Reloading FreePBX configuration..."
sshpass -p "Jumbo2601" ssh -o StrictHostKeyChecking=no root@172.16.1.143 "fwconsole reload"

# Wait for FreePBX to reload
echo "3. Waiting for FreePBX to reload..."
sleep 3

# Restart voice-app to re-register
echo "4. Restarting voice-app..."
docker restart voice-app

# Wait for voice-app to start
echo "5. Waiting for voice-app to start..."
sleep 5

# Check registration status
echo "6. Checking SIP registration status..."
curl -s http://localhost:3000/api/sip-status | python3 -m json.tool

echo ""
echo "✅ Done! Check if Trinity is now registered above."
