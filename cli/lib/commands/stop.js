import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, configExists, getInstallationType } from '../config.js';
import { stopContainers } from '../docker.js';

/**
 * Stop command - Shut down all services
 * @returns {Promise<void>}
 */
export async function stopCommand(services = []) {
  console.log(chalk.bold.cyan('\n⏹️  Stopping AI Phone\n'));

  // Check if configured
  if (!configExists()) {
    console.log(chalk.yellow('⚠️  Not configured. Nothing to stop.\n'));
    return;
  }

  // Load config and get installation type
  const config = await loadConfig();
  const installationType = getInstallationType(config);

  console.log(chalk.gray(`Installation type: ${installationType}\n`));

  const spinner = ora('Stopping services...').start();

  try {
    // Stop Docker containers
    await stopContainers(services);

    spinner.succeed('Services stopped successfully');
    console.log(chalk.bold.green('\n✓ AI Phone stopped\n'));

  } catch (error) {
    spinner.fail(`Failed to stop services: ${error.message}`);
  }
}
