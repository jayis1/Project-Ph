#!/usr/bin/env node

/**
 * FreePBX Conference Room Provisioner
 * Creates department-based conference rooms for Nebuchadnezzar crew
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

const CONFERENCES = [
    {
        exten: '8010',
        description: 'Command - Morpheus & Neo',
        userpin: '',
        adminpin: '',
        options: 'M(conf-announce)',
        users: 3,
        leader_wait: 'yes'
    },
    {
        exten: '8020',
        description: 'Operations - Tank & Dozer',
        userpin: '',
        adminpin: '',
        options: 'M(conf-announce)',
        users: 3,
        leader_wait: 'yes'
    },
    {
        exten: '8030',
        description: 'Tech Team - Apoc, Switch & Mouse',
        userpin: '',
        adminpin: '',
        options: 'M(conf-announce)',
        users: 3,
        leader_wait: 'yes'
    },
    {
        exten: '8040',
        description: 'Security - Cypher & Guests',
        userpin: '',
        adminpin: '',
        options: 'M(conf-announce)',
        users: 3,
        leader_wait: 'yes'
    }
];

async function provisionConferences() {
    let connection;

    try {
        console.log('🎙️  Provisioning Nebuchadnezzar Conference Rooms...\n');

        connection = await mysql.createConnection(DB_CONFIG);

        for (const conf of CONFERENCES) {
            console.log(`Creating conference room ${conf.exten}: ${conf.description}`);

            // Check if conference already exists
            const [existing] = await connection.execute(
                'SELECT exten FROM conferences WHERE exten = ?',
                [conf.exten]
            );

            if (existing.length > 0) {
                console.log(`  ⚠️  Conference ${conf.exten} already exists, updating...`);
                await connection.execute(
                    `UPDATE conferences SET 
            description = ?,
            userpin = ?,
            adminpin = ?,
            options = ?,
            users = ?,
            leader_wait = ?
          WHERE exten = ?`,
                    [
                        conf.description,
                        conf.userpin,
                        conf.adminpin,
                        conf.options,
                        conf.users,
                        conf.leader_wait,
                        conf.exten
                    ]
                );
            } else {
                await connection.execute(
                    `INSERT INTO conferences (exten, description, userpin, adminpin, options, users, leader_wait)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        conf.exten,
                        conf.description,
                        conf.userpin,
                        conf.adminpin,
                        conf.options,
                        conf.users,
                        conf.leader_wait
                    ]
                );
            }

            console.log(`  ✅ Conference ${conf.exten} configured`);
        }

        await connection.end();

        console.log('\n📞 Conference Rooms Summary:');
        console.log('  8010 - Command (Morpheus & Neo)');
        console.log('  8020 - Operations (Tank & Dozer)');
        console.log('  8030 - Tech Team (Apoc, Switch & Mouse)');
        console.log('  8040 - Security (Cypher & Guests)');

        console.log('\n🔄 Reloading FreePBX...');
        execSync('fwconsole reload 2>&1 | grep -v "skip_joinannounce" || true', { stdio: 'inherit' });

        console.log('\n✅ Conference room provisioning complete!');
        console.log('\nCrew members can dial these extensions to join department conferences.');

    } catch (error) {
        console.error('❌ Error provisioning conferences:', error.message);
        process.exit(1);
    }
}

provisionConferences();
