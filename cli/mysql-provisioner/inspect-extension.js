#!/usr/bin/env node

/**
 * Inspect extension 9001 structure via SSH + MySQL
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function inspect() {
    // Load config from ~/.gemini-phone/config.json
    const configPath = join(homedir(), '.gemini-phone', 'config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));

    // Extract credentials
    const freepbxHost = config.sip?.domain || '172.16.1.143';
    const mysqlPassword = config.api?.freepbx?.mysqlPassword;
    const sshPassword = config.voicemail?.sshPass || 'Jumbo2601';

    if (!mysqlPassword) {
        console.error('Error: FreePBX MySQL password not found in config.json');
        console.error('Expected: config.api.freepbx.mysqlPassword');
        process.exit(1);
    }

    // Run MySQL query via SSH
    const cmd = `sshpass -p "${sshPassword}" ssh -o StrictHostKeyChecking=no root@${freepbxHost} 'mysql -u freepbxuser -p"'"'"'${mysqlPassword}'"'"'" asterisk -e "SELECT id, keyword, data FROM sip WHERE id='\"'\"'9001'\"'\"' ORDER BY keyword;"'`;

    try {
        const result = execSync(cmd, { encoding: 'utf8' });
        console.log('Extension 9001 structure:');
        console.log('========================');
        console.log(result);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

inspect();
