#!/usr/bin/env node

/**
 * Multi-Level IVR System
 * Creates nested IVR menus for departments, conferences, and individual agents
 */

const mysql = require('mysql2/promise');
const { execSync } = require('child_process');

require('dotenv').config({ path: require('path').join(require('os').homedir(), '.gemini-phone', '.env') });

const DB_CONFIG = {
    host: 'localhost',
    user: 'freepbxuser',
    password: process.env.FREEPBX_DB_PASSWORD || 'mTbnCp0W7kqo',
    database: 'asterisk'
};

// IVR Structure
const IVRS = [
    {
        id: 1,
        name: 'MainMenu',
        description: 'Main Menu - Nebuchadnezzar',
        announcement: 1,  // Existing announcement
        entries: [
            { digit: '0', dest: 'ext-queues,8001,1', description: 'All Crew Queue' },
            { digit: '1', dest: 'ivr-2,s,1', description: 'Departments Menu' },
            { digit: '2', dest: 'ivr-3,s,1', description: 'Conference Rooms Menu' },
            { digit: '3', dest: 'ivr-4,s,1', description: 'Individual Agents Menu' },
            { digit: '9', dest: 'ext-group,1,1', description: 'Scammer Maze' }
        ]
    },
    {
        id: 2,
        name: 'DepartmentsMenu',
        description: 'Departments - Command, Ops, Tech',
        announcement: 0,  // Will need to create
        entries: [
            { digit: '1', dest: 'ext-group,1,1', description: 'Command Dept (Morpheus → Neo)' },
            { digit: '2', dest: 'ext-group,2,1', description: 'Operations Dept (Tank → Dozer)' },
            { digit: '3', dest: 'ext-group,3,1', description: 'Tech Team (Apoc → Switch → Mouse)' },
            { digit: '0', dest: 'ivr-1,s,1', description: 'Back to Main Menu' }
        ]
    },
    {
        id: 3,
        name: 'ConferencesMenu',
        description: 'Conference Rooms - AI Collaboration',
        announcement: 0,  // Will need to create
        entries: [
            { digit: '1', dest: 'ext-meetme,8101,1', description: 'Command War Room (Morpheus & Trinity)' },
            { digit: '2', dest: 'ext-meetme,8102,1', description: 'The One & Tank (Neo & Tank)' },
            { digit: '3', dest: 'ext-meetme,8103,1', description: 'Operations Center (Dozer & Apoc)' },
            { digit: '4', dest: 'ext-meetme,8104,1', description: 'Tech Lab (Switch & Mouse)' },
            { digit: '5', dest: 'ext-meetme,8105,1', description: 'Wildcard Room (Cypher)' },
            { digit: '0', dest: 'ivr-1,s,1', description: 'Back to Main Menu' }
        ]
    },
    {
        id: 4,
        name: 'IndividualAgentsMenu',
        description: 'Individual Agents - Direct Access',
        announcement: 0,  // Will need to create
        entries: [
            { digit: '1', dest: 'from-did-direct,9000,1', description: 'Morpheus' },
            { digit: '2', dest: 'from-did-direct,9001,1', description: 'Trinity' },
            { digit: '3', dest: 'from-did-direct,9002,1', description: 'Neo' },
            { digit: '4', dest: 'from-did-direct,9003,1', description: 'Tank' },
            { digit: '5', dest: 'from-did-direct,9004,1', description: 'Dozer' },
            { digit: '6', dest: 'from-did-direct,9005,1', description: 'Apoc' },
            { digit: '7', dest: 'from-did-direct,9006,1', description: 'Switch' },
            { digit: '8', dest: 'from-did-direct,9007,1', description: 'Mouse' },
            { digit: '9', dest: 'from-did-direct,9008,1', description: 'Cypher' },
            { digit: '0', dest: 'ivr-1,s,1', description: 'Back to Main Menu' }
        ]
    }
];

