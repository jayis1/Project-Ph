#!/bin/bash
set -e

echo "🔧 Enabling PJSIP realtime configuration on Server B..."

# Backup the sorcery.conf
cp /etc/asterisk/sorcery.conf /etc/asterisk/sorcery.conf.backup

# Enable realtime for PJSIP by uncommenting the sections
cat >> /etc/asterisk/sorcery.conf <<'EOF'

[res_pjsip]
endpoint=realtime,ps_endpoints
auth=realtime,ps_auths
aor=realtime,ps_aors
domain_alias=realtime,ps_domain_aliases

[res_pjsip_endpoint_identifier_ip]
identify=realtime,ps_endpoint_id_ips
EOF

echo "✅ Sorcery configuration updated"

echo "♻️  Reloading Asterisk modules..."
asterisk -rx "module reload res_sorcery_realtime.so"
asterisk -rx "module reload res_pjsip.so"

sleep 2

echo ""
echo "✅ Verifying bot endpoints are now loaded:"
asterisk -x "pjsip show endpoints" | head -50

echo ""
echo "🎉 Realtime configuration enabled!"
