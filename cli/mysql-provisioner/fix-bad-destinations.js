#!/usr/bin/env node

/**
 * FreePBX Destination Fixer
 * Fixes "bad destinations" errors by setting proper failover destinations
 */

import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { execSync } from 'child_process';

// Load environment variables
config({ path: process.env.HOME + '/.gemini-phone/.env' });

const DB_CONFIG = {
    host: 'localhost',
    user: 'freepbxuser',
    password: process.env.FREEPBX_DB_PASSWORD || 'mTbnCp0W7kqo',
    database: 'asterisk'
};

async function fixBadDestinations() {
    let connection;

    try {
        console.log('🔧 Fixing FreePBX Bad Destinations...\n');

        connection = await mysql.createConnection(DB_CONFIG);

        // ============================================
        // FIX 1: Queue 8001 - Set failover destination
        // ============================================
        console.log('📞 Fixing Queue 8001 destination...');

        // Set queue to go to app-blackhole (hangup) if no answer
        // This is the standard FreePBX way to handle "no destination"
        await connection.execute(
            `UPDATE queues_config SET 
        dest = 'app-blackhole,hangup,1'
      WHERE extension = ?`,
            ['8001']
        );

        console.log('  ✅ Queue 8001 failover set to hangup');

        // ============================================
        // FIX 2: Inbound Route - Verify IVR destination
        // ============================================
        console.log('\n📥 Fixing Inbound Route destination...');

        // Get the IVR ID
        const [ivrResult] = await connection.execute(
            'SELECT id FROM ivr_details WHERE name = ?',
            ['Nebuchadnezzar']
        );

        if (ivrResult.length > 0) {
            const ivrId = ivrResult[0].id;

            // Update inbound route to use proper IVR destination format
            await connection.execute(
                `UPDATE incoming SET 
          destination = 'ivr-${ivrId},s,1'
        WHERE description LIKE '%Nebuchadnezzar%'`,
                []
            );

            console.log(`  ✅ Inbound route destination set to ivr-${ivrId},s,1`);
        } else {
            console.log('  ⚠️  IVR not found, skipping inbound route fix');
        }

        await connection.end();

        console.log('\n🔄 Reloading FreePBX...');
        execSync('fwconsole reload 2>&1 | grep -v "skip_joinannounce" || true', { stdio: 'inherit' });

        console.log('\n✅ Bad destinations fixed!');
        console.log('\nVerify in FreePBX GUI:');
        console.log('  • Admin → System Status → should show 0 bad destinations');

    } catch (error) {
        console.error('❌ Error fixing destinations:', error.message);
        process.exit(1);
    }
}

fixBadDestinations();
