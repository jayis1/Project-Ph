#!/bin/bash
# provision_bots_complete.sh - Complete Bot Provisioning for Server B
set -e

echo "🤖 Provisioning ALL Bots (9000-9008) on Server B..."

MYSQL_PASS=$(awk -F'"' '/AMPDBPASS/{print $4}' /etc/freepbx.conf)
PASSWORD="GeminiPhone123!"

mysql -u freepbxuser -p"$MYSQL_PASS" asterisk <<EOF
-- Clean slate for bots
DELETE FROM pjsip WHERE id LIKE '90%';

-- Bot 9000 (Morpheus)
INSERT INTO pjsip (id, keyword, data, flags) VALUES 
('9000', 'type', 'endpoint', 0),
('9000', 'transport', '0.0.0.0-udp', 0),
('9000', 'context', 'from-internal', 0),
('9000', 'disallow', 'all', 0),
('9000', 'allow', 'ulaw,alaw', 0),
('9000', 'auth', '9000-auth', 0),
('9000', 'aors', '9000', 0),
('9000-auth', 'type', 'auth', 0),
('9000-auth', 'auth_type', 'userpass', 0),
('9000-auth', 'username', '9000', 0),
('9000-auth', 'password', '$PASSWORD', 0),
('9000', 'type', 'aor', 1),
('9000', 'max_contacts', '1', 1);

-- Bot 9001 (Trinity)
INSERT INTO pjsip (id, keyword, data, flags) VALUES 
('9001', 'type', 'endpoint', 0),
('9001', 'transport', '0.0.0.0-udp', 0),
('9001', 'context', 'from-internal', 0),
('9001', 'disallow', 'all', 0),
('9001', 'allow', 'ulaw,alaw', 0),
('9001', 'auth', '9001-auth', 0),
('9001', 'aors', '9001', 0),
('9001-auth', 'type', 'auth', 0),
('9001-auth', 'auth_type', 'userpass', 0),
('9001-auth', 'username', '9001', 0),
('9001-auth', 'password', '$PASSWORD', 0),
('9001', 'type', 'aor', 1),
('9001', 'max_contacts', '1', 1);

-- Bot 9002 (Neo)
INSERT INTO pjsip (id, keyword, data, flags) VALUES 
('9002', 'type', 'endpoint', 0),
('9002', 'transport', '0.0.0.0-udp', 0),
('9002', 'context', 'from-internal', 0),
('9002', 'disallow', 'all', 0),
('9002', 'allow', 'ulaw,alaw', 0),
('9002', 'auth', '9002-auth', 0),
('9002', 'aors', '9002', 0),
('9002-auth', 'type', 'auth', 0),
('9002-auth', 'auth_type', 'userpass', 0),
('9002-auth', 'username', '9002', 0),
('9002-auth', 'password', '$PASSWORD', 0),
('9002', 'type', 'aor', 1),
('9002', 'max_contacts', '1', 1);

-- Bot 9003 (Tank)
INSERT INTO pjsip (id, keyword, data, flags) VALUES 
('9003', 'type', 'endpoint', 0),
('9003', 'transport', '0.0.0.0-udp', 0),
('9003', 'context', 'from-internal', 0),
('9003', 'disallow', 'all', 0),
('9003', 'allow', 'ulaw,alaw', 0),
('9003', 'auth', '9003-auth', 0),
('9003', 'aors', '9003', 0),
('9003-auth', 'type', 'auth', 0),
('9003-auth', 'auth_type', 'userpass', 0),
('9003-auth', 'username', '9003', 0),
('9003-auth', 'password', '$PASSWORD', 0),
('9003', 'type', 'aor', 1),
('9003', 'max_contacts', '1', 1);

