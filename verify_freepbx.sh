#!/bin/bash
# Verify FreePBX configuration and fix routes

echo "🔍 Checking what was created..."

echo ""
echo "=== Extension 9000 ==="
mysql asterisk -e "SELECT keyword, data FROM pjsip WHERE id='9000' ORDER BY keyword;"

echo ""
echo "=== Inbound Routes ==="
mysql asterisk -e "SELECT * FROM incoming WHERE description LIKE '%Gateway%';" 2>/dev/null || echo "Schema might be different"

echo ""
echo "=== Outbound Routes ==="
mysql asterisk -e "DESCRIBE outbound_routes;" 2>/dev/null
mysql asterisk -e "SELECT * FROM outbound_routes WHERE name LIKE '%Gateway%';" 2>/dev/null || echo "Need to check schema"

echo ""
echo "=== Trunks ==="
mysql asterisk -e "SELECT trunkid, name, tech FROM trunks;"

echo ""
echo "=== Next: Use FreePBX GUI for routes if needed ==="
echo "Go to: http://172.16.1.72"
echo "  - Connectivity → Inbound Routes"
echo "  - Connectivity → Outbound Routes"
