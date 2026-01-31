# FreePBX IVR Automation via MySQL

## Problem

FreePBX GraphQL API does not expose IVR functionality. The only way to automate IVR provisioning is through direct MySQL database access.

## Solution Options

### Option 1: Direct MySQL Access (Most Reliable)

Connect directly to FreePBX's MySQL database and insert IVR configurations.

**Pros:**

- ✅ Full control
- ✅ Works reliably
- ✅ Can be automated

**Cons:**

- ❌ Requires MySQL credentials
- ❌ Bypasses FreePBX validation
- ❌ Need to run `fwconsole reload` after

**Implementation:**

```javascript
// Install mysql2
npm install mysql2

// Connect to FreePBX MySQL
const mysql = require('mysql2/promise');
const connection = await mysql.createConnection({
  host: '172.16.1.143',
  user: 'freepbxuser',
  password: 'your_mysql_password',
  database: 'asterisk'
});

// Insert IVR
await connection.execute(`
  INSERT INTO ivr_details (id, name, description, announcement, directdial, timeout, invalid_loops, retvm)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`, ['7000', 'Nebuchadnezzar Crew', 'AI Selection Menu', '0', 'CHECKED', '10', '3', 'CHECKED']);

// Insert IVR entries
await connection.execute(`
  INSERT INTO ivr_entries (ivr_id, selection, dest, ivr_ret)
  VALUES (?, ?, ?, ?)
`, ['7000', '1', 'ext-local,9000,1', '0']);

// Reload dialplan
exec('ssh root@172.16.1.143 "fwconsole reload"');
```

### Option 2: FreePBX CLI via SSH (Recommended)

Use FreePBX's command-line tools via SSH.

**Pros:**

- ✅ Uses official FreePBX tools
- ✅ Proper validation
- ✅ Automatic reload

**Cons:**

- ❌ Requires SSH access
- ❌ FreePBX CLI for IVR is limited

**Implementation:**

```bash
# SSH into FreePBX
ssh root@172.16.1.143

# Unfortunately, fwconsole doesn't have IVR commands
# You'd still need to use MySQL or the GUI
```

### Option 3: Manual GUI (Current Approach)

Keep using the FreePBX web GUI manually.

**Pros:**

- ✅ Safe
- ✅ Visual confirmation
- ✅ No risk of breaking things

**Cons:**

- ❌ Manual work
- ❌ Not automated

## Recommendation

For your scam-the-scammers setup, I recommend **Option 3 (Manual GUI)** because:

1. **You only set it up once** - After initial IVR creation, you rarely change it
2. **Safety** - Direct MySQL access can break FreePBX if done wrong
3. **Simplicity** - The GUI is straightforward for IVR setup

**However**, if you really want automation, I can implement **Option 1 (MySQL)** with proper safety checks.

## Next Steps

**Choose your path:**

**A) Manual (Recommended)**

- Follow `docs/NEBUCHADNEZZAR-SETUP.md`
- Takes 5 minutes to set up IVR 7000 in GUI
- Safe and reliable

**B) Automated (Advanced)**

- I'll create a MySQL-based IVR provisioning script
- Requires FreePBX MySQL credentials
- Higher risk but fully automated

Let me know which you prefer!
