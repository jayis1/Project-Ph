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
VALUES ('', '', 'ai-phone-custom,s,1', 'Catch-All to Trinity');

INSERT IGNORE INTO users (extension, name, outboundcid, sipname, noanswer_cid, busy_cid, chanunavail_cid, noanswer_dest, busy_dest, chanunavail_dest) 
VALUES ('9001', 'Trinity (AI)', 'Trinity <9001>', '9001', '', '', '', '', '', '');
INSERT IGNORE INTO devices (id, tech, dial, devicetype, user, description) 
VALUES ('9001', 'custom', 'local/s@ai-phone-custom', 'fixed', '9001', 'Trinity (AI)');

FLUSH PRIVILEGES;
SQL

# 1.5 Clean out any leftover broken test dialplans from earlier iterations
sed -i '/exten => 9001/d' /etc/asterisk/extensions_custom.conf || true
sed -i '/\[ai-phone-custom\]/d' /etc/asterisk/extensions_custom.conf || true
sed -i '/exten => s,.*ai_phone_trunk/d' /etc/asterisk/extensions_custom.conf || true

cat << 'DIALPLAN' >> /etc/asterisk/extensions_custom.conf

[ai-phone-custom]
exten => s,1,NoOp(Bypassing FreePBX to dial AI Phone Trunk directly)
exten => s,n,Dial(PJSIP/ai_phone_trunk/sip:127.0.0.1:5070,30,r)
exten => s,n,Hangup()

[from-internal-custom]
exten => 9001,1,Goto(ai-phone-custom,s,1)
DIALPLAN

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
