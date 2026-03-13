# FreePBX Provisioner Service

Node.js service that runs on the FreePBX server to help bot nodes self-provision.

## Features

- **Extension Management**: List available extensions, claim/release extensions
- **SIP Credentials**: Provide SIP credentials to bot nodes
- **IVR Information**: Return IVR configuration and digit mappings
- **Trunk Information**: Provide SIP trunk details
- **Claim Tracking**: Track which bot node claimed which extension
- **Phone Emulation**: Pretends to be a Yealink T46G (FreePBX free tier compatible)

## Installation

### Automatic (via install script)

The provisioner service is automatically installed when you run the installer on the FreePBX server:

```bash
curl -sSL https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/install.sh | bash
```

### Manual Installation

```bash
cd ~/.ai-phone-cli/freepbx-provisioner-service
npm install

# Create .env file
cat > ~/.ai-phone/.env << 'EOF'
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=freepbxuser
MYSQL_PASSWORD=your-password-here
FREEPBX_HOST=172.16.1.63
PROVISIONER_PORT=3500
EOF

# Install systemd service
sudo cp freepbx-provisioner.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable freepbx-provisioner
sudo systemctl start freepbx-provisioner
```

## Usage

### Check Service Status

```bash
sudo systemctl status freepbx-provisioner
```

### View Logs

```bash
sudo journalctl -u freepbx-provisioner -f
```

### Test Endpoints

```bash
# Health check
curl http://localhost:3500/health

# List extensions
curl http://localhost:3500/extensions

# Get specific extension
curl http://localhost:3500/extension/9001

# Claim extension
curl -X POST http://localhost:3500/claim-extension \
  -H "Content-Type: application/json" \
  -d '{"extension":"9001","hostname":"trinity1.local","ip":"172.16.1.84"}'

# Get IVR info
curl http://localhost:3500/ivr

# Get trunk info
curl http://localhost:3500/trunk

# Get SIP config
curl http://localhost:3500/sip-config
```

## API Endpoints

### GET /health

Health check endpoint

**Response:**

```json
{
  "status": "ok",
  "service": "freepbx-provisioner",
  "timestamp": "2026-02-01T19:00:00Z",
  "mysql": "connected"
}
```

### GET /extensions

List all extensions with claim status

**Response:**

```json
{
  "success": true,
  "extensions": [
    {
      "number": "9000",
      "name": "Morpheus",
      "role": "Captain",
      "voiceId": "pNInz6obpgDQGcFmaJgB",
      "claimed": true,
      "claimedBy": "morpheus1.local",
      "claimedAt": "2026-02-01T19:00:00Z"
    }
  ],
  "total": 9,
  "available": 8
}
```

### POST /claim-extension

Claim an extension for a bot node

**Request:**

```json
{
  "extension": "9001",
  "hostname": "trinity1.local",
  "ip": "172.16.1.84"
}
```

**Response:**

```json
{
  "success": true,
  "extension": {
    "number": "9001",
    "name": "Trinity",
    "role": "First Mate",
    "voiceId": "21m00Tcm4TlvDq8ikWAM",
    "sipUsername": "9001",
    "sipPassword": "secure-password",
    "sipDomain": "172.16.1.63",
    "sipRegistrar": "172.16.1.63",
    "sipPort": 5060
  }
}
```

### GET /ivr

Get IVR configuration

**Response:**

```json
{
  "success": true,
  "ivr": {
    "number": "7000",
    "id": 7000,
    "name": "Nebuchadnezzar Main Menu",
    "mappings": {
      "0": "9000",
      "1": "9001",
      "2": "9002"
    }
  }
}
```

## Bot Node Integration

Bot nodes use this service during `ai-phone setup`:

1. Connect to provisioner service
2. List available extensions
3. User selects extension
4. Claim extension
5. Receive SIP credentials
6. Save to config
7. Register to FreePBX

## Device Emulation

The service pretends to be a **Yealink T46G** phone, which is supported by FreePBX's free tier. This allows bot nodes to register without requiring commercial licensing.

## Troubleshooting

### Service won't start

Check logs:

```bash
sudo journalctl -u freepbx-provisioner -n 50
```

Common issues:

- MySQL password incorrect
- Port 3500 already in use
- Node.js not installed

### Can't claim extension

- Check if extension exists in FreePBX
- Verify MySQL credentials
- Check if extension already claimed

### Bot node can't connect

- Verify firewall allows port 3500
- Check provisioner service is running
- Verify bot subnet has access

## Security

- Service binds to 0.0.0.0 (all interfaces)
- Should be behind firewall restricting to bot subnet
- Consider adding API key authentication for production
- SIP passwords are retrieved from FreePBX database

## License

MIT
