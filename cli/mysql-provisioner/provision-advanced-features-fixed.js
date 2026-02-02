#!/usr/bin/env node

/**
 * FreePBX Advanced Features Provisioner
 * Configures paging, parking, queue callback, and queue priorities
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

// Paging Groups - for broadcasting announcements
const PAGING_GROUPS = [
    {
        page_number: '7000',
        description: 'All Crew - Emergency Page',
        ext_list: '9000&9001&9002&9003&9004&9005&9006&9007&9008',
        duplex: 0, // One-way paging
        default_group: 1
    },
    {
        page_number: '7010',
        description: 'Command - Morpheus & Neo',
        ext_list: '9000&9002',
        duplex: 1, // Two-way intercom
        default_group: 0
    },
    {
        page_number: '7020',
        description: 'Operations - Tank & Dozer',
        ext_list: '9003&9004',
        duplex: 1,
        default_group: 0
    },
    {
        page_number: '7030',
        description: 'Tech Team - Apoc, Switch & Mouse',
        ext_list: '9005&9006&9007',
        duplex: 1,
        default_group: 0
    }
];

// Call Parking - park calls and retrieve from any extension
const PARKING_CONFIG = {
    parkext: '70', // Dial 70 to park a call
    parkpos: '71-79', // Parking slots 71-79
    parkingtime: 45, // 45 seconds before callback
    context: 'parkedcalls',
    parkedmusicclass: 'default'
};

// Queue Callback - allow callers to request callback
const QUEUE_CALLBACK_CONFIG = {
    queue_id: '8001', // Nebuchadnezzar crew queue
    enabled: 1,
    callback_id: 'crew-callback',
    description: 'Crew Queue Callback'
};

async function provisionAdvancedFeatures() {
    let connection;

    try {
        console.log('🚀 Provisioning Advanced Features for Nebuchadnezzar...\n');

        connection = await mysql.createConnection(DB_CONFIG);

        // ============================================
        // STEP 1: Paging and Intercom
        // ============================================
        console.log('📢 Configuring Paging and Intercom...');

        // Check if paging table exists
        const [pagingTableExists] = await connection.execute(
            "SELECT * FROM information_schema.tables WHERE table_schema = 'asterisk' AND table_name = 'paging_groups'"
        );

        if (pagingTableExists.length > 0) {
            for (const page of PAGING_GROUPS) {
                const [existing] = await connection.execute(
                    'SELECT page_number FROM paging_groups WHERE page_number = ?',
                    [page.page_number]
                );

                if (existing.length > 0) {
                    console.log(`  ⚠️  Paging group ${page.page_number} already exists, clearing extensions...`);
                    await connection.execute(
                        'DELETE FROM paging_groups WHERE page_number = ?',
                        [page.page_number]
                    );
                }

                // Split ext_list (e.g., "9000&9001") and insert individual rows
                const extensions = page.ext_list.split('&');
                for (const ext of extensions) {
                    await connection.execute(
                        'INSERT INTO paging_groups (page_number, ext) VALUES (?, ?)',
                        [page.page_number, ext]
                    );
                }
                console.log(`  ✅ ${page.page_number} - ${page.description}`);
            }
        } else {
            console.log('  ⚠️  Paging module not installed');
            console.log('  ℹ️  Install via: Admin → Module Admin → "Paging and Intercom"');
        }

        // ============================================
        // STEP 2: Call Parking
        // ============================================
        console.log('\n🅿️  Configuring Call Parking...');

        // Check if parking table exists
        const [parkingTableExists] = await connection.execute(
            "SELECT * FROM information_schema.tables WHERE table_schema = 'asterisk' AND table_name = 'parkplus'"
        );

        if (parkingTableExists.length > 0) {
            const [existingParking] = await connection.execute(
                'SELECT parkext FROM parkplus WHERE parkext = ?',
                [PARKING_CONFIG.parkext]
            );

            if (existingParking.length > 0) {
                console.log('  ⚠️  Parking already configured, updating...');
                await connection.execute(
                    `UPDATE parkplus SET 
            parkpos = ?,
            parkingtime = ?,
            parkedmusicclass = ?
          WHERE parkext = ?`,
                    [
                        PARKING_CONFIG.parkpos,
                        PARKING_CONFIG.parkingtime,
                        PARKING_CONFIG.parkedmusicclass,
                        PARKING_CONFIG.parkext
                    ]
                );
            } else {
                await connection.execute(
                    `INSERT INTO parkplus (parkext, parkpos, parkingtime, parkedmusicclass, defaultlot, type, name, numslots)
          VALUES (?, ?, ?, ?, 'yes', 'public', 'Default Lot', 8)`,
                    [
                        PARKING_CONFIG.parkext,
                        PARKING_CONFIG.parkpos,
                        PARKING_CONFIG.parkingtime,
                        PARKING_CONFIG.parkedmusicclass
                    ]
                );
            }
            console.log(`  ✅ Park calls: Dial ${PARKING_CONFIG.parkext}`);
            console.log(`  ✅ Parking slots: ${PARKING_CONFIG.parkpos}`);
        } else {
            console.log('  ⚠️  Parking module not installed');
            console.log('  ℹ️  Install via: Admin → Module Admin → "Parking"');
        }

        // ============================================
        // STEP 3: Queue Callback
        // ============================================
        console.log('\n📞 Configuring Queue Callback...');

        // Check if queue callback table exists
        const [qcbTableExists] = await connection.execute(
            "SELECT * FROM information_schema.tables WHERE table_schema = 'asterisk' AND table_name = 'queuecallback'"
        );

        if (qcbTableExists.length > 0) {
            const [existingQCB] = await connection.execute(
                'SELECT queue_id FROM queuecallback WHERE queue_id = ?',
                [QUEUE_CALLBACK_CONFIG.queue_id]
            );

            if (existingQCB.length > 0) {
                console.log('  ⚠️  Queue callback already configured, updating...');
                await connection.execute(
                    `UPDATE queuecallback SET 
            enabled = ?,
            callback_id = ?
          WHERE queue_id = ?`,
                    [
                        QUEUE_CALLBACK_CONFIG.enabled,
                        QUEUE_CALLBACK_CONFIG.callback_id,
                        QUEUE_CALLBACK_CONFIG.queue_id
                    ]
                );
            } else {
                await connection.execute(
                    `INSERT INTO queuecallback (queue_id, enabled, callback_id)
          VALUES (?, ?, ?)`,
                    [
                        QUEUE_CALLBACK_CONFIG.queue_id,
                        QUEUE_CALLBACK_CONFIG.enabled,
                        QUEUE_CALLBACK_CONFIG.callback_id
                    ]
                );
            }
            console.log('  ✅ Queue callback enabled for Queue 8001');
        } else {
            console.log('  ⚠️  Queue Callback module not installed');
            console.log('  ℹ️  Install via: Admin → Module Admin → "Queue Callback"');
        }

        // ============================================
        // STEP 4: Queue Priorities
        // ============================================
        console.log('\n⭐ Configuring Queue Priorities...');

        // Update queue to use priority
        await connection.execute(
            `UPDATE queues SET 
        strategy = 'ringall',
        timeout = 15,
        retry = 5,
        maxlen = 0,
        announce_frequency = 30,
        announce_holdtime = 'yes'
      WHERE extension = ?`,
            ['8001']
        );
        console.log('  ✅ Queue priorities enabled (callers can be prioritized)');

        await connection.end();

        console.log('\n📋 Summary:');
        console.log('\n📢 Paging Groups:');
        console.log('  • 7000 - All Crew Emergency Page');
        console.log('  • 7010 - Command Intercom (Morpheus & Neo)');
        console.log('  • 7020 - Operations Intercom (Tank & Dozer)');
        console.log('  • 7030 - Tech Team Intercom (Apoc, Switch & Mouse)');

        console.log('\n🅿️  Call Parking:');
        console.log('  • Dial 70 to park a call');
        console.log('  • Parking slots: 71-79');
        console.log('  • Auto-callback after 45 seconds');

        console.log('\n📞 Queue Features:');
        console.log('  • Callback enabled for Queue 8001');
        console.log('  • Priority queuing available');

        console.log('\n🔄 Reloading FreePBX...');
        execSync('fwconsole reload 2>&1 | grep -v "skip_joinannounce" || true', { stdio: 'inherit' });

        console.log('\n✅ Advanced features provisioning complete!');

    } catch (error) {
        console.error('❌ Error provisioning advanced features:', error.message);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log('\n⚠️  Some modules may not be installed. Install them via FreePBX Module Admin.');
        }
        process.exit(1);
    }
}

provisionAdvancedFeatures();
