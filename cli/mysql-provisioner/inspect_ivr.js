
import mysql from 'mysql2/promise';
import { loadConfig } from '../lib/config.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function getMySQLConfig() {
    const config = await loadConfig();
    return {
        host: '127.0.0.1', // Assuming tunnel
        user: config.database.user,
        password: config.database.password,
        database: 'asterisk',
        port: 33306 // Assuming tunnel port
    };
}

async function createTunnel(sshConfig) {
    const cmd = `sshpass -p "${sshConfig.password}" ssh -f -N -L 33306:127.0.0.1:3306 -o StrictHostKeyChecking=no ${sshConfig.user}@${sshConfig.host}`;
    try {
        await execAsync(cmd);
        await new Promise(r => setTimeout(r, 1000));
        return true;
    } catch (e) {
        return false;
    }
}

async function inspect() {
    const config = await loadConfig();
    const sshConfig = {
        host: process.env.SSH_HOST || config.server?.host || '172.16.1.143',
        user: process.env.SSH_USER || 'root',
        password: process.env.SSH_PASS || config.server?.sshPassword || 'SangomaDefaultPassword'
    };

    await createTunnel(sshConfig);

    const mysqlConfig = await getMySQLConfig();
    const conn = await mysql.createConnection(mysqlConfig);

    const [rows] = await conn.execute("DESCRIBE ivr_details");
    console.log(JSON.stringify(rows, null, 2));

    await conn.end();
    process.exit(0);
}

inspect().catch(console.error);
