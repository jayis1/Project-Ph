
#!/bin/bash
# fix_trunk.sh - Fix Gateway Trunk IP on Server B
set -e

# The correct IP of Server A (Gateway)
CORRECT_IP="172.16.1.240"

echo "🔧 Fixing Gateway Trunk IP to $CORRECT_IP..."

# Get MySQL Password
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
EOF

echo "✅ Database Updated."
echo "🔄 Reloading Core..."
fwconsole reload
echo "🎉 Done! Gateway now points to $CORRECT_IP"
echo "   Please try the Redspot call again."
