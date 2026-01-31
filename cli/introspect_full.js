#!/usr/bin/env node

/**
 * Full GraphQL schema introspection to find IVR-related types
 */

import { loadConfig } from './lib/config.js';
import { FreePBXClient } from './lib/freepbx-api.js';

async function introspectSchema() {
    const config = await loadConfig();
    const client = new FreePBXClient({
        clientId: config.api.freepbx.clientId,
        clientSecret: config.api.freepbx.clientSecret,
        apiUrl: config.api.freepbx.apiUrl
    });

    console.log('🔍 Full GraphQL Schema Introspection\n');

    try {
        // Get all types
        const introspection = `
query {
  __schema {
    types {
      name
      kind
      description
    }
  }
}`;

        const res = await client.query(introspection);
        const types = res.__schema.types;

        // Filter for IVR-related types
        console.log('=== IVR-Related Types ===');
        const ivrTypes = types.filter(t =>
            t.name && (
                t.name.toLowerCase().includes('ivr') ||
                t.name.toLowerCase().includes('digital') ||
                t.name.toLowerCase().includes('receptionist') ||
                t.name.toLowerCase().includes('menu')
            )
        );

        if (ivrTypes.length > 0) {
            ivrTypes.forEach(t => {
                console.log(`\n${t.name} (${t.kind})`);
                if (t.description) console.log(`  ${t.description}`);
            });
        } else {
            console.log('❌ No IVR-related types found\n');
        }

        // Now get Query type fields to see all available queries
        console.log('\n=== All Available Queries ===');
        const queryIntrospection = `
query {
  __type(name: "Query") {
    fields {
      name
      description
    }
  }
}`;

        const queryRes = await client.query(queryIntrospection);
        const queries = queryRes.__type.fields;

        // Filter for anything that might be IVR
        const possibleIVRQueries = queries.filter(q =>
            q.name.toLowerCase().includes('ivr') ||
            q.name.toLowerCase().includes('digital') ||
            q.name.toLowerCase().includes('receptionist') ||
            q.name.toLowerCase().includes('menu')
        );

        if (possibleIVRQueries.length > 0) {
            console.log('\n✅ Found IVR-related queries:');
            possibleIVRQueries.forEach(q => {
                console.log(`\n${q.name}`);
                if (q.description) console.log(`  ${q.description}`);
            });
        } else {
            console.log('\n❌ No IVR-related queries found');
        }

        // Check Mutation type
        console.log('\n=== All Available Mutations ===');
        const mutationIntrospection = `
query {
  __type(name: "Mutation") {
    fields {
      name
      description
    }
  }
}`;

        const mutationRes = await client.query(mutationIntrospection);
        const mutations = mutationRes.__type.fields;

        const possibleIVRMutations = mutations.filter(m =>
            m.name.toLowerCase().includes('ivr') ||
            m.name.toLowerCase().includes('digital') ||
            m.name.toLowerCase().includes('receptionist') ||
            m.name.toLowerCase().includes('menu')
        );

        if (possibleIVRMutations.length > 0) {
            console.log('\n✅ Found IVR-related mutations:');
            possibleIVRMutations.forEach(m => {
                console.log(`\n${m.name}`);
                if (m.description) console.log(`  ${m.description}`);
            });
        } else {
            console.log('\n❌ No IVR-related mutations found');
        }

        // Save full schema to file for reference
        console.log('\n📝 Saving full schema to schema.json...');
        const fs = await import('fs');
        fs.writeFileSync('schema.json', JSON.stringify({ types, queries, mutations }, null, 2));
        console.log('✅ Schema saved!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

introspectSchema().catch(console.error);
