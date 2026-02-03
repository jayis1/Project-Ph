#!/bin/bash
# Check FreePBX database schema

echo "Checking FreePBX 17 database structure..."

echo ""
echo "=== PJSIP Tables ==="
mysql asterisk -e "SHOW TABLES LIKE '%pjsip%';"

echo ""
echo "=== AOR Tables ==="
mysql asterisk -e "SHOW TABLES LIKE '%aor%';"

echo ""
echo "=== Endpoint Tables ==="
mysql asterisk -e "SHOW TABLES LIKE '%endpoint%';"

echo ""
echo "=== Route Tables ==="
mysql asterisk -e "SHOW TABLES LIKE '%route%';"

echo ""
echo "=== Outbound Routes Structure ==="
mysql asterisk -e "DESCRIBE outbound_routes;" 2>/dev/null || echo "Table doesn't exist or has different name"

echo ""
echo "=== Users/Extensions Tables ==="
mysql asterisk -e "SHOW TABLES LIKE '%user%';"
mysql asterisk -e "SHOW TABLES LIKE '%extension%';"
