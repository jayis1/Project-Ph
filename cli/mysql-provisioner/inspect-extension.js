#!/usr/bin/env node

/**
 * Inspect extension 9001 structure via MySQL
 */

import mysql from 'mysql2/promise';
import { loadConfig } from '../lib/config.js';

async function inspect() {
    const config = loadConfig();
    const { server } = config;

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
