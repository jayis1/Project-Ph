import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { getConfigPath, getConfigDir } from '../config.js';

/**
 * Get the backups directory path
 * @returns {string} Path to ~/.ai-phone/backups
 */
function getBackupsDir() {
  return path.join(getConfigDir(), 'backups');
}

/**
 * Backup command - Create timestamped backup of configuration
 * @returns {Promise<void>}
 */
export async function backupCommand() {
  console.log(chalk.bold.cyan('\n💾 Backing up configuration\n'));

  const configPath = getConfigPath();

  // Check if config exists
  if (!fs.existsSync(configPath)) {
    console.log(chalk.yellow('⚠️  No configuration found to backup.'));
    console.log(chalk.gray('Run "ai-phone setup" to create configuration.\n'));
    return;
  }

  // Create backups directory if it doesn't exist
  const backupsDir = getBackupsDir();
  if (!fs.existsSync(backupsDir)) {
    await fs.promises.mkdir(backupsDir, { recursive: true, mode: 0o700 });
  }

  // Generate timestamp for filename
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/T/, '.')
    .replace(/:/g, '')
    .replace(/\..+/, '');
  const backupFilename = `config.${timestamp}.json`;
  const backupPath = path.join(backupsDir, backupFilename);

  // Copy config to backup
  const spinner = ora('Creating backup...').start();
  try {
    await fs.promises.copyFile(configPath, backupPath);

    // Get file size
    const stats = await fs.promises.stat(backupPath);
    const sizeMB = (stats.size / 1024).toFixed(2);

    spinner.succeed('Backup created');

    // Count existing backups
    const backups = await fs.promises.readdir(backupsDir);
    const configBackups = backups.filter(f => f.startsWith('config.') && f.endsWith('.json'));

    console.log(chalk.bold.green('\n✓ Configuration backed up successfully!\n'));
    console.log(chalk.gray(`Location: ${backupPath}`));
    console.log(chalk.gray(`Size: ${sizeMB} KB`));
    console.log(chalk.gray(`Total backups: ${configBackups.length}\n`));
  } catch (error) {
    spinner.fail(`Backup failed: ${error.message}`);
    throw error;
  }
}
