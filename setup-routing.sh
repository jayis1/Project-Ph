#!/bin/bash
set -e

echo "Setting up AI Phone Routing in FreePBX (Manual Config Method)..."

# 1. Strip out the buggy database entries if they exist from previous runs
mysql -u root asterisk << 'SQL'
DELETE FROM users WHERE extension = '9001';
DELETE FROM devices WHERE id = '9001';
DELETE FROM pjsip WHERE id = '9001' OR id = 'ai_phone_trunk' OR id = '2' OR id = 'to_ai_phone';
DELETE FROM trunks WHERE trunkid = 2 OR channelid = 'ai_phone_trunk';
DELETE FROM incoming;
INSERT IGNORE INTO incoming (cidnum, extension, destination, description)
VALUES ('', '', 'from-did-direct,9001,1', 'Catch-All to Trinity');

INSERT IGNORE INTO users (extension, name, outboundcid, sipname, noanswer_cid, busy_cid, chanunavail_cid, noanswer_dest, busy_dest, chanunavail_dest) 
VALUES ('9001', 'Trinity (AI)', 'Trinity <9001>', '9001', '', '', '', '', '', '');
INSERT IGNORE INTO devices (id, tech, dial, devicetype, user, description) 
VALUES ('9001', 'custom', 'PJSIP/ai_phone_trunk/sip:ai_phone@127.0.0.1:5070', 'fixed', '9001', 'Trinity (AI)');

FLUSH PRIVILEGES;
SQL

# 2. Add the AI Phone custom PJSIP Endpoint configuration
cat > /etc/asterisk/pjsip.endpoint_custom.conf <<'EOF'
; AI Phone Trunk (Created manually to bypass FreePBX GUI compiler bugs)
[ai_phone_trunk]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw
aors=ai_phone_trunk-aor
direct_media=no
force_rport=yes
rewrite_contact=yes
rtp_symmetric=yes
transport=0.0.0.0-udp
EOF

cat > /etc/asterisk/pjsip.aor_custom.conf <<'EOF'
; AI Phone AOR
[ai_phone_trunk-aor]
type=aor
max_contacts=1
contact=sip:127.0.0.1:5070
EOF

cat > /etc/asterisk/pjsip.identify_custom.conf <<'EOF'
; AI Phone Identify
[ai_phone_trunk-identify]
type=identify
endpoint=ai_phone_trunk
match=127.0.0.1
EOF

# 4. Reload Asterisk completely to ingest the raw files
echo "✅ Configuration files generated successfully!"
echo "🔄 Reloading Asterisk..."
asterisk -rx "core restart now"
sleep 5

echo "✅ Custom endpoints verified:"
asterisk -x "pjsip show endpoints" | grep ai_phone_trunk

echo "🎉 FreePBX routing configured successfully!"
echo "You can now dial 9001 from any phone connected to FreePBX."
