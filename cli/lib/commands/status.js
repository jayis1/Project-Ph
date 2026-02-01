import chalk from 'chalk';
import { loadConfig, configExists, getInstallationType } from '../config.js';
import { getContainerStatus } from '../docker.js';
import { isServerRunning, getServerPid } from '../process-manager.js';
import { checkGeminiApiServer } from '../network.js';
import { execSync } from 'child_process';

/**
 * Status command - Show comprehensive service status for all node types
 * @returns {Promise<void>}
 */
export async function statusCommand() {
  console.log(chalk.bold.cyan('\n📊 Gemini Phone Status\n'));

  // Check if configured
  if (!configExists()) {
    console.log(chalk.red('✗ Not configured'));
    console.log(chalk.gray('  Run "gemini-phone setup" first\n'));
    return;
  }

  const config = await loadConfig();
  const installationType = getInstallationType(config);
  const isPiSplit = config.deployment && config.deployment.mode === 'pi-split';

  // Show installation type and hostname
  console.log(chalk.bold('Node Information:'));
  console.log(chalk.gray(`  Hostname: ${getHostname()}`));
  console.log(chalk.gray(`  Type: ${getInstallationTypeLabel(installationType)}`));
  if (config.deployment?.role) {
    console.log(chalk.gray(`  Role: ${config.deployment.role}`));
  }
  console.log();

  // Show type-appropriate status
  if (installationType === 'api-server' || installationType === 'both') {
    await showApiServerStatus(config, isPiSplit);
  }

  if (installationType === 'voice-server' || installationType === 'both') {
    await showVoiceServerStatus(config, isPiSplit, installationType);
  }

  // Show FreePBX status if configured
  if (config.freepbx) {
    await showFreePBXStatus(config);
  }

  // Show provisioning status if available
  if (config.provisioning) {
    showProvisioningStatus(config);
  }

  // Show system resources
  showSystemResources();

  console.log();
}

/**
 * Get hostname
 * @returns {string} Hostname
 */
