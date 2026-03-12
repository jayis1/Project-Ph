#!/bin/bash
set -e

# Gemini Phone Bot Installer
# Usage: ./install-bot.sh --fleet --registrar 172.16.1.26
# Or:    ./install-bot.sh --ext 9000 --registrar 172.16.1.26
# Or:    ./install-bot.sh (Interactive Mode)

INSTALL_DIR="$HOME/gemini-bot"
REPO_URL="https://github.com/jayis1/2fast2dumb2fun.git"

# --- Parse Arguments ---
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --ext) EXTENSION="$2"; shift ;;
        --name) INSTANCE_NAME="$2"; shift ;;
        --pass) PASSWORD="$2"; shift ;;
        --registrar) REGISTRAR="$2"; shift ;;
        --api-url) API_URL="$2"; shift ;;
        --openai-key) OPENAI_API_KEY="$2"; shift ;;
        --elevenlabs-key) ELEVENLABS_API_KEY="$2"; shift ;;
        --external-ip) EXTERNAL_IP="$2"; shift ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

echo "🤖 Gemini Phone Installer Initializing..."

# --- Interactive Mode ---
if [ -z "$REGISTRAR" ]; then
    echo ""
    echo "👋 Welcome to the Gemini Phone Installer!"
    echo "   I'll help you set up your AI Phone."
    echo ""
    
    # Prompt for Registrar
    read -p "🔹 Enter PBX/Registrar IP: " REGISTRAR
    if [ -z "$REGISTRAR" ]; then echo "❌ Registrar IP is required."; exit 1; fi

    read -p "🔹 Enter Extension (Default 9001): " EXTENSION
    EXTENSION=${EXTENSION:-9001}
    read -p "🔹 Enter Name (Default gemini-phone): " INSTANCE_NAME
    INSTANCE_NAME=${INSTANCE_NAME:-"gemini-phone"}
    read -p "🔹 Enter Password (Default GeminiPhone123!): " PASSWORD
    PASSWORD=${PASSWORD:-"GeminiPhone123!"}

    echo ""
    read -p "🔹 Enter OpenAI API Key (Optional): " OPENAI_API_KEY
    read -p "🔹 Enter ElevenLabs API Key (Optional): " ELEVENLABS_API_KEY
    echo ""
    echo "✅ Configuration Received!"
fi

PASSWORD=${PASSWORD:-"GeminiPhone123!"}

if [ -z "$EXTENSION" ]; then
    echo "❌ Error: Must specify Extension."
    exit 1
fi

# --- 1. System Dependencies ---
SUDO="sudo"
if [ "$EUID" -eq 0 ]; then
  SUDO=""
fi

if ! command -v git &> /dev/null; then
    echo "📦 Installing Git..."
    $SUDO apt-get update && $SUDO apt-get install -y git curl
fi

if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com | sh
fi

# --- 2. Clone/Update Repo ---
if [ -d "$INSTALL_DIR" ]; then
    echo "♻️  Updating existing repo in $INSTALL_DIR..."
    cd "$INSTALL_DIR"
    git pull
else
    echo "📥 Cloning repository to $INSTALL_DIR..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# --- 3. Configuration ---
# Auto-detect IP
if [ -z "$EXTERNAL_IP" ]; then
    EXTERNAL_IP=$(hostname -I | awk '{print $1}')
fi
echo "🌐 Using External IP: $EXTERNAL_IP"

# Create .env (Base Config)
echo "📝 Configuring Environment..."
cat > .env <<EOF
# Base Config
HTTP_PORT=3000
WS_PORT=3001
SIP_DOMAIN=$REGISTRAR
SIP_REGISTRAR=$REGISTRAR
SIP_REGISTRAR_PORT=5060
EXTERNAL_IP=$EXTERNAL_IP
GEMINI_API_URL=${API_URL:-http://$REGISTRAR:3333}
OPENAI_API_KEY=$OPENAI_API_KEY
ELEVENLABS_API_KEY=$ELEVENLABS_API_KEY

# Container Services
DRACHTIO_HOST=127.0.0.1
DRACHTIO_PORT=9022
DRACHTIO_SECRET=cymru
FREESWITCH_HOST=127.0.0.1
FREESWITCH_PORT=8021
FREESWITCH_SECRET=JambonzR0ck$
AUDIO_DIR=/tmp/voice-audio
EOF

# --- 4. Single Bot Configuration ---
echo "SIP_EXTENSION=$EXTENSION" >> .env
echo "SIP_AUTH_ID=$EXTENSION" >> .env
echo "SIP_PASSWORD=${PASSWORD:-GeminiPhone123!}" >> .env
echo "INSTANCE_NAME=\"${INSTANCE_NAME:-gemini-phone}\"" >> .env
echo "ℹ️  Single Bot Configured (Extension $EXTENSION)"

# --- 5. Launch ---
echo "🔥 Launching Containers..."
if docker compose version &> /dev/null; then CMD="docker compose"; else CMD="docker-compose"; fi

$CMD up -d --build --remove-orphans

echo ""
echo "🎉 Deployment Complete!"
echo "   Bot:    $INSTANCE_NAME ($EXTENSION)"
echo "   Host:   $EXTERNAL_IP"
echo "   PBX:    $REGISTRAR"
echo ""

