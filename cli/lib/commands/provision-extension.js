import mysql from 'mysql2/promise';
import { readConfig } from '../config.js';
import chalk from 'chalk';

/**
 * Self-provision this bot's extension on FreePBX
 * Each bot creates its own PJSIP extension, voicemail, and device
 */
export async function provisionExtension() {
    console.log(chalk.blue('\n🤖 Self-Provisioning Extension on FreePBX...\n'));

    const config = readConfig();

    // Validate required config
    const required = ['SIP_EXTENSION', 'SIP_PASSWORD', 'FREEPBX_HOST', 'FREEPBX_DB_USER', 'FREEPBX_DB_PASS'];
    const missing = required.filter(key => !config[key]);

    if (missing.length > 0) {
        console.error(chalk.red(`❌ Missing required config: ${missing.join(', ')}`));
        console.log(chalk.yellow('\nRun: gemini-phone setup'));
        process.exit(1);
    }

    const extension = config.SIP_EXTENSION;
    const password = config.SIP_PASSWORD;
    const displayName = config.DEVICE_NAME || `AI Agent ${extension}`;
    const voicemailEmail = config.VOICEMAIL_EMAIL || '';

    // Connect to FreePBX database
    let connection;
    try {
        connection = await mysql.createConnection({
            host: config.FREEPBX_HOST,
            user: config.FREEPBX_DB_USER,
            password: config.FREEPBX_DB_PASS,
            database: 'asterisk'
        });

        console.log(chalk.green('✓ Connected to FreePBX database'));

        // Check if extension already exists
        const [existing] = await connection.execute(
            'SELECT extension FROM users WHERE extension = ?',
            [extension]
        );

        if (existing.length > 0) {
            console.log(chalk.yellow(`⚠️  Extension ${extension} already exists - updating...`));
            await updateExtension(connection, extension, password, displayName, voicemailEmail);
        } else {
            console.log(chalk.blue(`Creating new extension ${extension}...`));
            await createExtension(connection, extension, password, displayName, voicemailEmail);
        }

        console.log(chalk.green(`\n✅ Extension ${extension} (${displayName}) provisioned successfully!`));
        console.log(chalk.gray(`   Password: ${password}`));
        console.log(chalk.gray(`   Voicemail: ${voicemailEmail || 'none'}`));

    } catch (error) {
        console.error(chalk.red('\n❌ Provisioning failed:'), error.message);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

/**
 * Create new extension
 */
async function createExtension(connection, extension, password, displayName, email) {
    // 1. Create user entry
    await connection.execute(`
    INSERT INTO users (
      extension, password, name, voicemail, ringtimer, noanswer, recording, 
      outboundcid, sipname, noanswer_cid, busy_cid, chanunavail_cid, noanswer_dest, 
      busy_dest, chanunavail_dest, mohclass, id, linenumber, dialopts, 
      allow, avpf, icesupport, dtlsenable, dtlsverify, dtlssetup, 
      dtlsreuse, dtlscertfile, dtlsprivatekey, dtlscipher, encryption, 
      callgroup, pickupgroup, disallow, dial, accountcode, deny, permit, 
      secret, dtmfmode, canreinvite, context, host, type, port, 
      qualify, callwaiting, transfer, mailbox, setvar, callerid, 
      fullname, trunkname, usermode, maxcontacts, regexten, checksum
    ) VALUES (
      ?, ?, ?, 'default', 0, '', 'out=dontcare,in=dontcare', 
      '', ?, '', '', '', '', 
      '', '', 'default', ?, 1, 'tr', 
      '', 'no', 'no', 'no', '', 'actpass', 
      'no', '', '', '', 'no', 
      '', '', '', '', '', '', '', 
      ?, 'rfc2833', 'no', 'from-internal', 'dynamic', 'friend', '', 
      '', 'enabled', 'enabled', ?, '', ?, 
      ?, '', 'off', 1, 'no', ''
    )
  `, [
        extension,           // extension
        password,            // password
        displayName,         // name
        extension,           // sipname
        extension,           // id
        password,            // secret
        extension,           // mailbox
        `"${displayName}" <${extension}>`, // callerid
        displayName          // fullname
    ]);

    console.log(chalk.green(`  ✓ Created user entry`));

    // 2. Create PJSIP entries
    const pjsipSettings = [
        ['type', 'endpoint'],
        ['transport', '0.0.0.0-udp'],
        ['context', 'from-internal'],
        ['disallow', 'all'],
        ['allow', 'ulaw,alaw,gsm,g726,g722'],
        ['aors', extension],
        ['auth', `${extension}-auth`],
        ['outbound_auth', `${extension}-auth`],
        ['callerid', `${displayName} <${extension}>`],
        ['send_pai', 'yes'],
        ['send_rpid', 'yes'],
        ['direct_media', 'no'],
        ['trust_id_inbound', 'yes'],
        ['device_state_busy_at', '1'],
        ['dtmf_mode', 'rfc4733'],
        ['force_rport', 'yes'],
        ['rewrite_contact', 'yes'],
        ['rtp_symmetric', 'yes'],
        ['message_context', 'textmessage'],
        ['accountcode', extension]
    ];

    for (const [keyword, data] of pjsipSettings) {
        await connection.execute(
            'INSERT INTO pjsip (id, keyword, data, flags) VALUES (?, ?, ?, 0)',
            [extension, keyword, data]
        );
    }

    console.log(chalk.green(`  ✓ Created PJSIP endpoint`));

    // 3. Create AOR (Address of Record)
    await connection.execute(
        'INSERT INTO pjsip (id, keyword, data, flags) VALUES (?, ?, ?, 0)',
        [`${extension}`, 'type', 'aor', 0]
    );
    await connection.execute(
        'INSERT INTO pjsip (id, keyword, data, flags) VALUES (?, ?, ?, 0)',
        [`${extension}`, 'max_contacts', '1', 0]
    );
    await connection.execute(
        'INSERT INTO pjsip (id, keyword, data, flags) VALUES (?, ?, ?, 0)',
        [`${extension}`, 'qualify_frequency', '60', 0]
    );

    console.log(chalk.green(`  ✓ Created AOR`));

    // 4. Create Auth
    await connection.execute(
        'INSERT INTO pjsip (id, keyword, data, flags) VALUES (?, ?, ?, 0)',
        [`${extension}-auth`, 'type', 'auth', 0]
    );
    await connection.execute(
        'INSERT INTO pjsip (id, keyword, data, flags) VALUES (?, ?, ?, 0)',
        [`${extension}-auth`, 'auth_type', 'userpass', 0]
    );
    await connection.execute(
        'INSERT INTO pjsip (id, keyword, data, flags) VALUES (?, ?, ?, 0)',
        [`${extension}-auth`, 'username', extension, 0]
    );
    await connection.execute(
        'INSERT INTO pjsip (id, keyword, data, flags) VALUES (?, ?, ?, 0)',
        [`${extension}-auth`, 'password', password, 0]
    );

    console.log(chalk.green(`  ✓ Created authentication`));

    // 5. Create device entry
    await connection.execute(`
    INSERT INTO devices (
      id, tech, dial, devicetype, user, description, emergency_cid, 
      dial_trunk, deviceuser, devicerec
    ) VALUES (?, 'pjsip', ?, 'fixed', ?, ?, '', '', '', '')
  `, [extension, extension, extension, displayName]);

    console.log(chalk.green(`  ✓ Created device entry`));

    // 6. Create voicemail if email provided
    if (email) {
        await connection.execute(`
      INSERT INTO voicemail (
        mailbox, context, password, fullname, email, pager, 
        attach, saycid, dialout, callback, review, operator, 
        envelope, sayduration, saydurationm, sendvoicemail, delete, 
        nextaftercmd, forcename, forcegreetings, hidefromdir, 
        stamp, imapuser, imappassword, imapserver, imapport, 
        imapflags, imapvmsharedid, imapfolder
      ) VALUES (
        ?, 'default', ?, ?, ?, '', 
        'yes', 'yes', '', '', 'no', 'yes', 
        'no', 'no', 1, 'yes', 'no', 
        'yes', 'no', 'no', 'no', 
        NOW(), '', '', '', '', 
        '', 0, ''
      )
    `, [extension, password, displayName, email, email]);

        console.log(chalk.green(`  ✓ Created voicemail (${email})`));
    }
}

/**
 * Update existing extension
 */
async function updateExtension(connection, extension, password, displayName, email) {
    // Update password in users table
    await connection.execute(
        'UPDATE users SET password = ?, name = ?, secret = ? WHERE extension = ?',
        [password, displayName, password, extension]
    );

    // Update password in pjsip auth
    await connection.execute(
        'UPDATE pjsip SET data = ? WHERE id = ? AND keyword = ?',
        [password, `${extension}-auth`, 'password']
    );

    console.log(chalk.green(`  ✓ Updated password`));

    // Update voicemail if email provided
    if (email) {
        const [vmExists] = await connection.execute(
            'SELECT mailbox FROM voicemail WHERE mailbox = ? AND context = ?',
            [extension, 'default']
        );

        if (vmExists.length > 0) {
            await connection.execute(
                'UPDATE voicemail SET email = ?, pager = ? WHERE mailbox = ? AND context = ?',
                [email, email, extension, 'default']
            );
            console.log(chalk.green(`  ✓ Updated voicemail email`));
        } else {
            // Create voicemail if it doesn't exist
            await connection.execute(`
        INSERT INTO voicemail (
          mailbox, context, password, fullname, email, pager, attach, saycid
        ) VALUES (?, 'default', ?, ?, ?, ?, 'yes', 'yes')
      `, [extension, password, displayName, email, email]);
            console.log(chalk.green(`  ✓ Created voicemail`));
        }
    }
}
