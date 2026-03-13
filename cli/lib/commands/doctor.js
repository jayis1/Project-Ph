import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import axios from 'axios';
import { loadConfig, configExists, getInstallationType } from '../config.js';
import { checkDocker, getContainerStatus } from '../docker.js';
import { isReachable } from '../network.js';
import { checkPort } from '../port-check.js';
import { FreePBXClient } from '../freepbx-api.js';



/**
 * Check if voice-app container is running
 * @returns {Promise<{running: boolean, error?: string}>}
 */
async function checkVoiceApp() {
  const containers = await getContainerStatus();
  const voiceApp = containers.find(c => c.name.includes('voice-app'));

  if (!voiceApp) {
    return {
      running: false,
      error: 'Container not found'
    };
  }

  const isRunning = voiceApp.status.toLowerCase().includes('up') ||
    voiceApp.status.toLowerCase().includes('running');

  if (!isRunning) {
    return {
      running: false,
      error: `Container status: ${voiceApp.status}`
    };
  }

  return { running: true };
}

/**
 * Check SIP registration status via voice-app API
 * @param {number} port - Voice-app HTTP port
 * @returns {Promise<{connected: boolean, registered: boolean, details?: any, error?: string}>}
 */
async function checkSIPRegistration(port) {
  try {
    const response = await axios.get(`http://localhost:${port}/api/sip-status`, {
      timeout: 5000
    });

    if (response.status === 200) {
      const { drachtioConnected, freeswitchConnected, registrations } = response.data;
      const registeredCount = registrations.length;

      return {
        connected: true,
        registered: registeredCount > 0,
        details: { drachtioConnected, freeswitchConnected, registrations }
      };
    } else {
      return { connected: false, error: `API returned status ${response.status}` };
    }
  } catch (error) {
    return { connected: false, error: 'Voice-app API not responding' };
  }
}



/**
 * Doctor command - Run health checks
 * @returns {Promise<void>}
 */
export async function doctorCommand() {
  console.log(chalk.bold.cyan('\n🔍 AI Phone Health Check\n'));

  if (!configExists()) {
    console.log(chalk.red('✗ Not configured'));
    console.log(chalk.gray('  → Run "ai-phone setup" first\n'));
    process.exit(1);
  }

  const config = await loadConfig();
  const installationType = getInstallationType(config);
  const isPiSplit = config.deployment && config.deployment.mode === 'pi-split';

  console.log(chalk.bold(`Installation Type: ${installationType === 'api-server' ? 'API Server' : installationType === 'voice-server' ? 'Voice Server' : 'Both (all-in-one)'}\n`));

  const checks = [];
  let passedCount = 0;

  // Run health checks
  const voiceResult = await runVoiceServerChecks(config, isPiSplit);
  checks.push(...voiceResult.checks);
  passedCount += voiceResult.passedCount;

  // Summary
  console.log(chalk.bold(`\n${passedCount}/${checks.length} checks passed\n`));

  if (passedCount === checks.length) {
    console.log(chalk.green('✓ All systems operational!\n'));
    process.exit(0);
  } else if (passedCount > checks.length / 2) {
    console.log(chalk.yellow('⚠ Some issues detected. Review the failures above.\n'));
    process.exit(1);
  } else {
    console.log(chalk.red('✗ Multiple failures detected. Fix the issues above before using AI Phone.\n'));
    process.exit(1);
  }
}



/**
 * Run voice server health checks
 * @param {object} config - Configuration
 * @param {boolean} isPiSplit - Is Pi split mode
 * @returns {Promise<{checks: Array, passedCount: number}>}
 */
