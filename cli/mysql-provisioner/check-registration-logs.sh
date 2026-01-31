#!/bin/bash

# Check registration attempts and password issues in voice-app logs

echo "🔍 Checking voice-app logs for registration issues..."
echo ""

echo "📝 Last 50 lines of voice-app logs:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker logs voice-app 2>&1 | tail -50

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 Checking for SIP registration errors:"
docker logs voice-app 2>&1 | grep -i "register\|auth\|401\|403\|error" | tail -20

echo ""
echo "📊 Current SIP status:"
curl -s http://localhost:3000/api/sip-status | python3 -m json.tool
