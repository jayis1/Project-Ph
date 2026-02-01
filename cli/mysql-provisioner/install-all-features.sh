#!/bin/bash

# Complete FreePBX Provisioning - Matrix AI Scam-Baiting Crew
# Continues on errors to install as many features as possible
# Run this on your FreePBX server to install all 5 provisioning steps


echo "🚀 Installing ALL Gemini Phone FreePBX Features"
echo ""
echo "This will provision:"
echo "  1. IVR, Queue & Inbound Route"
echo "  2. Extension Settings"
echo "  3. Conference Rooms"
echo "  4. Misc Features (Destinations, Feature Codes)"
echo "  5. Advanced Features (Paging, Parking, Queue Callback)"
echo ""

# Create temp directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Download all provisioners directly
echo "📥 Downloading provisioners..."
curl -sSL "https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/cli/mysql-provisioner/provision-ivr-final.js" -o provision-ivr.cjs
curl -sSL "https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/cli/mysql-provisioner/provision-extension-settings.js" -o provision-settings.cjs
curl -sSL "https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/cli/mysql-provisioner/provision-conferences.js" -o provision-conferences.mjs
curl -sSL "https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/cli/mysql-provisioner/provision-misc-features.js" -o provision-misc.mjs
curl -sSL "https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/cli/mysql-provisioner/provision-advanced-features.js" -o provision-advanced.mjs
curl -sSL "https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/cli/mysql-provisioner/fix-bad-destinations.js" -o fix-destinations.mjs

# Setup Node.js environment
echo "📦 Setting up Node.js environment..."
npm init -y > /dev/null 2>&1
# Enable ES modules
echo '{"type": "module"}' > package.json
npm install mysql2 dotenv > /dev/null 2>&1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 1: IVR, Queue & Inbound Route"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node provision-ivr.cjs

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 2: Extension Settings"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node provision-settings.cjs

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 3: Conference Rooms"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node provision-conferences.mjs

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 4: Misc Features"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node provision-misc.mjs

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 5: Advanced Features"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node provision-advanced.mjs

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 6: Fixing Bad Destinations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node fix-destinations.mjs

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎉 ALL FEATURES INSTALLED!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📞 Extensions: 9000-9008 (Morpheus, Trinity, Neo, Tank, Dozer, Apoc, Switch, Mouse, Cypher)"
echo "🎛️  IVR: Nebuchadnezzar (Press 0 for all crew, 1-8 for individuals)"
echo "🎙️  Conferences: 8010-8040 (Command, Operations, Tech, Security)"
echo "🎹 Feature Codes: *1 (IVR), *8001 (Queue), *8010-8040 (Conferences)"
echo "📢 Paging: 7000 (All Crew), 7010-7030 (Departments)"
echo "🅿️  Parking: Dial 70 to park, slots 71-79"
echo "📞 Queue: Callback enabled, priority queuing"
echo ""
echo "✅ Your Matrix AI crew is ready to scam the scammers!"
echo ""

# Cleanup
cd /
rm -rf "$TEMP_DIR"
