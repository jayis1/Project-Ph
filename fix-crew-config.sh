#!/bin/bash
set -e

# Gemini Phone Crew Configuration Fixer
# Fixes common configuration issues across all crew member LXCs
# Usage: curl -sSL https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/fix-crew-config.sh | bash

echo "🔧 Gemini Phone Configuration Fixer"
echo ""

CONFIG_FILE="$HOME/.gemini-phone/config.json"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "✗ Config file not found: $CONFIG_FILE"
    echo "  Run 'gemini-phone setup' first"
    exit 1
fi

echo "📋 Current configuration status:"
echo ""

# Check for common issues
NEEDS_FIX=false

# Check ElevenLabs API key
if grep -q '"apiKey": ""' "$CONFIG_FILE" 2>/dev/null; then
    echo "⚠️  ElevenLabs API key is empty"
    NEEDS_FIX=true
elif ! grep -q '"apiKey":' "$CONFIG_FILE" 2>/dev/null; then
    echo "⚠️  ElevenLabs API key is missing"
    NEEDS_FIX=true
fi

# Check FreePBX M2M API
if ! grep -q '"graphqlUrl":.*http' "$CONFIG_FILE" 2>/dev/null; then
    echo "⚠️  FreePBX GraphQL URL is missing or empty"
    NEEDS_FIX=true
fi

if [ "$NEEDS_FIX" = false ]; then
    echo "✓ Configuration looks good!"
    echo ""
    echo "Running health check..."
    gemini-phone doctor
    exit 0
fi

echo ""
echo "🔧 Fixing configuration..."
echo ""

# Prompt for API keys if needed
read -p "Enter ElevenLabs API key (or press Enter to skip): " ELEVENLABS_KEY
read -p "Enter FreePBX Client ID (or press Enter to skip): " FREEPBX_CLIENT_ID
read -sp "Enter FreePBX Client Secret (or press Enter to skip): " FREEPBX_SECRET
echo ""
read -p "Enter FreePBX GraphQL URL (default: http://172.16.1.143:83/admin/api/api/gql): " FREEPBX_URL
FREEPBX_URL=${FREEPBX_URL:-http://172.16.1.143:83/admin/api/api/gql}

echo ""
echo "📝 Updating configuration..."

# Backup original config
cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%s)"
echo "✓ Backup created"

# Update config using jq if available, otherwise use sed
if command -v jq &> /dev/null; then
    # Use jq for clean JSON manipulation
    TMP_FILE=$(mktemp)
    
    jq_cmd="."
    
    if [ -n "$ELEVENLABS_KEY" ]; then
        jq_cmd="$jq_cmd | .elevenlabs.apiKey = \"$ELEVENLABS_KEY\""
    fi
    
    if [ -n "$FREEPBX_CLIENT_ID" ]; then
        jq_cmd="$jq_cmd | .api.freepbx.clientId = \"$FREEPBX_CLIENT_ID\""
    fi
    
    if [ -n "$FREEPBX_SECRET" ]; then
        jq_cmd="$jq_cmd | .api.freepbx.clientSecret = \"$FREEPBX_SECRET\""
    fi
    
    if [ -n "$FREEPBX_URL" ]; then
        jq_cmd="$jq_cmd | .api.freepbx.graphqlUrl = \"$FREEPBX_URL\""
    fi
    
    cat "$CONFIG_FILE" | jq "$jq_cmd" > "$TMP_FILE"
    mv "$TMP_FILE" "$CONFIG_FILE"
    
    echo "✓ Configuration updated"
else
    # Fallback to sed (less reliable but works without jq)
    echo "⚠️  jq not found, using sed (install jq for better results)"
    
    if [ -n "$ELEVENLABS_KEY" ]; then
        sed -i "s|\"apiKey\": \"[^\"]*\"|\"apiKey\": \"$ELEVENLABS_KEY\"|g" "$CONFIG_FILE"
    fi
    
    if [ -n "$FREEPBX_URL" ]; then
        sed -i "s|\"graphqlUrl\": \"[^\"]*\"|\"graphqlUrl\": \"$FREEPBX_URL\"|g" "$CONFIG_FILE"
    fi
    
    echo "✓ Configuration updated (basic)"
fi

echo ""
echo "🔄 Restarting services..."
gemini-phone stop
sleep 2
gemini-phone start
sleep 5

echo ""
echo "🔍 Running health check..."
gemini-phone doctor

echo ""
echo "✅ Configuration fix complete!"
echo ""
echo "If issues persist, check the config manually:"
echo "  nano $CONFIG_FILE"
echo ""
echo "Backup saved to: $CONFIG_FILE.backup.*"
