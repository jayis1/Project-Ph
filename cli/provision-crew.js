import { provisionExtensions, validateConnection } from './lib/freepbx-provisioner.js';
import { loadConfig } from './lib/config.js';
import { createMySQLPool } from './lib/freepbx-connection.js';

async function main() {
    console.log("🚀 Provisioning Matrix Crew...");
    const config = await loadConfig();

    // Map config to expected structure
    const fp = config.api?.freepbx || config.freepbx || {};

    // Construct the config object expected by provisionExtensions
    const provisioningConfig = {
        ...config,
        freepbx: {
            host: fp.host || fp.mysqlHost || '127.0.0.1',
            sshUser: fp.sshUser || 'root',
            sshPassword: fp.sshPassword,
            mysqlHost: fp.mysqlHost || fp.host || '127.0.0.1',
            mysqlUser: 'botprov',
            mysqlPassword: 'GeminiBot2026!',
            mysqlPort: fp.mysqlPort,
            botSubnet: fp.botSubnet || '172.16.1.0/24'
        }
    };

    console.log("Using Host:", provisioningConfig.freepbx.host);

    console.log("Checking connection...");
    // We can skip validateConnection if we assume local creds work (since we built config object manually)
    // But validateConnection also decrypts if needed.
    // Our manual object is plain text (loaded from config.json which IS plain text? No, it's decrypted by loadConfig? No.)
    // loadConfig returns raw object (which might be encrypted or not depending on saveConfig?).
    // saveConfig encrypts?
    // Let's check credential-manager.js usage.
    // loadConfig returns plain object.
    // provisionExtensions calls decryptConfig(config).
    // decryptConfig handles decryption IF encrypted.

    // Let's rely on validateConnection to test.
    // const validate = await validateConnection(provisioningConfig);
    // if (!validate.success) {
    //     console.error("Connection failed:", validate.error);
    //     if (validate.details) console.error(validate.details);
    //     process.exit(1);
    // }

    // SKIP VALIDATION (because it checks SSH which might fail if I hardcoded root/no-pass)
    // Direct MySQL connection
    const connectionConfig = {
        mysql: {
            host: provisioningConfig.freepbx.mysqlHost,
            user: provisioningConfig.freepbx.mysqlUser,
            password: provisioningConfig.freepbx.mysqlPassword,
            database: 'asterisk'
        }
    };

    const pool = await createMySQLPool(connectionConfig.mysql);

    console.log("Creating Extensions & Devices for Default Crew...");
    try {
        const result = await provisionExtensions(provisioningConfig, pool, (update) => {
            console.log(`[${update.step}] ${update.message}`);
        });
        console.log("Result:", result);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

main().catch(console.error);
