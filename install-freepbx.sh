#!/bin/bash

# One-Line FreePBX Auto-Provisioner
# Provisions multi-level IVR maze with 13 IVRs and 9 extensions
# Run on FreePBX server: curl -sSL https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/install-freepbx.sh | bash

set -e

# --- HOTFIX: Patch FreePBX PJSip Driver Bugs ---
echo "🩹 Patching FreePBX PJSip driver bugs..."
DRIVERS_PATH=$(find /var/www/html/admin -name PJSip.class.php)
if [ ! -z "$DRIVERS_PATH" ]; then
    # Fix 1: Missing trunk_name
    sed -i "s/\$tn = \$trunk\['trunk_name'\];/\$tn = isset(\$trunk['trunk_name']) ? \$trunk['trunk_name'] : 'unknown';/" $DRIVERS_PATH
    
    # Fix 2: Missing retry_interval
    sed -i "s/'retry_interval' => \$trunk\['retry_interval'\],/'retry_interval' => \!empty(\$trunk['retry_interval']) ? \$trunk['retry_interval'] : 60,/g" $DRIVERS_PATH
    
    # Fix 3: Missing expiration
    sed -i "s/'expiration' => \$trunk\['expiration'\],/'expiration' => \!empty(\$trunk['expiration']) ? \$trunk['expiration'] : 3600,/g" $DRIVERS_PATH
    
    # Fix 4: Missing server_uri (Lines ~552)
    sed -i "s/'server_uri' => \$trunk\['sip_server'\],/'server_uri' => \!empty(\$trunk['sip_server']) ? \$trunk['sip_server'] : '127.0.0.1',/g" $DRIVERS_PATH

    # Fix 5: Missing client_uri (Lines ~564)
    sed -i "s/'client_uri' => \$trunk\['sip_server'\],/'client_uri' => \!empty(\$trunk['sip_server']) ? \$trunk['sip_server'] : '127.0.0.1',/g" $DRIVERS_PATH

    # Fix 6: Missing contact (Line ~625)
    sed -i "s/\$conf\['pjsip.aor.conf'\]\[\$tn\]\['contact'\] = 'sip:'.\$trunk\['sip_server'\];/\$conf['pjsip.aor.conf'][\$tn]['contact'] = 'sip:'.(!empty(\$trunk['sip_server']) ? \$trunk['sip_server'] : '127.0.0.1');/" $DRIVERS_PATH

    # Fix 7: Missing match in identify (Line ~806)
    # Using 127.0.0.1 as fallback to avoid crashing, user must configure proper trunk manually anyway
    sed -i "s/'match' => \!empty(\$trunk\['match'\]) ? \$trunk\['match'\] : \$trunk\['sip_server'\]/'match' => \!empty(\$trunk['match']) ? \$trunk['match'] : (\!empty(\$trunk['sip_server']) ? \$trunk['sip_server'] : '127.0.0.1')/" $DRIVERS_PATH

    echo "✅ Patched PJSip.class.php successfully (7 Fixes applied)."
else
    echo "⚠️  Could not find PJSip.class.php - skipping patches."
fi

# --- End Hotfix ---

echo "🚀 AI Phone - FreePBX IVR Maze Auto-Provisioner"
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



# Create a temporary provisioning script in the current directory (so imports work)
cat > provision.mjs << PROVISION_SCRIPT
import { provisionFreePBX } from './lib/freepbx-provisioner.js';

const mysqlPassword = process.argv[2];

const config = {
  freepbx: {
    host: 'localhost',
    sshUser: 'root',
    sshPassword: '', // Not needed for localhost
    mysqlUser: 'freepbxuser',
    mysqlPassword: mysqlPassword,
    mysqlDatabase: 'asterisk'
  }
};

const options = {
  skipTrunks: true,
  skipInfrastructure: false,
  skipExtensions: false,
  skipIVR: false
};


const progressCallback = (progress) => {
  if (progress.status === 'running') {
    console.log(`⏳ ${progress.message}`);
  } else if (progress.status === 'success') {
    console.log(`✅ ${progress.message}`);
  } else if (progress.status === 'error') {
    console.error(`❌ ${progress.message}`);
  }
};

try {
  console.log('🚀 Starting FreePBX provisioning...\n');
  const result = await provisionFreePBX(config, options, progressCallback);
  
  if (result.success) {
    console.log('\n✅ Provisioning completed successfully!');
  } else {
    console.error('\n❌ Provisioning failed:', result.error);
    process.exit(1);
  }
} catch (error) {
  console.error('\n❌ Provisioning error:', error.message);
  process.exit(1);
}
PROVISION_SCRIPT

# Run the provisioning script
node provision.mjs "$MYSQL_PASSWORD"

# Cleanup
rm provision.mjs

echo ""
echo "🎉 IVR Maze provisioning complete!"
echo ""
echo "� Installing FreePBX Provisioner Service..."
cd "$TEMP_DIR/2fast2dumb2fun/freepbx-provisioner-service"
npm install --silent

# Create directory
mkdir -p /opt/freepbx-provisioner
cp -r . /opt/freepbx-provisioner/

# Configure .env
cat > /opt/freepbx-provisioner/.env <<ENV
PROVISIONER_PORT=3333
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=freepbxuser
MYSQL_PASSWORD=$MYSQL_PASSWORD
FREEPBX_HOST=$(hostname -I | awk '{print $1}')
EXTERNAL_IP=$(curl -s ifconfig.me)
ENV

# Install Systemd Service
cp freepbx-provisioner.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable freepbx-provisioner
systemctl restart freepbx-provisioner

echo "✅ Service installed and running on port 3333"

echo ""
echo "�📞 Extensions created:"
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
