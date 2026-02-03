
#!/bin/bash
# final_fix_v2.sh - The "Hammer" approach for Gateway Trunk
set -e

echo "🔨 Applying Final Fix to Gateway Trunk..."
MYSQL_PASS=$(awk -F'"' '/AMPDBPASS/{print $4}' /etc/freepbx.conf)
SERVER_A_IP="172.16.1.146"

# 1. Nuke and Pave
mysql -u freepbxuser -p"$MYSQL_PASS" asterisk <<EOF
DELETE FROM pjsip WHERE id LIKE 'Gateway%';

-- Recreate with 0.0.0.0-udp explicitly
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'type', 'endpoint', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'transport', '0.0.0.0-udp', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'context', 'from-pstn', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'disallow', 'all', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'allow', 'ulaw,alaw', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'aors', 'Gateway', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'from_domain', '$SERVER_A_IP', 0);

INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'type', 'aor', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'contact', 'sip:$SERVER_A_IP:5060', 0);

INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'type', 'identify', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'endpoint', 'Gateway', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'match', '$SERVER_A_IP', 0);
EOF

echo "✅ Database Updated."

# 2. Verify
echo "🔍 VERIFYING DATABASE NOW:"
mysql -u freepbxuser -p"$MYSQL_PASS" asterisk -e "SELECT data FROM pjsip WHERE id='Gateway' AND keyword='transport';"

# 3. Force Reload
echo "🔄 Restarting FreePBX to force config load..."
fwconsole restart

echo "🎉 Done. Call NOW!"
