#!/bin/bash
# Auto-provision Extension 9000 and Routes on FreePBX Controller

echo "🔧 Configuring FreePBX Controller..."

# Create extension 9000 for Trinity
echo "Creating extension 9000..."
fwconsole pjsip extension add 9000 \
  --displayname="Trinity" \
  --secret="GeminiPhone123!" \
  --allow="ulaw,alaw" \
  --disallow="all"

# Create inbound route (from Gateway to extension 9000)
echo "Creating inbound route..."
mysql asterisk <<EOF
INSERT INTO incoming (description, destination, cidnum)
VALUES ('From Gateway', 'from-did-direct,9000,1', '');
EOF

# Create outbound route (to Gateway trunk)
echo "Creating outbound route..."
mysql asterisk <<EOF
INSERT INTO outbound_routes (name, outcid, seq)
VALUES ('Through Gateway', '', 0);

SET @route_id = LAST_INSERT_ID();

INSERT INTO outbound_route_patterns (route_id, match_pattern_prefix, match_pattern_pass, prepend_digits)
VALUES (@route_id, '', 'X.', '');

INSERT INTO outbound_route_trunks (route_id, trunk_id, seq)
SELECT @route_id, trunk_id, 0
FROM trunks
WHERE name = 'Gateway'
LIMIT 1;
EOF

# Add firewall rules for Gateway and Trinity
echo "Configuring firewall..."
fwconsole firewall add trusted 172.16.1.35 --comment="Gateway" 2>/dev/null || true
fwconsole firewall add trusted 172.16.1.34 --comment="Trinity" 2>/dev/null || true

# Reload FreePBX
echo "Reloading FreePBX..."
fwconsole reload

echo "✅ Configuration complete!"
echo ""
echo "Extension 9000 created for Trinity"
echo "Inbound route: Gateway → 9000"
echo "Outbound route: 9000 → Gateway"
echo "Firewall: Trusted 172.16.1.35, 172.16.1.34"
