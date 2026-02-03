
#!/bin/bash
# correct_sql_fix.sh - Properly structured PJSIP Trunk
set -e

echo "🔧 Creating Gateway Trunk (Corrected SQL)..."
MYSQL_PASS=$(awk -F'"' '/AMPDBPASS/{print $4}' /etc/freepbx.conf)
SERVER_A_IP="172.16.1.146"

mysql -u freepbxuser -p"$MYSQL_PASS" asterisk <<EOF
-- Clean up old mess
DELETE FROM pjsip WHERE id LIKE 'Gateway%';

-- 1. AOR (Gateway-aor)
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway-aor', 'type', 'aor', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway-aor', 'contact', 'sip:$SERVER_A_IP:5060', 0);

-- 2. Endpoint (Gateway)
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'type', 'endpoint', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'transport', '0.0.0.0-udp', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'context', 'from-pstn', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'disallow', 'all', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'allow', 'ulaw,alaw', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'aors', 'Gateway-aor', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'from_domain', '$SERVER_A_IP', 0);

-- 3. Identify (Gateway-identify)
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway-identify', 'type', 'identify', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway-identify', 'endpoint', 'Gateway', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway-identify', 'match', '$SERVER_A_IP', 0);
EOF

echo "✅ Database Updated (No Duplicates!)."
echo "🔄 Reloading Core..."
# Using full restart to be safe, as reload might not catch everything
fwconsole restart
echo "🎉 Done! Gateway should be PERFECT now."
