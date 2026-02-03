
#!/bin/bash
# fix_transport.sh - Fix PJSIP Transport for Gateway Trunk
set -e

echo "🔧 Fixing Transport to '0.0.0.0-udp'..."
MYSQL_PASS=$(awk -F'"' '/AMPDBPASS/{print $4}' /etc/freepbx.conf)

mysql -u freepbxuser -p"$MYSQL_PASS" asterisk <<EOF
-- Update Gateway Trunk to use correct transport
UPDATE pjsip SET data = '0.0.0.0-udp' 
WHERE id = 'Gateway' AND keyword = 'transport';
EOF

echo "✅ Database Updated."
echo "🔄 Reloading Core..."
fwconsole reload
echo "🎉 Done! Transport Fixed."
echo "   Please try the call (Morpheus) again."
