
#!/bin/bash
# debug_gateway.sh - Inspect Gateway Config
echo "🔍 Checking Asterisk Memory..."
asterisk -x "pjsip show endpoint Gateway" | grep transport

echo "------------------------------------------------"
echo "🔍 Checking Database..."
MYSQL_PASS=$(awk -F'"' '/AMPDBPASS/{print $4}' /etc/freepbx.conf)
mysql -u freepbxuser -p"$MYSQL_PASS" asterisk -e "SELECT * FROM pjsip WHERE id='Gateway' AND keyword='transport';"
