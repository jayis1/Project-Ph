import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadEnv, envExists, migrateConfigToEnv, saveEnv } from './env-loader.js';

/**
 * Get the config directory path
 * @returns {string} Path to ~/.gemini-phone
 */
export function getConfigDir() {
  return path.join(os.homedir(), '.gemini-phone');
}

/**
 * Get the config file path
 * @returns {string} Path to ~/.gemini-phone/config.json
 */
export function getConfigPath() {
  return path.join(getConfigDir(), 'config.json');
}

/**
 * Check if config file exists
 * @returns {boolean} True if config exists
 */
export function configExists() {
  return fs.existsSync(getConfigPath());
}

/**
 * Load configuration from disk, merging .env values
 * @returns {Promise<object>} Configuration object
 */
export async function loadConfig() {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    throw new Error('Configuration not found. Run "gemini-phone setup" first.');
  }

  const data = await fs.promises.readFile(configPath, 'utf8');
  const config = JSON.parse(data);

  // Ensure installationType exists for backward compatibility
  if (!config.installationType) {
    config.installationType = 'both';
  }

  // Normalize config structure (Handle flat keys from setup.js)
  normalizeConfig(config);

  // Auto-migrate: If .env doesn't exist but config has dynamic values, create .env
  if (!envExists() && (config.sip?.domain || config.server?.externalIp)) {
    const envVars = migrateConfigToEnv(config);
    saveEnv(envVars);
  }

  // Load .env and merge (env takes precedence for dynamic values)
  const env = loadEnv();

  if (Object.keys(env).length > 0) {
    // Merge FreePBX/SIP settings from .env
    if (env.FREEPBX_IP || env.SIP_DOMAIN) {
      config.sip = config.sip || {};
      config.sip.domain = env.SIP_DOMAIN || env.FREEPBX_IP || config.sip.domain;
      config.sip.registrar = env.SIP_REGISTRAR || env.FREEPBX_IP || config.sip.registrar;
    }

    if (env.FREEPBX_GRAPHQL_URL) {
      // .env always takes precedence
      config.api = config.api || {};
      config.api.freepbx = config.api.freepbx || {};
      config.api.freepbx.apiUrl = env.FREEPBX_GRAPHQL_URL;
    } else if (env.FREEPBX_IP) {
      // Auto-generate GraphQL URL from FREEPBX_IP
      config.api = config.api || {};
      config.api.freepbx = config.api.freepbx || {};
      config.api.freepbx.apiUrl = `http://${env.FREEPBX_IP}:83/admin/api/api/gql`;
    }

    // Merge server settings from .env
    if (env.EXTERNAL_IP) {
      config.server = config.server || {};
      config.server.externalIp = env.EXTERNAL_IP;
    }

    if (env.HTTP_PORT) {
      config.server = config.server || {};
      config.server.httpPort = parseInt(env.HTTP_PORT, 10);
    }

    // Merge admin phone from .env
    if (env.ADMIN_PHONE_NUMBER) {
      config.admin = config.admin || {};
      config.admin.phoneNumber = env.ADMIN_PHONE_NUMBER;
    }

    // Merge FreePBX MySQL settings from .env
    if (env.FREEPBX_MYSQL_HOST || env.FREEPBX_MYSQL_USER || env.FREEPBX_MYSQL_PASSWORD) {
      config.api = config.api || {};
      config.api.freepbx = config.api.freepbx || {};
      if (env.FREEPBX_MYSQL_HOST) config.api.freepbx.mysqlHost = env.FREEPBX_MYSQL_HOST;
      if (env.FREEPBX_MYSQL_USER) config.api.freepbx.mysqlUser = env.FREEPBX_MYSQL_USER;
      if (env.FREEPBX_MYSQL_PASSWORD) config.api.freepbx.mysqlPassword = env.FREEPBX_MYSQL_PASSWORD;
    }
  }

  return config;
}

/**
 * Normalize configuration object to V2 structure
 * @param {object} config - Configuration object to mutate
 */
function normalizeConfig(config) {
  // Ensure objects exist
  config.server = config.server || {};
  config.sip = config.sip || {};
  config.api = config.api || {};
  config.api.elevenlabs = config.api.elevenlabs || {};
  config.api.openai = config.api.openai || {};
  config.api.gemini = config.api.gemini || {};
  config.api.n8n = config.api.n8n || {};
  config.api.freepbx = config.api.freepbx || {};

  // Defaults
  if (!config.server.geminiApiPort) config.server.geminiApiPort = 3333;
  if (!config.server.httpPort) config.server.httpPort = 3000;

  // Map flat keys to nested structure
  if (config.externalIp) config.server.externalIp = config.externalIp;
  if (config.sipDomain) config.sip.domain = config.sipDomain;
  if (config.sipDomain && !config.sip.registrar) config.sip.registrar = config.sipDomain;

  if (config.elevenlabsKey) config.api.elevenlabs.apiKey = config.elevenlabsKey;
  if (config.openaiKey) config.api.openai.apiKey = config.openaiKey;
  if (config.geminiKey) config.api.gemini.apiKey = config.geminiKey;
  if (config.n8nWebhookUrl) config.api.n8n.webhookUrl = config.n8nWebhookUrl;

  // Map devices
  if (!config.devices || config.devices.length === 0) {
    if (config.sipExtension) {
      config.devices = [{
        name: config.botName || 'Gemini',
        extension: config.sipExtension,
        authId: config.sipExtension,
        password: config.sipPassword || '',
        prompt: config.botPrompt || '',
        voiceId: config.voiceId || ''
      }];
    } else {
      config.devices = [];
    }
  }
}

/**
 * Get the installation type from config
 * @param {object} config - Configuration object
 * @returns {string} Installation type ('voice-server' | 'api-server' | 'both')
 */
export function getInstallationType(config) {
  return config.installationType || 'both';
}

/**
 * Save configuration to disk
 * @param {object} config - Configuration object
 * @returns {Promise<void>}
 */
export async function saveConfig(config) {
  const configDir = getConfigDir();
  const configPath = getConfigPath();

  // Create directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    await fs.promises.mkdir(configDir, { recursive: true, mode: 0o700 });
  }

  // Backup existing config if it exists
  if (fs.existsSync(configPath)) {
    const backupPath = configPath + '.backup';
    await fs.promises.copyFile(configPath, backupPath);
  }

  // Add security warning to config
  const configWithWarning = {
    _WARNING: 'DO NOT SHARE THIS FILE - Contains API keys and passwords',
    ...config
  };

  // Write config file
  const data = JSON.stringify(configWithWarning, null, 2);
  await fs.promises.writeFile(configPath, data, { mode: 0o600 });
}

/**
 * Get the PID file path
 * @returns {string} Path to server.pid
 */
export function getPidPath() {
  return path.join(getConfigDir(), 'server.pid');
}

/**
 * Get the docker-compose.yml path
 * @returns {string} Path to generated docker-compose.yml
 */
export function getDockerComposePath() {
  return path.join(getConfigDir(), 'docker-compose.yml');
}

/**
 * Get the .env file path
 * @returns {string} Path to generated .env
 */
export function getEnvPath() {
  return path.join(getConfigDir(), '.env');
}
