#!/bin/bash
#
# FreePBX Initial Setup Script
# Run this on a fresh FreePBX installation to prepare for bot self-provisioning
#

set -e

echo "🔧 FreePBX Initial Setup for Bot Self-Provisioning"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ Please run as root (sudo bash setup-freepbx.sh)"
  exit 1
fi

# Get FreePBX database password
echo "📋 Getting FreePBX database credentials..."
DB_PASS=$(grep 'AMPDBPASS' /etc/freepbx.conf | cut -d"'" -f4)
if [ -z "$DB_PASS" ]; then
  echo "❌ Could not find FreePBX database password in /etc/freepbx.conf"
  exit 1
fi
echo "✓ Found database password"

# Get bot subnet
read -p "Enter bot LXC subnet (e.g., 172.16.1.0/24): " BOT_SUBNET
if [ -z "$BOT_SUBNET" ]; then
  echo "❌ Subnet is required"
  exit 1
fi

# Generate strong password for bot provisioning user
BOT_DB_PASS=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)

echo ""
echo "🔐 Creating MySQL user for bot provisioning..."

# Create MySQL user for bots
mysql -u root << EOF
-- Create user for bot provisioning
DROP USER IF EXISTS 'botprov'@'${BOT_SUBNET%/*}%';
CREATE USER 'botprov'@'${BOT_SUBNET%/*}%' IDENTIFIED BY '$BOT_DB_PASS';

-- Grant permissions on asterisk database
GRANT SELECT, INSERT, UPDATE, DELETE ON asterisk.* TO 'botprov'@'${BOT_SUBNET%/*}%';

-- Flush privileges
FLUSH PRIVILEGES;
EOF

echo "✓ Created MySQL user: botprov"
echo "✓ Password: $BOT_DB_PASS"

# Configure firewall
echo ""
echo "🔥 Configuring firewall..."

# Allow MySQL from bot subnet
firewall-cmd --permanent --add-rich-rule="rule family=\"ipv4\" source address=\"$BOT_SUBNET\" port port=\"3306\" protocol=\"tcp\" accept" 2>/dev/null || true

# Allow SIP from bot subnet
firewall-cmd --permanent --add-rich-rule="rule family=\"ipv4\" source address=\"$BOT_SUBNET\" port port=\"5060\" protocol=\"udp\" accept" 2>/dev/null || true

# Allow RTP from bot subnet (for media)
firewall-cmd --permanent --add-rich-rule="rule family=\"ipv4\" source address=\"$BOT_SUBNET\" port port=\"10000-20000\" protocol=\"udp\" accept" 2>/dev/null || true

# Reload firewall
firewall-cmd --reload 2>/dev/null || true

echo "✓ Firewall configured"

# Save credentials to file
CRED_FILE="/root/bot-provisioning-credentials.txt"
cat > "$CRED_FILE" << EOF
# Bot Provisioning Credentials
# Generated: $(date)

FREEPBX_HOST=$(hostname -I | awk '{print $1}')
FREEPBX_DB_USER=botprov
FREEPBX_DB_PASS=$BOT_DB_PASS

# Use these in bot .env files:
# FREEPBX_HOST=$(hostname -I | awk '{print $1}')
# FREEPBX_DB_USER=botprov
# FREEPBX_DB_PASS=$BOT_DB_PASS
EOF

chmod 600 "$CRED_FILE"

echo ""
echo "✅ FreePBX setup complete!"
echo ""
echo "📝 Credentials saved to: $CRED_FILE"
echo ""
echo "🤖 Next steps:"
echo "   1. Configure SIP trunk (Redspot or your provider)"
echo "   2. On each bot LXC, add to ~/.ai-phone/.env:"
echo "      FREEPBX_HOST=$(hostname -I | awk '{print $1}')"
echo "      FREEPBX_DB_USER=botprov"
echo "      FREEPBX_DB_PASS=$BOT_DB_PASS"
echo "   3. Run: ai-phone provision-extension"
echo "   4. Run: ai-phone start"
echo ""
echo "🎉 Bots will self-provision their extensions!"
