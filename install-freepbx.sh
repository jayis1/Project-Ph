#!/bin/bash

# One-Line FreePBX Auto-Provisioner
# Provisions multi-level IVR maze with 13 IVRs and 9 extensions
# Run on FreePBX server: curl -sSL https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/install-freepbx.sh | bash

set -e

echo "🚀 Gemini Phone - FreePBX IVR Maze Auto-Provisioner"
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

echo ""
echo "📦 Installing dependencies..."

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📥 Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Install git if not present
if ! command -v git &> /dev/null; then
    echo "📥 Installing git..."
    apt-get update && apt-get install -y git
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
echo "🚀 Provisioning IVR Maze..."
echo ""
echo "This will create:"
echo "  - 13 IVRs (3-level maze: Main → Departments → Phone Lines)"
echo "  - 9 Extensions (Nebuchadnezzar crew: 9000-9008)"
echo ""

# Run auto-provision (trunks removed from this command)
node bin/gemini-phone.js auto-provision \
    --mysql-password "$MYSQL_PASSWORD"

echo ""
echo "🎉 IVR Maze provisioning complete!"
echo ""
echo "📞 Extensions created:"
echo "   9000: Morpheus (Captain)"
echo "   9001: Trinity (First Mate)"
echo "   9002: Neo (The One)"
echo "   9003: Tank (Operator)"
echo "   9004: Dozer (Pilot)"
echo "   9005: Apoc (Crew)"
echo "   9006: Switch (Crew)"
echo "   9007: Mouse (Crew)"
echo "   9008: Cypher (Traitor)"
echo ""
echo "🎛️  IVR Maze created:"
echo "   Level 1: Main Menu (Nebuchadnezzar Bridge)"
echo "   Level 2: 4 Departments (Operations, Engineering, Security, Training)"
echo "   Level 3: 8 Phone Lines (2 per department)"
echo ""
echo "📋 Next steps:"
echo "   1. Configure SIP trunk manually via FreePBX GUI"
echo "   2. Create inbound route pointing to IVR 1 (Nebuchadnezzar Bridge)"
echo "   3. Test the maze by calling in!"
echo ""
echo "✅ Your Matrix scam-baiting maze is ready!"
echo ""

# Cleanup
cd /
rm -rf "$TEMP_DIR"
