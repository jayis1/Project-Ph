
#!/bin/bash
# fix_inbound_v2.sh - Minimal Safe Import for Inbound Route
set -e

echo "🔧 creating Catch-All Inbound Route (Safe Mode)..."
MYSQL_PASS=$(awk -F'"' '/AMPDBPASS/{print $4}' /etc/freepbx.conf)

mysql -u freepbxuser -p"$MYSQL_PASS" asterisk <<EOF
-- Delete generic catch-alls
DELETE FROM incoming WHERE extension = '' AND cidnum = '';
DELETE FROM incoming WHERE extension = '/' AND cidnum = '';

-- Insert Minimal Catch-All -> IVR 1
INSERT INTO incoming (cidnum, extension, destination, description, pmmaxretries, pmminlength)
VALUES ('', '', 'ivr,1,1', 'Catch All -> IVR', '', '');

EOF

echo "✅ Route Created."
echo "🔄 Reloading Core..."
fwconsole reload
echo "🎉 Done! Try the call now!"
