import fs from 'fs';
import path from 'path';
import { getConfigDir } from './config.js';

/**
 * Load environment variables from ~/.gemini-phone/.env
 * @returns {object} Environment variables as key-value pairs
 */
export function loadEnv() {
    const envPath = path.join(getConfigDir(), '.env');

    if (!fs.existsSync(envPath)) {
        return {}; // Return empty if no .env file
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};

    envContent.split('\n').forEach(line => {
        line = line.trim();

        // Skip empty lines and comments
        if (!line || line.startsWith('#')) return;

        // Parse KEY=VALUE
        const equalIndex = line.indexOf('=');
        if (equalIndex === -1) return;

        const key = line.substring(0, equalIndex).trim();
        const value = line.substring(equalIndex + 1).trim();

        // Remove quotes if present
        env[key] = value.replace(/^["']|["']$/g, '');
    });

    return env;
}

/**
 * Save environment variables to ~/.gemini-phone/.env
 * @param {object} envVars - Environment variables to save
 */
export function saveEnv(envVars) {
    const envPath = path.join(getConfigDir(), '.env');
    const lines = [];

    // Add header
    lines.push('# Gemini Phone Dynamic Configuration');
    lines.push('# This file contains values that may change (FreePBX IP, SIP settings)');
    lines.push('# Static values (API keys, device identity) are in config.json');
    lines.push('');

    // FreePBX section
    if (envVars.FREEPBX_IP || envVars.FREEPBX_GRAPHQL_URL) {
        lines.push('# FreePBX Configuration');
        if (envVars.FREEPBX_IP) {
            lines.push(`FREEPBX_IP=${envVars.FREEPBX_IP}`);
        }
        if (envVars.FREEPBX_GRAPHQL_URL) {
            lines.push(`FREEPBX_GRAPHQL_URL=${envVars.FREEPBX_GRAPHQL_URL}`);
        }
        lines.push('');
    }

    // SIP section
    if (envVars.SIP_DOMAIN || envVars.SIP_REGISTRAR) {
        lines.push('# SIP Configuration');
        if (envVars.SIP_DOMAIN) {
            lines.push(`SIP_DOMAIN=${envVars.SIP_DOMAIN}`);
        }
        if (envVars.SIP_REGISTRAR) {
            lines.push(`SIP_REGISTRAR=${envVars.SIP_REGISTRAR}`);
        }
        lines.push('');
    }

    // Server section
    if (envVars.EXTERNAL_IP || envVars.HTTP_PORT || envVars.WS_PORT) {
        lines.push('# Server Configuration');
        if (envVars.EXTERNAL_IP) {
            lines.push(`EXTERNAL_IP=${envVars.EXTERNAL_IP}`);
        }
        if (envVars.HTTP_PORT) {
            lines.push(`HTTP_PORT=${envVars.HTTP_PORT}`);
        }
        if (envVars.WS_PORT) {
            lines.push(`WS_PORT=${envVars.WS_PORT}`);
        }
        lines.push('');
    }

    // Admin section
    if (envVars.ADMIN_PHONE_NUMBER) {
        lines.push('# Admin Contact');
        lines.push(`ADMIN_PHONE_NUMBER=${envVars.ADMIN_PHONE_NUMBER}`);
        lines.push('');
    }

    fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
}

/**
 * Check if .env file exists
 * @returns {boolean} True if .env exists
 */
export function envExists() {
    const envPath = path.join(getConfigDir(), '.env');
    return fs.existsSync(envPath);
}

/**
 * Get path to .env file
 * @returns {string} Absolute path to .env
 */
export function getEnvPath() {
    return path.join(getConfigDir(), '.env');
}

/**
 * Migrate dynamic values from config.json to .env
 * @param {object} config - Current config object
 * @returns {object} Environment variables extracted from config
 */
export function migrateConfigToEnv(config) {
    const env = {};

    // Extract FreePBX settings
    if (config.sip?.domain) {
        env.FREEPBX_IP = config.sip.domain;
        env.SIP_DOMAIN = config.sip.domain;
    }

    if (config.sip?.registrar) {
        env.SIP_REGISTRAR = config.sip.registrar;
    }

    if (config.api?.freepbx?.apiUrl) {
        env.FREEPBX_GRAPHQL_URL = config.api.freepbx.apiUrl;
    }

    // Extract server settings
    if (config.server?.externalIp) {
        env.EXTERNAL_IP = config.server.externalIp;
    }

    if (config.server?.httpPort) {
        env.HTTP_PORT = config.server.httpPort.toString();
    }

    // Extract admin phone
    if (config.admin?.phoneNumber) {
        env.ADMIN_PHONE_NUMBER = config.admin.phoneNumber;
    }

    return env;
}
