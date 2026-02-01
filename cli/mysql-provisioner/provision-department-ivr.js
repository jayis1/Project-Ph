#!/usr/bin/env node

/**
 * Department-Based IVR Provisioner
 * Creates ring groups for departments and updates IVR to route by department
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

const DEPARTMENTS = [
    {
        id: 1,
        name: 'Command',
        description: 'Command - Morpheus & Neo (Sequential)',
        extensions: '9000-9002',  // Morpheus first, then Neo
        strategy: 'hunt',  // Sequential calling
        digit: '1'
    },
    {
        id: 2,
        name: 'Operations',
        description: 'Operations - Tank & Dozer (Sequential)',
        extensions: '9003-9004',  // Tank first, then Dozer
        strategy: 'hunt',
        digit: '2'
    },
    {
        id: 3,
        name: 'Tech Team',
        description: 'Tech Team - Apoc & Switch & Mouse (Sequential)',
        extensions: '9005-9006-9007',  // Apoc, then Switch, then Mouse
        strategy: 'hunt',
        digit: '3'
    }
];

const DIRECT_EXTENSIONS = [
    { extension: '9001', name: 'Trinity', digit: '4' },
    { extension: '9008', name: 'Cypher', digit: '5' }
];

async function provisionDepartmentIVR() {
    let connection;

    try {
        console.log('🏢 Provisioning Department-Based IVR...\n');

        connection = await mysql.createConnection(DB_CONFIG);

        // Step 1: Create Ring Groups for each department
        console.log('📞 Creating Ring Groups...');
        for (const dept of DEPARTMENTS) {
            // Check if ring group exists
            const [existing] = await connection.execute(
                'SELECT grpnum FROM ringgroups WHERE grpnum = ?',
                [dept.id]
            );

            if (existing.length > 0) {
                console.log(`  ⚠️  Ring Group ${dept.id} (${dept.name}) already exists, updating...`);
                await connection.execute(
                    `UPDATE ringgroups SET 
                        description = ?,
                        grplist = ?,
                        strategy = ?
                    WHERE grpnum = ?`,
                    [dept.description, dept.extensions, dept.strategy, dept.id]
                );
            } else {
                await connection.execute(
                    `INSERT INTO ringgroups (grpnum, description, grplist, strategy, grptime, grppre, annmsg_id, postdest, alertinfo, remotealert_id, needsconf, toolate_id, ringing, cwignore, cfignore, cpickup, recording, changecid, fixedcid)
                    VALUES (?, ?, ?, ?, 20, '', 0, '', '', 0, '', 0, 'Ring', '', '', '', '', '', '')`,
                    [dept.id, dept.description, dept.extensions, dept.strategy]
                );
            }
            console.log(`  ✅ ${dept.name}: ${dept.extensions}`);
        }

        // Step 2: Update IVR entries to route to departments
        console.log('\n🎯 Updating IVR to route by department...');
        for (const dept of DEPARTMENTS) {
            await connection.execute(
                `UPDATE ivr_entries SET dest = ? WHERE ivr_id = 1 AND selection = ?`,
                [`ext-group,${dept.id},1`, dept.digit]
            );
            console.log(`  ✅ Digit ${dept.digit} → ${dept.name}`);
        }

        // Keep digit 0 for all crew (queue)
        console.log('  ✅ Digit 0 → All Crew (Queue 8001)');

        // Step 3: Add direct extensions (Trinity & Cypher)
        console.log('\n👤 Adding direct extensions...');
        for (const ext of DIRECT_EXTENSIONS) {
            await connection.execute(
                `UPDATE ivr_entries SET dest = ? WHERE ivr_id = 1 AND selection = ?`,
                [`from-did-direct,${ext.extension},1`, ext.digit]
            );
            console.log(`  ✅ Digit ${ext.digit} → ${ext.name} (${ext.extension})`);
        }

        // Remove unused digits (6-9)
        await connection.execute(
            `DELETE FROM ivr_entries WHERE ivr_id = 1 AND selection IN ('6','7','8','9')`
        );
        console.log('  ✅ Removed unused digits 6-9');

        await connection.end();

        console.log('\n🔄 Reloading FreePBX...');
        execSync('fwconsole reload 2>&1 | grep -v "skip_joinannounce" || true', { stdio: 'inherit' });

        console.log('\n✅ Department-Based IVR Configured!\n');
        console.log('📞 IVR Menu (Sequential Calling):');
        console.log('  Press 0 → All Crew (Queue 8001 - everyone rings)');
        console.log('  Press 1 → Command Dept (Morpheus → Neo)');
        console.log('  Press 2 → Operations Dept (Tank → Dozer)');
        console.log('  Press 3 → Tech Team Dept (Apoc → Switch → Mouse)');
        console.log('  Press 4 → Trinity (direct)');
        console.log('  Press 5 → Cypher (direct)');
        console.log('\n📝 Next: Update IVR audio greeting to match new menu');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

provisionDepartmentIVR();
