#!/usr/bin/env node

/**
 * Quick Fix: Route Inbound Calls Directly to Queue 8001
 * Bypasses IVR until audio files are created
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

async function fixInboundRoute() {
    let connection;

    try {
        console.log('🔧 Quick Fix: Routing calls directly to Queue 8001...\n');

        connection = await mysql.createConnection(DB_CONFIG);

        // Update inbound route to go directly to queue instead of IVR
        await connection.execute(
            `UPDATE incoming SET 
                destination = 'ext-queues,8001,1'
            WHERE description LIKE '%Nebuchadnezzar%'`
        );

        console.log('✅ Inbound route updated to go directly to Queue 8001');
        console.log('   (Bypassing IVR until audio files are created)\n');

        await connection.end();

        console.log('🔄 Reloading FreePBX...');
        execSync('fwconsole reload 2>&1 | grep -v "skip_joinannounce" || true', { stdio: 'inherit' });

        console.log('\n✅ Quick fix applied!');
        console.log('\nNow when scammers call:');
        console.log('  • They go directly to Queue 8001');
        console.log('  • All 9 crew members ring');
        console.log('  • No more hangups!\n');
        console.log('📝 Next step: Create IVR audio files in FreePBX');
        console.log('   (Admin → System Recordings → Use "Brian" voice)');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fixInboundRoute();
