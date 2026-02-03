
#!/bin/bash
# rebuild_gateway.sh - Nuke and Pave Gateway Trunk
set -e

echo "🔥 Rebuilding Gateway Trunk with CORRECT Transport (0.0.0.0-udp)..."
MYSQL_PASS=$(awk -F'"' '/AMPDBPASS/{print $4}' /etc/freepbx.conf)
SERVER_A_IP="172.16.1.240"

mysql -u freepbxuser -p"$MYSQL_PASS" asterisk <<EOF
-- Delete everything related to Gateway
DELETE FROM pjsip WHERE id LIKE 'Gateway%';

-- Re-Create Endpoint
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'type', 'endpoint', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'transport', '0.0.0.0-udp', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'context', 'from-pstn', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'disallow', 'all', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'allow', 'ulaw,alaw', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'aors', 'Gateway-a', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'from_domain', '$SERVER_A_IP', 0);

-- Re-Create AOR
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway-a', 'type', 'aor', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway-a', 'contact', 'sip:$SERVER_A_IP:5060', 0);

-- Re-Create Identify
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway-i', 'type', 'identify', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway-i', 'endpoint', 'Gateway', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway-i', 'match', '$SERVER_A_IP', 0);
EOF

echo "✅ Database Refreshed."
echo "🔄 Reloading Core..."
# Reload to apply changes
fwconsole reload
echo "🎉 Done! Gateway Trunk Rebuilt."
exit 0
