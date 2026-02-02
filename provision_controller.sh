#!/bin/bash
# Auto-provision Extension 9000 and Routes on FreePBX 17 Controller

echo "🔧 Configuring FreePBX Controller..."

# Create extension 9000 via database
echo "Creating extension 9000..."
mysql asterisk <<'EOF'
-- Create PJSIP extension 9000
INSERT IGNORE INTO pjsip (id, keyword, data, flags) VALUES
('9000', 'type', 'endpoint', 2),
('9000', 'aors', '9000', 3),
('9000', 'auth', '9000', 4),
('9000', 'context', 'from-internal', 5),
('9000', 'disallow', 'all', 6),
('9000', 'allow', 'ulaw', 7),
('9000', 'allow', 'alaw', 8);

-- Create AOR for 9000
INSERT IGNORE INTO ps_aors (id, max_contacts) VALUES
('9000', 1);

-- Create auth for 9000
INSERT IGNORE INTO ps_auths (id, auth_type, password, username) VALUES
('9000', 'userpass', 'GeminiPhone123!', '9000');

-- Create endpoint in ps_endpoints
INSERT IGNORE INTO ps_endpoints (id, transport, aors, auth, context, disallow, allow, direct_media, callerid, mailboxes) VALUES
('9000', 'transport-udp', '9000', '9000', 'from-internal', 'all', 'ulaw,alaw', 'no', 'Trinity <9000>', '9000@default');

-- Add to users table
INSERT IGNORE INTO users (extension, name, voicemail) VALUES
('9000', 'Trinity', 'novm');
EOF

# Create inbound route (match all, send to 9000)
echo "Creating inbound route..."
mysql asterisk <<'EOF'
INSERT IGNORE INTO incoming (description, destination, cidnum)
VALUES ('From Gateway', 'from-did-direct,9000,1', '');
EOF

# Create outbound route (to Gateway trunk)
echo "Creating outbound route..."
mysql asterisk <<'EOF'
-- Create outbound route
INSERT IGNORE INTO outbound_routes (name, outcid, seq)
VALUES ('Through Gateway', '', 0);

-- Get the route ID
SET @route_id = (SELECT route_id FROM outbound_routes WHERE name = 'Through Gateway' LIMIT 1);

-- Add dial pattern (match any number)
INSERT IGNORE INTO outbound_route_patterns (route_id, match_pattern_prefix, match_pattern_pass, prepend_digits)
VALUES (@route_id, '', 'X.', '');

-- Add Gateway trunk to route
INSERT IGNORE INTO outbound_route_trunks (route_id, trunk_id, seq)
SELECT @route_id, trunkid, 0
FROM trunks
WHERE name = 'Gateway'
LIMIT 1;
EOF

# Add firewall rules
echo "Configuring firewall..."
fwconsole firewall add trusted 172.16.1.35 --comment="Gateway" 2>/dev/null || echo "Firewall: Gateway already trusted"
fwconsole firewall add trusted 172.16.1.34 --comment="Trinity" 2>/dev/null || echo "Firewall: Trinity already trusted"

# Reload FreePBX
echo "Reloading FreePBX..."
fwconsole reload

echo ""
echo "✅ Configuration complete!"
echo ""
echo "Created:"
echo "  - Extension 9000 (Trinity) - Password: GeminiPhone123!"
echo "  - Inbound route: Gateway → 9000"
echo "  - Outbound route: 9000 → Gateway"
echo "  - Firewall: Trusted 172.16.1.35, 172.16.1.34"
echo ""
echo "Next: Deploy Trinity bot at 172.16.1.34"
