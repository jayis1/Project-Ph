#!/usr/bin/env node

/**
 * Scammer Maze - Maximum Time Wasting Configuration
 * Creates a long chain where calls cascade through ALL crew members
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

// The Scammer Maze: One long chain through everyone!
const MAZE_CHAIN = '9000-9001-9002-9003-9004-9005-9006-9007-9008';

async function provisionScammerMaze() {
    let connection;

    try {
        console.log('😈 Provisioning SCAMMER MAZE - Maximum Time Wasting!\n');

        connection = await mysql.createConnection(DB_CONFIG);

        // Create ONE massive ring group with all crew members in sequence
        console.log('🎯 Creating the maze chain...');
        console.log(`   ${MAZE_CHAIN.replace(/-/g, ' → ')}\n`);

        const [existing] = await connection.execute(
            'SELECT grpnum FROM ringgroups WHERE grpnum = 1'
        );

        if (existing.length > 0) {
            await connection.execute(
                `UPDATE ringgroups SET 
                    description = 'Scammer Maze - All Crew Chain',
                    grplist = ?,
                    strategy = 'hunt',
                    grptime = 15
                WHERE grpnum = 1`,
                [MAZE_CHAIN]
            );
            console.log('✅ Updated Scammer Maze ring group');
        } else {
            await connection.execute(
                `INSERT INTO ringgroups (grpnum, description, grplist, strategy, grptime)
                VALUES (1, 'Scammer Maze - All Crew Chain', ?, 'hunt', 15)`,
                [MAZE_CHAIN]
            );
            console.log('✅ Created Scammer Maze ring group');
        }

        // Update IVR to route ALL digits (1-5) to the maze
        console.log('\n🎲 Updating IVR - All paths lead to the maze...');

        for (let digit = 1; digit <= 5; digit++) {
            await connection.execute(
                `UPDATE ivr_entries SET dest = 'ext-group,1,1' WHERE ivr_id = 1 AND selection = ?`,
                [digit.toString()]
            );
            console.log(`  ✅ Digit ${digit} → Scammer Maze`);
        }

        // Keep digit 0 for queue (all ring simultaneously)
        console.log('  ✅ Digit 0 → All Crew Queue (simultaneous)');

        // Remove unused digits
        await connection.execute(
            `DELETE FROM ivr_entries WHERE ivr_id = 1 AND selection IN ('6','7','8','9')`
        );

        await connection.end();

        console.log('\n🔄 Reloading FreePBX...');
        execSync('fwconsole reload 2>&1 | grep -v "skip_joinannounce" || true', { stdio: 'inherit' });

        console.log('\n😈 SCAMMER MAZE ACTIVATED!\n');
        console.log('📞 How it works:');
        console.log('  • Scammer presses ANY digit (1-5)');
        console.log('  • Call goes to Morpheus (rings 15 sec)');
        console.log('  • No answer? → Trinity (rings 15 sec)');
        console.log('  • No answer? → Neo (rings 15 sec)');
        console.log('  • No answer? → Tank (rings 15 sec)');
        console.log('  • No answer? → Dozer (rings 15 sec)');
        console.log('  • No answer? → Apoc (rings 15 sec)');
        console.log('  • No answer? → Switch (rings 15 sec)');
        console.log('  • No answer? → Mouse (rings 15 sec)');
        console.log('  • No answer? → Cypher (rings 15 sec)');
        console.log('  • Total potential time: 135 seconds (2+ minutes!)');
        console.log('\n  Press 0 → All crew rings at once (for when you want quick pickup)\n');
        console.log('💀 Scammers will be trapped in the maze!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

provisionScammerMaze();
