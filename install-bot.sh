#!/bin/bash
set -e

# Gemini Phone Bot Installer
# Usage: ./install-bot.sh --fleet --registrar 172.16.1.26
# Or:    ./install-bot.sh --ext 9000 --registrar 172.16.1.26

INSTALL_DIR="$HOME/gemini-bot"
REPO_URL="https://github.com/jayis1/2fast2dumb2fun.git"

# --- Parse Arguments ---
FLEET_MODE=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --fleet) FLEET_MODE=true ;;
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

if [ -z "$REGISTRAR" ]; then
    echo "Usage: ./install-bot.sh --fleet --registrar 172.16.1.26"
    echo "   Or: ./install-bot.sh --ext 9000 --registrar 172.16.1.26"
    exit 1
fi

echo "🤖 Gemini Bot Installer Initializing..."

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
DRACHTIO_HOST=drachtio
DRACHTIO_PORT=9022
DRACHTIO_SECRET=cymru
FREESWITCH_HOST=freeswitch
FREESWITCH_PORT=8021
FREESWITCH_SECRET=JambonzR0ck$
AUDIO_DIR=/tmp/voice-audio
EOF

# --- 4. Fleet Configuration ---
if [ "$FLEET_MODE" = "true" ]; then
    echo "🚀 Configuring Full Bot Fleet (Extensions 9000-9008)..."
    mkdir -p voice-app/config
    cat > voice-app/config/devices.json <<JSON
{
  "9000": { "name": "Morpheus", "extension": "9000", "authId": "9000", "password": "DGHwMW6v25", "voiceId": "JAgnJveGGUh4qy4kh6dF", "prompt": "You are Morpheus from The Matrix. Use under 40 words." },
  "9001": { "name": "Trinity", "extension": "9001", "authId": "9001", "password": "GeminiPhone123!", "voiceId": "EXAVOICEID_TRINITY", "prompt": "You are Trinity." },
  "9002": { "name": "Neo", "extension": "9002", "authId": "9002", "password": "GeminiPhone123!", "voiceId": "EXAVOICEID_NEO", "prompt": "You are Neo." },
  "9003": { "name": "Tank", "extension": "9003", "authId": "9003", "password": "GeminiPhone123!", "voiceId": "EXAVOICEID_TANK", "prompt": "You are Tank." },
  "9004": { "name": "Dozer", "extension": "9004", "authId": "9004", "password": "GeminiPhone123!", "voiceId": "EXAVOICEID_DOZER", "prompt": "You are Dozer." },
  "9005": { "name": "Apoc", "extension": "9005", "authId": "9005", "password": "GeminiPhone123!", "voiceId": "EXAVOICEID_APOC", "prompt": "You are Apoc." },
  "9006": { "name": "Switch", "extension": "9006", "authId": "9006", "password": "GeminiPhone123!", "voiceId": "EXAVOICEID_SWITCH", "prompt": "You are Switch." },
  "9007": { "name": "Mouse", "extension": "9007", "authId": "9007", "password": "GeminiPhone123!", "voiceId": "EXAVOICEID_MOUSE", "prompt": "You are Mouse." },
  "9008": { "name": "Cypher", "extension": "9008", "authId": "9008", "password": "GeminiPhone123!", "voiceId": "EXAVOICEID_CYPHER", "prompt": "You are Cypher." }
}
JSON
    echo "✅ Fleet Config Written to voice-app/config/devices.json"

else
    # Single Bot Mode
    if [ -z "$EXTENSION" ]; then
        echo "❌ Error: Must specify --fleet OR --ext <number>"
        exit 1
    fi
    echo "SIP_EXTENSION=$EXTENSION" >> .env
    echo "SIP_AUTH_ID=$EXTENSION" >> .env
    echo "SIP_PASSWORD=${PASSWORD:-changeme}" >> .env
    echo "INSTANCE_NAME=\"${INSTANCE_NAME:-Bot}\"" >> .env
    echo "ℹ️  Single Bot Configured (Extension $EXTENSION)"
fi

# --- 5. Launch ---
echo "🔥 Launching Containers..."
if docker compose version &> /dev/null; then CMD="docker compose"; else CMD="docker-compose"; fi

$CMD up -d --build --remove-orphans

echo ""
echo "🎉 Deployment Complete!"
if [ "$FLEET_MODE" = "true" ]; then
    echo "   Fleet:  9 Instances (9000-9008)"
else
    echo "   Bot:    $INSTANCE_NAME ($EXTENSION)"
fi
echo "   Host:   $EXTERNAL_IP"
echo "   PBX:    $REGISTRAR"
echo ""

