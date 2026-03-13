#!/usr/bin/env node

/**
 * AI Phone CLI
 * 
 * Simple unified command-line interface for AI Phone.
 * Modeled after NetworkChuck's claude-phone for simplicity.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packagePath = join(__dirname, '../../package.json');
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));

const program = new Command();

program
  .name('ai-phone')
  .description('Voice interface for local AI via SIP')
  .version(pkg.version);

// Setup command
program
  .command('setup')
  .description('Interactive setup wizard')
  .action(async () => {
    const { setupCommand } = await import('../lib/commands/setup.js');
    await setupCommand();
  });

// Start command
program
  .command('start')
  .description('Start AI Phone services')
  .action(async () => {
    const { startCommand } = await import('../lib/commands/start.js');
    await startCommand();
  });

// Stop command
program
  .command('stop')
  .description('Stop AI Phone services')
  .action(async () => {
    const { stopCommand } = await import('../lib/commands/stop.js');
    await stopCommand();
  });

// Status command
program
  .command('status')
  .description('Check service status')
  .action(async () => {
    const { statusCommand } = await import('../lib/commands/status.js');
    await statusCommand();
  });

// Doctor command
program
  .command('doctor')
  .description('Run system health checks')
  .action(async () => {
    const { doctorCommand } = await import('../lib/commands/doctor.js');
    await doctorCommand();
  });


// Config commands
const config = program.command('config').description('Manage configuration');

config
  .command('show')
  .description('Show current configuration')
  .action(async () => {
    const { showConfig } = await import('../lib/commands/config/show.js');
    await showConfig();
  });

config
  .command('path')
  .description('Show config file path')
  .action(async () => {
    const { configPath } = await import('../lib/commands/config/path.js');
    await configPath();
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command specified
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
