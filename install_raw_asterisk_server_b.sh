#!/bin/bash
set -e

echo "🚀 Installing Raw Asterisk on Server B (172.16.1.33)"
echo "   This replaces FreePBX to avoid genConfig bugs"
echo ""

# Update system
echo "📦 Updating system packages..."
apt update
DEBIAN_FRONTEND=noninteractive apt install -y asterisk asterisk-modules asterisk-config

# Stop asterisk to configure it
systemctl stop asterisk

echo "📝 Creating PJSIP configuration..."

# Backup existing configs
cp /etc/asterisk/pjsip.conf /etc/asterisk/pjsip.conf.backup || true
cp /etc/asterisk/extensions.conf /etc/asterisk/extensions.conf.backup || true

# Create PJSIP transport and endpoints
cat > /etc/asterisk/pjsip.conf <<'EOF'
;================== TRANSPORT ==================
[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060

;================== TRUNK TO SERVER A ==================
[to_gateway]
type=endpoint
context=from-trunk
disallow=all
allow=ulaw,alaw
transport=transport-udp
aors=to_gateway
direct_media=no

[to_gateway]
type=aor
contact=sip:172.16.1.26:5060

[to_gateway]
type=identify
endpoint=to_gateway
match=172.16.1.26

;================== BOT EXTENSIONS ==================
; Extension 9000 - Morpheus
[9000]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw
auth=9000
aors=9000
transport=transport-udp

[9000]
type=auth
auth_type=userpass
username=9000
password=GeminiPhone123!
realm=172.16.1.33

[9000]
type=aor
max_contacts=1

; Extension 9001 - Trinity
[9001]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw
auth=9001
aors=9001
transport=transport-udp

[9001]
type=auth
auth_type=userpass
username=9001
password=GeminiPhone123!
realm=172.16.1.33

[9001]
type=aor
max_contacts=1

; Extension 9002 - Neo
[9002]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw
auth=9002
aors=9002
transport=transport-udp

[9002]
type=auth
auth_type=userpass
username=9002
password=GeminiPhone123!
realm=172.16.1.33

[9002]
type=aor
max_contacts=1

; Extension 9003 - Tank
[9003]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw
auth=9003
aors=9003
transport=transport-udp

[9003]
type=auth
auth_type=userpass
username=9003
password=GeminiPhone123!
realm=172.16.1.33

[9003]
type=aor
max_contacts=1

; Extension 9004 - Dozer
[9004]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw
auth=9004
aors=9004
transport=transport-udp

[9004]
type=auth
auth_type=userpass
username=9004
password=GeminiPhone123!
realm=172.16.1.33

[9004]
type=aor
max_contacts=1

; Extension 9005 - Apoc
[9005]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw
auth=9005
aors=9005
transport=transport-udp

[9005]
type=auth
auth_type=userpass
username=9005
password=GeminiPhone123!
realm=172.16.1.33

[9005]
type=aor
max_contacts=1

; Extension 9006 - Switch
[9006]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw
auth=9006
aors=9006
transport=transport-udp

[9006]
type=auth
auth_type=userpass
username=9006
password=GeminiPhone123!
realm=172.16.1.33

[9006]
type=aor
max_contacts=1

; Extension 9007 - Mouse
[9007]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw
auth=9007
aors=9007
transport=transport-udp

[9007]
type=auth
auth_type=userpass
username=9007
password=GeminiPhone123!
realm=172.16.1.33

[9007]
type=aor
max_contacts=1

; Extension 9008 - Cypher
[9008]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw
auth=9008
aors=9008
transport=transport-udp

[9008]
type=auth
auth_type=userpass
username=9008
password=GeminiPhone123!
realm=172.16.1.33

[9008]
type=aor
max_contacts=1
EOF

echo "📝 Creating dialplan..."

# Create basic dialplan
cat > /etc/asterisk/extensions.conf <<'EOF'
[general]
static=yes
writeprotect=no

[from-trunk]
; Calls from Server A - route to extension 9000 for testing
exten => _X.,1,NoOp(Incoming call from Server A)
 same => n,Dial(PJSIP/9000,30)
 same => n,Hangup()

[from-internal]
; Outbound calls from bots - route back to Server A
exten => _X.,1,NoOp(Outbound call from bot ${CALLERID(num)})
 same => n,Dial(PJSIP/${EXTEN}@to_gateway)
 same => n,Hangup()
EOF

echo "✅ Configuration files created"

# Enable and start Asterisk
systemctl enable asterisk
systemctl start asterisk

echo "⏳ Waiting for Asterisk to start..."
sleep 3

echo ""
echo "✅ Verifying configuration..."
asterisk -rx 'pjsip show endpoints'

echo ""
echo "🎉 Raw Asterisk Server B installation complete!"
echo ""
echo "Next steps:"
echo "1. On Server A, update the 'to_maze' trunk to point to 172.16.1.33"
echo "2. On your local machine, restart voice-app:"
echo "   docker restart voice-app"
echo "   docker logs --tail 20 voice-app"
echo ""
echo "You should see 200 OK registrations! 🚀"
