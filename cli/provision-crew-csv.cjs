
const { Client } = require('ssh2');
const fs = require('fs');

const config = {
    host: '172.16.1.28',
    username: 'root',
    password: '12345'
};

const crew = [
    { extension: '9000', name: 'Morpheus' },
    { extension: '9001', name: 'Trinity' },
    { extension: '9002', name: 'Neo' },
    { extension: '9003', name: 'Tank' },
    { extension: '9004', name: 'Dozer' },
    { extension: '9005', name: 'Apoc' },
    { extension: '9006', name: 'Switch' },
    { extension: '9007', name: 'Mouse' },
    { extension: '9008', name: 'Cypher' }
];

// CSV Headers inferred from standard FreePBX Bulk Handler
// 'dial' is usually auto-generated if missed, but we can try without it first.
// 'devicetype' defaults to 'fixed'.
const headers = 'action,extension,name,cid_masquerade,sipname,outboundcid,tech,devicetype,password,emergency_cid,recording_in_external,recording_out_external,recording_in_internal,recording_out_internal,userman_directory_enable,userman_assign,novm,callwaiting,pinless,context,user';

const generateCSV = () => {
    let csv = headers + '\n';
    crew.forEach(member => {
        // action=add
        // password=GeminiPhone123!
        // context=from-internal
        const row = [
            'add',                      // action
            member.extension,           // extension
            member.name,                // name
            '',                         // cid_masquerade
            '',                         // sipname
            '',                         // outboundcid
            'pjsip',                    // tech
            'fixed',                    // devicetype (User asked for Sangoma? 'sangoma_phone'? sticking to fixed for now)
            'GeminiPhone123!',          // password
            '',                         // emergency_cid
            'dontcare',                 // recording...
            'dontcare',
            'dontcare',
            'dontcare',
            'yes',                      // userman_directory_enable
            'yes',                      // userman_assign
            'yes',                      // novm
            'enabled',                  // callwaiting
            'disabled',                 // pinless
            'from-internal',            // context
            member.extension            // user
        ];
        csv += row.join(',') + '\n';
    });
    return csv;
};

const run = async () => {
    const csvContent = generateCSV();
    console.log('--- Generated CSV ---');
    console.log(csvContent);

    const conn = new Client();

    conn.on('ready', () => {
        console.log('SSH Connected.');

        // 1. Delete existing extensions to avoid conflicts (optional, but safer for bulk import 'add')
        // actually 'replace' might be better but let's use 'add' and delete first if needed.
        // Or assume 'edit' if exists? bulkimport handles replace?
        // Let's copy file first.

        conn.sftp((err, sftp) => {
            if (err) throw err;
            const remotePath = '/tmp/crew_extensions.csv';
            const stream = sftp.createWriteStream(remotePath);
            stream.write(csvContent);
            stream.end();
            stream.on('close', () => {
                console.log(`CSV uploaded to ${remotePath}`);

                // 2. Run Bulk Import
                // --replace: Replace existing extension
                const cmd = `fwconsole bulkimport --type=extensions --replace ${remotePath} && fwconsole reload`;
                console.log(`Executing: ${cmd}`);

                conn.exec(cmd, (err, stream) => {
                    if (err) throw err;
                    stream.on('close', (code, signal) => {
                        console.log('Command finished with code: ' + code);
                        conn.end();
                    }).on('data', (data) => {
                        console.log('STDOUT: ' + data);
                    }).stderr.on('data', (data) => {
                        console.log('STDERR: ' + data);
                    });
                });
            });
        });
    }).connect(config);
};

run();
