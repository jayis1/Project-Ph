#!/usr/bin/env node

/**
 * FreePBX Misc Features Provisioner
 * Creates misc destinations, feature codes, and missed call notifications
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

// Misc Destinations - shortcuts to common destinations
const MISC_DESTINATIONS = [
    {
        description: 'IVR - Nebuchadnezzar',
        destdial: 'ivr,1,1'
    },
    {
        description: 'Queue - All Crew',
        destdial: 'ext-queues,8001,1'
    },
    {
        description: 'Conference - Command',
        destdial: 'ext-meetme,8010,1'
    },
    {
        description: 'Conference - Operations',
        destdial: 'ext-meetme,8020,1'
    },
    {
        description: 'Conference - Tech Team',
        destdial: 'ext-meetme,8030,1'
    },
    {
        description: 'Conference - Security',
        destdial: 'ext-meetme,8040,1'
    }
];

// Feature Codes - quick dial shortcuts
const FEATURE_CODES = [
    {
        modulename: 'customappsreg',
        featurename: 'nebuchadnezzar-ivr',
        description: 'Nebuchadnezzar IVR',
        defaultcode: '*1',
        customcode: null,
        enabled: 1
    },
    {
        modulename: 'customappsreg',
        featurename: 'crew-queue',
        description: 'All Crew Queue',
        defaultcode: '*8001',
        customcode: null,
        enabled: 1
    },
    {
        modulename: 'customappsreg',
        featurename: 'conf-command',
        description: 'Command Conference',
        defaultcode: '*8010',
        customcode: null,
        enabled: 1
    },
    {
        modulename: 'customappsreg',
        featurename: 'conf-operations',
        description: 'Operations Conference',
        defaultcode: '*8020',
        customcode: null,
        enabled: 1
    },
    {
        modulename: 'customappsreg',
        featurename: 'conf-tech',
        description: 'Tech Team Conference',
        defaultcode: '*8030',
        customcode: null,
        enabled: 1
    },
    {
        modulename: 'customappsreg',
        featurename: 'conf-security',
        description: 'Security Conference',
        defaultcode: '*8040',
        customcode: null,
        enabled: 1
    }
];

async function provisionMiscFeatures() {
    let connection;

    try {
        console.log('🔧 Provisioning Misc Features for Nebuchadnezzar...\n');

        connection = await mysql.createConnection(DB_CONFIG);

        // ============================================
        // STEP 1: Misc Destinations
        // ============================================
        console.log('📍 Creating Misc Destinations...');

        for (const dest of MISC_DESTINATIONS) {
            const [existing] = await connection.execute(
                'SELECT description FROM miscdests WHERE description = ?',
                [dest.description]
            );

            if (existing.length > 0) {
                console.log(`  ⚠️  Destination "${dest.description}" already exists, updating...`);
                await connection.execute(
                    'UPDATE miscdests SET destdial = ? WHERE description = ?',
                    [dest.destdial, dest.description]
                );
            } else {
                await connection.execute(
                    'INSERT INTO miscdests (description, destdial) VALUES (?, ?)',
                    [dest.description, dest.destdial]
                );
            }
            console.log(`  ✅ ${dest.description}`);
        }

        // ============================================
        // STEP 2: Feature Codes
        // ============================================
        console.log('\n🎹 Creating Feature Codes...');

        for (const fc of FEATURE_CODES) {
            const [existing] = await connection.execute(
                'SELECT featurename FROM featurecodes WHERE featurename = ?',
                [fc.featurename]
            );

            if (existing.length > 0) {
                console.log(`  ⚠️  Feature code "${fc.description}" already exists, updating...`);
                await connection.execute(
                    `UPDATE featurecodes SET 
            modulename = ?,
            description = ?,
            defaultcode = ?,
            customcode = ?,
            enabled = ?
          WHERE featurename = ?`,
                    [fc.modulename, fc.description, fc.defaultcode, fc.customcode, fc.enabled, fc.featurename]
                );
            } else {
                await connection.execute(
                    `INSERT INTO featurecodes (modulename, featurename, description, defaultcode, customcode, enabled)
          VALUES (?, ?, ?, ?, ?, ?)`,
                    [fc.modulename, fc.featurename, fc.description, fc.defaultcode, fc.customcode, fc.enabled]
                );
            }
            console.log(`  ✅ ${fc.defaultcode} - ${fc.description}`);
        }

        // ============================================
        // STEP 3: Missed Call Notifications
        // ============================================
        console.log('\n📧 Configuring Missed Call Notifications...');

        // Check if missed call notification module exists
        const [mcnExists] = await connection.execute(
            "SELECT * FROM information_schema.tables WHERE table_schema = 'asterisk' AND table_name = 'missedcallnotify'"
        );

        if (mcnExists.length > 0) {
            // Enable missed call notifications for queue
            const [queueNotify] = await connection.execute(
                'SELECT * FROM missedcallnotify WHERE dest_type = ? AND dest_id = ?',
                ['queue', '8001']
            );

            if (queueNotify.length === 0) {
                await connection.execute(
                    `INSERT INTO missedcallnotify (dest_type, dest_id, enabled, email_list)
          VALUES (?, ?, ?, ?)`,
                    ['queue', '8001', 1, '']
                );
                console.log('  ✅ Enabled for Queue 8001 (configure email in FreePBX GUI)');
            } else {
                console.log('  ℹ️  Already configured for Queue 8001');
            }
        } else {
            console.log('  ⚠️  Missed Call Notification module not installed');
            console.log('  ℹ️  Install via: Admin → Module Admin → "Missed Call Notification"');
        }

        await connection.end();

        console.log('\n📋 Summary:');
        console.log('\n📍 Misc Destinations Created:');
        console.log('  • IVR - Nebuchadnezzar');
        console.log('  • Queue - All Crew');
        console.log('  • Conference - Command/Operations/Tech/Security');

        console.log('\n🎹 Feature Codes Created:');
        console.log('  • *1 - Nebuchadnezzar IVR');
        console.log('  • *8001 - All Crew Queue');
        console.log('  • *8010 - Command Conference');
        console.log('  • *8020 - Operations Conference');
        console.log('  • *8030 - Tech Team Conference');
        console.log('  • *8040 - Security Conference');

        console.log('\n📧 Missed Call Notifications:');
        console.log('  • Configure email addresses in FreePBX GUI');
        console.log('  • Admin → Missed Call Notification');

        console.log('\n🔄 Reloading FreePBX...');
        execSync('fwconsole reload 2>&1 | grep -v "skip_joinannounce" || true', { stdio: 'inherit' });

        console.log('\n✅ Misc features provisioning complete!');

    } catch (error) {
        console.error('❌ Error provisioning misc features:', error.message);
        process.exit(1);
    }
}

provisionMiscFeatures();
