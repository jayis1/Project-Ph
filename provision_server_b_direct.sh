#!/bin/bash
set -e

echo "🤖 Direct SQL Bot Provisioning for Server B (172.16.1.29)"
echo "   Bypassing FreePBX genConfig bugs..."

PASS=$(awk -F'"' '/AMPDBPASS/{print $4}' /etc/freepbx.conf)

mysql -u freepbxuser -p"$PASS" asterisk <<SQL
DELETE FROM pjsip WHERE id LIKE '90%';

INSERT INTO pjsip (id, keyword, data, flags) VALUES 
('9000', 'type', 'endpoint', 0), ('9000', 'context', 'from-internal', 0),
('9000', 'disallow', 'all', 0), ('9000', 'allow', 'ulaw,alaw', 0),
('9000', 'auth', '9000-auth', 0), ('9000', 'aors', '9000-aor', 0),
('9000', 'transport', '0.0.0.0-udp', 0),
('9000-auth', 'type', 'auth', 0), ('9000-auth', 'auth_type', 'userpass', 0),
('9000-auth', 'username', '9000', 0), ('9000-auth', 'password', 'GeminiPhone123!', 0),
('9000-auth', 'realm', '172.16.1.29', 0),
('9000-aor', 'type', 'aor', 0), ('9000-aor', 'max_contacts', '1', 0),

('9001', 'type', 'endpoint', 0), ('9001', 'context', 'from-internal', 0),
('9001', 'disallow', 'all', 0), ('9001', 'allow', 'ulaw,alaw', 0),
('9001', 'auth', '9001-auth', 0), ('9001', 'aors', '9001-aor', 0),
('9001', 'transport', '0.0.0.0-udp', 0),
('9001-auth', 'type', 'auth', 0), ('9001-auth', 'auth_type', 'userpass', 0),
('9001-auth', 'username', '9001', 0), ('9001-auth', 'password', 'GeminiPhone123!', 0),
('9001-auth', 'realm', '172.16.1.29', 0),
('9001-aor', 'type', 'aor', 0), ('9001-aor', 'max_contacts', '1', 0),

('9002', 'type', 'endpoint', 0), ('9002', 'context', 'from-internal', 0),
('9002', 'disallow', 'all', 0), ('9002', 'allow', 'ulaw,alaw', 0),
('9002', 'auth', '9002-auth', 0), ('9002', 'aors', '9002-aor', 0),
('9002', 'transport', '0.0.0.0-udp', 0),
('9002-auth', 'type', 'auth', 0), ('9002-auth', 'auth_type', 'userpass', 0),
('9002-auth', 'username', '9002', 0), ('9002-auth', 'password', 'GeminiPhone123!', 0),
('9002-auth', 'realm', '172.16.1.29', 0),
('9002-aor', 'type', 'aor', 0), ('9002-aor', 'max_contacts', '1', 0),

('9003', 'type', 'endpoint', 0), ('9003', 'context', 'from-internal', 0),
('9003', 'disallow', 'all', 0), ('9003', 'allow', 'ulaw,alaw', 0),
('9003', 'auth', '9003-auth', 0), ('9003', 'aors', '9003-aor', 0),
('9003', 'transport', '0.0.0.0-udp', 0),
('9003-auth', 'type', 'auth', 0), ('9003-auth', 'auth_type', 'userpass', 0),
('9003-auth', 'username', '9003', 0), ('9003-auth', 'password', 'GeminiPhone123!', 0),
('9003-auth', 'realm', '172.16.1.29', 0),
('9003-aor', 'type', 'aor', 0), ('9003-aor', 'max_contacts', '1', 0),

