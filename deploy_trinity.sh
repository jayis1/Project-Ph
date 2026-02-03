#!/bin/bash
set -e

echo "🤖 Deploying Trinity Bot (Extension 9001)"
echo "=========================================="
echo ""

# Configuration
TRINITY_IP=$(hostname -I | awk '{print $1}')
ASTERISK_SERVER="172.16.1.33"
GEMINI_API_SERVER="172.16.1.233:3333"
ELEVENLABS_KEY="${ELEVENLABS_API_KEY:-your_key_here}"
OPENAI_KEY="${OPENAI_API_KEY:-your_key_here}"

echo "📍 Trinity IP: $TRINITY_IP"
echo "📍 Asterisk Server: $ASTERISK_SERVER"
echo ""

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    apt update
    apt install -y docker.io docker-compose git
    systemctl enable docker
    systemctl start docker
fi

# Create working directory
WORK_DIR="/opt/trinity-bot"
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

echo "📝 Creating Trinity configuration..."

# Create devices.json for Trinity only
cat > devices.json <<'EOF'
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

# Create .env file
cat > .env <<EOF
# Voice App Configuration for Trinity
NODE_ENV=production

# FreeSWITCH Connection
FREESWITCH_HOST=127.0.0.1
FREESWITCH_PORT=8021
FREESWITCH_SECRET=ClueCon

# Drachtio SIP Server
DRACHTIO_HOST=127.0.0.1
DRACHTIO_PORT=9022
DRACHTIO_SECRET=cymru

# Media Configuration
EXTERNAL_IP=$TRINITY_IP
RTP_PORT_START=30000
RTP_PORT_END=30100

# SIP Configuration - Point to Asterisk Server B
SIP_DOMAIN=$ASTERISK_SERVER
SIP_REGISTRAR=$ASTERISK_SERVER
SIP_REGISTRAR_PORT=5060
SIP_EXTENSION=9001

# API Keys
ELEVENLABS_API_KEY=$ELEVENLABS_KEY
OPENAI_API_KEY=$OPENAI_KEY

# Gemini Backend
GEMINI_API_URL=http://$GEMINI_API_SERVER

# Voice App Server
HTTP_PORT=3000
WEBSOCKET_PORT=3001

# Logging
LOG_LEVEL=info
EOF

echo "📦 Cloning Gemini Phone repository..."
if [ ! -d "gemini-phoneq" ]; then
    git clone https://github.com/jayis1/gemini-phoneq.git
fi

cd gemini-phoneq

# Copy configs
cp ../devices.json voice-app/config/devices.json
cp ../.env .env

echo "🐳 Starting Docker containers..."
docker-compose up -d

echo "⏳ Waiting for containers to start..."
sleep 10

echo ""
echo "✅ Checking Trinity registration..."
docker logs --tail 20 voice-app | grep -E "Trinity|9001|MULTI-REGISTRAR"

echo ""
echo "🎉 Trinity deployment complete!"
echo ""
echo "To verify:"
echo "  docker logs --tail 30 voice-app"
echo ""
echo "To check registration on Asterisk server:"
echo "  ssh root@$ASTERISK_SERVER \"asterisk -rx 'pjsip show endpoints' | grep 9001\""
echo ""
echo "Trinity is ready at extension 9001! 🚀"
