import { FreePBXClient } from './lib/freepbx-api.js';
import { loadConfig } from './lib/config.js';

async function checkSchema() {
    const config = await loadConfig();
    const client = new FreePBXClient({
        clientId: config.api.freepbx.clientId,
        clientSecret: config.api.freepbx.clientSecret,
        apiUrl: config.api.freepbx.apiUrl
    });

    const query = `
    query {
        __type(name: "Mutation") {
            fields {
                name
                args {
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
    }`;

    try {
        const data = await client.query(query);
        const addExt = data.__type.fields.find(f => f.name === 'addExtension');
        console.log(JSON.stringify(addExt, null, 2));

        if (addExt) {
            const inputType = addExt.args.find(a => a.name === 'input').type.name || addExt.args.find(a => a.name === 'input').type.ofType.name;
            console.log('Input Type:', inputType);

            const typeQuery = `
             query {
                __type(name: "${inputType}") {
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
             }`;
            const typeData = await client.query(typeQuery);
            console.log(JSON.stringify(typeData, null, 2));
        }

    } catch (e) {
        console.error(e);
    }
}

checkSchema();
