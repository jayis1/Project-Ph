import inquirer from 'inquirer';
import chalk from 'chalk';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { writeDockerConfig } from '../docker.js';

const CONFIG_DIR = join(homedir(), '.config', 'gemini-phone');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export async function setupCommand() {
  console.log(chalk.cyan.bold('\n🎯 Gemini Phone Setup Wizard\n'));

  // Ensure config directory exists
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  // Load existing config if present
  let existingConfig = {};
  if (existsSync(CONFIG_FILE)) {
    try {
      existingConfig = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
      console.log(chalk.yellow('Found existing configuration. You can update it.\n'));
    } catch (e) {
      console.log(chalk.red('Error reading existing config, starting fresh.\n'));
    }
  }

  // Ask what to install
  const { installMode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'installMode',
      message: 'What would you like to install?',
      choices: [
        { name: 'Both (Voice Server + API Server on same machine)', value: 'both' },
        { name: 'Voice Server Only (connects to remote API server)', value: 'voice' },
        { name: 'API Server Only (Gemini CLI wrapper)', value: 'api' }
      ],
      default: existingConfig.installMode || 'both'
    }
  ]);

  const config = { installMode };

  // Voice server configuration
  if (installMode === 'both' || installMode === 'voice') {
    console.log(chalk.cyan('\n📞 Voice Server Configuration\n'));

    const voiceConfig = await inquirer.prompt([
      {
        type: 'input',
        name: 'sipDomain',
        message: 'SIP Domain/Server IP:',
        default: existingConfig.sipDomain || '172.16.1.33',
        validate: (input) => input.trim() !== '' || 'SIP domain is required'
      },
      {
        type: 'input',
        name: 'sipExtension',
        message: 'Extension number:',
        default: existingConfig.sipExtension || '9000',
        validate: (input) => /^\d+$/.test(input) || 'Must be a number'
      },
      {
        type: 'password',
        name: 'sipPassword',
        message: 'SIP Password:',
        default: existingConfig.sipPassword || '',
        validate: (input) => input.trim() !== '' || 'Password is required'
      },
      {
        type: 'input',
        name: 'externalIp',
        message: 'External IP (for RTP):',
        default: existingConfig.externalIp || '',
        validate: (input) => /^\d+\.\d+\.\d+\.\d+$/.test(input) || 'Must be valid IP address'
      },
      {
        type: 'password',
        name: 'elevenlabsKey',
        message: 'ElevenLabs API Key:',
        default: existingConfig.elevenlabsKey || '',
        validate: (input) => input.trim() !== '' || 'API key is required'
      },
      {
        type: 'password',
        name: 'openaiKey',
        message: 'OpenAI API Key:',
        default: existingConfig.openaiKey || '',
        validate: (input) => input.trim() !== '' || 'API key is required'
      },
      {
        type: 'password',
        name: 'geminiKey',
        message: 'Google Gemini API Key:',
        default: existingConfig.geminiKey || '',
        validate: (input) => input.trim() !== '' || 'API key is required'
      }
    ]);

    Object.assign(config, voiceConfig);
  }

  // API server configuration
  if (installMode === 'both' || installMode === 'api') {
    console.log(chalk.cyan('\n🤖 API Server Configuration\n'));

    // Ask for Gemini API URL or default to localhost
    const apiConfig = await inquirer.prompt([
      {
        type: 'input',
        name: 'geminiApiUrl',
        message: 'Gemini API URL:',
        default: existingConfig.geminiApiUrl || 'http://localhost:3333',
        when: installMode === 'voice'
      }
    ]);

    if (installMode === 'both') {
      config.geminiApiUrl = 'http://localhost:3333';
    } else if (apiConfig.geminiApiUrl) {
      config.geminiApiUrl = apiConfig.geminiApiUrl;
    }

    // Ask for N8N Webhook URL
    const { n8nWebhookUrl } = await inquirer.prompt([
      {
        type: 'input',
        name: 'n8nWebhookUrl',
        message: 'N8N Webhook URL (optional):',
        default: existingConfig.n8nWebhookUrl || '',
      }
    ]);

    config.n8nWebhookUrl = n8nWebhookUrl;
  }

  // Voice profile
  if (installMode === 'both' || installMode === 'voice') {
    console.log(chalk.cyan('\n🎭 AI Personality\n'));

    const { botName, botPrompt, voiceId } = await inquirer.prompt([
      {
        type: 'input',
        name: 'botName',
        message: 'Bot name:',
        default: existingConfig.botName || 'Gemini',
      },
      {
        type: 'input',
        name: 'botPrompt',
        message: 'System prompt:',
        default: existingConfig.botPrompt || 'You are a helpful AI assistant. Be concise and friendly.',
      },
      {
        type: 'input',
        name: 'voiceId',
        message: 'ElevenLabs Voice ID:',
        default: existingConfig.voiceId || 'EXAVITQu4vr4xnSDxMaL',
      }
    ]);

    config.botName = botName;
    config.botPrompt = botPrompt;
    config.voiceId = voiceId;
  }

  // Save configuration
  try {
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log(chalk.green(`\n✅ Configuration saved to: ${CONFIG_FILE}\n`));

    // Create devices.json
    if (installMode === 'both' || installMode === 'voice') {
      createDevicesFile(config);
    }

    // Generate Docker configuration (docker-compose.yml and .env)
    // We need to map the flat config to the structure expected by writeDockerConfig
    // See cli/lib/docker.js generateEnvFile for the expected structure
    const installDir = join(homedir(), '.gemini-phone-cli');

    const mappedConfig = {
      paths: {
        voiceApp: join(installDir, 'voice-app'),
      },
      server: {
        externalIp: config.externalIp,
        httpPort: 3000,
        geminiApiPort: 3333,
      },
      sip: {
        domain: config.sipDomain,
        registrar: config.sipDomain,
      },
      api: {
        gemini: { apiKey: config.geminiKey },
        elevenlabs: { apiKey: config.elevenlabsKey },
        openai: { apiKey: config.openaiKey },
        n8n: { webhookUrl: config.n8nWebhookUrl },
      },
      devices: [{
        extension: config.sipExtension,
        authId: config.sipExtension,
        password: config.sipPassword,
        voiceId: config.voiceId,
      }],
      deployment: {
        mode: installMode
      }
    };

    if (installMode === 'both' || installMode === 'voice' || installMode === 'api') {
      await writeDockerConfig(mappedConfig);
      console.log(chalk.green(`✅ Generated docker-compose.yml and .env`));
    }

    console.log(chalk.cyan('Next steps:'));
    console.log(chalk.white(`  gemini-phone start    ${chalk.gray('# Launch services')}`));
    console.log(chalk.white(`  gemini-phone status   ${chalk.gray('# Check status')}`));
    console.log();

  } catch (error) {
    console.error(chalk.red(`\n✗ Failed to save configuration: ${error.message}\n`));
    process.exit(1);
  }
}



function createDevicesFile(config) {
  const devicesPath = join(homedir(), '.gemini-phone-cli', 'voice-app', 'config', 'devices.json');
  const devices = {
    [config.sipExtension]: {
      extension: config.sipExtension,
      authId: config.sipExtension,
      password: config.sipPassword,
      name: config.botName,
      prompt: config.botPrompt,
      voiceId: config.voiceId
    }
  };

  // Ensure directory exists
  const dir = join(homedir(), '.gemini-phone-cli', 'voice-app', 'config');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(devicesPath, JSON.stringify(devices, null, 2));
  console.log(chalk.green(`✅ Created devices.json`));
}
