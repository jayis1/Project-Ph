#!/bin/bash
# Setup Controller (172.16.1.72) - FreePBX

echo "🔧 Setting up Controller (FreePBX)..."

# Download installer
curl -sSL https://raw.githubusercontent.com/freepbx/sng_freepbx_debian_install/master/sng_freepbx_debian_install.sh -o /tmp/freepbx_install.sh

# Run with skipversion flag
bash /tmp/freepbx_install.sh --skipversion

echo ""
echo "✅ FreePBX installed!"
echo ""
echo "Next steps:"
echo "1. Access GUI: http://172.16.1.72"
echo "2. Complete setup wizard"
echo "3. Create trunk to Gateway (172.16.1.35)"
echo "4. Create extension 9000 for Trinity"
