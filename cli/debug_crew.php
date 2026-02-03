<?php
if (!defined('FREEPBX_IS_AUTH')) {
    define('FREEPBX_IS_AUTH', 'TRUE');
}
require_once('/etc/freepbx.conf');
$FreePBX = FreePBX::Create();
$core = $FreePBX->Core;

echo "--- DEVICES ---\n";
$devices = $core->getAllDevices();
print_r($devices);

echo "--- USERS ---\n";
$users = $core->getAllUsers();
print_r($users);

echo "--- DEVICE 9000 ---\n";
try {
    $d = $core->getDevice(9000);
    print_r($d);
} catch (Exception $e) {
    echo "Device 9000 not found: " . $e->getMessage() . "\n";
}
