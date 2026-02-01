#!/bin/bash

# One-Line FreePBX Auto-Provisioner
# Detects MySQL password and provisions extensions, IVR, and trunk
# Run on FreePBX server: curl -sSL https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/install-freepbx.sh | bash

set -e

echo "🚀 Gemini Phone - FreePBX Auto-Provisioner"
echo ""

# Auto-detect MySQL password from FreePBX config
if [ -f /etc/freepbx.conf ]; then
    MYSQL_PASSWORD=$(grep AMPDBPASS /etc/freepbx.conf | sed -n 's/.*"\(.*\)".*/\1/p')
    echo "✅ Detected MySQL password from FreePBX config"
else
    echo "❌ FreePBX config not found at /etc/freepbx.conf"
    echo "   Please run this script on a FreePBX server"
    exit 1
fi

# Prompt for trunk details
echo ""
echo "📞 SIP Trunk Configuration"
read -p "Enter your SIP trunk DID number: " TRUNK_NUMBER
read -p "Enter your SIP trunk username: " TRUNK_USERNAME
read -sp "Enter your SIP trunk password: " TRUNK_PASSWORD
echo ""
read -p "Enter your SIP trunk server (default: voice.redspot.dk): " TRUNK_SERVER
TRUNK_SERVER=${TRUNK_SERVER:-voice.redspot.dk}
read -p "Enter your SIP trunk port (default: 5060): " TRUNK_PORT
TRUNK_PORT=${TRUNK_PORT:-5060}

echo ""
echo "📦 Installing dependencies..."

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Install sshpass for SSH automation
if ! command -v sshpass &> /dev/null; then
    apt-get update && apt-get install -y sshpass
fi

# Clone repo to temp directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

echo "📥 Downloading provisioner..."
git clone --depth 1 https://github.com/jayis1/2fast2dumb2fun.git
cd 2fast2dumb2fun/cli

echo "📦 Installing Node dependencies..."
npm install --silent

echo ""
echo "🚀 Running auto-provision..."
echo ""

# Run auto-provision with non-interactive mode
node bin/gemini-phone.js auto-provision \
    --freepbx-host localhost \
    --ssh-user root \
    --ssh-password "$ROOT_PASSWORD" \
    --mysql-user freepbxuser \
    --mysql-password "$MYSQL_PASSWORD" \
    --trunk-number "$TRUNK_NUMBER" \
    --trunk-username "$TRUNK_USERNAME" \
    --trunk-password "$TRUNK_PASSWORD" \
    --trunk-server "$TRUNK_SERVER" \
    --trunk-port "$TRUNK_PORT" \
    --bot-subnet "172.16.1.0/24" \
    --non-interactive

echo ""
echo "🎉 Provisioning complete!"
echo ""
echo "📞 Extensions: 9000-9008 (Morpheus, Trinity, Neo, Tank, Dozer, Apoc, Switch, Mouse, Cypher)"
echo "🎛️  IVR: Press 0-8 to reach different AI agents"
echo "📞 Trunk: $TRUNK_NUMBER configured"
echo ""
echo "✅ Your Matrix AI crew is ready to scam the scammers!"
echo ""

# Cleanup
cd /
rm -rf "$TEMP_DIR"
