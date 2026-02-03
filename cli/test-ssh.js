
import { Client } from 'ssh2';

const passwords = [
    'Jumbo2601',
    'GeminiPhone123!',
    'GeminiBot2026!',
    'changeme',
    'admin',
    'password',
    'GeminiRules!',
    'freepbx',
    'SangomaDefaultPassword'
];

const host = '172.16.1.26';
const user = 'root';

async function tryPassword(password) {
    return new Promise((resolve) => {
        const conn = new Client();
        conn.on('ready', () => {
            console.log(`SUCCESS with password: ${password}`);
            conn.end();
            resolve(true);
        }).on('error', (err) => {
            // console.log(`Failed with ${password}: ${err.message}`);
            resolve(false);
        }).connect({
            host,
            username: user,
            password,
            readyTimeout: 5000,
            tryKeyboard: true
        });
    });
}

async function main() {
    console.log(`Testing passwords against ${user}@${host}...`);
    for (const pass of passwords) {
        process.stdout.write(`Trying ${pass}... `);
        const success = await tryPassword(pass);
        if (success) {
            console.log("\nFOUND IT!");
            process.exit(0);
        } else {
            console.log("Failed.");
        }
    }
    console.log("All failed.");
    process.exit(1);
}

main();
