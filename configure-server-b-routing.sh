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
MYSQL_PASSWORD=$(awk -F'"' '/AMPDBPASS/{print $4}' /etc/freepbx.conf)

if [ -z "$MYSQL_PASSWORD" ]; then
    echo "❌ Could not detect MySQL password from FreePBX config"
    exit 1
fi

echo "✅ Detected MySQL password"
echo ""

# Create trunk to Server A
echo "⏳ Creating SIP trunk to Server A..."
mysql -u freepbxuser -p"$MYSQL_PASSWORD" asterisk << EOF
-- Clean up any existing entries
DELETE FROM pjsip WHERE id LIKE 'Gateway%';
DELETE FROM trunks WHERE name = 'GatewayServer';
DELETE FROM outbound_routes WHERE name = 'To_Gateway';

-- Create trunk entry
INSERT INTO trunks (tech, channelid, name, outcid, keepcid, maxchans, failscript, dialoutprefix, usercontext, provider, disabled, \`continue\`, routedisplay)
VALUES ('pjsip', 'GatewayServer', 'GatewayServer', '', 'off', '', '', '', '', '', 'off', 'off', 'on');

-- Create PJSIP endpoint
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'type', 'endpoint', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'transport', 'transport-udp', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'context', 'from-pstn', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'disallow', 'all', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'allow', 'ulaw,alaw', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'direct_media', 'no', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'from_domain', '$SERVER_A_IP', 0);

-- Create AOR
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway-a', 'type', 'aor', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway-a', 'contact', 'sip:$SERVER_A_IP:5060', 0);

-- Link endpoint to AOR
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway', 'aors', 'Gateway-a', 0);

-- Create identify
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway-i', 'type', 'identify', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway-i', 'endpoint', 'Gateway', 0);
INSERT INTO pjsip (id, keyword, data, flags) VALUES ('Gateway-i', 'match', '$SERVER_A_IP', 0);

echo "✅ Trunk created"

-- Create outbound route
INSERT INTO outbound_routes (name, outcid, outcid_mode, password, emergency_route, intracompany_route, mohclass, time_group_id)
VALUES ('To_Gateway', '', 'default', '', '', '', 'default', NULL);

SET @route_id = LAST_INSERT_ID();

-- Link trunk to route
INSERT INTO outbound_route_trunks (route_id, trunk_id, seq)
VALUES (@route_id, (SELECT trunkid FROM trunks WHERE name = 'GatewayServer'), 0);

-- Add dial patterns (match_cid is required, blank for any)
INSERT INTO outbound_route_patterns (route_id, match_pattern_prefix, match_pattern_pass, match_cid, prepend_digits)
VALUES (@route_id, '', 'ZXXXXXXX', '', '');

INSERT INTO outbound_route_patterns (route_id, match_pattern_prefix, match_pattern_pass, match_cid, prepend_digits)
VALUES (@route_id, '', '00.', '', '');
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
