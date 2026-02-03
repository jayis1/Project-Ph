
#!/bin/bash
# fix_inbound.sh - Create Catch-All Inbound Route on Server B
set -e

echo "🔧 Configuring Catch-All Inbound Route -> IVR..."

MYSQL_PASS=$(awk -F'"' '/AMPDBPASS/{print $4}' /etc/freepbx.conf)

mysql -u freepbxuser -p"$MYSQL_PASS" asterisk <<EOF
-- Delete existing catch-all if any
DELETE FROM incoming WHERE extension = '' AND cidnum = '';

-- Insert Catch-All pointing to IVR 1 (Nebuchadnezzar)
INSERT INTO incoming (cidnum, extension, destination, privacymanager, alertinfo, ringing, delay_answer, pricid, pmmaxretries, pmminlength, description, grppre)
VALUES ('', '', 'ivr,1,1', '0', '', '', '0', '', '', '', 'Catch All -> IVR', '');

EOF

echo "✅ Route Created."
echo "🔄 Reloading Core..."
fwconsole reload
echo "🎉 Done! All incoming calls should now hit the IVR."
echo "   Please try the Redspot call again."
