#!/bin/bash
# Deploy Morpheus Bot on Trinity (172.16.1.34)

set -e

echo "🤖 Deploying Morpheus..."

# Check if running on Morpheus
CURRENT_IP=$(hostname -I | awk '{print $1}')
if [ "$CURRENT_IP" != "172.16.1.104" ]; then
    echo "⚠️  Warning: Expected IP 172.16.1.104, got $CURRENT_IP"
    echo "Continuing anyway..."
fi

# Install dependencies
echo "📦 Installing dependencies..."
apt update
apt install -y git nodejs npm docker.io docker-compose curl

# Clone/update gemini-phone repo
if [ -d "/root/gemini-phone" ]; then
    echo "📂 Updating existing installation..."
    cd /root/gemini-phone
    git pull
else
    echo "📥 Cloning gemini-phone..."
    cd /root
    git clone https://github.com/jayis1/2fast2dumb2fun.git gemini-phone
    cd gemini-phone
fi

# Create .env file
echo "⚙️  Configuring environment..."
cat > /root/gemini-phone/.env << 'EOF'
# FreePBX Configuration
SIP_DOMAIN=172.16.1.72
SIP_REGISTRAR=172.16.1.72
SIP_USERNAME=9000
SIP_PASSWORD=GeminiPhone123!
SIP_EXTENSION=9000

# Bot Configuration
BOT_NAME=Morpheus
BOT_PERSONALITY=You are Morpheus from The Matrix. You speak with wisdom and philosophical depth. You guide callers to understand deeper truths about their questions.

# Voice Configuration
ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY:-your_key_here}
ELEVENLABS_VOICE_ID=TX3LPaxmHKxFdv7VOQHJ

# STT Configuration
OPENAI_API_KEY=${OPENAI_API_KEY:-your_key_here}

# Gemini API Configuration
GEMINI_API_KEY=${GEMINI_API_KEY:-your_key_here}
GEMINI_API_URL=http://localhost:3333

# Network Configuration
EXTERNAL_IP=172.16.1.104
RTP_PORT_START=30000
RTP_PORT_END=30100

# Docker Configuration
VOICE_APP_PORT=3000
API_SERVER_PORT=3333
EOF

# Prompt for API keys if not set
if ! grep -q "ELEVENLABS_API_KEY=sk-" /root/gemini-phone/.env; then
    echo ""
    read -p "Enter ElevenLabs API key: " ELEVEN_KEY
    sed -i "s/ELEVENLABS_API_KEY=.*/ELEVENLABS_API_KEY=$ELEVEN_KEY/" /root/gemini-phone/.env
fi

if ! grep -q "OPENAI_API_KEY=sk-" /root/gemini-phone/.env; then
    echo ""
    read -p "Enter OpenAI API key: " OPENAI_KEY
    sed -i "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=$OPENAI_KEY/" /root/gemini-phone/.env
fi

if ! grep -q "GEMINI_API_KEY=AIza" /root/gemini-phone/.env; then
    echo ""
    read -p "Enter Gemini API key: " GEMINI_KEY
    sed -i "s/GEMINI_API_KEY=.*/GEMINI_API_KEY=$GEMINI_KEY/" /root/gemini-phone/.env
fi

# Build and start services
echo "🚀 Starting Morpheus..."
cd /root/gemini-phone
docker-compose down 2>/dev/null || true
docker-compose up -d --build

# Wait for services
echo "⏳ Waiting for services to start..."
sleep 10

# Check status
echo ""
echo "=== Service Status ==="
docker-compose ps

echo ""
echo "=== SIP Registration ==="
sleep 5
docker-compose logs voice-app | grep -i "regist" | tail -5 || echo "Check logs with: docker-compose logs voice-app"

echo ""
echo "✅ Morpheus deployment complete!"
echo ""
echo "📞 Morpheus is registered as extension 9000"
echo "🌐 Controller: 172.16.1.72"
echo "🎭 Persona: Morpheus (The Matrix)"
echo ""
echo "To check status:"
echo "  docker-compose ps"
echo "  docker-compose logs voice-app"
echo ""
echo "To test: Call your Redspot number and it will route to Morpheus!"
