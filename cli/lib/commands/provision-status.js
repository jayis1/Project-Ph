import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, configExists } from '../config.js';
import { decryptConfig } from '../credential-manager.js';
import { createMySQLPool, executeMySQLQuery } from '../freepbx-connection.js';

/**
 * Provision Status Command
 * Shows what has been provisioned on FreePBX
 */
export async function provisionStatusCommand() {
    console.log(chalk.bold.cyan('\n🔍 FreePBX Provisioning Status\n'));

    // Check if configured
    if (!configExists()) {
        console.log(chalk.red('✗ Not configured'));
        console.log(chalk.gray('  Run "gemini-phone setup" first\n'));
        return;
    }

    const config = await loadConfig();

    // Check if FreePBX is configured
    if (!config.freepbx) {
        console.log(chalk.yellow('⚠ FreePBX not configured'));
        console.log(chalk.gray('  Run "gemini-phone auto-provision" to set up FreePBX\n'));
        return;
    }

    const spinner = ora('Connecting to FreePBX...').start();

    try {
        const decrypted = decryptConfig(config);

        // Create MySQL connection
        const pool = await createMySQLPool({
            host: decrypted.freepbx.mysqlHost || decrypted.freepbx.host,
            port: decrypted.freepbx.mysqlPort || 3306,
            user: decrypted.freepbx.mysqlUser || 'freepbxuser',
            password: decrypted.freepbx.mysqlPassword,
            database: 'asterisk'
        });

        spinner.succeed('Connected to FreePBX');
        console.log();

        // Check extensions
        await checkExtensions(pool);

        // Check IVR
        await checkIVR(pool);

        // Check trunk
        await checkTrunk(pool, decrypted);

        // Check inbound routes
        await checkInboundRoutes(pool, decrypted);

        // Show provisioning metadata
        if (config.provisioning) {
            showProvisioningMetadata(config.provisioning);
        }

        await pool.end();
        console.log();

    } catch (error) {
        spinner.fail('Failed to connect to FreePBX');
        console.error(chalk.red(`\n✗ Error: ${error.message}\n`));
        process.exit(1);
    }
}

/**
 * Check extensions
 * @param {object} pool - MySQL pool
 */
async function checkExtensions(pool) {
    console.log(chalk.bold('Extensions (9000-9008):'));

    const result = await executeMySQLQuery(
        pool,
        `SELECT DISTINCT id, 
     MAX(CASE WHEN keyword = 'callerid' THEN data END) as callerid,
     MAX(CASE WHEN keyword = 'secret' THEN data END) as secret
     FROM sip 
     WHERE id >= 9000 AND id <= 9008 
     GROUP BY id 
     ORDER BY id`
    );

    if (result.success && result.rows.length > 0) {
        console.log(chalk.green(`  ✓ ${result.rows.length} extensions found\n`));

        for (const row of result.rows) {
            console.log(chalk.gray(`  ${row.id}: ${row.callerid || 'No caller ID'}`));
            console.log(chalk.gray(`    Secret: ${row.secret ? '***configured***' : 'not set'}`));
        }
    } else {
        console.log(chalk.red('  ✗ No extensions found'));
        console.log(chalk.gray('    Run "gemini-phone auto-provision" to create extensions'));
    }
    console.log();
}

/**
 * Check IVR
 * @param {object} pool - MySQL pool
 */
async function checkIVR(pool) {
    console.log(chalk.bold('IVR System:'));

    // Check IVR entries
    const ivrResult = await executeMySQLQuery(
        pool,
        'SELECT ivr_id, name, description FROM ivr_entries WHERE ivr_id = 7000'
    );

    if (ivrResult.success && ivrResult.rows.length > 0) {
        const ivr = ivrResult.rows[0];
        console.log(chalk.green(`  ✓ IVR ${ivr.ivr_id} configured`));
        console.log(chalk.gray(`    Name: ${ivr.name}`));
        console.log(chalk.gray(`    Description: ${ivr.description || 'none'}`));

        // Check IVR options
        const optionsResult = await executeMySQLQuery(
            pool,
            'SELECT selection, dest FROM ivr_details WHERE ivr_id = 7000 ORDER BY selection'
        );

        if (optionsResult.success && optionsResult.rows.length > 0) {
            console.log(chalk.gray(`\n    Digit Mappings:`));
            for (const option of optionsResult.rows) {
                const dest = option.dest.replace('ext-local,', '').replace(',1', '');
                console.log(chalk.gray(`      ${option.selection} → Extension ${dest}`));
            }
        }
    } else {
        console.log(chalk.red('  ✗ IVR not configured'));
        console.log(chalk.gray('    Run "gemini-phone auto-provision" to create IVR'));
    }
    console.log();
}

