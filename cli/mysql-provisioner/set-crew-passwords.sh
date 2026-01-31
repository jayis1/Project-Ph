#!/bin/bash
# Set SIP passwords for crew extensions 9002-9008
# Run this on the admin node (fucktard2)

MYSQL_PASS=$(grep -oP '"mysqlPassword":\s*"\K[^"]+' ~/.gemini-phone/config.json)
SSH_PASS=$(grep -oP '"sshPass":\s*"\K[^"]+' ~/.gemini-phone/config.json)
FREEPBX_HOST="172.16.1.143"
SIP_SECRET="GeminiPhone123!"

if [ -z "$MYSQL_PASS" ]; then
    echo "❌ MySQL password not found in config.json"
    exit 1
fi

echo "🔐 Setting SIP passwords for crew extensions..."
echo ""

for EXT in 9002 9003 9004 9005 9006 9007 9008; do
    echo "Setting password for extension $EXT..."
    sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no root@$FREEPBX_HOST \
        "mysql -u freepbxuser -p$MYSQL_PASS asterisk -e \"UPDATE sip SET data='$SIP_SECRET' WHERE id='$EXT' AND keyword='secret';\""
done

echo ""
echo "🔄 Reloading FreePBX..."
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no root@$FREEPBX_HOST "fwconsole reload"

echo ""
echo "✅ Done! Crew members should now be able to register."
