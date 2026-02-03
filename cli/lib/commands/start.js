import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { startContainers } from '../docker.js';

const CONFIG_FILE = join(homedir(), '.config', 'gemini-phone', 'config.json');

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

  try {
    // Start services based on mode
    if (installMode === 'both') {
      console.log(chalk.cyan('📞 Starting Voice + API Server...'));
      await startContainers();
    } else if (installMode === 'voice') {
      console.log(chalk.cyan('📞 Starting Voice Server containers...'));
      // Only start voice-related services
      // Note: If docker-compose.yml defines dependencies, other services might start. 
      // But passing specific services usually starts dependencies too.
      await startContainers(['drachtio', 'freeswitch', 'voice-app']);
    } else if (installMode === 'api') {
      console.log(chalk.cyan('🤖 Starting API Server container...'));
      await startContainers(['gemini-api-server']);
    } else {
      // Fallback for older configs
      console.log(chalk.cyan('📞 Starting all services...'));
      await startContainers();
    }

    console.log(chalk.green('\n✅ Services started!\n'));
    console.log(chalk.cyan('Next steps:'));
    console.log(chalk.white(`  gemini-phone status   ${chalk.gray('# Check status')}`));
    console.log(chalk.white(`  gemini-phone stop     ${chalk.gray('# Stop services')}`));
    console.log();

  } catch (error) {
    console.log(chalk.red(`\n✗ Failed to start services: ${error.message}\n`));
    // Check if it's the specific ENOENT error from before to give better hint
    if (error.message.includes('ENOENT') && error.message.includes('docker')) {
      console.log(chalk.yellow('  Hint: Make sure Docker is installed and "docker" command works.'));
      console.log(chalk.yellow('  Try running: docker compose version'));
    }
    process.exit(1);
  }
}