-- Bot 9004 (Dozer)
INSERT INTO pjsip (id, keyword, data, flags) VALUES 
('9004', 'type', 'endpoint', 0),
('9004', 'transport', '0.0.0.0-udp', 0),
('9004', 'context', 'from-internal', 0),
('9004', 'disallow', 'all', 0),
('9004', 'allow', 'ulaw,alaw', 0),
('9004', 'auth', '9004-auth', 0),
('9004', 'aors', '9004', 0),
('9004-auth', 'type', 'auth', 0),
('9004-auth', 'auth_type', 'userpass', 0),
('9004-auth', 'username', '9004', 0),
('9004-auth', 'password', '$PASSWORD', 0),
('9004', 'type', 'aor', 1),
('9004', 'max_contacts', '1', 1);

-- Bot 9005 (Apoc)
INSERT INTO pjsip (id, keyword, data, flags) VALUES 
('9005', 'type', 'endpoint', 0),
('9005', 'transport', '0.0.0.0-udp', 0),
('9005', 'context', 'from-internal', 0),
('9005', 'disallow', 'all', 0),
('9005', 'allow', 'ulaw,alaw', 0),
('9005', 'auth', '9005-auth', 0),
('9005', 'aors', '9005', 0),
('9005-auth', 'type', 'auth', 0),
('9005-auth', 'auth_type', 'userpass', 0),
('9005-auth', 'username', '9005', 0),
('9005-auth', 'password', '$PASSWORD', 0),
('9005', 'type', 'aor', 1),
('9005', 'max_contacts', '1', 1);

-- Bot 9006 (Switch)
INSERT INTO pjsip (id, keyword, data, flags) VALUES 
('9006', 'type', 'endpoint', 0),
('9006', 'transport', '0.0.0.0-udp', 0),
('9006', 'context', 'from-internal', 0),
('9006', 'disallow', 'all', 0),
('9006', 'allow', 'ulaw,alaw', 0),
('9006', 'auth', '9006-auth', 0),
('9006', 'aors', '9006', 0),
('9006-auth', 'type', 'auth', 0),
('9006-auth', 'auth_type', 'userpass', 0),
('9006-auth', 'username', '9006', 0),
('9006-auth', 'password', '$PASSWORD', 0),
('9006', 'type', 'aor', 1),
('9006', 'max_contacts', '1', 1);

-- Bot 9007 (Mouse)
INSERT INTO pjsip (id, keyword, data, flags) VALUES 
('9007', 'type', 'endpoint', 0),
('9007', 'transport', '0.0.0.0-udp', 0),
('9007', 'context', 'from-internal', 0),
('9007', 'disallow', 'all', 0),
('9007', 'allow', 'ulaw,alaw', 0),
('9007', 'auth', '9007-auth', 0),
('9007', 'aors', '9007', 0),
('9007-auth', 'type', 'auth', 0),
('9007-auth', 'auth_type', 'userpass', 0),
('9007-auth', 'username', '9007', 0),
('9007-auth', 'password', '$PASSWORD', 0),
('9007', 'type', 'aor', 1),
('9007', 'max_contacts', '1', 1);

-- Bot 9008 (Cypher)
INSERT INTO pjsip (id, keyword, data, flags) VALUES 
('9008', 'type', 'endpoint', 0),
('9008', 'transport', '0.0.0.0-udp', 0),
('9008', 'context', 'from-internal', 0),
('9008', 'disallow', 'all', 0),
('9008', 'allow', 'ulaw,alaw', 0),
('9008', 'auth', '9008-auth', 0),
('9008', 'aors', '9008', 0),
('9008-auth', 'type', 'auth', 0),
('9008-auth', 'auth_type', 'userpass', 0),
('9008-auth', 'username', '9008', 0),
('9008-auth', 'password', '$PASSWORD', 0),
('9008', 'type', 'aor', 1),
('9008', 'max_contacts', '1', 1);

EOF

echo "✅ All Bots Provisioned Successfully!"
echo "🔄 Restarting FreePBX..."
fwconsole restart
echo "🎉 Done! Bots should register in ~5 seconds."
