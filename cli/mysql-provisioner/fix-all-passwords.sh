#!/bin/bash

# Fix all crew member extension passwords to plaintext
# This resolves the "Configuration Ghosting" issue where FreePBX converts plaintext to MD5

echo "🔧 Fixing all crew extension passwords..."
echo ""

# FreePBX credentials from config
FREEPBX_HOST="172.16.1.143"
MYSQL_PASSWORD="rCK+gZBKfILF"
SSH_PASSWORD="Jumbo2601"
SIP_SECRET="GeminiPhone123!"

# All crew extensions
EXTENSIONS=("9000" "9001" "9002" "9003" "9004" "9005" "9006" "9007" "9008")
NAMES=("Morpheus" "Trinity" "Neo" "Tank" "Dozer" "Apoc" "Switch" "Mouse" "Cypher")

echo "📝 Updating passwords for ${#EXTENSIONS[@]} extensions..."
echo ""

for i in "${!EXTENSIONS[@]}"; do
    EXT="${EXTENSIONS[$i]}"
    NAME="${NAMES[$i]}"
    
    echo "  → ${NAME} (${EXT})"
    
    # Update password to plaintext
    sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no root@${FREEPBX_HOST} \
        "mysql -u freepbxuser -p${MYSQL_PASSWORD} asterisk -e \"UPDATE sip SET data='${SIP_SECRET}' WHERE id='${EXT}' AND keyword='secret';\""
done

echo ""
echo "✅ All passwords updated to plaintext"
echo ""
echo "🔄 Reloading FreePBX..."

# Reload FreePBX
sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no root@${FREEPBX_HOST} "fwconsole reload"

echo "✅ FreePBX reloaded"
echo ""
echo "⏳ Waiting 3 seconds for reload to complete..."
sleep 3
echo ""
echo "🔄 Restarting voice-app..."

# Restart voice-app container
docker restart voice-app

echo "✅ Voice-app restarted"
echo ""
echo "⏳ Waiting 10 seconds for registrations..."
sleep 10
echo ""
echo "📊 Checking SIP registrations..."
echo ""

# Check registrations
curl -s http://localhost:3000/api/sip-status | python3 -m json.tool

echo ""
echo "✅ Done! All crew members should now be registered."
echo ""
