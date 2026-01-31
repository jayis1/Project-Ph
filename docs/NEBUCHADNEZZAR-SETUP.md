# Nebuchadnezzar Crew - IVR Setup Guide

## 🚢 The Crew

Your scam-the-scammers AI call center with the full Nebuchadnezzar crew!

| Extension | Name | Role | Personality |
|-----------|------|------|-------------|
| 9000 | Morpheus | Captain | Wise mentor, philosophical, calm |
| 9001 | Trinity | First Mate | Elite hacker, direct, efficient |
| 9002 | Neo | The One | Learning fast, curious, helpful |
| 9003 | Tank | Operator | Tech support, knowledgeable |
| 9004 | Dozer | Pilot | Friendly helper, easygoing |
| 9005 | Apoc | Crew | Street smart, practical |
| 9006 | Switch | Crew | Quick thinker, sharp |
| 9007 | Mouse | Programmer | Enthusiastic, creative |
| 9008 | Cypher | Traitor | Suspicious, self-serving |

## 📞 Ring Group 8000

**Automated Setup:**

```bash
node cli/provision-nebuchadnezzar.js
```

This creates Ring Group 8000 with ALL crew members (extensions 9000-9008).

## 🎙️ IVR 7000 - Manual Setup

Since IVR isn't in the FreePBX GraphQL API, you need to create it manually:

### Step 1: Create IVR

1. Go to **Applications → IVR → Add IVR**
2. **IVR Number**: `7000`
3. **IVR Name**: `Nebuchadnezzar Crew Selection`
4. **IVR Description**: `Choose your AI crew member`

### Step 2: Configure Options

| Key | Destination | Description |
|-----|-------------|-------------|
| 1 | Extensions → 9000 | Morpheus (Captain) |
| 2 | Extensions → 9001 | Trinity (First Mate) |
| 3 | Extensions → 9002 | Neo (The One) |
| 4 | Extensions → 9003 | Tank (Operator) |
| 5 | Extensions → 9004 | Dozer (Pilot) |
| 6 | Extensions → 9005 | Apoc (Crew) |
| 7 | Extensions → 9006 | Switch (Crew) |
| 8 | Extensions → 9007 | Mouse (Programmer) |
| 9 | Extensions → 9008 | Cypher (Traitor) |
| 0 | Ring Groups → 8000 | Ring All Crew |
| # | Extensions → 9000 | Morpheus (default) |

### Step 3: Record Announcement

**Option A: Use System Recording**

1. Go to **Admin → System Recordings**
2. Click **Add Recording**
3. Record:
   > "Welcome to the Nebuchadnezzar. Press 1 for Morpheus, 2 for Trinity, 3 for Neo, 4 for Tank, 5 for Dozer, 6 for Apoc, 7 for Switch, 8 for Mouse, 9 for Cypher, or press 0 to ring all crew members."

**Option B: Upload Pre-recorded File**

1. Record the announcement on your computer
2. Upload via **Admin → System Recordings → Upload**

### Step 4: Configure IVR Settings

- **Timeout**: 10 seconds
- **Invalid Retries**: 3
- **Timeout Retries**: 3
- **Invalid Destination**: Hangup
- **Timeout Destination**: Ring Group 8000 (ring all)
- **Direct Dial**: Enabled
- **Return to IVR**: Disabled

### Step 5: Point Your DID

1. Go to **Connectivity → Inbound Routes**
2. Find your DID or create a new route
3. Set **Destination**: IVR → 7000

## 🎯 Testing

Call your DID and you should hear:

1. IVR announcement
2. Press 1-9 to talk to specific AI
3. Press 0 to ring all AIs
4. If timeout → rings all AIs

## 🔧 Updating the Crew

When you add more AIs:

1. Run `node cli/provision-nebuchadnezzar.js` to update Ring Group 8000
2. Manually add the new extension to IVR 7000

## 💡 Pro Tips

1. **Test Each AI**: Call and press each number to verify all AIs answer
2. **Monitor Calls**: Use **Reports → CDR Reports** to see which AI gets the most calls
3. **Scammer Confusion**: The more AIs, the more you can waste scammers' time! 😈
4. **Personality Variety**: Give each AI a distinct personality so scammers think they're talking to different people

## 🎬 The Scam-the-Scammers Flow

```
Scammer calls your DID
    ↓
IVR: "Press 1 for Morpheus, 2 for Trinity..."
    ↓
Scammer presses 1
    ↓
Morpheus answers: "This is Morpheus. What can I help you with?"
    ↓
Scammer: "Your computer has virus!"
    ↓
Morpheus: "What is real? How do you define 'virus'?" 🤔
    ↓
Scammer gets confused and frustrated
    ↓
Time wasted = Mission accomplished! ✅
```

Enjoy your AI scam-the-scammers call center! 🚀
