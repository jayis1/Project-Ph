
#!/bin/bash
# create_trunk_fresh.sh - Recreate Gateway Trunk
set -e

echo "🌱 Creating Gateway Trunk from Scratch..."
MYSQL_PASS=$(awk -F'"' '/AMPDBPASS/{print $4}' /etc/freepbx.conf)
# Using your IP (Server A)
SERVER_A_IP="172.16.1.146"

mysql -u freepbxuser -p"$MYSQL_PASS" asterisk <<EOF
-- Clean slate
DELETE FROM pjsip WHERE id LIKE 'Gateway%';

-- 1. Endpoint
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'type', 'endpoint', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'transport', '0.0.0.0-udp', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'context', 'from-pstn', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'disallow', 'all', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'allow', 'ulaw,alaw', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'aors', 'Gateway', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'from_domain', '$SERVER_A_IP', 0);

-- 2. AOR
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'type', 'aor', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'contact', 'sip:$SERVER_A_IP:5060', 0);

-- 3. Identify (Crucial for Inbound!)
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'type', 'identify', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'endpoint', 'Gateway', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'match', '$SERVER_A_IP', 0);
EOF

echo "✅ Database Populated."
echo "🔄 Reloading Core..."
fwconsole reload
echo "🎉 Trunk Created! Call now!"
