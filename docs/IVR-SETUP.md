# Ring Group and IVR Setup for Gemini Phone

This guide shows how to set up a FreePBX Ring Group and IVR so you can call one number and select which AI to talk to.

## Overview

Instead of calling each AI directly (9000 for Morpheus, 9001 for Trinity), you can:

1. Call a single number (e.g., your DID or extension 8000)
2. Hear an IVR menu: "Press 1 for Morpheus, Press 2 for Trinity"
3. Get connected to the AI you selected

## Setup Steps

### 1. Create Ring Group (Optional)

If you want all AIs to ring at once:

1. Go to **Connectivity → Ring Groups**
2. Click **Add Ring Group**
3. Configure:
   - **Ring Group Number**: 8000
   - **Group Description**: "AI Assistants"
   - **Extension List**: 9000, 9001 (add more as needed)
   - **Ring Strategy**: "ringall" (all ring at once) or "hunt" (one at a time)
4. **Submit** and **Apply Config**

Now calling 8000 will ring both Morpheus and Trinity.

### 2. Create IVR Menu (Recommended)

For a menu-driven selection:

1. Go to **Applications → IVR**
2. Click **Add IVR**
3. Configure:
   - **IVR Number**: 7000
   - **IVR Name**: "AI Selection Menu"
   - **IVR Description**: "Choose your AI assistant"
   - **Announcement**: Record or upload audio saying:

     ```
     "Welcome to the AI assistant menu.
      Press 1 for Morpheus, the philosophical guide.
      Press 2 for Trinity, the security expert.
      Press 0 to ring all assistants."
     ```

4. **IVR Entries**:
   - **1** → Destination: Extensions → 9000 (Morpheus)
   - **2** → Destination: Extensions → 9001 (Trinity)
   - **0** → Destination: Ring Groups → 8000 (All AIs)
   - **t** (timeout) → Destination: Hangup or Ring Group 8000
   - **i** (invalid) → Destination: Repeat IVR or Hangup

5. **Submit** and **Apply Config**

### 3. Point Your DID to the IVR

1. Go to **Connectivity → Inbound Routes**
2. Find your DID or create a new route
3. Set **Destination**: IVR → 7000 (AI Selection Menu)
4. **Submit** and **Apply Config**

Now when you call your number, you'll hear the menu!

## Recording the IVR Announcement

### Option 1: Text-to-Speech (Quick)

1. In the IVR settings, use **System Recordings**
2. FreePBX can generate TTS for you

### Option 2: Record via Phone

1. Go to **Admin → System Recordings**
2. Click **Add Recording**
3. Call the recording extension from your phone
4. Record your message
5. Use this recording in your IVR

### Option 3: Upload Audio File

1. Record audio on your computer (WAV or MP3)
2. Go to **Admin → System Recordings**
3. Upload your file
4. Select it in the IVR announcement dropdown

## Example IVR Script

Here's a fun script you can use:

```
"Welcome to the Nebuchadnezzar's AI crew.

Press 1 to speak with Morpheus, who will guide you through the real world of your server infrastructure.

Press 2 to reach Trinity, our security specialist and mainframe guardian.

Press 3 for Neo... just kidding, he's still learning.

Press 0 to ring all available operators.

Or stay on the line to be connected to the first available AI."
```

## Advanced: Time-Based Routing

Route to different AIs based on time of day:

1. Go to **Applications → Time Conditions**
2. Create condition: "Business Hours"
3. **Time to match**: Mon-Fri, 9am-5pm
4. **Destination if matched**: Extension 9000 (Morpheus)
5. **Destination if not matched**: Extension 9001 (Trinity)

## Instance Identification (Optional)

If you want each AI to announce which server it's on:

1. Add to each server's `.env`:

   ```bash
   # On Morpheus server (fucktard4)
   INSTANCE_NAME="Server One"
   
   # On Trinity server (fucktard2)
   INSTANCE_NAME="Server Two"
   ```

2. Restart containers:

   ```bash
   docker compose restart voice-app
   ```

3. Now when you call:
   - Morpheus: "Hello! I'm Morpheus on Server One. How can I help you today?"
   - Trinity: "Hello! I'm Trinity on Server Two. How can I help you today?"

**Note**: If `INSTANCE_NAME` is not set, the AI will just say its name without the server identifier.

## Testing Your Setup

1. **Test IVR**: Call 7000 directly, verify menu plays
2. **Test Option 1**: Press 1, should reach Morpheus
3. **Test Option 2**: Press 2, should reach Trinity
4. **Test Ring Group**: Call 8000, both should ring
5. **Test DID**: Call your external number, should go to IVR

## Troubleshooting

### IVR Not Playing

- Check that announcement is uploaded/recorded
- Verify IVR is enabled
- Check FreePBX logs: `asterisk -rx "core show channels"`

### Wrong AI Answers

- Verify extension destinations in IVR settings
- Check that both 9000 and 9001 are registered (FreePBX → Reports → Asterisk Info → Peers)

### No Audio

- Check codec compatibility (ulaw/alaw)
- Verify RTP ports are open (30000-30100)
- Check FreePBX firewall settings

## Fun IVR Ideas

### Matrix Theme

```
"You have reached the Matrix. This is your last chance.
Press 1 for the red pill - speak with Morpheus.
Press 2 for the blue pill - speak with Trinity.
Press 3 to stay in wonderland."
```

### Server Status Theme

```
"Server monitoring system.
Press 1 for infrastructure overview.
Press 2 for security status.
Press 3 for performance metrics.
Or press 0 for emergency response team."
```

### Personal Assistant Theme

```
"Welcome to your personal AI assistant network.
Press 1 for general inquiries.
Press 2 for technical support.
Press 3 for system administration.
Press 9 to speak with all assistants."
```

---

## Related Documentation

- [FreePBX IVR Documentation](https://wiki.freepbx.org/display/FPG/IVR)
- [Ring Groups Guide](https://wiki.freepbx.org/display/FPG/Ring+Groups)
- [Inbound Routes](https://wiki.freepbx.org/display/FPG/Inbound+Routes)
