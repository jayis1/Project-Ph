#!/bin/bash
# Add IVR option 0 → Morpheus (9000) via MySQL

MYSQL_PASS=$(grep -oP '"mysqlPassword":\s*"\K[^"]+' ~/.gemini-phone/config.json)
SSH_PASS=$(grep -oP '"sshPass":\s*"\K[^"]+' ~/.gemini-phone/config.json)
FREEPBX_HOST="172.16.1.143"

if [ -z "$MYSQL_PASS" ]; then
    echo "❌ MySQL password not found in config"
    exit 1
fi

echo "🔧 Adding IVR option 0 → Morpheus (9000)..."

# Add IVR entry for option 0
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no root@$FREEPBX_HOST \
    "mysql -u freepbxuser -p'$MYSQL_PASS' asterisk -e \"
    INSERT INTO ivr_entries (ivr_id, selection, dest, ivr_ret)
    VALUES ('7000', '0', 'from-did-direct,9000,1', '0')
    ON DUPLICATE KEY UPDATE dest='from-did-direct,9000,1';
    \""

if [ $? -eq 0 ]; then
    echo "✅ IVR option 0 added successfully"
else
    echo "❌ Failed to add IVR option 0"
    exit 1
fi

echo "🔄 Reloading FreePBX..."
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no root@$FREEPBX_HOST "fwconsole reload"

echo ""
echo "✅ Done! IVR option 0 now connects to Morpheus (9000)"
echo ""
echo "📞 Test it:"
echo "  1. Call IVR 7000"
echo "  2. Press 0"
echo "  3. Should connect to Morpheus"
