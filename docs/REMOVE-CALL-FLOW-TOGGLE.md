# Remove Broken Call Flow Toggle from FreePBX

## Issue

There's a Call Flow Toggle feature code `*2834` ("internal callback") in FreePBX with broken destinations (shown in red).

![Broken Call Flow Toggle](file:///home/jais/.gemini/antigravity/brain/c9dc8514-466e-4e13-a02f-cb6c2f106a02/uploaded_media_1769887395023.png)

## How to Remove

### Via FreePBX GUI

1. Log into FreePBX web interface
2. Go to **Applications → Call Flow Control**
3. Find the entry with Feature Code `*2834` (Description: "internal callback")
4. Click the **Delete** icon (trash can)
5. Click **Submit** at the bottom
6. Click **Apply Config** (red bar at top)

### Via MySQL (if needed)

If the GUI doesn't work, remove it directly from the database:

```bash
# SSH into FreePBX server
ssh root@172.16.1.143

# Connect to MySQL
mysql -u freepbxuser -p asterisk

# Find the toggle
SELECT * FROM callflow_toggle WHERE feature_code = '*2834';

# Delete it
DELETE FROM callflow_toggle WHERE feature_code = '*2834';

# Exit MySQL
exit

# Reload FreePBX
fwconsole reload
```

## Why Remove It?

- **Bad destinations**: Both Normal and Override flows are broken (red)
- **Not needed**: The new scheduled callback system doesn't use Call Flow Toggles
- **Confusion**: Having a broken feature code can cause issues

## After Removal

The scheduled callback system works through:

- AI conversation detection (`🗣️ SCHEDULED_CALLBACK:` pattern)
- REST API endpoints (`/api/callbacks`)
- No feature codes needed!

Test callbacks by calling any crew member and saying:

```
"Call me back in 30 seconds to test this"
```
