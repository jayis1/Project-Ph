
import { Client } from 'ssh2';

const config = {
    host: '172.16.1.28',
    username: 'root',
    password: '12345'
};

function runCommand(cmd) {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        conn.on('ready', () => {
            conn.exec(cmd, (err, stream) => {
                if (err) return reject(err);
                let stdout = '';
                let stderr = '';
                stream.on('close', (code, signal) => {
                    conn.end();
                    console.log(stdout); // Print output
                    resolve();
                }).on('data', (data) => {
                    stdout += data;
                }).stderr.on('data', (data) => {
                    stderr += data;
                });
            });
        }).connect(config);
    });
}

// Run fwconsole list to find bulk commands
runCommand('ls -R /var/www/html/admin/modules/bulkhandler && echo "---CORE.XML---" && cat /var/www/html/admin/modules/core/module.xml').catch(console.error);
