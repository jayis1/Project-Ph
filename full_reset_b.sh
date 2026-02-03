
#!/bin/bash
# full_reset_b.sh - TOTAL RESET of Server B PJSIP Config
set -e

echo "☢️  INITIATING FRESH START FOR SERVER B..."

MYSQL_PASS=$(awk -F'"' '/AMPDBPASS/{print $4}' /etc/freepbx.conf)
SERVER_A_IP="172.16.1.146"

mysql -u freepbxuser -p"$MYSQL_PASS" asterisk <<EOF
-- 1. DELETE EVERYTHING related to our setup
DELETE FROM pjsip WHERE id LIKE 'Gateway%';
DELETE FROM pjsip WHERE id LIKE '900%';

-- 2. CREATE GATEWAY TRUNK (Correct Transport)
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway-aor', 'type', 'aor', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway-aor', 'contact', 'sip:$SERVER_A_IP:5060', 0);

INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'type', 'endpoint', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'transport', '0.0.0.0-udp', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'context', 'from-pstn', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'disallow', 'all', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'allow', 'ulaw,alaw', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'aors', 'Gateway-aor', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'from_domain', '$SERVER_A_IP', 0);

INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway-identify', 'type', 'identify', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway-identify', 'endpoint', 'Gateway', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway-identify', 'match', '$SERVER_A_IP', 0);

-- 3. CREATE BOT EXTENSIONS (9000-9008)
-- (Loop in SQL is hard, so we assume standard list)
INSERT INTO pjsip (id, keyword, data, flags) VALUES 
('9000', 'type', 'endpoint'), ('9000', 'transport', '0.0.0.0-udp'), ('9000', 'context', 'from-internal'), ('9000', 'aors', '9000'), ('9000-auth', 'type', 'auth'), ('9000-auth', 'auth_type', 'userpass'), ('9000-auth', 'username', '9000'), ('9000-auth', 'password', 'GeminiPhone123!'),
('9001', 'type', 'endpoint'), ('9001', 'transport', '0.0.0.0-udp'), ('9001', 'context', 'from-internal'), ('9001', 'aors', '9001'), ('9001-auth', 'type', 'auth'), ('9001-auth', 'auth_type', 'userpass'), ('9001-auth', 'username', '9001'), ('9001-auth', 'password', 'GeminiPhone123!'),
('9002', 'type', 'endpoint'), ('9002', 'transport', '0.0.0.0-udp'), ('9002', 'context', 'from-internal'), ('9002', 'aors', '9002'), ('9002-auth', 'type', 'auth'), ('9002-auth', 'auth_type', 'userpass'), ('9002-auth', 'username', '9002'), ('9002-auth', 'password', 'GeminiPhone123!'),
('9003', 'type', 'endpoint'), ('9003', 'transport', '0.0.0.0-udp'), ('9003', 'context', 'from-internal'), ('9003', 'aors', '9003'), ('9003-auth', 'type', 'auth'), ('9003-auth', 'auth_type', 'userpass'), ('9003-auth', 'username', '9003'), ('9003-auth', 'password', 'GeminiPhone123!'),
('9004', 'type', 'endpoint'), ('9004', 'transport', '0.0.0.0-udp'), ('9004', 'context', 'from-internal'), ('9004', 'aors', '9004'), ('9004-auth', 'type', 'auth'), ('9004-auth', 'auth_type', 'userpass'), ('9004-auth', 'username', '9004'), ('9004-auth', 'password', 'GeminiPhone123!'),
('9005', 'type', 'endpoint'), ('9005', 'transport', '0.0.0.0-udp'), ('9005', 'context', 'from-internal'), ('9005', 'aors', '9005'), ('9005-auth', 'type', 'auth'), ('9005-auth', 'auth_type', 'userpass'), ('9005-auth', 'username', '9005'), ('9005-auth', 'password', 'GeminiPhone123!'),
('9006', 'type', 'endpoint'), ('9006', 'transport', '0.0.0.0-udp'), ('9006', 'context', 'from-internal'), ('9006', 'aors', '9006'), ('9006-auth', 'type', 'auth'), ('9006-auth', 'auth_type', 'userpass'), ('9006-auth', 'username', '9006'), ('9006-auth', 'password', 'GeminiPhone123!'),
('9007', 'type', 'endpoint'), ('9007', 'transport', '0.0.0.0-udp'), ('9007', 'context', 'from-internal'), ('9007', 'aors', '9007'), ('9007-auth', 'type', 'auth'), ('9007-auth', 'auth_type', 'userpass'), ('9007-auth', 'username', '9007'), ('9007-auth', 'password', 'GeminiPhone123!'),
('9008', 'type', 'endpoint'), ('9008', 'transport', '0.0.0.0-udp'), ('9008', 'context', 'from-internal'), ('9008', 'aors', '9008'), ('9008-auth', 'type', 'auth'), ('9008-auth', 'auth_type', 'userpass'), ('9008-auth', 'username', '9008'), ('9008-auth', 'password', 'GeminiPhone123!');

-- Enable Auth for Endpoints (Linking)
INSERT INTO pjsip (id, keyword, data, flags) VALUES 
('9000', 'auth', '9000-auth', 0), ('9001', 'auth', '9001-auth', 0), ('9002', 'auth', '9002-auth', 0), ('9003', 'auth', '9003-auth', 0), 
('9004', 'auth', '9004-auth', 0), ('9005', 'auth', '9005-auth', 0), ('9006', 'auth', '9006-auth', 0), ('9007', 'auth', '9007-auth', 0), ('9008', 'auth', '9008-auth', 0);

EOF

echo "✅ Database Cleared & Repopulated."
echo "🔄 Restarting FreePBX (This takes 30s)..."
fwconsole restart
echo "🎉 Fresh Start Complete. ALL Transports are 0.0.0.0-udp."
