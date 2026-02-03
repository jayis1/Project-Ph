
const { Client } = require('ssh2');

const config = {
    host: '172.16.1.28',
    username: 'root',
    password: '12345'
};

const run = () => {
    const conn = new Client();
    conn.on('ready', () => {
        console.log('SSH2 Connected!');
        conn.exec('uptime && asterisk -x "pjsip show endpoints"', (err, stream) => {
            if (err) throw err;
            stream.on('close', (code, signal) => {
                console.log('Command finished with code: ' + code);
                conn.end();
            }).on('data', (data) => {
                console.log('STDOUT: ' + data);
            }).stderr.on('data', (data) => {
                console.log('STDERR: ' + data);
            });
        });
    }).on('error', (err) => {
        console.error('SSH2 Connection Error:', err);
    }).connect(config);
};

run();
