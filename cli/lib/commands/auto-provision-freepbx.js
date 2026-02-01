import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { provisionFreePBX } from '../freepbx-provisioner.js';
import { encryptConfig } from '../credential-manager.js';
import { loadConfig, saveConfig } from '../config.js';
import { validateIP, validateHostname } from '../validators.js';

/**
 * Auto-provision FreePBX Command
 * Interactive wizard for complete FreePBX provisioning
 */

export async function autoProvisionCommand(options = {}) {
    console.log(chalk.bold.cyan('\n🚀 FreePBX Auto-Provisioning Wizard\n'));

    // Load existing config if available
    let config;
    try {
        config = await loadConfig();
    } catch (error) {
        console.log(chalk.yellow('⚠️  No existing configuration found. Starting fresh setup.\n'));
        config = {
            version: '2.6.102',
            api: {},
            sip: {},
            server: {},
            devices: []
        };
    }

    // Non-interactive mode
    if (options.nonInteractive) {
        return runNonInteractive(config, options);
    }

    // Interactive wizard
    console.log(chalk.bold('Step 1: FreePBX Server Configuration\n'));

    const freepbxAnswers = await inquirer.prompt([
        {
            type: 'input',
            name: 'host',
            message: 'FreePBX server IP or hostname:',
            default: config.freepbx?.host || '172.16.1.63',
            validate: (input) => {
                if (!input) return 'FreePBX host is required';
                if (!validateIP(input) && !validateHostname(input)) {
                    return 'Invalid IP address or hostname';
                }
                return true;
            }
        },
        {
            type: 'input',
            name: 'sshUser',
            message: 'SSH username:',
            default: config.freepbx?.sshUser || 'root'
        },
        {
            type: 'password',
            name: 'sshPassword',
            message: 'SSH password:',
            validate: (input) => input ? true : 'SSH password is required'
        },
        {
            type: 'input',
            name: 'mysqlUser',
            message: 'MySQL username:',
            default: config.freepbx?.mysqlUser || 'freepbxuser'
        },
        {
            type: 'password',
            name: 'mysqlPassword',
            message: 'MySQL password:',
            validate: (input) => input ? true : 'MySQL password is required'
        },
        {
            type: 'input',
            name: 'botSubnet',
            message: 'Bot subnet (for firewall rules):',
            default: config.freepbx?.botSubnet || '172.16.1.0/24',
            validate: (input) => {
                if (!input) return 'Bot subnet is required';
                if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(input)) {
                    return 'Invalid subnet format (e.g., 172.16.1.0/24)';
                }
                return true;
            }
        }
    ]);

    console.log(chalk.bold('\n\nStep 2: SIP Trunk Configuration\n'));

    const trunkAnswers = await inquirer.prompt([
        {
            type: 'input',
            name: 'number',
            message: 'SIP trunk number (DID):',
            default: config.sipTrunk?.number || options.trunkNumber || '88707695',
            validate: (input) => input ? true : 'Trunk number is required'
        },
        {
            type: 'input',
            name: 'username',
            message: 'SIP trunk username:',
            default: (answers) => config.sipTrunk?.username || answers.number,
            validate: (input) => input ? true : 'Trunk username is required'
        },
        {
            type: 'password',
            name: 'password',
            message: 'SIP trunk password:',
            default: config.sipTrunk?.password || options.trunkPassword,
            validate: (input) => input ? true : 'Trunk password is required'
        },
        {
            type: 'input',
            name: 'server',
            message: 'SIP trunk server:',
            default: config.sipTrunk?.server || options.trunkServer || 'voice.redspot.dk'
        },
        {
            type: 'input',
            name: 'port',
            message: 'SIP trunk port:',
            default: config.sipTrunk?.port || '5060',
            validate: (input) => {
                const port = parseInt(input);
                if (isNaN(port) || port < 1 || port > 65535) {
                    return 'Port must be between 1 and 65535';
                }
                return true;
            }
        }
    ]);

    console.log(chalk.bold('\n\nStep 3: Extension Configuration\n'));

    const extAnswers = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'useDefaultCrew',
            message: 'Use default Nebuchadnezzar crew (9000-9008)?',
            default: true
        }
    ]);

    // Build complete configuration
    const provisioningConfig = {
        ...config,
        freepbx: {
            host: freepbxAnswers.host,
            sshUser: freepbxAnswers.sshUser,
            sshPassword: freepbxAnswers.sshPassword,
            mysqlHost: freepbxAnswers.host,
            mysqlUser: freepbxAnswers.mysqlUser,
            mysqlPassword: freepbxAnswers.mysqlPassword,
            botSubnet: freepbxAnswers.botSubnet
        },
        sipTrunk: {
            number: trunkAnswers.number,
            username: trunkAnswers.username,
            password: trunkAnswers.password,
            server: trunkAnswers.server,
            port: trunkAnswers.port
        },
        crew: extAnswers.useDefaultCrew ? undefined : config.crew
    };

    // Show configuration summary
    console.log(chalk.bold.cyan('\n\n📋 Configuration Summary\n'));
    console.log(chalk.white('FreePBX Server:'));
    console.log(chalk.gray(`  Host: ${freepbxAnswers.host}`));
    console.log(chalk.gray(`  SSH User: ${freepbxAnswers.sshUser}`));
    console.log(chalk.gray(`  MySQL User: ${freepbxAnswers.mysqlUser}`));
    console.log(chalk.gray(`  Bot Subnet: ${freepbxAnswers.botSubnet}`));

    console.log(chalk.white('\nSIP Trunk:'));
    console.log(chalk.gray(`  Number: ${trunkAnswers.number}`));
    console.log(chalk.gray(`  Server: ${trunkAnswers.server}:${trunkAnswers.port}`));
    console.log(chalk.gray(`  Username: ${trunkAnswers.username}`));

    console.log(chalk.white('\nExtensions:'));
    console.log(chalk.gray(`  Range: 9000-9008 (9 extensions)`));
    console.log('');

    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: 'Proceed with provisioning?',
            default: true
        }
    ]);

    if (!confirm) {
        console.log(chalk.yellow('\n⚠️  Provisioning cancelled.\n'));
        return;
    }

    // Run provisioning
    console.log(chalk.bold.cyan('\n\n🚀 Starting Provisioning...\n'));

    let spinner = ora('Initializing...').start();

    const progressCallback = ({ _step, status, message, details }) => {
        if (status === 'running') {
            spinner.text = message;
        } else if (status === 'success') {
            spinner.succeed(message);
            spinner = ora('Processing...').start();
        } else if (status === 'error') {
            spinner.fail(message);
            if (details) {
                console.log(chalk.red('Details:'), details);
            }
            spinner = ora('Continuing...').start();
        } else if (status === 'warning') {
            spinner.warn(message);
            if (details) {
                console.log(chalk.yellow('Details:'), details);
            }
            spinner = ora('Continuing...').start();
        }
    };

    try {
        const result = await provisionFreePBX(provisioningConfig, {}, progressCallback);

        spinner.stop();

        if (result.success) {
            console.log(chalk.bold.green('\n\n✅ Provisioning Complete!\n'));

            // Save encrypted configuration
            const encryptedConfig = encryptConfig(provisioningConfig);
            encryptedConfig.provisioning = {
                completed: true,
                timestamp: new Date().toISOString(),
                version: '2.6.102'
            };

            await saveConfig(encryptedConfig);
            console.log(chalk.green('✓ Configuration saved\n'));

            // Show next steps
            console.log(chalk.bold.cyan('📝 Next Steps:\n'));
            console.log(chalk.white('1. Wait 1-2 minutes for trunk registration'));
            console.log(chalk.white(`2. Call ${trunkAnswers.number} to test the IVR`));
            console.log(chalk.white('3. Press 0 to reach Morpheus (9000)'));
            console.log(chalk.white('4. Press 1-8 for other crew members'));
            console.log(chalk.white('5. Run "gemini-phone start" to launch voice services\n'));

            // Show verification results
            if (result.results.verify) {
                console.log(chalk.bold.cyan('🔍 Verification Results:\n'));
                const checks = result.results.verify.checks;
                console.log(`  Extensions: ${checks.extensions ? chalk.green('✓') : chalk.red('✗')}`);
                console.log(`  IVR System: ${checks.ivr ? chalk.green('✓') : chalk.red('✗')}`);
                console.log(`  SIP Trunk:  ${checks.trunk ? chalk.green('✓') : chalk.red('✗')}`);
                console.log('');
            }
        } else {
            console.log(chalk.bold.red('\n\n❌ Provisioning Failed\n'));
            console.log(chalk.red('Error:'), result.error);

            if (result.results) {
                console.log(chalk.yellow('\nPartial Results:'));
                for (const [step, stepResult] of Object.entries(result.results)) {
                    if (stepResult) {
                        const status = stepResult.success ? chalk.green('✓') : chalk.red('✗');
                        console.log(`  ${status} ${step}`);
                    }
                }
            }

            console.log(chalk.yellow('\nYou can retry provisioning with: gemini-phone auto-provision\n'));
            process.exit(1);
        }
    } catch (error) {
        spinner.fail('Provisioning failed');
        console.error(chalk.red('\n❌ Error:'), error.message);
        console.error(chalk.gray('\nStack trace:'));
        console.error(chalk.gray(error.stack));
        process.exit(1);
    }
}

