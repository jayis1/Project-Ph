#!/bin/bash
# Configure existing Asterisk on Server A (installed via Proxmox script)

echo "🧹 Cleaning up failed compilation..."

# Remove compilation artifacts
cd /usr/src
rm -rf asterisk-* *.tar.gz 2>/dev/null

# Clean package cache
apt clean
apt autoclean

echo "✅ Cleanup complete!"
echo ""
df -h /
echo ""

echo "🔧 Configuring existing Asterisk..."

# Configure PJSIP for Gateway
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

# Restart Asterisk
systemctl restart asterisk

echo "✅ Gateway configured!"
echo ""
echo "Verifying endpoints..."
sleep 3
asterisk -rx 'pjsip show endpoints'
