import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { spawn } from 'child_process';

const CONFIG_FILE = join(homedir(), '.config', 'gemini-phone', 'config.json');
const INSTALL_DIR = join(homedir(), '.gemini-phone-cli');

export async function startCommand() {
  console.log(chalk.cyan.bold('\n🚀 Starting Gemini Phone\n'));

  // Check if config exists
  if (!existsSync(CONFIG_FILE)) {
    console.log(chalk.red('✗ No configuration found'));
    console.log(chalk.yellow('  Run: gemini-phone setup\n'));
    process.exit(1);
  }

  // Load config
  let config;
  try {
    config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
  } catch (error) {
    console.log(chalk.red(`✗ Failed to read config: ${error.message}\n`));
    process.exit(1);
  }

  const { installMode } = config;

  // Start services based on mode
  if (installMode === 'both') {
    await startVoiceServer();
    await startApiServer();
  } else if (installMode === 'voice') {
    await startVoiceServer();
  } else if (installMode === 'api') {
    await startApiServer();
  }

  console.log(chalk.green('\n✅ Services started!\n'));
  console.log(chalk.cyan('Next steps:'));
  console.log(chalk.white(`  gemini-phone status   ${chalk.gray('# Check status')}`));
  console.log(chalk.white(`  gemini-phone stop     ${chalk.gray('# Stop services')}`));
  console.log();
}

async function startVoiceServer() {
  console.log(chalk.cyan('📞 Starting voice server...\n'));

  const dockerComposePath = join(INSTALL_DIR, 'docker-compose.yml');

  if (!existsSync(dockerComposePath)) {
    console.log(chalk.red('✗ docker-compose.yml not found'));
    console.log(chalk.yellow(`  Expected at: ${dockerComposePath}\n`));
    process.exit(1);
  }

  return new Promise((resolve, reject) => {
    const dockerCompose = spawn('docker-compose', ['up', '-d'], {
      cwd: INSTALL_DIR,
      stdio: 'inherit'
    });

    dockerCompose.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green('✓ Voice server started\n'));
        resolve();
      } else {
        console.log(chalk.red(`✗ Voice server failed to start (exit code ${code})\n`));
        reject(new Error('Docker compose failed'));
      }
    });

    dockerCompose.on('error', (err) => {
      console.log(chalk.red(`✗ Failed to start docker-compose: ${err.message}\n`));
      reject(err);
    });
  });
}

async function startApiServer() {
  console.log(chalk.cyan('🤖 Starting API server...\n'));

  const apiServerPath = join(INSTALL_DIR, 'gemini-api-server', 'server.js');

  if (!existsSync(apiServerPath)) {
    console.log(chalk.red('✗ API server not found'));
    console.log(chalk.yellow(`  Expected at: ${apiServerPath}\n`));
    process.exit(1);
  }

  // Start API server in background using pm2 or nohup
  const { spawn: spawnDetached } = await import('child_process');

  // Try pm2 first
  try {
    const pm2 = spawnDetached('pm2', ['start', apiServerPath, '--name', 'gemini-api-server'], {
      cwd: join(INSTALL_DIR, 'gemini-api-server'),
      stdio: 'ignore',
      detached: true
    });
    pm2.unref();
    console.log(chalk.green('✓ API server started (managed by pm2)\n'));
  } catch (error) {
    // Fallback to node directly
    console.log(chalk.yellow('⚠️  pm2 not found, starting with node directly\n'));
    const node = spawnDetached('node', [apiServerPath], {
      cwd: join(INSTALL_DIR, 'gemini-api-server'),
      stdio: 'ignore',
      detached: true
    });
    node.unref();
    console.log(chalk.green('✓ API server started\n'));
  }
}
