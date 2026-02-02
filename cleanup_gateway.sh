#!/bin/bash
# Clean Server A and expand or use package-based Asterisk

echo "🧹 Cleaning up Server A..."

# Clean compilation artifacts
cd /usr/src
rm -rf asterisk-* *.tar.gz

# Clean apt cache
apt clean
apt autoclean
apt autoremove -y

# Show disk space
df -h /

echo "✅ Cleanup complete!"
echo ""
echo "Next: Either expand the LXC disk in Proxmox, OR I'll install Asterisk via packages"
