import { loadConfig } from './lib/config.js';
import { FreePBXClient } from './lib/freepbx-api.js';

async function debugRingGroups() {
    const config = await loadConfig();
    const client = new FreePBXClient({
        clientId: config.api.freepbx.clientId,
        clientSecret: config.api.freepbx.clientSecret,
        apiUrl: config.api.freepbx.apiUrl
    });

    console.log('Fetching all Ring Groups...');

    try {
        const query = `query { fetchAllRingGroups { ringgroups { groupNumber description } } }`;
        const res = await client.query(query);
        console.log('Result:', JSON.stringify(res, null, 2));

        const ringgroups = res?.fetchAllRingGroups?.ringgroups || [];
        console.log('Parsed Ring Groups:', ringgroups);

        const exists = ringgroups.some(rg => rg.groupNumber === '8000');
        console.log(`Does Ring Group 8000 exist? ${exists}`);

    } catch (error) {
        console.error('Error fetching ring groups:', error);
    }
}

debugRingGroups();
