/**
 * Device Registry Module
 *
 * Manages device configurations for multi-device voice interface support.
 * Loads device configs from JSON and provides lookup by extension or name.
 *
 * Each device has:
 * - name: Human-readable identifier (e.g., "Cephanie", "Morpheus")
 * - extension: SIP extension number (e.g., "9002")
 * - authId: 3CX authentication ID for SIP REGISTER
 * - password: 3CX authentication password
 * - voiceId: ElevenLabs voice ID for TTS
 * - prompt: System prompt that defines device personality
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const CONFIG_PATH = path.join(__dirname, '../config/devices.json');

// Default device (Morpheus) - used when config file missing or no match found
const MORPHEUS_DEFAULT = {
  name: 'Morpheus',
  extension: '9000',
  authId: 'Au0XZPTpJY',
  password: 'DGHwMW6v25',
  voiceId: 'JAgnJveGGUh4qy4kh6dF',
  prompt: 'You are Morpheus, Chuck\'s principal AI assistant. You are meticulous, systematic, and excellence-driven. Keep voice responses under 40 words.'
};

class DeviceRegistry {
  constructor() {
    this.devices = {};
    this.devicesByName = {};
    this.loaded = false;
    this.load();
  }

  /**
   * Load devices from config file
   * Supports both:
   * 1. Legacy format: { "9000": { extension, authId, password, ... }, ... }
   * 2. Template format: { template: {...}, extensions: [...], customizations: {...} }
   */
  load() {
    try {
      if (!fs.existsSync(CONFIG_PATH)) {
        logger.warn('Device config not found, using Morpheus default only', {
          path: CONFIG_PATH
        });
        this.devices = {
          [MORPHEUS_DEFAULT.extension]: MORPHEUS_DEFAULT
        };
        this.devicesByName = {
          [MORPHEUS_DEFAULT.name.toLowerCase()]: MORPHEUS_DEFAULT
        };
        this.loaded = true;
        return;
      }

      const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
      const config = JSON.parse(configData);

      if (typeof config !== 'object') {
        throw new Error('Device config must be an object');
      }

      this.devices = {};
      this.devicesByName = {};

      // Check if template-based format
      if (config.template && config.extensions) {
        logger.info('Loading template-based device config');
        this._loadTemplateConfig(config);
      } else {
        // Legacy format: direct extension mapping
        logger.info('Loading legacy device config');
        this._loadLegacyConfig(config);
      }

      // Only use Morpheus default if NO devices are configured
      if (Object.keys(this.devices).length === 0) {
        logger.warn('No devices configured, using Morpheus default');
        this.devices[MORPHEUS_DEFAULT.extension] = MORPHEUS_DEFAULT;
        this.devicesByName[MORPHEUS_DEFAULT.name.toLowerCase()] = MORPHEUS_DEFAULT;
      }

      this.loaded = true;
      logger.info('Device registry loaded', {
        deviceCount: Object.keys(this.devices).length,
        devices: Object.keys(this.devices)
      });

    } catch (error) {
      logger.error('Failed to load device config', { error: error.message });
      this.devices = { [MORPHEUS_DEFAULT.extension]: MORPHEUS_DEFAULT };
      this.devicesByName = { [MORPHEUS_DEFAULT.name.toLowerCase()]: MORPHEUS_DEFAULT };
      this.loaded = true;
    }
  }

  /**
   * Load template-based configuration
   * Format: { template: { password, voiceId, ... }, extensions: ["9000", ...], customizations: { "9000": { name, prompt, ... } } }
   */
  _loadTemplateConfig(config) {
    const { template, extensions, customizations = {} } = config;

    for (const extension of extensions) {
      const custom = customizations[extension] || {};

      // Merge template with customization
      const device = {
        extension: extension,
        authId: custom.authId || extension, // Default authId = extension
        password: custom.password || template.password,
        name: custom.name || `Bot-${extension}`,
        prompt: custom.prompt || template.prompt || 'You are a helpful AI assistant.',
        voiceId: custom.voiceId || template.voiceId || 'EXAVITQu4vr4xnSDxMaL'
      };

      this.devices[extension] = device;
      this.devicesByName[device.name.toLowerCase()] = device;
    }
  }

  /**
   * Load legacy direct-mapping configuration
   * Format: { "9000": { extension, authId, password, ... }, ... }
   */
  _loadLegacyConfig(config) {
    for (const [extension, device] of Object.entries(config)) {
      if (!device.name || !device.extension) {
        logger.warn('Skipping invalid device config', { extension, device });
        continue;
      }

      this.devices[extension] = device;
      this.devicesByName[device.name.toLowerCase()] = device;
    }
  }

  reload() {
    logger.info('Reloading device registry...');
    this.load();
  }

  getByExtension(extension) {
    return this.devices[extension] || null;
  }

  getByName(name) {
    if (!name) return null;
    return this.devicesByName[name.toLowerCase()] || null;
  }

  get(identifier) {
    if (!identifier) return null;
    let device = this.getByExtension(identifier);
    if (!device) {
      device = this.getByName(identifier);
    }
    return device;
  }

  getAll() {
    return { ...this.devices };
  }

  getAllDevices() {
    return { ...this.devices };
  }

  getDefault() {
    return { ...MORPHEUS_DEFAULT };
  }

  isLoaded() {
    return this.loaded;
  }

  /**
   * Get devices that have auth credentials for SIP registration
   * Returns array of devices with authId and password
   */
  getRegistrableDevices() {
    const registrable = [];
    for (const device of Object.values(this.devices)) {
      if (device.authId && device.password) {
        registrable.push(device);
      }
    }
    return registrable;
  }

  /**
   * Get registration configs for all registrable devices
   * Returns object keyed by extension
   */
  getRegistrationConfigs() {
    const configs = {};
    for (const [ext, device] of Object.entries(this.devices)) {
      if (device.authId && device.password) {
        configs[ext] = device;
      }
    }
    return configs;
  }
}

// Singleton instance
const registry = new DeviceRegistry();

module.exports = registry;