/**
 * Run provisioning in non-interactive mode
 * @param {object} config - Existing configuration
 * @param {object} options - Command options
 */
async function runNonInteractive(config, options) {
    console.log(chalk.cyan('Running in non-interactive mode...\n'));

    // Validate required options
    if (!config.freepbx || !config.sipTrunk) {
        console.error(chalk.red('❌ Configuration incomplete. Run interactive mode first or provide config file.\n'));
        process.exit(1);
    }

    // Override with command-line options
    if (options.trunkNumber) {
        config.sipTrunk.number = options.trunkNumber;
        config.sipTrunk.username = options.trunkNumber;
    }
    if (options.trunkPassword) {
        config.sipTrunk.password = options.trunkPassword;
    }
    if (options.trunkServer) {
        config.sipTrunk.server = options.trunkServer;
    }

    let spinner = ora('Starting provisioning...').start();

    const progressCallback = ({ _step, status, message }) => {
        if (status === 'success') {
            spinner.succeed(message);
            spinner.start('Processing...');
        } else if (status === 'error') {
            spinner.fail(message);
            spinner.start('Continuing...');
        }
    };

    try {
        const result = await provisionFreePBX(config, {}, progressCallback);

        spinner.stop();

        if (result.success) {
            console.log(chalk.green('\n✅ Provisioning complete\n'));

            // Save configuration
            const encryptedConfig = encryptConfig(config);
            encryptedConfig.provisioning = {
                completed: true,
                timestamp: new Date().toISOString(),
                version: '2.6.102'
            };
            await saveConfig(encryptedConfig);
        } else {
            console.log(chalk.red('\n❌ Provisioning failed:', result.error, '\n'));
            process.exit(1);
        }
    } catch (error) {
        spinner.fail('Provisioning failed');
        console.error(chalk.red('\n❌ Error:'), error.message);
        process.exit(1);
    }
}
