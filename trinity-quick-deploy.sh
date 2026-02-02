#!/bin/bash
set -e

echo "🤖 Trinity Bot Quick Deploy"
echo "============================"

# Get local IP
TRINITY_IP=$(hostname -I | awk '{print $1}')
echo "📍 Trinity IP: $TRINITY_IP"

# Install essentials
apt update && apt install -y docker.io docker-compose git curl

# Enable Docker
systemctl enable docker
systemctl start docker

# Create working directory
mkdir -p /opt/trinity
cd /opt/trinity

# Download full project
git clone https://github.com/jayis1/2fast2dumb2fun.git gemini-phoneq
cd gemini-phoneq

# Create Trinity-only devices.json
cat > voice-app/config/devices.json <<'EOF'
{
  "9001": {
    "extension": "9001",
    "authId": "9001",
    "password": "GeminiPhone123!",
    "name": "Trinity",
    "prompt": "You are Trinity. First Mate of the Nebuchadnezzar. You are a hacker. You are fiercely loyal to Morpheus and in love with Neo. Be professional, deadly, and concise.",
    "voiceId": "21m00Tcm4TlvDq8ikWAM"
  }
}
EOF

# Create .env
cat > .env <<EOF
NODE_ENV=production
FREESWITCH_HOST=127.0.0.1
FREESWITCH_PORT=8021
FREESWITCH_SECRET=ClueCon
DRACHTIO_HOST=127.0.0.1
DRACHTIO_PORT=9022
DRACHTIO_SECRET=cymru
EXTERNAL_IP=$TRINITY_IP
RTP_PORT_START=30000
RTP_PORT_END=30100
SIP_DOMAIN=172.16.1.33
SIP_REGISTRAR=172.16.1.33
SIP_REGISTRAR_PORT=5060
SIP_EXTENSION=9001
ELEVENLABS_API_KEY=CHANGE_ME
OPENAI_API_KEY=CHANGE_ME
GEMINI_API_URL=http://172.16.1.233:3333
HTTP_PORT=3000
WEBSOCKET_PORT=3001
LOG_LEVEL=info
EOF

echo ""
echo "⚠️  IMPORTANT: Edit .env and add your API keys!"
echo "   nano .env"
echo ""
echo "Then run: docker-compose up -d"
echo ""
