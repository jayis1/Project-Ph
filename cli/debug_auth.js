
import mysql from 'mysql2/promise';
import { loadConfig } from './lib/config.js';

async function inspectAuth() {
    const config = await loadConfig();
    const mysqlConfig = {
        host: '172.16.1.143', // Or use tunnel if direct fails
        user: config.api?.freepbx?.mysqlUser || 'freepbxuser',
        password: config.api?.freepbx?.mysqlPassword || 'rCK+gZBKfILF',
        database: 'asterisk'
    };

    try {
        console.log('Connecting to MySQL...');
        const connection = await mysql.createConnection(mysqlConfig);

        console.log('Querying ps_auths for 9001...');
        const [rows] = await connection.execute(
            "SELECT id, auth_type, password, md5_creds, username FROM ps_auths WHERE id = '9001' OR id = '9001-auth'"
        );

        console.log(JSON.stringify(rows, null, 2));
        await connection.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

inspectAuth();
