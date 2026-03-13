# Fail2ban Whitelisting for AI Phone

## Problem

FreePBX uses fail2ban to protect against brute-force SIP attacks. However, this can accidentally block your legitimate crew member LXC containers if they make too many registration attempts or failed calls.

## Solution

Whitelist your crew member IPs in fail2ban so they're never blocked.

## Quick Start

### Option 1: Whitelist Individual IPs

Run this on your **FreePBX server** for each crew member:

```bash
# Copy script to FreePBX
scp ~/.ai-phone-cli/scripts/whitelist-fail2ban.sh root@172.16.1.143:/tmp/

# SSH to FreePBX and run
ssh root@172.16.1.143
bash /tmp/whitelist-fail2ban.sh 172.16.1.100 "Morpheus LXC"
bash /tmp/whitelist-fail2ban.sh 172.16.1.101 "Trinity LXC"
# ... repeat for each crew member
```

### Option 2: Whitelist Entire Subnet (Recommended)

If all your LXCs are in the same subnet:

```bash
ssh root@172.16.1.143
bash /tmp/whitelist-fail2ban.sh 172.16.1.0/24 "AI Phone Crew Subnet"
```

## What It Does

1. Backs up existing `/etc/fail2ban/jail.local`
2. Adds your IP(s) to the `ignoreip` list
3. Restarts fail2ban service
4. Verifies the configuration

## Verify Whitelisting

Check current whitelisted IPs:

```bash
ssh root@172.16.1.143 "grep -A 10 'ignoreip' /etc/fail2ban/jail.local"
```

Check fail2ban status:

```bash
ssh root@172.16.1.143 "fail2ban-client status asterisk"
```

## Manual Method

If you prefer to edit manually:

1. SSH to FreePBX: `ssh root@172.16.1.143`
2. Edit config: `nano /etc/fail2ban/jail.local`
3. Add to `[DEFAULT]` section:

```ini
[DEFAULT]
ignoreip = 127.0.0.1/8 ::1
           172.16.1.0/24  # AI Phone crew subnet
```

1. Restart: `systemctl restart fail2ban`

## Troubleshooting

### Check if IP is banned

```bash
ssh root@172.16.1.143 "fail2ban-client status asterisk"
```

### Unban an IP

```bash
ssh root@172.16.1.143 "fail2ban-client set asterisk unbanip 172.16.1.100"
```

### View fail2ban logs

```bash
ssh root@172.16.1.143 "tail -f /var/log/fail2ban.log"
```

## Best Practices

1. **Whitelist the subnet** - Easier than individual IPs
2. **Run during setup** - Do this before deploying crew members
3. **Document IPs** - Keep track of which IPs are whitelisted
4. **Test after changes** - Make a test call to verify SIP still works

## Integration with Setup

You can add this to your deployment workflow:

```bash
# 1. Install AI Phone on crew member LXC
curl -sSL https://raw.githubusercontent.com/jayis1/2fast2dumb2fun/main/install.sh | bash

# 2. Whitelist the IP on FreePBX
ssh root@172.16.1.143 "bash /tmp/whitelist-fail2ban.sh $(hostname -I | awk '{print $1}') '$(hostname)'"

# 3. Setup and start
ai-phone setup
ai-phone start
```
