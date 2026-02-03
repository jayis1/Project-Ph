#!/bin/bash
# Configure Server A (FreePBX) to route calls to Server B extensions

SERVER_A_IP="172.16.1.32"
SERVER_B_IP="172.16.1.33"

echo "Configuring Server A to route to Server B..."

# SSH into Server A and configure PJSIP trunk + outbound route
ssh -o StrictHostKeyChecking=no root@$SERVER_A_IP <<'ENDSSH'

# Add trunk to Server B in pjsip.conf
cat >> /etc/asterisk/pjsip_custom.conf <<'EOF'

; Trunk to Server B (Bot Extensions)
[server-b-trunk]
type=endpoint
context=from-trunk
disallow=all
allow=ulaw,alaw
direct_media=no
transport=transport-udp
aors=server-b-trunk

[server-b-trunk]
type=identify
endpoint=server-b-trunk
match=172.16.1.33

[server-b-trunk]
type=aor
contact=sip:172.16.1.33:5060
qualify_frequency=60

EOF

# Add outbound route in extensions_custom.conf
cat >> /etc/asterisk/extensions_custom.conf <<'EOF'

; Route 9xxx extensions to Server B
[from-internal-custom]
exten => _9XXX,1,NoOp(Routing ${EXTEN} to Server B)
 same => n,Dial(PJSIP/${EXTEN}@server-b-trunk,30)
 same => n,Hangup()

EOF

# Reload Asterisk
asterisk -rx "pjsip reload"
asterisk -rx "dialplan reload"

echo "Server A routing configured!"
echo "You can now dial 9009 from Server A to reach Trinity"

ENDSSH

echo "Done! Test by dialing 9009 from any phone on Server A"
