#!/bin/bash
# Complete FreePBX Provisioner
# Provisions crew extensions, IVR, queue, and inbound routes

set -e

echo "🚀 Gemini Phone - Complete FreePBX Provisioner"
echo ""
echo "This will provision:"
echo "  • IVR menu 'Nebuchadnezzar' with 10 options"
echo "  • Queue 8001 with all crew members"
echo "  • Inbound route to IVR"
echo "  • Extension settings (Caller ID)"
echo "  • Call flow control (DND, ring time)"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Installing Node.js..."
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs
fi

echo "✓ Node.js $(node --version)"
echo ""

# Create temp directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

echo "📥 Downloading provisioners..."
curl -sSL https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/cli/mysql-provisioner/provision-ivr-final.js -o provision-ivr.cjs

echo "📦 Installing dependencies..."
npm init -y > /dev/null 2>&1
# Set package.json to use ES modules
node -e "const pkg = require('./package.json'); pkg.type = 'module'; require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2));"
npm install mysql2 dotenv > /dev/null 2>&1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 1: Provisioning IVR, Queue & Inbound Route"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
node provision-ivr.cjs

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 2: Configuring Extension Settings"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
curl -sSL "https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/cli/mysql-provisioner/provision-extension-settings.js" -o provision-settings.cjs
node provision-settings.cjs

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎉 PROVISIONING COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Your Gemini Phone system is fully configured:"
echo ""
echo "📞 Extensions:"
echo "   • Morpheus: 9000"
echo "   • Trinity:  9001"
echo "   • Neo:      9002"
echo "   • Tank:     9003"
echo "   • Dozer:    9004"
echo "   • Apoc:     9005"
echo "   • Switch:   9006"
echo "   • Mouse:    9007"
echo "   • Cypher:   9008"
echo ""
echo "🎛️  IVR Menu: Nebuchadnezzar"
echo "   • Press 0: All crew (Queue 8001)"
echo "   • Press 1-8: Individual crew members"
echo ""
echo "📥 Inbound Route: Configured to IVR"
echo ""
echo "✅ Ready to receive calls!"
echo ""

# Cleanup
cd /
rm -rf "$TEMP_DIR"
