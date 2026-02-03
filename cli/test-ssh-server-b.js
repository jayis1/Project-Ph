
import { Client } from 'ssh2';

const config = {
    host: '172.16.1.26',
    username: 'root',
    password: '12345',
    readyTimeout: 5000
};

console.log(`Connecting to ${config.host}...`);

const conn = new Client();
conn.on('ready', () => {
    console.log('SSH Connection SUCCESS!');
    conn.exec('fwconsole version && asterisk -rx "pjsip show endpoints"', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log(`Stream :: close :: code: ${code}, signal: ${signal}`);
            conn.end();
        }).on('data', (data) => {
            console.log('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
            console.log('STDERR: ' + data);
        });
    });
}).on('error', (err) => {
    console.error('SSH Connection Failed:', err.message);
}).connect(config);
