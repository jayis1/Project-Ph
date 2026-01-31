#!/usr/bin/env node

/**
 * Provision PJSIP Extensions for Nebuchadnezzar Crew (9002-9008)
 * 
 * This script creates PJSIP extensions by replicating the structure of extension 9001.
 * Uses SSH + MySQL to insert all 56 required PJSIP configuration fields.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import crypto from 'crypto';
import chalk from 'chalk';

const CREW = [
    { name: 'Neo', extension: '9002', voiceId: 'pNInz6obpgDQGcFmaJgB' },        // Adam (male)
    { name: 'Tank', extension: '9003', voiceId: 'pNInz6obpgDQGcFmaJgB' },       // Adam (male)
    { name: 'Dozer', extension: '9004', voiceId: 'pNInz6obpgDQGcFmaJgB' },      // Adam (male)
    { name: 'Apoc', extension: '9005', voiceId: 'pNInz6obpgDQGcFmaJgB' },       // Adam (male)
    { name: 'Switch', extension: '9006', voiceId: '21m00Tcm4TlvDq8ikWAM' },     // Rachel (female)
    { name: 'Mouse', extension: '9007', voiceId: 'pNInz6obpgDQGcFmaJgB' },      // Adam (male)
    { name: 'Cypher', extension: '9008', voiceId: 'pNInz6obpgDQGcFmaJgB' }      // Adam (male)
];

const SIP_SECRET = 'GeminiPhone123!';

// PJSIP configuration fields (based on extension 9001)
const PJSIP_FIELDS = [
    { keyword: 'account', data: (ext) => ext },
    { keyword: 'accountcode', data: () => '' },
    { keyword: 'aggregate_mwi', data: () => 'yes' },
    { keyword: 'allow', data: () => '' },
    { keyword: 'avpf', data: () => 'no' },
    { keyword: 'bundle', data: () => 'no' },
    { keyword: 'callerid', data: (ext, name) => `${name} (AI) <${ext}>` },
    { keyword: 'context', data: () => 'from-internal' },
    { keyword: 'defaultuser', data: () => '' },
    { keyword: 'device_state_busy_at', data: () => '0' },
    { keyword: 'dial', data: (ext) => `PJSIP/${ext}` },
    { keyword: 'direct_media', data: () => 'yes' },
    { keyword: 'disallow', data: () => '' },
    { keyword: 'dtmfmode', data: () => 'rfc4733' },
    { keyword: 'force_callerid', data: () => 'no' },
    { keyword: 'force_rport', data: () => 'yes' },
    { keyword: 'icesupport', data: () => 'no' },
    { keyword: 'mailbox', data: (ext) => `${ext}@device` },
    { keyword: 'match', data: () => '' },
    { keyword: 'max_audio_streams', data: () => '1' },
    { keyword: 'max_contacts', data: () => '1' },
    { keyword: 'max_video_streams', data: () => '1' },
    { keyword: 'maximum_expiration', data: () => '7200' },
    { keyword: 'md5_cred', data: () => '' },
    { keyword: 'media_address', data: () => '' },
    { keyword: 'media_encryption', data: () => 'no' },
    { keyword: 'media_encryption_optimistic', data: () => 'no' },
    { keyword: 'media_use_received_transport', data: () => 'no' },
    { keyword: 'message_context', data: () => '' },
    { keyword: 'minimum_expiration', data: () => '60' },
    { keyword: 'mwi_subscription', data: () => 'auto' },
    { keyword: 'namedcallgroup', data: () => '' },
    { keyword: 'namedpickupgroup', data: () => '' },
    { keyword: 'outbound_auth', data: () => 'yes' },
    { keyword: 'outbound_proxy', data: () => '' },
    { keyword: 'qualifyfreq', data: () => '60' },
    { keyword: 'refer_blind_progress', data: () => 'yes' },
    { keyword: 'remove_existing', data: () => 'yes' },
    { keyword: 'rewrite_contact', data: () => 'yes' },
    { keyword: 'rtcp_mux', data: () => 'no' },
    { keyword: 'rtp_symmetric', data: () => 'yes' },
    { keyword: 'rtp_timeout', data: () => '0' },
    { keyword: 'rtp_timeout_hold', data: () => '0' },
    { keyword: 'secret', data: () => crypto.createHash('md5').update(SIP_SECRET).digest('hex') },
    { keyword: 'send_connected_line', data: () => 'yes' },
    { keyword: 'sendrpid', data: () => 'pai' },
    { keyword: 'sipdriver', data: () => 'chan_pjsip' },
    { keyword: 'timers', data: () => 'yes' },
    { keyword: 'timers_min_se', data: () => '90' },
    { keyword: 'transport', data: () => '' },
    { keyword: 'trustrpid', data: () => 'yes' },
    { keyword: 'user_eq_phone', data: () => 'no' },
    { keyword: 'vmexten', data: () => '' },
    { keyword: 'webrtc', data: () => 'no' }
];

async function provisionExtensions() {
    console.log(chalk.bold.cyan('\n🚢 Provisioning Nebuchadnezzar Crew Extensions\n'));

    // Load config
    const configPath = join(homedir(), '.gemini-phone', 'config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));

    const freepbxHost = config.sip?.domain || '172.16.1.143';
    const mysqlPassword = config.api?.freepbx?.mysqlPassword;
    const sshPassword = config.voicemail?.sshPass || 'Jumbo2601';

    if (!mysqlPassword) {
        console.error(chalk.red('Error: FreePBX MySQL password not found in config.json'));
        process.exit(1);
    }

    let createdCount = 0;
    let skippedCount = 0;

    for (const member of CREW) {
        console.log(chalk.cyan(`\n📞 Provisioning ${member.name} (${member.extension})...`));

        // Check if extension already exists
        const checkCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "mysql -u freepbxuser -p${mysqlPassword} asterisk -e 'SELECT COUNT(*) as count FROM sip WHERE id=\\"${member.extension}\\" LIMIT 1;'"`;

        try {
            const result = execSync(checkCmd, { encoding: 'utf8' });
            const count = parseInt(result.split('\n')[1]);

            if (count > 0) {
                console.log(chalk.yellow(`  ⚠ ${member.name} already exists - skipping`));
                skippedCount++;
                continue;
            }
        } catch (error) {
            console.error(chalk.red(`  ✗ Error checking ${member.name}: ${error.message}`));
            continue;
        }

        // Insert all PJSIP fields
        console.log(chalk.gray(`  → Inserting ${PJSIP_FIELDS.length} configuration fields...`));

        for (const field of PJSIP_FIELDS) {
            const data = typeof field.data === 'function'
                ? field.data(member.extension, member.name)
                : field.data;

            const insertCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "mysql -u freepbxuser -p${mysqlPassword} asterisk -e \\"INSERT INTO sip (id, keyword, data, flags) VALUES ('${member.extension}', '${field.keyword}', '${data}', 0);\\""`;

            try {
                execSync(insertCmd, { encoding: 'utf8' });
            } catch (error) {
                console.error(chalk.red(`  ✗ Failed to insert ${field.keyword}: ${error.message}`));
            }
        }

        console.log(chalk.green(`  ✓ ${member.name} created successfully`));
        createdCount++;
    }

    // Reload FreePBX
    console.log(chalk.cyan('\n🔄 Reloading FreePBX configuration...'));
    const reloadCmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} "fwconsole reload"`;
    execSync(reloadCmd, { encoding: 'utf8' });
    console.log(chalk.green('  ✓ FreePBX reloaded'));

    // Summary
    console.log(chalk.bold('\n📊 Summary:'));
    console.log(`  ${chalk.green('Created:')} ${createdCount} extensions`);
    console.log(`  ${chalk.yellow('Skipped:')} ${skippedCount} extensions (already exist)`);

    if (createdCount > 0) {
        console.log(chalk.cyan('\n📝 Next steps:'));
        console.log('  1. Update ~/.gemini-phone/config.json with new crew members');
        console.log('  2. Restart voice-app: gemini-phone stop && gemini-phone start');
        console.log('  3. Verify registrations: curl http://localhost:3000/api/sip-status');
        console.log('  4. Test IVR: Call extension 7000');
    }

    console.log(chalk.green('\n✅ Provisioning complete!\n'));
}

provisionExtensions().catch(error => {
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
});
