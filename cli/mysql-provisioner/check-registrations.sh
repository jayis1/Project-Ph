#!/bin/bash

# Wait for voice-app to be ready and check SIP registrations

echo "🔍 Waiting for voice-app to start..."
echo ""

# Wait up to 30 seconds for the API to respond
for i in {1..30}; do
    if curl -s http://localhost:3000/api/sip-status > /dev/null 2>&1; then
        echo "✅ Voice-app is ready!"
        echo ""
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo "📊 SIP Registration Status:"
echo ""

# Get SIP status
curl -s http://localhost:3000/api/sip-status | jq '.' || echo "❌ Failed to get SIP status"

echo ""
echo "📝 Docker logs (last 20 lines):"
echo ""

docker logs voice-app 2>&1 | tail -20
