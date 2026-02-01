#!/usr/bin/env node

/**
 * AI Collaboration Conference Rooms
 * Creates conference rooms with 2 AI agents per room for collaborative scam-baiting
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

// Conference rooms with 2 AI agents each
const CONFERENCE_ROOMS = [
    {
        exten: '8001',
        description: 'Command War Room - Morpheus & Trinity',
        agents: ['9000', '9001'],
        userpin: '',
        adminpin: '1234',
        options: 'cq'  // c=announce count, q=quiet mode
    },
    {
        exten: '8002',
        description: 'The One & Tank - Neo & Tank',
        agents: ['9002', '9003'],
        userpin: '',
        adminpin: '1234',
        options: 'cq'
    },
    {
        exten: '8003',
        description: 'Operations Center - Dozer & Apoc',
        agents: ['9004', '9005'],
        userpin: '',
        adminpin: '1234',
        options: 'cq'
    },
    {
        exten: '8004',
        description: 'Tech Lab - Switch & Mouse',
        agents: ['9006', '9007'],
        userpin: '',
        adminpin: '1234',
        options: 'cq'
    },
    {
        exten: '8005',
        description: 'Wildcard Room - Cypher Solo',
        agents: ['9008'],
        userpin: '',
        adminpin: '1234',
        options: 'cq'
    }
];

async function provisionConferenceRooms() {
    let connection;

    try {
        console.log('🎙️  Provisioning AI Collaboration Conference Rooms...\n');

        connection = await mysql.createConnection(DB_CONFIG);

        for (const room of CONFERENCE_ROOMS) {
            // Check if conference exists
            const [existing] = await connection.execute(
                'SELECT exten FROM meetme WHERE exten = ?',
                [room.exten]
            );

            if (existing.length > 0) {
                console.log(`  ⚠️  Conference ${room.exten} exists, updating...`);
                await connection.execute(
                    `UPDATE meetme SET 
                        description = ?,
                        userpin = ?,
                        adminpin = ?,
                        options = ?
                    WHERE exten = ?`,
                    [room.description, room.userpin, room.adminpin, room.options, room.exten]
                );
            } else {
                await connection.execute(
                    `INSERT INTO meetme (exten, description, userpin, adminpin, options, users)
                    VALUES (?, ?, ?, ?, ?, 0)`,
                    [room.exten, room.description, room.userpin, room.adminpin, room.options]
                );
            }

            console.log(`  ✅ ${room.exten}: ${room.description}`);
            console.log(`     Agents: ${room.agents.join(' & ')}`);
        }

        await connection.end();

        console.log('\n🔄 Reloading FreePBX...');
        execSync('fwconsole reload 2>&1 | grep -v "skip_joinannounce" || true', { stdio: 'inherit' });

        console.log('\n✅ Conference Rooms Ready!\n');
        console.log('📞 How to use:');
        console.log('  1. Dial conference extension (8001-8005)');
        console.log('  2. Both AI agents can join and collaborate');
        console.log('  3. Scammer hears both AI personalities working together\n');

        console.log('🎯 Conference Room Directory:');
        CONFERENCE_ROOMS.forEach(room => {
            console.log(`  ${room.exten} - ${room.description}`);
        });

        console.log('\n💡 Integration Ideas:');
        console.log('  • Route scammers to conference rooms instead of individual extensions');
        console.log('  • Have 2 AIs "discuss" the scammer\'s offer together');
        console.log('  • Create confusion by having AIs disagree with each other');
        console.log('  • Maximum entertainment and time wasting!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

provisionConferenceRooms();
