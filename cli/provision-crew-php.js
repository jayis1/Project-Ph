
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'ssh2';
import { loadConfig } from './lib/config.js';
import { decryptConfig } from './lib/credential-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSSH(config, command) {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        conn.on('ready', () => {
            conn.exec(command, (err, stream) => {
                if (err) return reject(err);
                let stdout = '';
                let stderr = '';
                stream.on('close', (code, signal) => {
                    conn.end();
                    if (code === 0) resolve({ stdout });
                    else reject(new Error(stderr || `Command failed with code ${code}`));
                }).on('data', (data) => {
                    stdout += data;
                }).stderr.on('data', (data) => {
                    stderr += data;
                });
            });
        }).on('error', (err) => { // Handle connection errors
            reject(err);
        }).connect({
            host: config.host,
            username: config.user,
            password: config.password,
            readyTimeout: 20000
        });
    });
}

async function main() {
    console.log("🚀 Provisioning Crew via PHP (SSH2)...");
    const rawConfig = await loadConfig();
    const config = decryptConfig(rawConfig);

    const crew = [
        { name: 'Morpheus', extension: '9000', secret: 'GeminiPhone123!' },
        { name: 'Trinity', extension: '9001', secret: 'GeminiPhone123!' },
        { name: 'Neo', extension: '9002', secret: 'GeminiPhone123!' },
        { name: 'Tank', extension: '9003', secret: 'GeminiPhone123!' },
        { name: 'Dozer', extension: '9004', secret: 'GeminiPhone123!' },
        { name: 'Apoc', extension: '9005', secret: 'GeminiPhone123!' },
        { name: 'Switch', extension: '9006', secret: 'GeminiPhone123!' },
        { name: 'Mouse', extension: '9007', secret: 'GeminiPhone123!' },
        { name: 'Cypher', extension: '9008', secret: 'GeminiPhone123!' }
    ];

    let phpCode = `<?php
    if (!defined('FREEPBX_IS_AUTH')) { define('FREEPBX_IS_AUTH', 'TRUE'); }
    require_once('/etc/freepbx.conf');
    $FreePBX = FreePBX::Create();
    $core = $FreePBX->Core;
    echo "Provisioning Crew...\\n";
    `;

    crew.forEach(member => {
        phpCode += `
    // Check if device ${member.extension} exists
    try {
        $dev = $core->getDevice(${member.extension});
        echo "Device ${member.extension} CORRUPT or Exists - Fixing...\\n";
        $core->delDevice(${member.extension});
    } catch (Exception $e) {
    }

    try {
        $user = $core->getUser(${member.extension});
        echo "User ${member.extension} CORRUPT or Exists - Fixing...\\n";
        $core->delUser(${member.extension});
    } catch (Exception $e) {
    }
    
    echo "Creating Device & User ${member.extension}...\\n";
    $core->addDevice(${member.extension}, 'pjsip', [
        'secret' => ['value' => '${member.secret}'],
        'context' => ['value' => 'from-internal'],
        'deny' => ['value' => '0.0.0.0/0.0.0.0'],
        'permit' => ['value' => '0.0.0.0/0.0.0.0'],
        'tech' => ['value' => 'pjsip'],
        'devicetype' => ['value' => 'fixed'],
        'user' => ['value' => '${member.extension}'],
        'dial' => ['value' => 'PJSIP/${member.extension}'],
        'description' => ['value' => '${member.name}'],
        'emergency_cid' => ['value' => ''],
        'hint_override' => ['value' => '']
    ]);
    $core->addUser(${member.extension}, [
        'password' => '${member.secret}',
        'name' => '${member.name}',
        'voicemail' => 'novm',
        'ringtimer' => 0,
        'noanswer' => '',
        'newdid' => '',
        'newdidcid' => '',
        'callwaiting' => 'enabled',
        'pinless' => 'disabled'
    ]);
    `;
    });

    phpCode += `echo "Done.\\n"; ?>`;

    const remotePath = '/tmp/provision_crew.php';
    const localPath = path.resolve(__dirname, 'provision_crew.php');

    fs.writeFileSync(localPath, phpCode);
    console.log(`Generated PHP script: ${localPath}`);

    const sshConfig = {
        host: '172.16.1.28',
        user: 'root',
        password: '12345'
    };

    const b64 = Buffer.from(phpCode).toString('base64');
    const writeCmd = `echo "${b64}" | base64 -d > ${remotePath}`;

    console.log("Uploading script to Server B...");
    try {
        await runSSH(sshConfig, writeCmd);
        console.log("Executing PHP script...");
        const execResult = await runSSH(sshConfig, `php ${remotePath}`);
        console.log("Output:\n", execResult.stdout);

        console.log("Reloading FreePBX...");
        await runSSH(sshConfig, `fwconsole reload`);
        console.log("Done.");
    } catch (err) {
        console.error("SSH Error:", err.message);
        process.exit(1);
    }
}

main().catch(console.error);
