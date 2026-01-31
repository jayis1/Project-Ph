#!/bin/bash

# Provision all Nebuchadnezzar crew extensions on FreePBX
# Run this from any crew member LXC (e.g., Trinity)

set -e

FREEPBX_IP="${1:-172.16.1.63}"
FREEPBX_PASSWORD="${2}"

if [ -z "$FREEPBX_PASSWORD" ]; then
    echo "Usage: $0 <freepbx-ip> <freepbx-root-password>"
    echo "Example: $0 172.16.1.63 mypassword"
    exit 1
fi

echo "🚢 Provisioning Nebuchadnezzar Crew Extensions on FreePBX"
echo "   FreePBX: $FREEPBX_IP"
echo ""

# Create SQL script on FreePBX
ssh root@$FREEPBX_IP << 'ENDSSH'

# Get MySQL password from FreePBX config
MYSQL_PASS=$(grep AMPDBPASS /etc/freepbx.conf | cut -d'"' -f2)

echo "📝 Creating extensions 9000-9008..."

# Create all extensions via MySQL
mysql -u freepbxuser -p$MYSQL_PASS asterisk << 'EOF'
-- Morpheus (9000)
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9000', 'account', '9000', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9000', 'callerid', 'Morpheus (AI) <9000>', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9000', 'context', 'from-internal', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9000', 'dial', 'PJSIP/9000', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9000', 'secret', 'GeminiPhone123!', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9000', 'sipdriver', 'chan_pjsip', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9000', 'dtmfmode', 'rfc4733', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9000', 'rtp_symmetric', 'yes', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9000', 'force_rport', 'yes', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9000', 'direct_media', 'yes', 0);

-- Neo (9002)
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9002', 'account', '9002', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9002', 'callerid', 'Neo (AI) <9002>', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9002', 'context', 'from-internal', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9002', 'dial', 'PJSIP/9002', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9002', 'secret', 'GeminiPhone123!', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9002', 'sipdriver', 'chan_pjsip', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9002', 'dtmfmode', 'rfc4733', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9002', 'rtp_symmetric', 'yes', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9002', 'force_rport', 'yes', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9002', 'direct_media', 'yes', 0);

-- Tank (9003)
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9003', 'account', '9003', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9003', 'callerid', 'Tank (AI) <9003>', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9003', 'context', 'from-internal', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9003', 'dial', 'PJSIP/9003', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9003', 'secret', 'GeminiPhone123!', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9003', 'sipdriver', 'chan_pjsip', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9003', 'dtmfmode', 'rfc4733', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9003', 'rtp_symmetric', 'yes', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9003', 'force_rport', 'yes', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9003', 'direct_media', 'yes', 0);

-- Dozer (9004)
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9004', 'account', '9004', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9004', 'callerid', 'Dozer (AI) <9004>', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9004', 'context', 'from-internal', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9004', 'dial', 'PJSIP/9004', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9004', 'secret', 'GeminiPhone123!', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9004', 'sipdriver', 'chan_pjsip', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9004', 'dtmfmode', 'rfc4733', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9004', 'rtp_symmetric', 'yes', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9004', 'force_rport', 'yes', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9004', 'direct_media', 'yes', 0);

-- Apoc (9005)
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9005', 'account', '9005', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9005', 'callerid', 'Apoc (AI) <9005>', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9005', 'context', 'from-internal', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9005', 'dial', 'PJSIP/9005', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9005', 'secret', 'GeminiPhone123!', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9005', 'sipdriver', 'chan_pjsip', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9005', 'dtmfmode', 'rfc4733', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9005', 'rtp_symmetric', 'yes', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9005', 'force_rport', 'yes', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9005', 'direct_media', 'yes', 0);

-- Switch (9006)
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9006', 'account', '9006', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9006', 'callerid', 'Switch (AI) <9006>', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9006', 'context', 'from-internal', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9006', 'dial', 'PJSIP/9006', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9006', 'secret', 'GeminiPhone123!', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9006', 'sipdriver', 'chan_pjsip', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9006', 'dtmfmode', 'rfc4733', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9006', 'rtp_symmetric', 'yes', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9006', 'force_rport', 'yes', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9006', 'direct_media', 'yes', 0);

-- Mouse (9007)
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9007', 'account', '9007', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9007', 'callerid', 'Mouse (AI) <9007>', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9007', 'context', 'from-internal', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9007', 'dial', 'PJSIP/9007', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9007', 'secret', 'GeminiPhone123!', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9007', 'sipdriver', 'chan_pjsip', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9007', 'dtmfmode', 'rfc4733', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9007', 'rtp_symmetric', 'yes', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9007', 'force_rport', 'yes', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9007', 'direct_media', 'yes', 0);

-- Cypher (9008)
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9008', 'account', '9008', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9008', 'callerid', 'Cypher (AI) <9008>', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9008', 'context', 'from-internal', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9008', 'dial', 'PJSIP/9008', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9008', 'secret', 'GeminiPhone123!', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9008', 'sipdriver', 'chan_pjsip', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9008', 'dtmfmode', 'rfc4733', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9008', 'rtp_symmetric', 'yes', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9008', 'force_rport', 'yes', 0);
INSERT IGNORE INTO sip (id, keyword, data, flags) VALUES ('9008', 'direct_media', 'yes', 0);
EOF

echo "✓ Extensions created"

# Reload FreePBX
echo "🔄 Reloading FreePBX..."
fwconsole reload > /dev/null 2>&1

# Show created extensions
echo ""
echo "📋 Created extensions:"
mysql -u freepbxuser -p$MYSQL_PASS asterisk -e "SELECT DISTINCT id, (SELECT data FROM sip s2 WHERE s2.id = s1.id AND s2.keyword = 'callerid' LIMIT 1) as name FROM sip s1 WHERE id LIKE '900%' ORDER BY id;" 2>/dev/null

ENDSSH

echo ""
echo "✅ All crew extensions provisioned!"
echo ""
echo "Next steps:"
echo "  1. Deploy crew member LXCs (Morpheus, Neo, Tank, etc.)"
echo "  2. Run: curl -sSL https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/install.sh | bash"
echo "  3. Run: gemini-phone setup (use password: GeminiPhone123!)"
echo "  4. Run: gemini-phone start"
echo ""
