#!/bin/bash
set -e

echo "🔗 Configuring Server B → Server A Routing"
echo ""

# Read from /dev/tty to work when piped from curl
if [ -t 0 ]; then
    # Running interactively
    read -p "Enter Server A IP address (e.g., 172.16.1.146): " SERVER_A_IP
else
    # Piped from curl, read from terminal
    read -p "Enter Server A IP address (e.g., 172.16.1.146): " SERVER_A_IP </dev/tty
fi

if [ -z "$SERVER_A_IP" ]; then
    echo "❌ Server A IP is required"
    exit 1
fi

echo ""
echo "📋 Configuration:"
echo "   Server A IP: $SERVER_A_IP"
echo "   Server B (this machine): $(hostname -I | awk '{print $1}')"
echo ""

# Get MySQL password from FreePBX config
MYSQL_PASSWORD=$(awk -F"'" '/AMPDBPASS/{print $2}' /etc/freepbx.conf)

if [ -z "$MYSQL_PASSWORD" ]; then
    echo "❌ Could not detect MySQL password from FreePBX config"
    exit 1
fi

echo "✅ Detected MySQL password"
echo ""

# Create trunk to Server A
echo "⏳ Creating SIP trunk to Server A..."
mysql -u freepbxuser -p"$MYSQL_PASSWORD" asterisk << EOF
-- Create trunk entry
INSERT INTO trunks (tech, channelid, name, outcid, keepcid, maxchans, failscript, dialoutprefix, usercontext, provider, disabled, continue, routedisplay)
VALUES ('pjsip', 'GatewayServer', 'GatewayServer', '', 'off', '', '', '', '', '', 'off', 'off', 'on');

-- Get the trunk ID
SET @trunk_id = LAST_INSERT_ID();

-- Create PJSIP endpoint for Server A
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('GatewayServer', 'type', 'endpoint', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('GatewayServer', 'transport', 'transport-udp', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('GatewayServer', 'context', 'from-pstn', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('GatewayServer', 'disallow', 'all', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('GatewayServer', 'allow', 'ulaw,alaw', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('GatewayServer', 'direct_media', 'no', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('GatewayServer', 'from_domain', '$SERVER_A_IP', 0);

-- Create AOR
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('GatewayServer', 'type', 'aor', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('GatewayServer', 'contact', 'sip:$SERVER_A_IP:5060', 0);

-- Create identify for Server A
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('GatewayServer', 'type', 'identify', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('GatewayServer', 'endpoint', 'GatewayServer', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('GatewayServer', 'match', '$SERVER_A_IP', 0);
EOF

echo "✅ Trunk created"
echo ""

# Create outbound route
echo "⏳ Creating outbound route to Server A..."
mysql -u freepbxuser -p"$MYSQL_PASSWORD" asterisk << EOF
-- Create outbound route
INSERT INTO outbound_routes (name, outcid, outcid_mode, password, emergency_route, intracompany_route, mohclass, time_group_id, dest_restriction)
VALUES ('To_Gateway', '', 'default', '', '', '', 'default', NULL, '');

SET @route_id = LAST_INSERT_ID();

-- Add trunk to route
INSERT INTO outbound_route_trunks (route_id, trunk_id, seq)
VALUES (@route_id, (SELECT trunkid FROM trunks WHERE name = 'GatewayServer'), 0);

-- Add dial pattern (match all external numbers)
INSERT INTO outbound_route_patterns (route_id, match_pattern_prefix, match_pattern_pass, prepend_digits, seq)
VALUES (@route_id, '', 'NXXNXXXXXX', '', 0);

-- Add international pattern
INSERT INTO outbound_route_patterns (route_id, match_pattern_prefix, match_pattern_pass, prepend_digits, seq)
VALUES (@route_id, '', 'ZXXXXXXXXX.', '', 1);
EOF

echo "✅ Outbound route created"
echo ""

echo "🎉 Configuration complete!"
echo ""
echo "⚠️  IMPORTANT: You must manually reload FreePBX:"
echo "   Run: fwconsole reload"
echo ""
echo "   If it errors with 'trunk_name' bug, delete the trunk and configure manually via GUI"
echo ""
