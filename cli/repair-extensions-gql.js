
import { FreePBXClient } from './lib/freepbx-api.js';
import https from 'https';
import axios from 'axios';

// Patch Axios to ignore SSL errors for local dev
axios.defaults.httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function main() {
    console.log("🚀 Repairing Extensions via GraphQL (Authenticated)...");

    const clientId = '7f5667b7869821a570279930778b623eb52ddfcdf8e68708a957f3531567cab0';
    const clientSecret = 'b2d1184aa0dd1ef0170eee1e4fe2f07a';
    const apiUrl = 'http://172.16.1.26/admin/api/api/gql';

    console.log(`Using credentials: ${clientId.substring(0, 8)}...`);

    // Manual construction to bypass config loading logic which might interfere
    const client = new FreePBXClient({
        clientId,
        clientSecret,
        apiUrl
    });

    // Monkey-patch getToken to handle self-signed certs in token request if needed
    // (Axios default patch above handles it for global axios, but FreePBXClient might use a specific instance?
    // Looking at freepbx-api.js, it uses global axios or new instance? It imports axios. So global default should work.)

    try {
        // Test connection
        console.log("Testing connection & Token...");
        const valid = await client.testConnection();
        if (!valid.valid) {
            throw new Error("Connection Test Failed: " + valid.error);
        }
        console.log("✅ Authenticated!");

        const crew = [
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

        for (const member of crew) {
            console.log(`Repairing ${member.name} (${member.extension})...`);
            try {
                // Find ID first
                const internalId = await client.findExtensionId(member.extension);
                if (!internalId) {
                    console.log(`Extension ${member.extension} NOT FOUND in GQL. Skipping update.`);
                    continue;
                }

                // Update
                const res = await client.updateExtension(member.extension, member.name, member.extension);
                console.log(`Success: ${member.extension}`, res);
            } catch (err) {
                console.error(`Failed ${member.extension}:`, err.message);
            }
        }

        console.log("Reloading Config...");
        try {
            await client.applyConfig();
            console.log("Done.");
        } catch (err) {
            console.error("Reload Failed:", err.message);
        }

    } catch (err) {
        console.error("Fatal Error:", err.message);
        if (err.response) {
            console.error("Response Data:", err.response.data);
        }
    }
}

main();
