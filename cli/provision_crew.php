<?php
    if (!defined('FREEPBX_IS_AUTH')) { define('FREEPBX_IS_AUTH', 'TRUE'); }
    require_once('/etc/freepbx.conf');
    $FreePBX = FreePBX::Create();
    $core = $FreePBX->Core;
    echo "Provisioning Crew...\n";
    
    // Check if device 9000 exists
    try {
        $dev = $core->getDevice(9000);
        echo "Device 9000 CORRUPT or Exists - Fixing...\n";
        $core->delDevice(9000);
    } catch (Exception $e) {
    }

    try {
        $user = $core->getUser(9000);
        echo "User 9000 CORRUPT or Exists - Fixing...\n";
        $core->delUser(9000);
    } catch (Exception $e) {
    }
    
    echo "Creating Device & User 9000...\n";
    $core->addDevice(9000, 'pjsip', [
        'secret' => ['value' => 'GeminiPhone123!'],
        'context' => ['value' => 'from-internal'],
        'deny' => ['value' => '0.0.0.0/0.0.0.0'],
        'permit' => ['value' => '0.0.0.0/0.0.0.0'],
        'tech' => ['value' => 'pjsip'],
        'devicetype' => ['value' => 'fixed'],
        'user' => ['value' => '9000'],
        'dial' => ['value' => 'PJSIP/9000'],
        'description' => ['value' => 'Morpheus'],
        'emergency_cid' => ['value' => ''],
        'hint_override' => ['value' => '']
    ]);
    $core->addUser(9000, [
        'password' => 'GeminiPhone123!',
        'name' => 'Morpheus',
        'voicemail' => 'novm',
        'ringtimer' => 0,
        'noanswer' => '',
        'newdid' => '',
        'newdidcid' => '',
        'callwaiting' => 'enabled',
        'pinless' => 'disabled'
    ]);
    
    // Check if device 9001 exists
    try {
        $dev = $core->getDevice(9001);
        echo "Device 9001 CORRUPT or Exists - Fixing...\n";
        $core->delDevice(9001);
    } catch (Exception $e) {
    }

    try {
        $user = $core->getUser(9001);
        echo "User 9001 CORRUPT or Exists - Fixing...\n";
        $core->delUser(9001);
    } catch (Exception $e) {
    }
    
    echo "Creating Device & User 9001...\n";
    $core->addDevice(9001, 'pjsip', [
        'secret' => ['value' => 'GeminiPhone123!'],
        'context' => ['value' => 'from-internal'],
        'deny' => ['value' => '0.0.0.0/0.0.0.0'],
        'permit' => ['value' => '0.0.0.0/0.0.0.0'],
        'tech' => ['value' => 'pjsip'],
        'devicetype' => ['value' => 'fixed'],
        'user' => ['value' => '9001'],
        'dial' => ['value' => 'PJSIP/9001'],
        'description' => ['value' => 'Trinity'],
        'emergency_cid' => ['value' => ''],
        'hint_override' => ['value' => '']
    ]);
    $core->addUser(9001, [
        'password' => 'GeminiPhone123!',
        'name' => 'Trinity',
        'voicemail' => 'novm',
        'ringtimer' => 0,
        'noanswer' => '',
        'newdid' => '',
        'newdidcid' => '',
        'callwaiting' => 'enabled',
        'pinless' => 'disabled'
    ]);
    
    // Check if device 9002 exists
    try {
        $dev = $core->getDevice(9002);
        echo "Device 9002 CORRUPT or Exists - Fixing...\n";
        $core->delDevice(9002);
    } catch (Exception $e) {
    }

    try {
        $user = $core->getUser(9002);
        echo "User 9002 CORRUPT or Exists - Fixing...\n";
        $core->delUser(9002);
    } catch (Exception $e) {
    }
    
    echo "Creating Device & User 9002...\n";
    $core->addDevice(9002, 'pjsip', [
        'secret' => ['value' => 'GeminiPhone123!'],
        'context' => ['value' => 'from-internal'],
        'deny' => ['value' => '0.0.0.0/0.0.0.0'],
        'permit' => ['value' => '0.0.0.0/0.0.0.0'],
        'tech' => ['value' => 'pjsip'],
        'devicetype' => ['value' => 'fixed'],
        'user' => ['value' => '9002'],
        'dial' => ['value' => 'PJSIP/9002'],
        'description' => ['value' => 'Neo'],
        'emergency_cid' => ['value' => ''],
        'hint_override' => ['value' => '']
    ]);
    $core->addUser(9002, [
        'password' => 'GeminiPhone123!',
        'name' => 'Neo',
        'voicemail' => 'novm',
        'ringtimer' => 0,
        'noanswer' => '',
        'newdid' => '',
        'newdidcid' => '',
        'callwaiting' => 'enabled',
        'pinless' => 'disabled'
    ]);
    
    // Check if device 9003 exists
    try {
        $dev = $core->getDevice(9003);
        echo "Device 9003 CORRUPT or Exists - Fixing...\n";
        $core->delDevice(9003);
    } catch (Exception $e) {
    }

    try {
        $user = $core->getUser(9003);
        echo "User 9003 CORRUPT or Exists - Fixing...\n";
        $core->delUser(9003);
    } catch (Exception $e) {
    }
    
    echo "Creating Device & User 9003...\n";
    $core->addDevice(9003, 'pjsip', [
        'secret' => ['value' => 'GeminiPhone123!'],
        'context' => ['value' => 'from-internal'],
        'deny' => ['value' => '0.0.0.0/0.0.0.0'],
        'permit' => ['value' => '0.0.0.0/0.0.0.0'],
        'tech' => ['value' => 'pjsip'],
        'devicetype' => ['value' => 'fixed'],
        'user' => ['value' => '9003'],
        'dial' => ['value' => 'PJSIP/9003'],
        'description' => ['value' => 'Tank'],
        'emergency_cid' => ['value' => ''],
        'hint_override' => ['value' => '']
    ]);
    $core->addUser(9003, [
        'password' => 'GeminiPhone123!',
        'name' => 'Tank',
        'voicemail' => 'novm',
        'ringtimer' => 0,
        'noanswer' => '',
        'newdid' => '',
        'newdidcid' => '',
        'callwaiting' => 'enabled',
        'pinless' => 'disabled'
    ]);
    
    // Check if device 9004 exists
    try {
        $dev = $core->getDevice(9004);
        echo "Device 9004 CORRUPT or Exists - Fixing...\n";
        $core->delDevice(9004);
    } catch (Exception $e) {
    }

    try {
        $user = $core->getUser(9004);
        echo "User 9004 CORRUPT or Exists - Fixing...\n";
        $core->delUser(9004);
    } catch (Exception $e) {
    }
    
    echo "Creating Device & User 9004...\n";
    $core->addDevice(9004, 'pjsip', [
        'secret' => ['value' => 'GeminiPhone123!'],
        'context' => ['value' => 'from-internal'],
        'deny' => ['value' => '0.0.0.0/0.0.0.0'],
        'permit' => ['value' => '0.0.0.0/0.0.0.0'],
        'tech' => ['value' => 'pjsip'],
        'devicetype' => ['value' => 'fixed'],
        'user' => ['value' => '9004'],
        'dial' => ['value' => 'PJSIP/9004'],
        'description' => ['value' => 'Dozer'],
        'emergency_cid' => ['value' => ''],
        'hint_override' => ['value' => '']
    ]);
    $core->addUser(9004, [
        'password' => 'GeminiPhone123!',
        'name' => 'Dozer',
        'voicemail' => 'novm',
        'ringtimer' => 0,
        'noanswer' => '',
        'newdid' => '',
        'newdidcid' => '',
        'callwaiting' => 'enabled',
        'pinless' => 'disabled'
    ]);
    
    // Check if device 9005 exists
    try {
        $dev = $core->getDevice(9005);
        echo "Device 9005 CORRUPT or Exists - Fixing...\n";
        $core->delDevice(9005);
    } catch (Exception $e) {
    }

    try {
        $user = $core->getUser(9005);
        echo "User 9005 CORRUPT or Exists - Fixing...\n";
        $core->delUser(9005);
    } catch (Exception $e) {
    }
    
    echo "Creating Device & User 9005...\n";
    $core->addDevice(9005, 'pjsip', [
        'secret' => ['value' => 'GeminiPhone123!'],
        'context' => ['value' => 'from-internal'],
        'deny' => ['value' => '0.0.0.0/0.0.0.0'],
        'permit' => ['value' => '0.0.0.0/0.0.0.0'],
        'tech' => ['value' => 'pjsip'],
        'devicetype' => ['value' => 'fixed'],
        'user' => ['value' => '9005'],
        'dial' => ['value' => 'PJSIP/9005'],
        'description' => ['value' => 'Apoc'],
        'emergency_cid' => ['value' => ''],
        'hint_override' => ['value' => '']
    ]);
    $core->addUser(9005, [
        'password' => 'GeminiPhone123!',
        'name' => 'Apoc',
        'voicemail' => 'novm',
        'ringtimer' => 0,
        'noanswer' => '',
        'newdid' => '',
        'newdidcid' => '',
        'callwaiting' => 'enabled',
        'pinless' => 'disabled'
    ]);
    
    // Check if device 9006 exists
    try {
        $dev = $core->getDevice(9006);
        echo "Device 9006 CORRUPT or Exists - Fixing...\n";
        $core->delDevice(9006);
    } catch (Exception $e) {
    }

    try {
        $user = $core->getUser(9006);
        echo "User 9006 CORRUPT or Exists - Fixing...\n";
        $core->delUser(9006);
    } catch (Exception $e) {
    }
    
    echo "Creating Device & User 9006...\n";
    $core->addDevice(9006, 'pjsip', [
        'secret' => ['value' => 'GeminiPhone123!'],
        'context' => ['value' => 'from-internal'],
        'deny' => ['value' => '0.0.0.0/0.0.0.0'],
        'permit' => ['value' => '0.0.0.0/0.0.0.0'],
        'tech' => ['value' => 'pjsip'],
        'devicetype' => ['value' => 'fixed'],
        'user' => ['value' => '9006'],
        'dial' => ['value' => 'PJSIP/9006'],
        'description' => ['value' => 'Switch'],
        'emergency_cid' => ['value' => ''],
        'hint_override' => ['value' => '']
    ]);
    $core->addUser(9006, [
        'password' => 'GeminiPhone123!',
        'name' => 'Switch',
        'voicemail' => 'novm',
        'ringtimer' => 0,
        'noanswer' => '',
        'newdid' => '',
        'newdidcid' => '',
        'callwaiting' => 'enabled',
        'pinless' => 'disabled'
    ]);
    
    // Check if device 9007 exists
    try {
        $dev = $core->getDevice(9007);
        echo "Device 9007 CORRUPT or Exists - Fixing...\n";
        $core->delDevice(9007);
    } catch (Exception $e) {
    }

    try {
        $user = $core->getUser(9007);
        echo "User 9007 CORRUPT or Exists - Fixing...\n";
        $core->delUser(9007);
    } catch (Exception $e) {
    }
    
    echo "Creating Device & User 9007...\n";
    $core->addDevice(9007, 'pjsip', [
        'secret' => ['value' => 'GeminiPhone123!'],
        'context' => ['value' => 'from-internal'],
        'deny' => ['value' => '0.0.0.0/0.0.0.0'],
        'permit' => ['value' => '0.0.0.0/0.0.0.0'],
        'tech' => ['value' => 'pjsip'],
        'devicetype' => ['value' => 'fixed'],
        'user' => ['value' => '9007'],
        'dial' => ['value' => 'PJSIP/9007'],
        'description' => ['value' => 'Mouse'],
        'emergency_cid' => ['value' => ''],
        'hint_override' => ['value' => '']
    ]);
    $core->addUser(9007, [
        'password' => 'GeminiPhone123!',
        'name' => 'Mouse',
        'voicemail' => 'novm',
        'ringtimer' => 0,
        'noanswer' => '',
        'newdid' => '',
        'newdidcid' => '',
        'callwaiting' => 'enabled',
        'pinless' => 'disabled'
    ]);
    
    // Check if device 9008 exists
    try {
        $dev = $core->getDevice(9008);
        echo "Device 9008 CORRUPT or Exists - Fixing...\n";
        $core->delDevice(9008);
    } catch (Exception $e) {
    }

    try {
        $user = $core->getUser(9008);
        echo "User 9008 CORRUPT or Exists - Fixing...\n";
        $core->delUser(9008);
    } catch (Exception $e) {
    }
    
    echo "Creating Device & User 9008...\n";
    $core->addDevice(9008, 'pjsip', [
        'secret' => ['value' => 'GeminiPhone123!'],
        'context' => ['value' => 'from-internal'],
        'deny' => ['value' => '0.0.0.0/0.0.0.0'],
        'permit' => ['value' => '0.0.0.0/0.0.0.0'],
        'tech' => ['value' => 'pjsip'],
        'devicetype' => ['value' => 'fixed'],
        'user' => ['value' => '9008'],
        'dial' => ['value' => 'PJSIP/9008'],
        'description' => ['value' => 'Cypher'],
        'emergency_cid' => ['value' => ''],
        'hint_override' => ['value' => '']
    ]);
    $core->addUser(9008, [
        'password' => 'GeminiPhone123!',
        'name' => 'Cypher',
        'voicemail' => 'novm',
        'ringtimer' => 0,
        'noanswer' => '',
        'newdid' => '',
        'newdidcid' => '',
        'callwaiting' => 'enabled',
        'pinless' => 'disabled'
    ]);
    echo "Done.\n"; ?>