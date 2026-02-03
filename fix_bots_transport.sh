
#!/bin/bash
# fix_bots_transport.sh - Fix Transport for ALL Extensions
set -e

echo "🔧 Fixing Transport for ALL Endpoints to '0.0.0.0-udp'..."
MYSQL_PASS=$(awk -F'"' '/AMPDBPASS/{print $4}' /etc/freepbx.conf)

mysql -u freepbxuser -p"$MYSQL_PASS" asterisk <<EOF
-- Update ALL transports in pjsip table (safe, as we only use UDP)
UPDATE pjsip SET data = '0.0.0.0-udp' WHERE keyword = 'transport';
EOF

echo "✅ Database Updated."
echo "🔄 Restarting FreePBX..."
fwconsole restart
echo "🎉 Done! All extensions now use the correct transport."
