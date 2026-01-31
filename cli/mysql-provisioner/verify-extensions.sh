#!/bin/bash

# Check if extensions 9002-9008 exist in FreePBX database

echo "🔍 Checking FreePBX database for extensions 9002-9008..."
echo ""

FREEPBX_HOST="172.16.1.143"
MYSQL_PASSWORD="rCK+gZBKfILF"
SSH_PASSWORD="Jumbo2601"

for EXT in 9002 9003 9004 9005 9006 9007 9008; do
    echo "Extension ${EXT}:"
    
    COUNT=$(sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no root@${FREEPBX_HOST} \
        "mysql -u freepbxuser -p${MYSQL_PASSWORD} asterisk -se \"SELECT COUNT(*) FROM sip WHERE id='${EXT}';\"")
    
    echo "  Records in 'sip' table: ${COUNT}"
    
    if [ "$COUNT" -gt "0" ]; then
        echo "  ✅ Extension exists in database"
        
        # Show some fields
        sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no root@${FREEPBX_HOST} \
            "mysql -u freepbxuser -p${MYSQL_PASSWORD} asterisk -se \"SELECT keyword, data FROM sip WHERE id='${EXT}' LIMIT 5;\""
    else
        echo "  ❌ Extension NOT found in database"
    fi
    
    echo ""
done

echo "📊 Checking 'users' table..."
echo ""

for EXT in 9002 9003 9004 9005 9006 9007 9008; do
    COUNT=$(sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no root@${FREEPBX_HOST} \
        "mysql -u freepbxuser -p${MYSQL_PASSWORD} asterisk -se \"SELECT COUNT(*) FROM users WHERE extension='${EXT}';\"")
    
    echo "Extension ${EXT} in 'users' table: ${COUNT} records"
done

echo ""
echo "✅ Database check complete"
