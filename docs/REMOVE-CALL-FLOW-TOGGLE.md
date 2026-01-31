# Fix Call Flow Toggle in FreePBX

## Issue

There's a Call Flow Toggle feature code `*2834` ("internal callback") in FreePBX with broken destinations (shown in red).

![Broken Call Flow Toggle](file:///home/jais/.gemini/antigravity/brain/c9dc8514-466e-4e13-a02f-cb6c2f106a02/uploaded_media_1769887395023.png)

## How to Fix

### Via FreePBX GUI

1. Log into FreePBX web interface
2. Go to **Applications → Call Flow Control**
3. Find the entry with Feature Code `*2834` (Description: "internal callback")
4. Click the **Edit** icon (pencil)
5. Configure the destinations:

**Normal Flow (Green/ILF off):**

- Set to: `Extensions → 9000` (Morpheus) or `Ring Groups → 8000` (All crew)

**Override Flow (Red/ILF on):**

- Set to: `Terminate Call → Hangup` or another destination

1. Click **Submit** at the bottom
2. Click **Apply Config** (red bar at top)

### Suggested Configuration

**Option 1: Toggle between Morpheus and All Crew**

- Normal Flow: `Extensions → 9000` (Morpheus only)
- Override Flow: `Ring Groups → 8000` (All crew members)

**Option 2: Toggle between Callbacks Enabled/Disabled**

- Normal Flow: `IVR → 7000` (Nebuchadnezzar Crew menu)
- Override Flow: `Announcement → "Callbacks are currently disabled"` → Hangup

**Option 3: After-Hours Toggle**

- Normal Flow: `IVR → 7000` (Normal business hours)
- Override Flow: `Voicemail → 9000` (After hours, leave message)

## How to Use

Once configured, dial `*2834` from any phone to toggle between modes:

```bash
# Check current mode
# Dial *2834 - you'll hear a confirmation

# Toggle to other mode
# Dial *2834 again
```

## Integration with Scheduled Callbacks

The Call Flow Toggle can work alongside the scheduled callback system:

- **Normal mode**: Calls go to crew members who can schedule callbacks
- **Override mode**: Calls go to voicemail or alternate destination

The scheduled callback system (`🗣️ SCHEDULED_CALLBACK:`) works independently and doesn't require this toggle.

## Testing

1. Call the main number (88707695)
2. Verify it follows the "Normal Flow" destination
3. Dial `*2834` to toggle
4. Call the main number again
5. Verify it follows the "Override Flow" destination
6. Dial `*2834` to toggle back
