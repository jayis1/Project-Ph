import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { loadConfig } from '../config.js';
import { FreePBXClient } from '../freepbx-api.js';

/**
 * Provision command - Sync identity to FreePBX
 * @param {object} options - Command options
 * @returns {Promise<void>}
 */
export async function provisionCommand(options = {}) {
    console.log(chalk.bold.cyan('\n⚙️  FreePBX Self-Provisioning\n'));

    const config = await loadConfig();

    if (!config.api.freepbx || !config.api.freepbx.clientId) {
        console.log(chalk.red('❌ FreePBX API not configured. Run "gemini-phone setup" first.'));
        return;
    }

    // Step 1: Prompt for Route Info (DID)
    console.log(chalk.bold('📞 Route Configuration'));
    const { setupRoute, did } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'setupRoute',
            message: 'Configure an Inbound Route for Morpheus?',
            default: true
        },
        {
            type: 'input',
            name: 'did',
            message: 'DID Number (leave empty for "Any"):',
            when: (answers) => answers.setupRoute,
            default: ''
        }
    ]);

    const spinner = ora('Connecting to FreePBX...').start();

    try {
        const client = new FreePBXClient({
            clientId: config.api.freepbx.clientId,
            clientSecret: config.api.freepbx.clientSecret,
            apiUrl: config.api.freepbx.apiUrl
        });

        const pbxResult = await client.testConnection();
        if (!pbxResult.valid) {
            spinner.fail(chalk.red(`FreePBX API connection failed: ${pbxResult.error}`));
            return;
        }

        // Step 2: Sync Extension Identity
        spinner.text = 'Syncing identity for Morpheus...';

        const device = config.devices[0];
        if (!device) {
            spinner.fail(chalk.red('No devices configured.'));
            return;
        }

        const name = `${device.name} (AI)`;
        // FreePBX GraphQL API requires numeric outboundcid
        const cid = device.extension;

        const updateResult = await client.updateExtension(
            device.extension,
            name,
            cid
        );

        if (!updateResult.updateExtension.status) {
            spinner.fail(chalk.red(`Extension Sync failed: ${updateResult.updateExtension.message}`));
            return;
        }

        // Step 3: Sync Inbound Route
        if (setupRoute) {
            spinner.text = `Configuring inbound route for DID: ${did || 'ANY'}...`;
            try {
                const routeResult = await client.addInboundRoute(
                    device.extension,
                    did,
                    '' // CID (Any)
                );

                if (!routeResult.addInboundRoute.status) {
                    spinner.warn(chalk.yellow(`Inbound Route sync failed: ${routeResult.addInboundRoute.message}`));
                }
            } catch (err) {
                // If route already exists (GraphQL error), just warn
                if (err.message && err.message.includes('Inbound Route already exists')) {
                    spinner.warn(chalk.yellow('Inbound Route already exists (skipping creation)'));
                } else {
                    throw err; // Rebrand other errors
                }
            }
        }

        // Step 4: Provision Ring Group (if --full flag or multiple devices)
        const shouldProvisionGroup = options.full || config.devices.length > 1;

        if (shouldProvisionGroup) {
            spinner.text = 'Provisioning Ring Group 8000 (All AIs)...';
            const extensions = config.devices.map(d => d.extension);
            const ringGroupExists = await client.ringGroupExists('8000');

            await client.createOrUpdateRingGroup(
                '8000',
                'All AI Assistants',
                extensions,
                'ringall'
            );

            spinner.info(chalk.cyan(`Ring Group 8000 ${ringGroupExists ? 'updated' : 'created'} with ${extensions.length} AI(s)`));
        }

        // Step 5: Provision Ring Group 8000 (Nebuchadnezzar Crew)
        if (options.full) {
            spinner.text = 'Provisioning Ring Group 8000 (Nebuchadnezzar Crew)...';

            // Full crew list
            const crewExtensions = [
                '9000', '9001', '9002', '9003', '9004',
                '9005', '9006', '9007', '9008'
            ];

            try {
                const rgExists = await client.ringGroupExists('8000');
                await client.createOrUpdateRingGroup(
                    '8000',
                    'Nebuchadnezzar Crew',
                    crewExtensions,
                    'ringall'
                );
                spinner.succeed(chalk.cyan(`Ring Group 8000 ${rgExists ? 'updated' : 'created'} with 9 crew members (Matrix)`));
            } catch (error) {
                spinner.warn(chalk.yellow(`Could not provision Ring Group: ${error.message}`));
            }

            // IVR instructions or automation
            spinner.info(chalk.cyan('ℹ️  To provision IVR 7000:'));
            spinner.info(chalk.gray('   Run: cd cli/mysql-provisioner && node provision-ivr-mysql.js'));
        } else if (config.devices.length > 1) {
            // Standard multi-device logic (local devices only)
            // ... existing logic ...
            spinner.warn(chalk.yellow('⚠️  IVR provisioning not supported by FreePBX GraphQL API'));
            // ...
        }

        // Step 6: Apply Config
        spinner.text = 'Applying configuration...';
        await client.applyConfig();

        spinner.succeed(chalk.green(`Successfully provisioned Morpheus to extension ${device.extension}!`));
        console.log(chalk.gray(`  Name: ${name}`));
        console.log(chalk.gray(`  CID:  ${cid}`));
        if (setupRoute) {
            console.log(chalk.gray(`  Route: ${did || 'ANY'} -> ${device.extension}`));
        }
        console.log('');

    } catch (error) {
        spinner.fail(chalk.red(`Provisioning Error: ${error.message}`));
    }
}