/**
 * Check trunk
 * @param {object} pool - MySQL pool
 * @param {object} config - Decrypted config
 */
async function checkTrunk(pool, config) {
    console.log(chalk.bold('SIP Trunk:'));

    // Check PJSIP endpoint
    const endpointResult = await executeMySQLQuery(
        pool,
        'SELECT id, transport, context, from_user, from_domain FROM ps_endpoints WHERE id = ?',
        ['outsideworld']
    );

    if (endpointResult.success && endpointResult.rows.length > 0) {
        const endpoint = endpointResult.rows[0];
        console.log(chalk.green(`  ✓ Trunk "${endpoint.id}" configured`));
        console.log(chalk.gray(`    From User: ${endpoint.from_user}`));
        console.log(chalk.gray(`    From Domain: ${endpoint.from_domain}`));
        console.log(chalk.gray(`    Context: ${endpoint.context}`));

        // Check registration
        const regResult = await executeMySQLQuery(
            pool,
            'SELECT server_uri, client_uri FROM ps_registrations WHERE id = ?',
            ['outsideworld']
        );

        if (regResult.success && regResult.rows.length > 0) {
            const reg = regResult.rows[0];
            console.log(chalk.gray(`\n    Registration:`));
            console.log(chalk.gray(`      Server: ${reg.server_uri}`));
            console.log(chalk.gray(`      Client: ${reg.client_uri}`));
        }

        // Check if trunk number matches config
        if (config.sipTrunk?.number) {
            console.log(chalk.gray(`\n    Expected Number: ${config.sipTrunk.number}`));
        }
    } else {
        console.log(chalk.red('  ✗ Trunk not configured'));
        console.log(chalk.gray('    Run "gemini-phone auto-provision" to create trunk'));
    }
    console.log();
}

/**
 * Check inbound routes
 * @param {object} pool - MySQL pool
 * @param {object} config - Decrypted config
 */
async function checkInboundRoutes(pool, _config) {
    console.log(chalk.bold('Inbound Routes:'));

    const routeResult = await executeMySQLQuery(
        pool,
        'SELECT extension, destination, cidnum FROM incoming ORDER BY extension'
    );

    if (routeResult.success && routeResult.rows.length > 0) {
        console.log(chalk.green(`  ✓ ${routeResult.rows.length} route(s) configured\n`));

        for (const route of routeResult.rows) {
            const dest = route.destination.replace('ivr,', 'IVR ').replace(',1', '');
            console.log(chalk.gray(`  ${route.extension || 'Any DID'}`));
            console.log(chalk.gray(`    Destination: ${dest}`));
            if (route.cidnum) {
                console.log(chalk.gray(`    Caller ID: ${route.cidnum}`));
            }
        }
    } else {
        console.log(chalk.yellow('  ⚠ No inbound routes configured'));
        console.log(chalk.gray('    Calls may not be routed properly'));
    }
    console.log();
}

/**
 * Show provisioning metadata
 * @param {object} provisioning - Provisioning metadata
 */
function showProvisioningMetadata(provisioning) {
    console.log(chalk.bold('Provisioning History:'));

    if (provisioning.completed) {
        console.log(chalk.green('  ✓ Provisioning completed'));
        console.log(chalk.gray(`    Date: ${new Date(provisioning.timestamp).toLocaleString()}`));
        console.log(chalk.gray(`    Version: ${provisioning.version}`));
    } else {
        console.log(chalk.yellow('  ⚠ Provisioning incomplete'));
    }
    console.log();
}