function getHostname() {
  try {
    return execSync('hostname', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Get installation type label
 * @param {string} type - Installation type
 * @returns {string} Label
 */
function getInstallationTypeLabel(type) {
  switch (type) {
    case 'api-server': return 'Admin Node (API Server)';
    case 'voice-server': return 'Bot Node (Voice Server)';
    case 'both': return 'All-in-One (Admin + Bot)';
    default: return type;
  }
}

/**
 * Show API server status
 * @param {object} config - Configuration
 * @param {boolean} isPiSplit - Is Pi split mode
 * @returns {Promise<void>}
 */
async function showApiServerStatus(config, isPiSplit) {
  console.log(chalk.bold('Gemini API Server:'));

  if (isPiSplit) {
    // Pi-split mode: Check remote API server
    const apiUrl = `http://${config.deployment.pi.macIp}:${config.server.geminiApiPort}`;
    const apiHealth = await checkGeminiApiServer(apiUrl);

    if (apiHealth.healthy) {
      console.log(chalk.green(`  ✓ Connected to remote API server`));
      console.log(chalk.gray(`    Address: ${config.deployment.pi.macIp}:${config.server.geminiApiPort}`));
      console.log(chalk.gray('    Status: Healthy'));
    } else {
      console.log(chalk.red(`  ✗ Cannot reach remote API server`));
      console.log(chalk.gray(`    Tried: ${apiUrl}`));
      console.log(chalk.gray('    Run "gemini-phone api-server" on your admin node'));
    }
  } else {
    // Standard mode: Check local server
    const serverRunning = await isServerRunning();
    if (serverRunning) {
      const pid = getServerPid();
      console.log(chalk.green(`  ✓ Running`));
      console.log(chalk.gray(`    PID: ${pid}`));
      console.log(chalk.gray(`    Port: ${config.server.geminiApiPort}`));

      // Check if port is listening
      const portListening = checkPortListening(config.server.geminiApiPort);
      if (portListening) {
        console.log(chalk.gray(`    Listening: Yes`));
      }
    } else {
      console.log(chalk.red('  ✗ Not running'));
      console.log(chalk.gray('    Run "gemini-phone start" to launch'));
    }
  }
  console.log();
}

/**
 * Show voice server status
 * @param {object} config - Configuration
 * @param {boolean} isPiSplit - Is Pi split mode
 * @param {string} installationType - Installation type
 * @returns {Promise<void>}
 */
async function showVoiceServerStatus(config, isPiSplit, installationType) {
  // Docker Containers
  console.log(chalk.bold('Docker Containers:'));
  const containers = await getContainerStatus();

  if (containers.length === 0) {
    console.log(chalk.red('  ✗ No containers running'));
    console.log(chalk.gray('    Run "gemini-phone start" to launch'));
  } else {
    for (const container of containers) {
      const isRunning = container.status.toLowerCase().includes('up') ||
        container.status.toLowerCase().includes('running');
      const icon = isRunning ? '✓' : '✗';
      const color = isRunning ? chalk.green : chalk.red;
      console.log(color(`  ${icon} ${container.name}`));
      console.log(chalk.gray(`    Status: ${container.status}`));

      // Show ports for voice-app
      if (container.name === 'voice-app' && isRunning) {
        console.log(chalk.gray(`    HTTP API: http://localhost:3000`));
        console.log(chalk.gray(`    WebSocket: ws://localhost:3001`));
      }
    }
  }
  console.log();

  // SIP Registration Status
  console.log(chalk.bold('SIP Registration:'));
  if (config.devices && config.devices.length > 0) {
    for (const device of config.devices) {
      console.log(chalk.gray(`  • ${device.name} (ext ${device.extension})`));
      console.log(chalk.gray(`    Domain: ${config.sip?.domain || 'not configured'}`));
      console.log(chalk.gray(`    Registrar: ${config.sip?.registrar || 'not configured'}`));
    }
  } else {
    console.log(chalk.gray('  (no devices configured)'));
  }
  console.log();

  // Network Configuration
  console.log(chalk.bold('Network Configuration:'));
  if (isPiSplit) {
    console.log(chalk.gray(`  Mode: Pi Split`));
    console.log(chalk.gray(`  Pi IP: ${config.server.externalIp}`));
    console.log(chalk.gray(`  Admin IP: ${config.deployment.pi.macIp}`));
    console.log(chalk.gray(`  Drachtio Port: ${config.deployment.pi.drachtioPort}`));
    if (config.deployment.pi.hasSbc) {
      console.log(chalk.yellow('  ⚠ SBC detected (using port 5070)'));
    }
  } else if (installationType === 'voice-server') {
    console.log(chalk.gray(`  Mode: Voice Server (Bot)`));
    console.log(chalk.gray(`  Server IP: ${config.server.externalIp}`));
    if (config.deployment?.apiServerIp) {
      console.log(chalk.gray(`  Admin IP: ${config.deployment.apiServerIp}`));
    }
  } else {
    console.log(chalk.gray(`  Mode: All-in-One`));
    console.log(chalk.gray(`  External IP: ${config.server.externalIp}`));
  }

  if (config.sip) {
    console.log(chalk.gray(`  SIP Domain: ${config.sip.domain}`));
    console.log(chalk.gray(`  SIP Registrar: ${config.sip.registrar}`));
  }
  console.log();

  // API Keys Status
  console.log(chalk.bold('API Keys:'));
  console.log(chalk.gray(`  ElevenLabs: ${config.api?.elevenlabs?.apiKey ? '✓ Configured' : '✗ Missing'}`));
  console.log(chalk.gray(`  OpenAI: ${config.api?.openai?.apiKey ? '✓ Configured' : '✗ Missing'}`));
  if (config.api?.freepbx?.clientId) {
    console.log(chalk.gray(`  FreePBX M2M: ✓ Configured`));
  }
  console.log();
}

/**
 * Show FreePBX status
 * @param {object} config - Configuration
 * @returns {Promise<void>}
 */
async function showFreePBXStatus(config) {
  console.log(chalk.bold('FreePBX Server:'));
  console.log(chalk.gray(`  Host: ${config.freepbx.host}`));
  console.log(chalk.gray(`  SSH User: ${config.freepbx.sshUser || 'root'}`));
  console.log(chalk.gray(`  MySQL User: ${config.freepbx.mysqlUser || 'freepbxuser'}`));

  // Try to ping FreePBX
  const reachable = checkHostReachable(config.freepbx.host);
  if (reachable) {
    console.log(chalk.green(`  ✓ Reachable`));
  } else {
    console.log(chalk.red(`  ✗ Not reachable`));
  }
  console.log();
}

/**
 * Show provisioning status
 * @param {object} config - Configuration
 */
function showProvisioningStatus(config) {
  console.log(chalk.bold('Provisioning Status:'));
  if (config.provisioning.completed) {
    console.log(chalk.green(`  ✓ Completed`));
    console.log(chalk.gray(`    Date: ${new Date(config.provisioning.timestamp).toLocaleString()}`));
    console.log(chalk.gray(`    Version: ${config.provisioning.version}`));
  } else {
    console.log(chalk.yellow(`  ⚠ Not completed`));
    console.log(chalk.gray('    Run "gemini-phone auto-provision" to provision FreePBX'));
  }
  console.log();
}

/**
 * Show system resources
 */
function showSystemResources() {
  console.log(chalk.bold('System Resources:'));

  try {
    // CPU Load
    const loadavg = execSync('cat /proc/loadavg', { encoding: 'utf8' }).trim().split(' ');
    console.log(chalk.gray(`  Load Average: ${loadavg[0]} ${loadavg[1]} ${loadavg[2]}`));

    // Memory
    const meminfo = execSync('free -h | grep Mem', { encoding: 'utf8' }).trim();
    const memParts = meminfo.split(/\s+/);
    console.log(chalk.gray(`  Memory: ${memParts[2]} / ${memParts[1]} used`));

    // Disk
    const diskinfo = execSync('df -h / | tail -1', { encoding: 'utf8' }).trim();
    const diskParts = diskinfo.split(/\s+/);
    console.log(chalk.gray(`  Disk: ${diskParts[2]} / ${diskParts[1]} used (${diskParts[4]})`));

    // Uptime
    const uptime = execSync('uptime -p', { encoding: 'utf8' }).trim();
    console.log(chalk.gray(`  Uptime: ${uptime.replace('up ', '')}`));
  } catch (error) {
    console.log(chalk.gray('  (system info unavailable)'));
  }
}

/**
 * Check if port is listening
 * @param {number} port - Port number
 * @returns {boolean} True if listening
 */
function checkPortListening(port) {
  try {
    execSync(`ss -tuln | grep :${port}`, { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if host is reachable
 * @param {string} host - Hostname or IP
 * @returns {boolean} True if reachable
 */
function checkHostReachable(host) {
  try {
    execSync(`ping -c 1 -W 1 ${host}`, { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
