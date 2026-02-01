#!/bin/bash
# Standalone IVR provisioner for FreePBX
# Run this directly on the FreePBX server

set -e

echo "🚀 FreePBX IVR Provisioner (Standalone)"
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
curl -sSL https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/cli/mysql-provisioner/provision-ivr-standalone.js -o provision-ivr-standalone.js

echo "📦 Installing dependencies..."
npm init -y > /dev/null 2>&1
npm install mysql2 chalk ora > /dev/null 2>&1

echo "🔧 Running provisioner..."
echo ""
node provision-ivr-standalone.js

echo ""
echo "🔄 Reloading FreePBX..."
fwconsole reload

echo ""
echo "✅ IVR provisioning complete!"
echo ""
echo "Next steps:"
echo "  1. Go to Admin → System Recordings in FreePBX GUI"
echo "  2. Record audio files: welcome-nebuchadnezzar, after-hours, queue-please-wait"
echo "  3. Test by calling your main number and pressing 0"
echo ""

# Cleanup
cd /
rm -rf "$TEMP_DIR"
