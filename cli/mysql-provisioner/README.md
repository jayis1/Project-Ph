# MySQL-Based IVR Provisioner

Automated IVR provisioning for FreePBX via direct MySQL access.

## ⚠️ Warning

This script directly modifies the FreePBX MySQL database. Use with caution!

## Prerequisites

1. **MySQL Access** - You need FreePBX MySQL credentials
2. **SSH Access** - To reload dialplan after changes
3. **sshpass** - For automated SSH (installed automatically)

## Setup

### Step 1: Get MySQL Credentials

SSH into your FreePBX server:

```bash
ssh root@172.16.1.143
cat /etc/freepbx.conf | grep -A 5 "AMPDBUSER\|AMPDBPASS"
```

You'll see something like:

```
$amp_conf['AMPDBUSER'] = 'freepbxuser';
$amp_conf['AMPDBPASS'] = 'your_password_here';
```

### Step 2: Configure the Script

Edit `provision-ivr-mysql.js` and update:

```javascript
const MYSQL_CONFIG = {
    host: '172.16.1.143',
    port: 3306,
    user: 'freepbxuser',        // From freepbx.conf
    password: 'YOUR_PASSWORD',   // From freepbx.conf
    database: 'asterisk'
};
```

### Step 3: Install Dependencies

```bash
cd cli/mysql-provisioner
npm install
```

### Step 4: Run the Provisioner

```bash
node provision-ivr-mysql.js
```

## What It Does

1. ✅ Connects to FreePBX MySQL database
2. ✅ Deletes existing IVR 7000 (if exists)
3. ✅ Creates new IVR 7000 with all crew members
4. ✅ Configures menu options (1-9 for crew, 0 for ring all)
5. ✅ Reloads FreePBX dialplan via SSH
6. ✅ Shows next steps for recording announcement

## IVR Configuration

| Key | Destination | AI |
|-----|-------------|-----|
| 1 | Extension 9000 | Morpheus |
| 2 | Extension 9001 | Trinity |
| 3 | Extension 9002 | Neo |
| 4 | Extension 9003 | Tank |
| 5 | Extension 9004 | Dozer |
| 6 | Extension 9005 | Apoc |
| 7 | Extension 9006 | Switch |
| 8 | Extension 9007 | Mouse |
| 9 | Extension 9008 | Cypher |
| 0 | Ring Group 8000 | All Crew |

## Troubleshooting

### MySQL Connection Refused

1. Check MySQL is running: `systemctl status mariadb`
2. Allow remote connections in `/etc/my.cnf`:

   ```
   [mysqld]
   bind-address = 0.0.0.0
   ```

3. Grant remote access:

   ```sql
   GRANT ALL ON asterisk.* TO 'freepbxuser'@'%' IDENTIFIED BY 'password';
   FLUSH PRIVILEGES;
   ```

### SSH Connection Failed

1. Check SSH is running: `systemctl status sshd`
2. Verify password in script matches root password
3. Or use SSH key instead of password

### Dialplan Not Reloading

Manually reload:

```bash
ssh root@172.16.1.143 "fwconsole reload"
```

## Safety

- ✅ Checks for existing IVR before creating
- ✅ Deletes old entries to avoid conflicts
- ✅ Uses transactions (rollback on error)
- ✅ Validates all data before insert

## Next Steps After Provisioning

1. **Record Announcement** in FreePBX GUI
2. **Update IVR** to use the recording
3. **Point DID** to IVR 7000
4. **Test** by calling and pressing each number

Enjoy your automated scam-the-scammers IVR! 🚀