('9004', 'type', 'endpoint', 0), ('9004', 'context', 'from-internal', 0),
('9004', 'disallow', 'all', 0), ('9004', 'allow', 'ulaw,alaw', 0),
('9004', 'auth', '9004-auth', 0), ('9004', 'aors', '9004-aor', 0),
('9004', 'transport', '0.0.0.0-udp', 0),
('9004-auth', 'type', 'auth', 0), ('9004-auth', 'auth_type', 'userpass', 0),
('9004-auth', 'username', '9004', 0), ('9004-auth', 'password', 'GeminiPhone123!', 0),
('9004-auth', 'realm', '172.16.1.29', 0),
('9004-aor', 'type', 'aor', 0), ('9004-aor', 'max_contacts', '1', 0),

('9005', 'type', 'endpoint', 0), ('9005', 'context', 'from-internal', 0),
('9005', 'disallow', 'all', 0), ('9005', 'allow', 'ulaw,alaw', 0),
('9005', 'auth', '9005-auth', 0), ('9005', 'aors', '9005-aor', 0),
('9005', 'transport', '0.0.0.0-udp', 0),
('9005-auth', 'type', 'auth', 0), ('9005-auth', 'auth_type', 'userpass', 0),
('9005-auth', 'username', '9005', 0), ('9005-auth', 'password', 'GeminiPhone123!', 0),
('9005-auth', 'realm', '172.16.1.29', 0),
('9005-aor', 'type', 'aor', 0), ('9005-aor', 'max_contacts', '1', 0),

('9006', 'type', 'endpoint', 0), ('9006', 'context', 'from-internal', 0),
('9006', 'disallow', 'all', 0), ('9006', 'allow', 'ulaw,alaw', 0),
('9006', 'auth', '9006-auth', 0), ('9006', 'aors', '9006-aor', 0),
('9006', 'transport', '0.0.0.0-udp', 0),
('9006-auth', 'type', 'auth', 0), ('9006-auth', 'auth_type', 'userpass', 0),
('9006-auth', 'username', '9006', 0), ('9006-auth', 'password', 'GeminiPhone123!', 0),
('9006-auth', 'realm', '172.16.1.29', 0),
('9006-aor', 'type', 'aor', 0), ('9006-aor', 'max_contacts', '1', 0),

('9007', 'type', 'endpoint', 0), ('9007', 'context', 'from-internal', 0),
('9007', 'disallow', 'all', 0), ('9007', 'allow', 'ulaw,alaw', 0),
('9007', 'auth', '9007-auth', 0), ('9007', 'aors', '9007-aor', 0),
('9007', 'transport', '0.0.0.0-udp', 0),
('9007-auth', 'type', 'auth', 0), ('9007-auth', 'auth_type', 'userpass', 0),
('9007-auth', 'username', '9007', 0), ('9007-auth', 'password', 'GeminiPhone123!', 0),
('9007-auth', 'realm', '172.16.1.29', 0),
('9007-aor', 'type', 'aor', 0), ('9007-aor', 'max_contacts', '1', 0),

('9008', 'type', 'endpoint', 0), ('9008', 'context', 'from-internal', 0),
('9008', 'disallow', 'all', 0), ('9008', 'allow', 'ulaw,alaw', 0),
('9008', 'auth', '9008-auth', 0), ('9008', 'aors', '9008-aor', 0),
('9008', 'transport', '0.0.0.0-udp', 0),
('9008-auth', 'type', 'auth', 0), ('9008-auth', 'auth_type', 'userpass', 0),
('9008-auth', 'username', '9008', 0), ('9008-auth', 'password', 'GeminiPhone123!', 0),
('9008-auth', 'realm', '172.16.1.29', 0),
('9008-aor', 'type', 'aor', 0), ('9008-aor', 'max_contacts', '1', 0);
SQL

echo "✅ Database updated. Restarting Asterisk..."
asterisk -rx "core restart now"
sleep 5

echo ""
echo "✅ Verifying endpoints loaded:"
asterisk -x "pjsip show endpoints"

echo ""
echo "🎉 Server B provisioning complete!"
echo "   All 9 bot extensions (9000-9008) are ready for registration."
