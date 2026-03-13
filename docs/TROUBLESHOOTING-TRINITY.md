# Trinity Registration Troubleshooting

Trinity (extension 9001) is offline while Morpheus (extension 9000) is online. Both run the same code in separate LXCs.

## Quick Diagnostics

### 1. Check if Trinity's Container is Running

```bash
# SSH into Trinity's LXC
ssh root@trinity-lxc-ip

# Check Docker status
docker compose ps

# Expected output:
# voice-app    running
# drachtio     running
# freeswitch   running
```

**If containers are stopped**:

```bash
docker compose up -d
docker compose logs voice-app | grep -i "register\|sip"
```

### 2. Check SIP Registration Logs

```bash
# On Trinity's LXC
docker compose logs voice-app | grep -E "REGISTER|401|403|Registration"

# Look for:
# ✅ "Registration successful for 9001"
# ❌ "Registration failed: 401 Unauthorized"
# ❌ "Registration failed: timeout"
```

### 3. Verify Network Connectivity

```bash
# On Trinity's LXC - can it reach FreePBX?
ping -c 3 172.16.1.143

# Can it reach the SIP port?
nc -zv 172.16.1.143 5060

# Expected: "Connection to 172.16.1.143 5060 port [tcp/sip] succeeded!"
```

### 4. Check Configuration Differences

**Compare these between Morpheus and Trinity**:

```bash
# On each LXC
cat ~/.ai-phone/config.json | jq '{
  sipDomain,
  sipRegistrar,
  externalIp,
  devices: .devices[] | {name, extension, authId}
}'
```

**Common issues**:

- ❌ Both using same `EXTERNAL_IP` (should be different - each LXC's own IP)
- ❌ Different `SIP_DOMAIN` or `SIP_REGISTRAR`
- ❌ Wrong `authId` or `password` for Trinity

### 5. Check FreePBX Extension Status

**On FreePBX web UI**:

1. Go to **Connectivity → Extensions**
2. Find extension **9001** (Trinity)
3. Verify:
   - Extension exists
   - Secret matches `config.json` password
   - Not disabled
   - Same settings as 9000 (Morpheus)

**Via CLI**:

```bash
# On FreePBX server
asterisk -rx "pjsip show endpoints" | grep 9001
asterisk -rx "pjsip show aors 9001"
```

### 6. Check for Port Conflicts

```bash
# On Trinity's LXC
netstat -tuln | grep -E "5060|5080"

# Should show:
# 0.0.0.0:5060  (drachtio)
# 0.0.0.0:5080  (drachtio MRF)
```

**If ports are in use by something else**, Trinity can't register.

### 7. Compare Docker Compose Files

```bash
# On Morpheus LXC
cat ~/ai-phone/docker-compose.yml | grep -A 5 "EXTERNAL_IP\|SIP_"

# On Trinity LXC  
cat ~/ai-phone/docker-compose.yml | grep -A 5 "EXTERNAL_IP\|SIP_"
```

**Must be different**:

- `EXTERNAL_IP` - Each LXC's own IP
- `DRACHTIO_SECRET` - Can be same or different

**Must be same**:

- `SIP_DOMAIN` - FreePBX server IP
- `SIP_REGISTRAR` - FreePBX server IP

---

## Common Fixes

### Fix 1: Wrong EXTERNAL_IP

**Problem**: Trinity is using Morpheus's IP or 127.0.0.1

**Solution**:

```bash
# On Trinity's LXC
# Find Trinity's actual IP
ip addr show | grep "inet " | grep -v 127.0.0.1

# Update .env
echo "EXTERNAL_IP=172.16.1.XX" >> .env  # Trinity's actual IP

# Restart
docker compose down && docker compose up -d
```

### Fix 2: Container Not Running

**Problem**: voice-app crashed or didn't start

**Solution**:

```bash
docker compose logs voice-app --tail=50

# Look for errors, then:
docker compose restart voice-app
```

### Fix 3: Credentials Mismatch

**Problem**: Password in config.json doesn't match FreePBX

**Solution**:

```bash
# Get password from config
cat ~/.ai-phone/config.json | jq -r '.devices[] | select(.name=="Trinity") | .password'

# Update FreePBX extension 9001 with this password
# OR regenerate with: ai-phone setup
```

### Fix 4: Firewall Blocking SIP

**Problem**: LXC firewall blocking UDP 5060

**Solution**:

```bash
# On Proxmox host or Trinity LXC
iptables -A INPUT -p udp --dport 5060 -j ACCEPT
iptables -A INPUT -p udp --dport 5080 -j ACCEPT

# Or disable firewall temporarily to test
systemctl stop firewalld  # CentOS/RHEL
ufw disable              # Ubuntu
```

---

## Verification Steps

After applying fixes:

1. **Restart Trinity's containers**:

   ```bash
   docker compose restart
   ```

2. **Watch registration logs**:

   ```bash
   docker compose logs -f voice-app | grep -i register
   ```

3. **Check FreePBX**:
   - Refresh statistics page
   - Should show "Users Online: 2"

4. **Test call**:

   ```bash
   # Call Trinity from your phone
   # Dial 9001
   ```

---

## Debug Output to Share

If still not working, collect this info:

```bash
# On Trinity's LXC
echo "=== Docker Status ==="
docker compose ps

echo "=== Network Config ==="
cat ~/.ai-phone/config.json | jq '{sipDomain, sipRegistrar, externalIp}'

echo "=== Trinity Device ==="
cat ~/.ai-phone/config.json | jq '.devices[] | select(.name=="Trinity")'

echo "=== Registration Logs ==="
docker compose logs voice-app | grep -i "register\|401\|403" | tail -20

echo "=== Network Test ==="
ping -c 3 172.16.1.143
nc -zv 172.16.1.143 5060
```

Share this output for further diagnosis.
