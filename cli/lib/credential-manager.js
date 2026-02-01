import crypto from 'crypto';
import os from 'os';

/**
 * Credential Manager
 * Provides secure encryption/decryption for sensitive credentials
 * Uses machine-specific key derived from hostname and user
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Generate encryption key from machine-specific data
 * @returns {Buffer} Encryption key
 */
function getMachineKey() {
    const hostname = os.hostname();
    const username = os.userInfo().username;
    const machineId = `${hostname}-${username}`;

    // Derive key using PBKDF2
    return crypto.pbkdf2Sync(
        machineId,
        'gemini-phone-salt-v1',
        100000,
        KEY_LENGTH,
        'sha256'
    );
}

/**
 * Encrypt a credential value
 * @param {string} value - Plain text value to encrypt
 * @returns {string} Encrypted value (base64 encoded)
 */
export function encryptCredential(value) {
    if (!value || typeof value !== 'string') {
        throw new Error('Value must be a non-empty string');
    }

    const key = getMachineKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine iv + authTag + encrypted
    const combined = Buffer.concat([
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
    ]);

    return combined.toString('base64');
}

/**
 * Decrypt a credential value
 * @param {string} encrypted - Encrypted value (base64 encoded)
 * @returns {string} Plain text value
 */
export function decryptCredential(encrypted) {
    if (!encrypted || typeof encrypted !== 'string') {
        throw new Error('Encrypted value must be a non-empty string');
    }

    try {
        const key = getMachineKey();
        const combined = Buffer.from(encrypted, 'base64');

        // Extract iv, authTag, and encrypted data
        const iv = combined.subarray(0, IV_LENGTH);
        const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
        const encryptedData = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedData.toString('hex'), 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
}

/**
 * Encrypt sensitive fields in configuration object
 * @param {object} config - Configuration object
 * @returns {object} Configuration with encrypted fields
 */
export function encryptConfig(config) {
    const encrypted = JSON.parse(JSON.stringify(config)); // Deep clone

    // Encrypt FreePBX credentials
    if (encrypted.freepbx) {
        if (encrypted.freepbx.sshPassword) {
            encrypted.freepbx.sshPassword = encryptCredential(encrypted.freepbx.sshPassword);
            encrypted.freepbx.sshPasswordEncrypted = true;
        }
        if (encrypted.freepbx.mysqlPassword) {
            encrypted.freepbx.mysqlPassword = encryptCredential(encrypted.freepbx.mysqlPassword);
            encrypted.freepbx.mysqlPasswordEncrypted = true;
        }
    }

    // Encrypt SIP trunk credentials
    if (encrypted.sipTrunk) {
        if (encrypted.sipTrunk.password) {
            encrypted.sipTrunk.password = encryptCredential(encrypted.sipTrunk.password);
            encrypted.sipTrunk.passwordEncrypted = true;
        }
    }

    // Encrypt API keys
    if (encrypted.api) {
        if (encrypted.api.elevenlabs?.apiKey) {
            encrypted.api.elevenlabs.apiKey = encryptCredential(encrypted.api.elevenlabs.apiKey);
            encrypted.api.elevenlabs.apiKeyEncrypted = true;
        }
        if (encrypted.api.openai?.apiKey) {
            encrypted.api.openai.apiKey = encryptCredential(encrypted.api.openai.apiKey);
            encrypted.api.openai.apiKeyEncrypted = true;
        }
        if (encrypted.api.freepbx?.clientSecret) {
            encrypted.api.freepbx.clientSecret = encryptCredential(encrypted.api.freepbx.clientSecret);
            encrypted.api.freepbx.clientSecretEncrypted = true;
        }
    }

    return encrypted;
}

/**
 * Decrypt sensitive fields in configuration object
 * @param {object} config - Configuration object with encrypted fields
 * @returns {object} Configuration with decrypted fields
 */
export function decryptConfig(config) {
    const decrypted = JSON.parse(JSON.stringify(config)); // Deep clone

    // Decrypt FreePBX credentials
    if (decrypted.freepbx) {
        if (decrypted.freepbx.sshPasswordEncrypted && decrypted.freepbx.sshPassword) {
            decrypted.freepbx.sshPassword = decryptCredential(decrypted.freepbx.sshPassword);
            delete decrypted.freepbx.sshPasswordEncrypted;
        }
        if (decrypted.freepbx.mysqlPasswordEncrypted && decrypted.freepbx.mysqlPassword) {
            decrypted.freepbx.mysqlPassword = decryptCredential(decrypted.freepbx.mysqlPassword);
            delete decrypted.freepbx.mysqlPasswordEncrypted;
        }
    }

    // Decrypt SIP trunk credentials
    if (decrypted.sipTrunk) {
        if (decrypted.sipTrunk.passwordEncrypted && decrypted.sipTrunk.password) {
            decrypted.sipTrunk.password = decryptCredential(decrypted.sipTrunk.password);
            delete decrypted.sipTrunk.passwordEncrypted;
        }
    }

    // Decrypt API keys
    if (decrypted.api) {
        if (decrypted.api.elevenlabs?.apiKeyEncrypted && decrypted.api.elevenlabs.apiKey) {
            decrypted.api.elevenlabs.apiKey = decryptCredential(decrypted.api.elevenlabs.apiKey);
            delete decrypted.api.elevenlabs.apiKeyEncrypted;
        }
        if (decrypted.api.openai?.apiKeyEncrypted && decrypted.api.openai.apiKey) {
            decrypted.api.openai.apiKey = decryptCredential(decrypted.api.openai.apiKey);
            delete decrypted.api.openai.apiKeyEncrypted;
        }
        if (decrypted.api.freepbx?.clientSecretEncrypted && decrypted.api.freepbx.clientSecret) {
            decrypted.api.freepbx.clientSecret = decryptCredential(decrypted.api.freepbx.clientSecret);
            delete decrypted.api.freepbx.clientSecretEncrypted;
        }
    }

    return decrypted;
}

/**
 * Validate that a credential can be encrypted and decrypted
 * @param {string} value - Value to test
 * @returns {boolean} True if roundtrip successful
 */
export function validateCredential(value) {
    try {
        const encrypted = encryptCredential(value);
        const decrypted = decryptCredential(encrypted);
        return decrypted === value;
    } catch (error) {
        return false;
    }
}
