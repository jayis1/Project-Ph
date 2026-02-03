#!/bin/bash
set -e

echo "📝 Creating manual PJSIP config files for bots (bypassing FreePBX bugs)..."

# Create endpoint config
cat > /etc/asterisk/pjsip.endpoint_custom.conf <<'EOF'
; Bot endpoints 9000-9008 (manually created)
[9000]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw
auth=9000-auth
aors=9000-aor
transport=0.0.0.0-udp

[9001]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw
auth=9001-auth
aors=9001-aor
transport=0.0.0.0-udp

[9002]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw
auth=9002-auth
aors=9002-aor
transport=0.0.0.0-udp

[9003]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw
auth=9003-auth
aors=9003-aor
transport=0.0.0.0-udp

[9004]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw
auth=9004-auth
aors=9004-aor
transport=0.0.0.0-udp

[9005]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw
auth=9005-auth
aors=9005-aor
transport=0.0.0.0-udp

[9006]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw
auth=9006-auth
aors=9006-aor
transport=0.0.0.0-udp

[9007]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw
auth=9007-auth
aors=9007-aor
transport=0.0.0.0-udp

[9008]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw
auth=9008-auth
aors=9008-aor
transport=0.0.0.0-udp
EOF

# Create AOR config
cat > /etc/asterisk/pjsip.aor_custom.conf <<'EOF'
; Bot AORs 9000-9008
[9000-aor]
type=aor
max_contacts=1

[9001-aor]
type=aor
max_contacts=1

[9002-aor]
type=aor
max_contacts=1

[9003-aor]
type=aor
max_contacts=1

[9004-aor]
type=aor
max_contacts=1

[9005-aor]
type=aor
max_contacts=1

[9006-aor]
type=aor
max_contacts=1

[9007-aor]
type=aor
max_contacts=1

[9008-aor]
type=aor
max_contacts=1
EOF

# Create auth config
cat > /etc/asterisk/pjsip.auth_custom.conf <<'EOF'
; Bot auth 9000-9008
[9000-auth]
type=auth
auth_type=userpass
username=9000
password=GeminiPhone123!
realm=172.16.1.29

[9001-auth]
type=auth
auth_type=userpass
username=9001
password=GeminiPhone123!
realm=172.16.1.29

[9002-auth]
type=auth
auth_type=userpass
username=9002
password=GeminiPhone123!
realm=172.16.1.29

[9003-auth]
type=auth
auth_type=userpass
username=9003
password=GeminiPhone123!
realm=172.16.1.29

[9004-auth]
type=auth
auth_type=userpass
username=9004
password=GeminiPhone123!
realm=172.16.1.29

[9005-auth]
type=auth
auth_type=userpass
username=9005
password=GeminiPhone123!
realm=172.16.1.29

[9006-auth]
type=auth
auth_type=userpass
username=9006
password=GeminiPhone123!
realm=172.16.1.29

[9007-auth]
type=auth
auth_type=userpass
username=9007
password=GeminiPhone123!
realm=172.16.1.29

[9008-auth]
type=auth
auth_type=userpass
username=9008
password=GeminiPhone123!
realm=172.16.1.29
EOF

echo "✅ Config files created"
echo "♻️  Restarting Asterisk..."
asterisk -rx "core restart now"
sleep 5

echo ""
echo "✅ Verifying bot endpoints:"
asterisk -x "pjsip show endpoints"

echo ""
echo "🎉 Manual config complete! Bots should now appear"
