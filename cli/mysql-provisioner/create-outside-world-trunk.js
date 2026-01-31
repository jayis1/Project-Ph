#!/usr/bin/env node

/**
 * Create "Outside World" trunk based on Redspot configuration
 * and update inbound route to use it
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import chalk from 'chalk';

const TRUNK_NAME = 'Outside World';
const TRUNK_ID = 'outsideworld';

async function createTrunk() {
    console.log(chalk.bold.cyan(`\n🌍 Creating "${TRUNK_NAME}" Trunk\n`));

    const configPath = join(homedir(), '.gemini-phone', 'config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));

    const freepbxHost = config.sip?.domain || '172.16.1.143';
    const mysqlPassword = config.api?.freepbx?.mysqlPassword;
    const sshPassword = config.voicemail?.sshPass || 'Jumbo2601';

    if (!mysqlPassword) {
        console.error(chalk.red('Error: FreePBX MySQL password not found'));
        process.exit(1);
    }

    // Read trunk configuration from environment or config
    const TRUNK_CONFIG = {
        username: process.env.SIP_TRUNK_USERNAME || config.sipTrunk?.username || '88707695',
        auth_username: process.env.SIP_TRUNK_USERNAME || config.sipTrunk?.username || '88707695',
        secret: process.env.SIP_TRUNK_PASSWORD || config.sipTrunk?.password,
        sip_server: process.env.SIP_TRUNK_SERVER || config.sipTrunk?.server || 'voice.redspot.dk',
        sip_port: process.env.SIP_TRUNK_PORT || config.sipTrunk?.port || '5060',
        context: 'from-pstn',
        transport: 'udp'
    };

    if (!TRUNK_CONFIG.secret) {
        console.error(chalk.red('Error: SIP trunk password not found!'));
        console.error(chalk.yellow('Set SIP_TRUNK_PASSWORD environment variable or add to config.json:'));
        console.error(chalk.gray('  "sipTrunk": { "password": "your_password" }'));
        process.exit(1);
    }


    const query = (sql) => {
        const cmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "mysql -u freepbxuser -p${mysqlPassword} asterisk -e \\"${sql}\\""`;
        try {
            return execSync(cmd, { encoding: 'utf8' });
        } catch (error) {
            console.error(chalk.red(`SQL Error: ${error.message}`));
            return null;
        }
    };

    // 1. Create PJSIP trunk endpoint
    console.log(chalk.cyan('📞 Step 1: Creating PJSIP endpoint\n'));

    const pjsipFields = [
        { keyword: 'type', data: 'endpoint' },
        { keyword: 'context', data: TRUNK_CONFIG.context },
        { keyword: 'disallow', data: 'all' },
        { keyword: 'allow', data: 'ulaw' },
        { keyword: 'allow', data: 'alaw' },
        { keyword: 'aors', data: TRUNK_ID },
        { keyword: 'auth', data: TRUNK_ID },
        { keyword: 'outbound_auth', data: TRUNK_ID },
        { keyword: 'from_user', data: TRUNK_CONFIG.username },
        { keyword: 'from_domain', data: TRUNK_CONFIG.sip_server }
    ];

    for (const field of pjsipFields) {
        query(`INSERT INTO ps_endpoints (id, \`${field.keyword}\`) VALUES ('${TRUNK_ID}', '${field.data}') ON DUPLICATE KEY UPDATE \`${field.keyword}\`='${field.data}'`);
    }
    console.log(chalk.green(`  ✓ Endpoint created: ${TRUNK_ID}`));

    // 2. Create AOR (Address of Record)
    console.log(chalk.cyan('\n📞 Step 2: Creating AOR\n'));
    query(`INSERT INTO ps_aors (id, contact, qualify_frequency) VALUES ('${TRUNK_ID}', 'sip:${TRUNK_CONFIG.sip_server}:${TRUNK_CONFIG.sip_port}', '60') ON DUPLICATE KEY UPDATE contact='sip:${TRUNK_CONFIG.sip_server}:${TRUNK_CONFIG.sip_port}'`);
    console.log(chalk.green(`  ✓ AOR created: ${TRUNK_ID}`));

    // 3. Create Auth
    console.log(chalk.cyan('\n📞 Step 3: Creating authentication\n'));
    query(`INSERT INTO ps_auths (id, auth_type, username, password) VALUES ('${TRUNK_ID}', 'userpass', '${TRUNK_CONFIG.auth_username}', '${TRUNK_CONFIG.secret}') ON DUPLICATE KEY UPDATE username='${TRUNK_CONFIG.auth_username}', password='${TRUNK_CONFIG.secret}'`);
    console.log(chalk.green(`  ✓ Auth created: ${TRUNK_ID}`));

    // 4. Create Registration
    console.log(chalk.cyan('\n📞 Step 4: Creating registration\n'));
    query(`INSERT INTO ps_registrations (id, server_uri, client_uri, auth_rejection_permanent, outbound_auth) VALUES ('${TRUNK_ID}', 'sip:${TRUNK_CONFIG.sip_server}:${TRUNK_CONFIG.sip_port}', 'sip:${TRUNK_CONFIG.username}@${TRUNK_CONFIG.sip_server}', 'yes', '${TRUNK_ID}') ON DUPLICATE KEY UPDATE server_uri='sip:${TRUNK_CONFIG.sip_server}:${TRUNK_CONFIG.sip_port}'`);
    console.log(chalk.green(`  ✓ Registration created: ${TRUNK_ID}`));

    // 5. Reload FreePBX
    console.log(chalk.cyan('\n🔄 Reloading FreePBX...\n'));
    const reloadCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "fwconsole reload"`;
    execSync(reloadCmd, { encoding: 'utf8' });
    console.log(chalk.green('  ✓ FreePBX reloaded'));

    // 6. Summary
    console.log(chalk.bold('\n📊 Trunk Configuration:\n'));
    console.log(chalk.cyan(`  Name: ${TRUNK_NAME}`));
    console.log(chalk.cyan(`  ID: ${TRUNK_ID}`));
    console.log(chalk.cyan(`  Server: ${TRUNK_CONFIG.sip_server}:${TRUNK_CONFIG.sip_port}`));
    console.log(chalk.cyan(`  Username: ${TRUNK_CONFIG.username}`));
    console.log(chalk.cyan(`  Context: ${TRUNK_CONFIG.context}`));

    console.log(chalk.bold.green('\n✅ Trunk created successfully!\n'));
    console.log(chalk.yellow('Next: The inbound route is already configured.'));
    console.log(chalk.yellow('Wait a few minutes for registration, then test by calling 88707695\n'));
}

createTrunk().catch(error => {
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
});
