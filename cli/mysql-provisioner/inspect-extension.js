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

    const { server } = config;

    if (!server?.mysql) {
        console.error('Error: MySQL configuration not found in config.json');
        console.error('Expected: config.server.mysql');
        process.exit(1);
    }

    const connection = await mysql.createConnection({
        host: server.mysql.host,
        user: server.mysql.user,
        password: server.mysql.password,
        database: server.mysql.database || 'asterisk'
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