async function runVoiceServerChecks(config, isPiSplit) {
  const checks = [];
  let passedCount = 0;

  // Check Docker
  const dockerSpinner = ora('Checking Docker...').start();
  const dockerResult = await checkDocker();
  if (dockerResult.installed && dockerResult.running) {
    dockerSpinner.succeed(chalk.green('Docker is running'));
    passedCount++;
  } else {
    dockerSpinner.fail(chalk.red(`Docker check failed: ${dockerResult.error}`));
    console.log(chalk.gray('  → Install Docker Desktop from https://www.docker.com/products/docker-desktop\n'));
  }
  checks.push({ name: 'Docker', passed: dockerResult.installed && dockerResult.running });



  // Check FreePBX M2M API (only if configured)
  if (config.api && config.api.freepbx && config.api.freepbx.clientId) {
    const pbxSpinner = ora('Checking FreePBX M2M API...').start();
    try {
      const client = new FreePBXClient({
        clientId: config.api.freepbx.clientId,
        clientSecret: config.api.freepbx.clientSecret,
        apiUrl: config.api.freepbx.apiUrl
      });
      const pbxResult = await client.testConnection();
      if (pbxResult.valid) {
        pbxSpinner.succeed(chalk.green('FreePBX M2M API connected'));
        passedCount++;
      } else {
        pbxSpinner.fail(chalk.red(`FreePBX M2M API connection failed: ${pbxResult.error}`));
        console.log(chalk.gray('  → Check your Client ID, Secret and URL in ~/.ai-phone/config.json'));
        console.log(chalk.gray(`  → Current GraphQL URL: ${client.apiUrl}\n`));
      }
      checks.push({ name: 'FreePBX M2M API', passed: pbxResult.valid });

    } catch (err) {
      pbxSpinner.fail(chalk.red(`FreePBX M2M API error: ${err.message}`));
      console.log(chalk.gray('  → Ensure FreePBX is reachable and API is enabled\n'));
      checks.push({ name: 'FreePBX M2M API', passed: false });
    }
  }

  // Check Voice-app container
  const voiceAppSpinner = ora('Checking voice-app container...').start();
  const voiceAppResult = await checkVoiceApp();
  if (voiceAppResult.running) {
    voiceAppSpinner.succeed(chalk.green('Voice-app container running'));
    passedCount++;
  } else {
    voiceAppSpinner.fail(chalk.red(`Voice-app container not running: ${voiceAppResult.error}`));
    console.log(chalk.gray('  → Run "ai-phone start" to launch services\n'));
  }
  checks.push({ name: 'Voice-app container', passed: voiceAppResult.running });

  // Check SIP Registration (if container is running)
  if (voiceAppResult.running) {
    const sipSpinner = ora('Checking SIP registration...').start();
    const sipResult = await checkSIPRegistration(config.server.httpPort || 3000);

    if (sipResult.connected && sipResult.registered) {
      const exts = sipResult.details.registrations.map(r => r.extension).join(', ');
      sipSpinner.succeed(chalk.green(`SIP registered: extensions ${exts}`));
      passedCount++;
    } else if (sipResult.connected && !sipResult.registered) {
      sipSpinner.fail(chalk.red('SIP not registered with PBX'));
      console.log(chalk.gray('  → Check extension credentials in ~/.ai-phone/config.json'));
      console.log(chalk.gray('  → Ensure FreePBX allows registration from this IP\n'));
    } else {
      sipSpinner.warn(chalk.yellow(`SIP status unknown: ${sipResult.error}`));
      console.log(chalk.gray('  → Voice-app API is starting up or unreachable\n'));
      passedCount++; // Partial pass
    }
    checks.push({ name: 'SIP registration', passed: sipResult.connected && sipResult.registered });
  }

  // Check drachtio port availability
  const drachtioPort = config.onFreePbxServer ? 5070 : 5060;
  const drachtioSpinner = ora(`Checking drachtio port ${drachtioPort}...`).start();
  const drachtioPortCheck = await checkPort(drachtioPort);

  if (drachtioPortCheck.inUse) {
    if (drachtioPort === 5070) {
      drachtioSpinner.succeed(chalk.green(`Port ${drachtioPort} in use (expected - drachtio running)`));
      passedCount++;
    } else {
      drachtioSpinner.warn(chalk.yellow(`Port ${drachtioPort} in use (may conflict)`));
      passedCount++; // Partial pass
    }
  } else {
    drachtioSpinner.succeed(chalk.green(`Port ${drachtioPort} available`));
    passedCount++;
  }
  checks.push({ name: `Drachtio port ${drachtioPort}`, passed: true });

  return { checks, passedCount };
}
