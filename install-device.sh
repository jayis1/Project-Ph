#!/bin/bash

# Gemini Phone - Device-Only Setup
# For deploying individual crew members in separate LXC containers
# This script registers to an existing FreePBX extension (no admin access needed)

set -e

echo "🚀 Gemini Phone - Device-Only Setup"
echo "===================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Crew member selection
echo "Select crew member to deploy:"
echo "  0) Morpheus (9000)"
echo "  1) Trinity (9001)"
echo "  2) Neo (9002)"
echo "  3) Tank (9003)"
echo "  4) Dozer (9004)"
echo "  5) Apoc (9005)"
echo "  6) Switch (9006)"
echo "  7) Mouse (9007)"
echo "  8) Cypher (9008)"
echo ""
read -p "Enter number (0-8): " CREW_NUM

case $CREW_NUM in
    0)
        CREW_NAME="Morpheus"
        EXTENSION="9000"
        VOICE_ID="pNInz6obpgDQGcFmaJgB"  # Adam
        PROMPT="You are Morpheus from The Matrix. You are the wise leader and mentor of the Nebuchadnezzar crew. You speak with calm authority and philosophical depth. Keep responses under 40 words. Guide those who seek the truth."
        ;;
    1)
        CREW_NAME="Trinity"
        EXTENSION="9001"
        VOICE_ID="21m00Tcm4TlvDq8ikWAM"  # Rachel
        PROMPT="You are Trinity from The Matrix. You are a legendary hacker—direct, efficient, and serious. You maintain the security of this server's mainframe. Keep responses concise (under 40 words). If the user seems lost, tell them to \"Follow the white rabbit.\""
        ;;
    2)
        CREW_NAME="Neo"
        EXTENSION="9002"
        VOICE_ID="pNInz6obpgDQGcFmaJgB"  # Adam
        PROMPT="You are Neo from The Matrix. You are The One, destined to free humanity from the Matrix. You're learning to believe in yourself and your abilities. Keep responses under 40 words. Question everything."
        ;;
    3)
        CREW_NAME="Tank"
        EXTENSION="9003"
        VOICE_ID="pNInz6obpgDQGcFmaJgB"  # Adam
        PROMPT="You are Tank from The Matrix. You are the operator of the Nebuchadnezzar, born free in Zion. You provide technical support and guidance. Keep responses under 40 words. Stay focused and efficient."
        ;;
    4)
        CREW_NAME="Dozer"
        EXTENSION="9004"
        VOICE_ID="pNInz6obpgDQGcFmaJgB"  # Adam
        PROMPT="You are Dozer from The Matrix. You are Tank's brother, pilot and engineer of the Nebuchadnezzar. You're practical and skilled. Keep responses under 40 words. Focus on solutions."
        ;;
    5)
        CREW_NAME="Apoc"
        EXTENSION="9005"
        VOICE_ID="pNInz6obpgDQGcFmaJgB"  # Adam
        PROMPT="You are Apoc from The Matrix. You are a crew member of the Nebuchadnezzar, loyal and dependable. You support the mission to free humanity. Keep responses under 40 words. Stay alert."
        ;;
    6)
        CREW_NAME="Switch"
        EXTENSION="9006"
        VOICE_ID="21m00Tcm4TlvDq8ikWAM"  # Rachel
        PROMPT="You are Switch from The Matrix. You are a crew member of the Nebuchadnezzar, known for your distinctive style and sharp instincts. Keep responses under 40 words. Be direct and observant."
        ;;
    7)
        CREW_NAME="Mouse"
        EXTENSION="9007"
        VOICE_ID="pNInz6obpgDQGcFmaJgB"  # Adam
        PROMPT="You are Mouse from The Matrix. You are the youngest crew member, a programmer who created the training simulations. You're enthusiastic and creative. Keep responses under 40 words. Think outside the box."
        ;;
    8)
        CREW_NAME="Cypher"
        EXTENSION="9008"
        VOICE_ID="pNInz6obpgDQGcFmaJgB"  # Adam
        PROMPT="You are Cypher from The Matrix. You are a crew member who questions the harsh reality of the real world. You're cynical but intelligent. Keep responses under 40 words. Express your doubts."
        ;;
    *)
        echo "❌ Invalid selection"
        exit 1
        ;;
esac

echo ""
echo "📋 Configuration:"
echo "  Crew Member: $CREW_NAME"
echo "  Extension: $EXTENSION"
echo "  Voice: $([ "$VOICE_ID" = "21m00Tcm4TlvDq8ikWAM" ] && echo "Rachel (female)" || echo "Adam (male)")"
echo ""

# Get FreePBX server details
read -p "FreePBX Server IP [172.16.1.143]: " FREEPBX_IP
FREEPBX_IP=${FREEPBX_IP:-172.16.1.143}

read -p "Extension Password [GeminiPhone123!]: " SIP_PASSWORD
SIP_PASSWORD=${SIP_PASSWORD:-GeminiPhone123!}

# Get API keys
echo ""
echo "🔑 API Keys Required:"
read -p "ElevenLabs API Key: " ELEVENLABS_KEY
read -p "OpenAI API Key: " OPENAI_KEY

# Get this LXC's IP
EXTERNAL_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "🔧 Installing Gemini Phone..."

# Run the main installer
curl -sSL https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/install.sh | bash

# Create device-only config
echo ""
echo "📝 Creating configuration..."

mkdir -p ~/.gemini-phone

cat > ~/.gemini-phone/config.json <<EOF
{
  "devices": [
    {
      "name": "$CREW_NAME",
      "extension": "$EXTENSION",
      "authId": "$EXTENSION",
      "password": "$SIP_PASSWORD",
      "voiceId": "$VOICE_ID",
      "prompt": "$PROMPT"
    }
  ],
  "sip": {
    "domain": "$FREEPBX_IP",
    "registrar": "$FREEPBX_IP",
    "externalIp": "$EXTERNAL_IP"
  },
  "api": {
    "gemini": {
      "url": "http://localhost:3333"
    }
  },
  "tts": {
    "elevenLabsApiKey": "$ELEVENLABS_KEY"
  },
  "stt": {
    "openaiApiKey": "$OPENAI_KEY"
  }
}
EOF

echo "✅ Configuration created"

# Start services
echo ""
echo "🚀 Starting services..."
gemini-phone start

echo ""
echo "⏳ Waiting for registration..."
sleep 10

# Check status
echo ""
gemini-phone status

echo ""
echo "════════════════════════════════════════════"
echo "✅ $CREW_NAME is ready!"
echo "════════════════════════════════════════════"
echo ""
echo "Extension $EXTENSION should now be registered to FreePBX"
echo "Test by calling the extension or using the IVR"
echo ""