async function provisionMultiLevelIVR() {
    let connection;

    try {
        console.log('🎯 Provisioning Multi-Level IVR System...\n');

        connection = await mysql.createConnection(DB_CONFIG);

        for (const ivr of IVRS) {
            console.log(`📞 IVR ${ivr.id}: ${ivr.name}`);

            // Check if IVR exists
            const [existing] = await connection.execute(
                'SELECT id FROM ivr_details WHERE id = ?',
                [ivr.id]
            );

            if (existing.length > 0) {
                console.log(`  ⚠️  IVR ${ivr.id} exists, updating...`);
                await connection.execute(
                    `UPDATE ivr_details SET 
                        name = ?,
                        description = ?,
                        announcement = ?
                    WHERE id = ?`,
                    [ivr.name, ivr.description, ivr.announcement, ivr.id]
                );
            } else {
                await connection.execute(
                    `INSERT INTO ivr_details (id, name, description, announcement, directdial, invalid_loops, invalid_retry_recording, invalid_destination, timeout_enabled, invalid_recording, retvm, timeout_time, timeout_recording, timeout_retry_recording, timeout_destination, timeout_loops, timeout_append_announce, invalid_append_announce, timeout_ivr_ret, invalid_ivr_ret, alertinfo, rvolume, strict_dial_timeout, accept_pound_key)
                    VALUES (?, ?, ?, ?, 'Disabled', 3, '', 'app-blackhole,hangup,1', NULL, 2, 'on', 10, '', 3, 'app-blackhole,hangup,1', 3, 1, 1, 0, 0, '', 0, 20, '')`,
                    [ivr.id, ivr.name, ivr.description, ivr.announcement]
                );
            }

            // Delete existing entries
            await connection.execute('DELETE FROM ivr_entries WHERE ivr_id = ?', [ivr.id]);

            // Insert new entries
            for (const entry of ivr.entries) {
                await connection.execute(
                    `INSERT INTO ivr_entries (ivr_id, selection, dest, ivr_ret)
                    VALUES (?, ?, ?, 0)`,
                    [ivr.id, entry.digit, entry.dest]
                );
                console.log(`  ✅ Digit ${entry.digit} → ${entry.description}`);
            }

            console.log('');
        }

        await connection.end();

        console.log('🔄 Reloading FreePBX...');
        execSync('fwconsole reload 2>&1 | grep -v "skip_joinannounce" || true', { stdio: 'inherit' });

        console.log('\n✅ Multi-Level IVR System Configured!\n');
        console.log('📞 IVR Structure:');
        console.log('');
        console.log('Main Menu (IVR 1):');
        console.log('  0 = All Crew Queue');
        console.log('  1 = Departments Menu →');
        console.log('  2 = Conference Rooms Menu →');
        console.log('  3 = Individual Agents Menu →');
        console.log('  9 = Scammer Maze (135+ sec time waste!)');
        console.log('');
        console.log('Departments Menu (IVR 2):');
        console.log('  1 = Command (Morpheus → Neo)');
        console.log('  2 = Operations (Tank → Dozer)');
        console.log('  3 = Tech Team (Apoc → Switch → Mouse)');
        console.log('  0 = Back to Main Menu');
        console.log('');
        console.log('Conference Rooms Menu (IVR 3):');
        console.log('  1 = Command War Room (Morpheus & Trinity)');
        console.log('  2 = The One & Tank (Neo & Tank)');
        console.log('  3 = Operations Center (Dozer & Apoc)');
        console.log('  4 = Tech Lab (Switch & Mouse)');
        console.log('  5 = Wildcard Room (Cypher)');
        console.log('  0 = Back to Main Menu');
        console.log('');
        console.log('Individual Agents Menu (IVR 4):');
        console.log('  1-9 = Direct to each crew member');
        console.log('  0 = Back to Main Menu');
        console.log('');
        console.log('📝 Next: Create audio announcements for IVRs 2, 3, 4');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

provisionMultiLevelIVR();
