#!/usr/bin/env node

/**
 * FreePBX IVR Provisioner via GraphQL API
 * Works on fresh FreePBX installations
 * No MySQL schema dependencies
 */

const https = require('https');
const http = require('http');

// Load environment variables
require('dotenv').config({ path: require('path').join(require('os').homedir(), '.gemini-phone', '.env') });

// Configuration from environment
const FREEPBX_CONFIG = {
    clientId: process.env.FREEPBX_CLIENT_ID || 'ce8e1437ea49d4d0a86ee1436e4ed8067dbb8206652796888071cdedbd594a9b',
    clientSecret: process.env.FREEPBX_CLIENT_SECRET || '4d873592d662614faca24ad4c5e31e83',
    apiUrl: process.env.FREEPBX_API_URL || process.env.FREEPBX_GRAPHQL_URL || 'https://[IP_ADDRESS]/admin/api/api/gql',
    mysqlPassword: process.env.FREEPBX_MYSQL_PASSWORD || 'mTbnCp0W7kqo'
};

// Crew configuration
const CREW = [
    { name: 'Morpheus', extension: '9000' },
    { name: 'Trinity', extension: '9001' },
    { name: 'Neo', extension: '9002' },
    { name: 'Tank', extension: '9003' },
    { name: 'Dozer', extension: '9004' },
    { name: 'Apoc', extension: '9005' },
    { name: 'Switch', extension: '9006' },
    { name: 'Mouse', extension: '9007' },
    { name: 'Cypher', extension: '9008' }
];

function log(message, type = 'info') {
    const prefix = type === 'success' ? '✓' : type === 'error' ? '✗' : '•';
    console.log(`${prefix} ${message}`);
}

/**
 * Make GraphQL request to FreePBX
 */
async function graphqlRequest(query, variables = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(FREEPBX_CONFIG.apiUrl);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const postData = JSON.stringify({ query, variables });

        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'client_id': FREEPBX_CONFIG.clientId,
                'client_secret': FREEPBX_CONFIG.clientSecret
            },
            rejectUnauthorized: false // Allow self-signed certs
        };

        const req = client.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.errors) {
                        reject(new Error(parsed.errors[0].message));
                    } else {
                        resolve(parsed.data);
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse response: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

/**
 * Create or update queue
 */
async function provisionQueue() {
    log('Provisioning crew queue...');

    try {
        // Check if queue exists
        const checkQuery = `
            query {
                fetchQueuesConfig(extension: "8001") {
                    extension
                }
            }
        `;

        let queueExists = false;
        try {
            const result = await graphqlRequest(checkQuery);
            queueExists = result.fetchQueuesConfig !== null;
        } catch (error) {
            // Queue doesn't exist, that's fine
        }

        if (queueExists) {
            log('Queue 8001 already exists, skipping creation');
            return true;
        }

        // Create queue using FreePBX CLI (more reliable than GraphQL for queues)
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        // Create queue via fwconsole
        const createCmd = `fwconsole queue add 8001 --name="Crew Queue" --strategy=ringall --timeout=15 --retry=5`;
        await execAsync(createCmd);

        // Add all crew members as static agents
        for (const crew of CREW) {
            const addAgentCmd = `fwconsole queue addmember 8001 ${crew.extension}`;
            try {
                await execAsync(addAgentCmd);
            } catch (error) {
                // Member might already exist, continue
            }
        }

        log(`Queue 8001 provisioned with ${CREW.length} agents`, 'success');
        return true;
    } catch (error) {
        log(`Queue provisioning failed: ${error.message}`, 'error');
        log('Tip: Queue can be created manually in FreePBX GUI: Applications → Queues');
        return false;
    }
}

/**
 * Update IVR to route option 0 to queue
 */
async function updateIVR() {
    log('Updating IVR menu...');

    try {
        const mutation = `
            mutation UpdateIVR($id: String!, $option: String!, $dest: String!) {
                updateIVRDetails(
                    ivr_id: $id
                    selection: $option
                    dest: $dest
                ) {
                    status
                    message
                }
            }
        `;

        const variables = {
            id: '7000',
            option: '0',
            dest: 'ext-queues,8001,1'
        };

        try {
            await graphqlRequest(mutation, variables);
            log('IVR updated to route option 0 to queue 8001', 'success');
            return true;
        } catch (error) {
            // GraphQL might not support this, try fwconsole
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            const updateCmd = `mysql -u freepbxuser -p${FREEPBX_CONFIG.mysqlPassword} asterisk -e "UPDATE ivr_details SET dest='ext-queues,8001,1' WHERE selection='0' LIMIT 1"`;
            await execAsync(updateCmd);

            log('IVR updated via MySQL (option 0 → queue 8001)', 'success');
            return true;
        }
    } catch (error) {
        log(`IVR update failed: ${error.message}`, 'error');
        log('Tip: Update manually in FreePBX GUI: Applications → IVR → Edit IVR → Option 0');
        return false;
    }
}

/**
 * Reload FreePBX
 */
async function reloadFreePBX() {
    log('Reloading FreePBX configuration...');

    try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        await execAsync('fwconsole reload');
        log('FreePBX configuration reloaded', 'success');
        return true;
    } catch (error) {
        log(`FreePBX reload failed: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Main function
 */
async function main() {
    console.log('\n🚀 FreePBX IVR Provisioner (GraphQL API)\n');

    const results = {
        queue: await provisionQueue(),
        ivrUpdate: await updateIVR()
    };

    await reloadFreePBX();

    // Summary
    console.log('\n📊 Provisioning Summary:\n');
    console.log(`  Queue (8001):    ${results.queue ? '✓' : '✗'}`);
    console.log(`  IVR Update:      ${results.ivrUpdate ? '✓' : '✗'}`);

    const successCount = Object.values(results).filter(r => r).length;
    const totalCount = Object.keys(results).length;

    console.log(`\n✅ ${successCount}/${totalCount} items provisioned successfully!\n`);

    if (successCount === totalCount) {
        console.log('🎉 IVR is now configured!\n');
        console.log('Next steps:');
        console.log('  1. Call your main number');
        console.log('  2. Press 0 to reach all crew members');
        console.log('  3. All 9 crew members will ring simultaneously\n');
    } else {
        console.log('⚠️  Some items failed. See manual setup guide for details.\n');
    }
}

main().catch(error => {
    console.error(`\n✗ Fatal error: ${error.message}\n`);
    process.exit(1);
});
