#!/bin/bash
# Setup Gateway (172.16.1.35) - Asterisk with Redspot trunk

echo "🔧 Setting up Gateway (Asterisk)..."

# Update system
apt update && apt upgrade -y

# Add Asterisk repo for Debian
apt install -y gnupg2 curl
curl -fsSL https://packages.asterisk.org/gpg.key | gpg --dearmor -o /usr/share/keyrings/asterisk-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/asterisk-archive-keyring.gpg] https://packages.asterisk.org/deb bookworm main" > /etc/apt/sources.list.d/asterisk.list
apt update

# Install Asterisk
apt install -y asterisk

# Configure PJSIP
cat > /etc/asterisk/pjsip.conf <<'EOF'
[global]
max_forwards=70

[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060

; Trunk to Redspot (outside world)
[redspot]
type=endpoint
context=from-external
disallow=all
allow=ulaw,alaw
from_user=88707695
aors=redspot
outbound_auth=redspot

[redspot]
type=auth
auth_type=userpass
username=88707695
password=2fhbcvsTMNK6PJ6

[redspot]
type=aor
contact=sip:voice.redspot.dk:5060
qualify_frequency=60

; Trunk to Controller (FreePBX)
[controller]
type=endpoint
context=from-controller
disallow=all
allow=ulaw,alaw
transport=transport-udp
aors=controller

[controller]
type=identify
endpoint=controller
match=172.16.1.72

[controller]
type=aor
contact=sip:172.16.1.72:5060
qualify_frequency=60
EOF

# Configure dialplan
cat > /etc/asterisk/extensions.conf <<'EOF'
[general]
static=yes
writeprotect=no

; Inbound from Redspot → Controller
[from-external]
exten => _X.,1,NoOp(Inbound from Redspot: ${EXTEN})
 same => n,Dial(PJSIP/${EXTEN}@controller,30)
 same => n,Hangup()

; Outbound from Controller → Redspot
[from-controller]
exten => _X.,1,NoOp(Outbound to Redspot: ${EXTEN})
 same => n,Dial(PJSIP/${EXTEN}@redspot,30)
 same => n,Hangup()
EOF

# Start Asterisk
systemctl enable asterisk
systemctl restart asterisk

echo "✅ Gateway configured!"
echo ""
echo "Verifying endpoints..."
asterisk -rx 'pjsip show endpoints'
