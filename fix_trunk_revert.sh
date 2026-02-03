
#!/bin/bash
# fix_trunk_revert.sh - Revert Gateway Trunk IP to 172.16.1.146
set -e

# The Gateway is actually the local machine (172.16.1.146)
CORRECT_IP="172.16.1.146"

echo "🔧 Reverting Gateway Trunk IP to $CORRECT_IP..."
MYSQL_PASS=$(awk -F'"' '/AMPDBPASS/{print $4}' /etc/freepbx.conf)

mysql -u freepbxuser -p"$MYSQL_PASS" asterisk <<EOF
-- Update Endpoint Identify Match
UPDATE pjsip SET data = '$CORRECT_IP' 
WHERE id = 'Gateway-i' AND keyword = 'match';

-- Update AOR Contact
UPDATE pjsip SET data = 'sip:$CORRECT_IP:5060' 
WHERE id = 'Gateway-a' AND keyword = 'contact';

-- Update Endpoint From Domain
UPDATE pjsip SET data = '$CORRECT_IP' 
WHERE id = 'Gateway' AND keyword = 'from_domain';

-- Ensure Transport is still correct (just in case)
UPDATE pjsip SET data = '0.0.0.0-udp' 
WHERE id = 'Gateway' AND keyword = 'transport';
EOF

echo "✅ Database Updated."
echo "🔄 Reloading Core..."
fwconsole reload
echo "🎉 Done! Gateway now points to $CORRECT_IP"
echo "   Please try the Call again!"
