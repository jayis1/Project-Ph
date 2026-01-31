# IVR Option 9 - Admin Cell Phone Forwarding

## Overview

Configure IVR option 9 to forward calls to the system administrator's cell phone.

## Configuration

### Option 1: During Setup

When running `gemini-phone setup`, you'll be prompted:

```
📞 Admin Contact (Optional)
? Admin cell phone number (for IVR option 9, leave empty to skip):
```

Enter your cell phone in E.164 format: `+15551234567`

This will be saved to `~/.gemini-phone/config.json`:

```json
{
  "admin": {
    "phoneNumber": "+15551234567"
  }
}
```

### Option 2: Manual Configuration

Edit `~/.gemini-phone/config.json` and add:

```json
{
  "admin": {
    "phoneNumber": "+15551234567"
  },
  ...
}
```

### Option 3: Environment Variable

Add to `.env`:

```bash
ADMIN_PHONE_NUMBER=+15551234567
```

## FreePBX Configuration

### Automatic (via MySQL Provisioner)

The MySQL provisioner will automatically create IVR option 9 if admin phone is configured:

```bash
cd ~/.gemini-phone-cli/cli/mysql-provisioner
node provision-ivr-mysql.js
```

This creates:

- IVR option 9 → Custom destination → Outbound route to admin phone

### Manual (via FreePBX GUI)

1. Go to **Applications → IVR**
2. Edit "Nebuchadnezzar IVR" (7000)
3. Under **IVR Entries**, add:
   - **Digit**: 9
   - **Destination**: Custom Destination → `Local/${ADMIN_PHONE}@from-internal`
4. Click **Submit** and **Apply Config**

## Phone Number Format

**Recommended:** E.164 format

- US: `+15551234567`
- UK: `+441234567890`
- Germany: `+4930123456`

**Also supported:**

- National format: `5551234567` (US)
- With dashes: `555-123-4567`
- With spaces: `555 123 4567`

## Testing

1. Call your main IVR number (88707695)
2. Press **9**
3. Call should forward to your cell phone
4. You'll see caller ID from FreePBX

## Troubleshooting

### Option 9 doesn't work

1. Check config: `cat ~/.gemini-phone/config.json | grep -A 2 admin`
2. Verify IVR entry exists in FreePBX: **Applications → IVR → Nebuchadnezzar IVR**
3. Check outbound route allows calls to your number

### Call doesn't connect

1. Verify your SIP trunk supports outbound calls
2. Check FreePBX outbound routes: **Connectivity → Outbound Routes**
3. Ensure dial pattern matches your admin phone number

### Wrong caller ID

1. Go to **Connectivity → Outbound Routes**
2. Edit the route used for admin calls
3. Set **Outbound Caller ID** to your DID

## IVR Menu Example

With option 9 configured, your IVR menu becomes:

```
"Welcome to Nebuchadnezzar.
Press 1 for Morpheus.
Press 2 for Trinity.
Press 0 to reach all crew members.
Press 9 to reach the system administrator."
```

## Security Considerations

- **Don't expose admin phone publicly** - Only use in trusted environments
- **Consider time conditions** - Only allow during business hours
- **Use PIN protection** - Add a PIN code before forwarding (optional)

## Advanced: PIN Protection

To require a PIN before forwarding to admin:

1. Create a **Custom Destination**:

   ```
   custom-admin-pin,s,1
   ```

2. Add to `/etc/asterisk/extensions_custom.conf`:

   ```
   [custom-admin-pin]
   exten => s,1,Answer()
   exten => s,n,Read(PIN,enter-password,4)
   exten => s,n,GotoIf($["${PIN}" = "1234"]?auth:fail)
   exten => s,n(auth),Dial(Local/+15551234567@from-internal)
   exten => s,n,Hangup()
   exten => s,n(fail),Playback(auth-incorrect)
   exten => s,n,Hangup()
   ```

3. Set IVR option 9 to: **Custom Destination → custom-admin-pin**

Change `1234` to your desired PIN.
