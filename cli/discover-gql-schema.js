
import { FreePBXClient } from './lib/freepbx-api.js';
import https from 'https';
import axios from 'axios';

axios.defaults.httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function main() {
    console.log("🔍 Discovering GQL Schema...");

    // Credentials from before
    const clientId = '7f5667b7869821a570279930778b623eb52ddfcdf8e68708a957f3531567cab0';
    const clientSecret = 'b2d1184aa0dd1ef0170eee1e4fe2f07a';
    const apiUrl = 'http://172.16.1.26/admin/api/api/gql'; // HTTP Port 80

    const client = new FreePBXClient({ clientId, clientSecret, apiUrl });

    try {
        const q = `
            query {
                __schema {
                    mutationType {
                        fields {
                            name
                            description
                        }
                    }
                }
            }
        `;

        const res = await client.query(q);
        const mutations = res?.__schema?.mutationType?.fields || [];

        console.log("Found Mutations:");
        mutations.forEach(m => console.log(`- ${m.name}`));

        // Check for extension related
        const extMutations = mutations.filter(m => m.name.toLowerCase().includes('extension'));
        if (extMutations.length > 0) {
            console.log("\nPossible Extension Mutations:", extMutations.map(m => m.name));
        } else {
            console.log("\n❌ No 'Extension' mutations found.");
        }

    } catch (err) {
        console.error("Discovery Error:", err.message);
    }
}

main();
