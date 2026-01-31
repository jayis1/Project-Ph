#!/usr/bin/env node

/**
 * Test MySQL connection to FreePBX
 */

import mysql from 'mysql2/promise';
import chalk from 'chalk';

const MYSQL_CONFIG = {
    host: '172.16.1.143',
    port: 3306,
    user: 'freepbxuser',
    password: 'rCK+gZBKfILF',
    database: 'asterisk'
};

async function testConnection() {
    console.log(chalk.bold.cyan('\n🔍 Testing MySQL Connection\n'));
    console.log('Host:', MYSQL_CONFIG.host);
    console.log('User:', MYSQL_CONFIG.user);
    console.log('Database:', MYSQL_CONFIG.database);
    console.log('');

    try {
        console.log('Connecting...');
        const connection = await mysql.createConnection(MYSQL_CONFIG);
        console.log(chalk.green('✅ Connected successfully!\n'));

        // Test query
        console.log('Testing query...');
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM ivr_details');
        console.log(chalk.green(`✅ Query successful! Found ${rows[0].count} existing IVRs\n`));

        // Check if IVR 7000 exists
        const [existing] = await connection.execute('SELECT * FROM ivr_details WHERE id = ?', ['7000']);
        if (existing.length > 0) {
            console.log(chalk.yellow('⚠️  IVR 7000 already exists:'));
            console.log(chalk.gray(`   Name: ${existing[0].name}`));
            console.log(chalk.gray(`   Description: ${existing[0].description}\n`));
        } else {
            console.log(chalk.cyan('ℹ️  IVR 7000 does not exist yet\n'));
        }

        await connection.end();
        console.log(chalk.green('✅ Connection test passed! Ready to provision.\n'));

    } catch (error) {
        console.log(chalk.red('\n❌ Connection failed!\n'));
        console.error('Error:', error.message);

        if (error.code === 'ECONNREFUSED') {
            console.log(chalk.yellow('\n💡 Troubleshooting:'));
            console.log(chalk.gray('   1. Check MySQL is running: systemctl status mariadb'));
            console.log(chalk.gray('   2. Check MySQL allows remote connections'));
            console.log(chalk.gray('   3. Verify firewall allows port 3306\n'));
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log(chalk.yellow('\n💡 Access denied - check credentials:'));
            console.log(chalk.gray('   ssh root@172.16.1.143'));
            console.log(chalk.gray('   cat /etc/freepbx.conf | grep AMPDBPASS\n'));
        }
    }
}

testConnection().catch(console.error);
