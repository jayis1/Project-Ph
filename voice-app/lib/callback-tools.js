/**
 * AI tools for inter-extension calling and callback coordination
 * These tools enable crew members to call each other and coordinate callbacks
 */

// Crew member extension mapping
const CREW_EXTENSIONS = {
    'Morpheus': '9000',
    'Trinity': '9001',
    'Neo': '9002',
    'Tank': '9003',
    'Dozer': '9004',
    'Apoc': '9005',
    'Switch': '9006',
    'Mouse': '9007',
    'Cypher': '9008'
};

/**
 * Tool definitions for AI
 */
export const callbackTools = [
    {
        name: 'call_crew_member',
        description: 'Call another Nebuchadnezzar crew member at their extension. Use this when you need to talk to another crew member.',
        parameters: {
            type: 'object',
            properties: {
                crew_member: {
                    type: 'string',
                    enum: Object.keys(CREW_EXTENSIONS),
                    description: 'Name of the crew member to call'
                },
                message: {
                    type: 'string',
                    description: 'Message to deliver to the crew member (keep under 100 words)'
                }
            },
            required: ['crew_member', 'message']
        }
    },
    {
        name: 'request_callback',
        description: 'Ask another crew member to call a phone number back. Use this when someone asks you to have another crew member call them.',
        parameters: {
            type: 'object',
            properties: {
                crew_member: {
                    type: 'string',
                    enum: Object.keys(CREW_EXTENSIONS),
                    description: 'Crew member who should make the callback'
                },
                phone_number: {
                    type: 'string',
                    description: 'Phone number to call back (E.164 format, e.g., +15551234567)'
                },
                reason: {
                    type: 'string',
                    description: 'Brief reason for the callback (optional)'
                }
            },
            required: ['crew_member', 'phone_number']
        }
    },
    {
        name: 'make_callback',
        description: 'Call a phone number back. Use this when you were asked to call someone back.',
        parameters: {
            type: 'object',
            properties: {
                phone_number: {
                    type: 'string',
                    description: 'Phone number to call (E.164 format, e.g., +15551234567)'
                },
                greeting: {
                    type: 'string',
                    description: 'Opening message for the callback (optional, keep under 50 words)'
                }
            },
            required: ['phone_number']
        }
    }
];

/**
 * Tool implementations
 */

/**
 * Call another crew member's extension
 * @param {string} crewMember - Name of crew member
 * @param {string} message - Message to deliver
 * @param {string} callerDevice - Name of device making the call
 * @returns {Promise<object>} Call result
 */
export async function callCrewMember(crewMember, message, callerDevice) {
    const extension = CREW_EXTENSIONS[crewMember];

    if (!extension) {
        throw new Error(`Unknown crew member: ${crewMember}`);
    }

    console.log(`[${callerDevice}] Calling ${crewMember} at extension ${extension}`);

    try {
        const response = await fetch('http://localhost:3000/api/outbound-call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: extension,
                message: message,
                mode: 'conversation',
                device: crewMember
            })
        });

        const result = await response.json();

        if (result.success) {
            return {
                success: true,
                message: `Called ${crewMember} at extension ${extension}`,
                callId: result.callId
            };
        } else {
            return {
                success: false,
                message: `Failed to call ${crewMember}: ${result.error}`
            };
        }
    } catch (error) {
        console.error(`Error calling ${crewMember}:`, error);
        return {
            success: false,
            message: `Error calling ${crewMember}: ${error.message}`
        };
    }
}

/**
 * Request another crew member to call a number back
 * @param {string} crewMember - Name of crew member who should call back
 * @param {string} phoneNumber - Phone number to call back
 * @param {string} reason - Reason for callback (optional)
 * @param {string} callerDevice - Name of device requesting callback
 * @returns {Promise<object>} Request result
 */
export async function requestCallback(crewMember, phoneNumber, reason, callerDevice) {
    const extension = CREW_EXTENSIONS[crewMember];

    if (!extension) {
        throw new Error(`Unknown crew member: ${crewMember}`);
    }

    const reasonText = reason ? ` ${reason}` : '';
    const message = `Hey ${crewMember}, ${callerDevice} asked if you can call ${phoneNumber} back.${reasonText}`;

    console.log(`[${callerDevice}] Requesting ${crewMember} to call ${phoneNumber} back`);

    try {
        const response = await fetch('http://localhost:3000/api/outbound-call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: extension,
                message: message,
                mode: 'conversation',
                device: crewMember,
                metadata: {
                    callback_number: phoneNumber,
                    requested_by: callerDevice,
                    reason: reason
                }
            })
        });

        const result = await response.json();

        if (result.success) {
            return {
                success: true,
                message: `Asked ${crewMember} to call ${phoneNumber} back`,
                callId: result.callId
            };
        } else {
            return {
                success: false,
                message: `Failed to reach ${crewMember}: ${result.error}`
            };
        }
    } catch (error) {
        console.error(`Error requesting callback from ${crewMember}:`, error);
        return {
            success: false,
            message: `Error requesting callback: ${error.message}`
        };
    }
}

/**
 * Make an outbound callback
 * @param {string} phoneNumber - Phone number to call
 * @param {string} greeting - Opening message (optional)
 * @param {string} deviceName - Name of device making the call
 * @returns {Promise<object>} Call result
 */
export async function makeCallback(phoneNumber, greeting, deviceName) {
    const defaultGreeting = `Hi, this is ${deviceName} from the Nebuchadnezzar. You requested a callback.`;
    const message = greeting || defaultGreeting;

    console.log(`[${deviceName}] Making callback to ${phoneNumber}`);

    try {
        const response = await fetch('http://localhost:3000/api/outbound-call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: phoneNumber,
                message: message,
                mode: 'conversation',
                device: deviceName
            })
        });

        const result = await response.json();

        if (result.success) {
            return {
                success: true,
                message: `Calling ${phoneNumber} back`,
                callId: result.callId
            };
        } else {
            return {
                success: false,
                message: `Failed to call ${phoneNumber}: ${result.error}`
            };
        }
    } catch (error) {
        console.error(`Error making callback to ${phoneNumber}:`, error);
        return {
            success: false,
            message: `Error making callback: ${error.message}`
        };
    }
}
