import fs from 'fs';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { getConfigPath, getConfigDir, configExists } from '../../config.js';

/**
 * Config reset command - Reset configuration with confirmation and backup
 * @returns {Promise<void>}
 */
export async function configResetCommand() {
  console.log(chalk.bold.cyan('\n🔄 Reset Configuration\n'));

  // Check if config exists
  if (!configExists()) {
    console.log(chalk.yellow('⚠️  No configuration found to reset\n'));
    return;
  }

  const configPath = getConfigPath();
  const configDir = getConfigDir();

  // Confirmation prompt
  console.log(chalk.yellow('⚠️  This will delete your current configuration:'));
  console.log(chalk.gray(`  ${configPath}\n`));
  console.log(chalk.gray('A backup will be created before deletion.\n'));

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Are you sure you want to reset?',
      default: false
    }
  ]);

  if (!confirmed) {
    console.log(chalk.gray('\n✗ Reset cancelled\n'));
    return;
  }

  try {
    // Create backup with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${configPath}.backup-${timestamp}`;
    await fs.promises.copyFile(configPath, backupPath);
    console.log(chalk.green(`\n✓ Backup created: ${backupPath}`));

    // Delete config file
    await fs.promises.unlink(configPath);
    console.log(chalk.green('✓ Configuration deleted'));

    // Clean up other generated files
    const filesToClean = [
      'docker-compose.yml',
      '.env',
      'server.pid'
    ];

    for (const file of filesToClean) {
      const filePath = `${configDir}/${file}`;
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log(chalk.gray(`  Removed: ${file}`));
      }
    }

    console.log(chalk.bold.green('\n✓ Configuration reset complete'));
    console.log(chalk.gray('  Run "ai-phone setup" to configure again\n'));
  } catch (error) {
    console.log(chalk.red(`\n✗ Reset failed: ${error.message}\n`));
    throw error;
  }
}
