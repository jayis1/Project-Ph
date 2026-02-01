#!/bin/bash
# One-line IVR provisioner for FreePBX
# Run this directly on the FreePBX server

set -e

echo "🚀 FreePBX IVR Provisioner"
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

echo "📥 Downloading provisioner..."
curl -sSL https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/cli/mysql-provisioner/provision-ivr-final.js -o provision-ivr-final.js

echo "📦 Installing dependencies..."
npm init -y > /dev/null 2>&1
npm install mysql2 dotenv > /dev/null 2>&1

echo "🔧 Running provisioner..."
echo ""
node provision-ivr-final.js

echo ""
echo "✅ IVR provisioning complete!"
echo ""
echo "Next steps:"
echo "  1. Configure Inbound Route in FreePBX GUI"
echo "  2. Set destination to: IVR → Nebuchadnezzar"
echo "  3. Test by calling your main number"
echo ""

# Cleanup
cd /
rm -rf "$TEMP_DIR"
