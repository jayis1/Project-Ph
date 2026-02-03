
import { FreePBXClient } from './lib/freepbx-api.js';
import https from 'https';
import axios from 'axios';

axios.defaults.httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function main() {
    console.log("🔍 Inspecting addExtension Args...");

    const clientId = '7f5667b7869821a570279930778b623eb52ddfcdf8e68708a957f3531567cab0';
    const clientSecret = 'b2d1184aa0dd1ef0170eee1e4fe2f07a';
    const apiUrl = 'http://172.16.1.26/admin/api/api/gql';

    const client = new FreePBXClient({ clientId, clientSecret, apiUrl });

    try {
        const q = `
            query {
                __type(name: "updateCoreDeviceInput") {
                    name
                    kind
                    inputFields {
                        name
                        type {
                            name
                            kind
                            ofType {
                                name
                                kind
                            }
                        }
                    }
                }
            }
        `;

        const res = await client.query(q);
        const typeInfo = res?.__type;

        if (typeInfo && typeInfo.inputFields) {
            console.log(`Input Type: ${typeInfo.name}`);
            typeInfo.inputFields.forEach(field => {
                const typeName = field.type.name || (field.type.ofType ? field.type.ofType.name : 'Unknown');
                const kind = field.type.kind === 'NON_NULL' ? 'Required' : 'Optional';
                console.log(`- ${field.name} (${typeName}, ${kind})`);
            });
        } else {
            console.log("❌ Input Type 'addExtensionInput' not found.");
        }

    } catch (err) {
        console.error("Discovery Error:", err.message);
    }
}

main();
