#!/usr/bin/env node

/**
 * Inspect extension 9001 structure via MySQL
 */

import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function inspect() {
    // Load config from ~/.gemini-phone/config.json
    const configPath = join(homedir(), '.gemini-phone', 'config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));

    // Extract MySQL credentials from FreePBX config
    const freepbxHost = config.sip?.domain || '172.16.1.143';
    const mysqlPassword = config.api?.freepbx?.mysqlPassword;

    if (!mysqlPassword) {
        console.error('Error: FreePBX MySQL password not found in config.json');
        console.error('Expected: config.api.freepbx.mysqlPassword');
        process.exit(1);
    }

    const connection = await mysql.createConnection({
        host: freepbxHost,
        user: 'freepbxuser',
        password: mysqlPassword,
        database: 'asterisk'
    });

    const [rows] = await connection.execute(
        'SELECT id, keyword, data FROM sip WHERE id = ? ORDER BY keyword',
        ['9001']
    );

    console.log('Extension 9001 structure:');
    console.log('========================');
    rows.forEach(row => {
        console.log(`${row.keyword.padEnd(20)} = ${row.data}`);
    });

    await connection.end();
}

inspect().catch(console.error);
