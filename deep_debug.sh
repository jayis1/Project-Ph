
#!/bin/bash
# deep_debug.sh - Hunt for the config ghost
MYSQL_PASS=$(awk -F'"' '/AMPDBPASS/{print $4}' /etc/freepbx.conf)

echo "🔍 1. Searching for 'transport-udp' in Database..."
mysql -u freepbxuser -p"$MYSQL_PASS" asterisk -e "SELECT id, keyword, data FROM pjsip WHERE data = 'transport-udp';"

echo "------------------------------------------------"
echo "🔍 2. Searching for 'transport-udp' in /etc/asterisk..."
grep -r "transport-udp" /etc/asterisk

echo "------------------------------------------------"
echo "🔍 3. Checking Available Transports..."
asterisk -x "pjsip show transports"

echo "------------------------------------------------"
echo "🔍 4. Checking Inbound Routes (Why 'Not in Service'?)..."
mysql -u freepbxuser -p"$MYSQL_PASS" asterisk -e "SELECT extension, destination FROM incoming;"

echo "------------------------------------------------"
echo "DONE."
