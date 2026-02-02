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

# Check if FreePBX is installed and configured
if [ ! -f /etc/freepbx.conf ]; then
    echo "❌ FreePBX config not found at /etc/freepbx.conf"
    echo ""
    echo "Please complete the FreePBX web setup wizard first:"
    echo "  1. Open http://$(hostname -I | awk '{print $1}') in your browser"
    echo "  2. Complete the setup wizard"
    echo "  3. Then run this script again"
    echo ""
    exit 1
fi

# Auto-detect MySQL password from FreePBX config
MYSQL_PASSWORD=$(grep AMPDBPASS /etc/freepbx.conf | sed -n 's/.*"\(.*\)".*/\1/p')

if [ -z "$MYSQL_PASSWORD" ]; then
    echo "❌ Could not detect MySQL password from FreePBX config"
    echo ""
    echo "Please complete the FreePBX web setup wizard first:"
    echo "  1. Open http://$(hostname -I | awk '{print $1}') in your browser"
    echo "  2. Complete the setup wizard"
    echo "  3. Then run this script again"
    echo ""
    exit 1
fi

echo "✅ Detected MySQL password from FreePBX config"

# Test MySQL connection
if ! mysql -u freepbxuser -p"$MYSQL_PASSWORD" asterisk -e "SELECT 1" > /dev/null 2>&1; then
    echo "❌ MySQL connection failed"
    echo ""
    echo "The password was detected but MySQL connection failed."
    echo "Please verify FreePBX is fully set up and try again."
    echo ""
    exit 1
fi

echo "✅ MySQL connection successful"

# Create .env file with detected password
mkdir -p ~/.gemini-phone
# Create .env file with detected password (safely to handle special chars)
mkdir -p ~/.gemini-phone
cat > ~/.gemini-phone/.env << 'EOF'
MYSQL_HOST=localhost
MYSQL_USER=freepbxuser
MYSQL_DATABASE=asterisk
EOF

# Append password safely (handling special chars like $ by using single quotes)
# Note: This might break if the password contains a single quote, but FreePBX passwords usually don't.
echo "MYSQL_PASSWORD='$MYSQL_PASSWORD'" >> ~/.gemini-phone/.env
echo "FREEPBX_DB_PASSWORD='$MYSQL_PASSWORD'" >> ~/.gemini-phone/.env
echo "FREEPBX_MYSQL_PASSWORD='$MYSQL_PASSWORD'" >> ~/.gemini-phone/.env

echo "✅ Created .env file with MySQL credentials"
echo ""

# Create temp directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Download all provisioners directly
# Download all provisioners directly (with cache busting)
TS=$(date +%s)
echo "📥 Downloading provisioners..."
curl -sSL "https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/cli/mysql-provisioner/provision-ivr-final.js?v=$TS" -o provision-ivr.cjs
curl -sSL "https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/cli/mysql-provisioner/provision-extension-settings.js?v=$TS" -o provision-settings.cjs
curl -sSL "https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/cli/mysql-provisioner/provision-conferences.js?v=$TS" -o provision-conferences.mjs
curl -sSL "https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/cli/mysql-provisioner/provision-misc-features.js?v=$TS" -o provision-misc.mjs
curl -sSL "https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/cli/mysql-provisioner/provision-advanced-features-fixed.js?v=$TS" -o provision-advanced-v7.mjs
curl -sSL "https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/cli/mysql-provisioner/fix-bad-destinations.js?v=$TS" -o fix-destinations.mjs

# Setup Node.js environment
echo "📦 Setting up Node.js environment..."
npm init -y > /dev/null 2>&1
# Enable ES modules
echo '{"type": "module"}' > package.json
npm install mysql2 dotenv > /dev/null 2>&1

# Export variables directly to helper scripts (Covering ALL standard variations found in scripts)
export FREEPBX_MYSQL_HOST=localhost
export FREEPBX_MYSQL_USER=freepbxuser
export FREEPBX_MYSQL_PASSWORD="$MYSQL_PASSWORD"
export FREEPBX_DB_PASSWORD="$MYSQL_PASSWORD"
export PROVISIONER_DB_PASS="$MYSQL_PASSWORD"

# Also helpful to have these
export FREEPBX_MYSQL_DATABASE=asterisk
export PROVISIONER_DB_HOST=localhost
export PROVISIONER_DB_USER=freepbxuser
export PROVISIONER_DB_NAME=asterisk

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
node provision-advanced-v7.mjs

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
