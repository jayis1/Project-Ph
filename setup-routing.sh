#!/bin/bash
set -e

echo "Setting up AI Phone Routing in FreePBX..."

# 1. Clean up any existing duplicates
mysql -u root asterisk << 'SQL'
DELETE FROM users WHERE extension = '9001';
DELETE FROM devices WHERE id = '9001';
DELETE FROM pjsip WHERE id = '9001' OR id = 'ai_phone_trunk' OR id = '2';
DELETE FROM trunks WHERE trunkid = 2 OR channelid = 'ai_phone_trunk';
DELETE FROM incoming WHERE destination LIKE '%9001%';
FLUSH PRIVILEGES;
SQL

# 2. Create the AI Phone SIP Extension (9001)
mysql -u root asterisk << 'SQL'
INSERT IGNORE INTO users (extension, name, outboundcid, sipname, noanswer_cid, busy_cid, chanunavail_cid, noanswer_dest, busy_dest, chanunavail_dest) VALUES ('9001', 'Trinity (AI)', 'Trinity <9001>', '9001', '', '', '', '', '', '');
INSERT IGNORE INTO devices (id, tech, dial, devicetype, user, description) VALUES ('9001', 'pjsip', 'PJSIP/9001', 'fixed', '9001', 'Trinity (AI)');
INSERT IGNORE INTO pjsip (id, keyword, data, flags) VALUES 
('9001', 'account', '9001', 0),
('9001', 'context', 'from-internal', 0),
('9001', 'dial', 'PJSIP/9001', 0),
('9001', 'secret', 'GeminiPhone123!', 0),
('9001', 'sipdriver', 'chan_pjsip', 0),
('9001', 'disallow', 'all', 0),
('9001', 'allow', 'ulaw,alaw', 0),
('9001', 'direct_media', 'yes', 0),
('9001', 'rtp_symmetric', 'yes', 0),
('9001', 'force_rport', 'yes', 0),
('9001', 'rewrite_contact', 'yes', 0),
('9001', 'max_contacts', '1', 0);
SQL

# 2. Create the internal SIP Trunk to Drachtio (Port 5070)
mysql -u root asterisk << 'SQL'
INSERT IGNORE INTO trunks (trunkid, name, tech, outcid, keepcid, maxchans, failscript, dialoutprefix, channelid, usercontext, provider, disabled, `continue`)
VALUES
(2, 'ai_phone_trunk', 'pjsip', '', 'off', '', '', '', 'ai_phone_trunk', '', '', 'off', 'off');

INSERT IGNORE INTO pjsip (id, keyword, data, flags) VALUES 
('2', 'allow_unauthenticated_options', 'off', 0),
('2', 'auth_rejection_permanent', 'off', 0),
('2', 'authentication', 'outbound', 0),
('2', 'client_uri', '', 0),
('2', 'contact_user', '', 0),
('2', 'context', 'from-internal', 0),
('2', 'dialopts', '', 0),
('2', 'dialoutopts_cb', 'sys', 0),
('2', 'direct_media', 'no', 0),
('2', 'disabletrunk', 'off', 0),
('2', 'dtmfmode', 'auto', 0),
('2', 'expiration', '3600', 0),
('2', 'failtrunk_enable', '0', 0),
('2', 'fatal_retry_interval', '30', 0),
('2', 'fax_detect', 'no', 0),
('2', 'forbidden_retry_interval', '30', 0),
('2', 'force_rport', 'yes', 0),
('2', 'from_domain', '', 0),
('2', 'from_user', '', 0),
('2', 'hcid', 'on', 0),
('2', 'identify_by', 'default', 0),
('2', 'inband_progress', 'no', 0),
('2', 'match', '', 0),
('2', 'max_retries', '10000', 0),
('2', 'maxchans', '', 0),
('2', 'media_address', '', 0),
('2', 'media_encryption', 'no', 0),
('2', 'outbound_proxy', '', 0),
('2', 'peerdetails', '', 0),
('2', 'pjsip_line', 'true', 0),
('2', 'qualify_frequency', '60', 0),
('2', 'register', '', 0),
('2', 'registration', 'none', 0),
('2', 'retry_interval', '60', 0),
('2', 'rewrite_contact', 'no', 0),
('2', 'rtp_symmetric', 'yes', 0),
('2', 'secret', '', 0),
('2', 'send_connected_line', 'no', 0),
('2', 'sendrpid', 'no', 0),
('2', 'server_uri', '', 0),
('2', 'support_path', 'no', 0),
('2', 'sv_channelid', 'ai_phone_trunk', 0),
('2', 'sv_trunk_name', 'ai_phone_trunk', 0),
('2', 't38_udptl', 'no', 0),
('2', 't38_udptl_nat', 'no', 0),
('2', 'transport', '0.0.0.0-udp', 0),
('2', 'trunk_name', 'ai_phone_trunk', 0),
('2', 'trust_id_outbound', 'no', 0),
('2', 'trust_rpid', 'no', 0),
('2', 'user_eq_phone', 'no', 0);

INSERT IGNORE INTO pjsip (id, keyword, data, flags) VALUES ('ai_phone_trunk', 'endpoint', 'ai_phone_trunk', 24);
INSERT IGNORE INTO pjsip (id, keyword, data, flags) VALUES 
('ai_phone_trunk', 'context', 'from-internal', 0),
('ai_phone_trunk', 'disallow', 'all', 0),
('ai_phone_trunk', 'allow', 'ulaw,alaw', 0),
('ai_phone_trunk', 'aors', 'ai_phone_trunk', 0),
('ai_phone_trunk', 'sipdriver', 'chan_pjsip', 0),
('ai_phone_trunk', 'direct_media', 'no', 0),
('ai_phone_trunk', 'force_rport', 'yes', 0),
('ai_phone_trunk', 'rewrite_contact', 'yes', 0),
('ai_phone_trunk', 'rtp_symmetric', 'yes', 0),
('ai_phone_trunk', 'trunk_name', 'ai_phone_trunk', 0);

INSERT IGNORE INTO pjsip (id, keyword, data, flags) VALUES ('ai_phone_trunk', 'aor', 'ai_phone_trunk', 24);
INSERT IGNORE INTO pjsip (id, keyword, data, flags) VALUES ('ai_phone_trunk', 'contact', 'sip:127.0.0.1:5070', 0);
SQL

# 3. Create the Inbound Route back to AI (Catch-all for the Trunk or Dialplan)
# This routes all calls coming IN from the PBX to the AI Trunk
mysql -u root asterisk << 'SQL'
INSERT IGNORE INTO incoming (cidnum, extension, destination, description, pmmaxretries, pmminlength) VALUES ('', '9001', 'from-did-direct,9001,1', 'To_AI_Phone', '', '');
SQL

# 4. Create the Outbound Route (AI calling out)
mysql -u root asterisk << 'SQL'
INSERT IGNORE INTO outbound_routes (route_id, name) 
VALUES (2, 'From_AI_Phone')
ON DUPLICATE KEY UPDATE name='From_AI_Phone';

INSERT IGNORE INTO outbound_route_patterns (route_id, match_pattern_pass) 
VALUES (2, 'X.');

INSERT IGNORE INTO outbound_route_trunks (route_id, trunk_id, seq) 
VALUES (2, 2, 0);
SQL

# 5. Fix the GUI Apply Config State
mysql -u root asterisk << 'SQL'
UPDATE admin SET value = 'true' WHERE variable = 'need_reload';
SQL

# 4. Dialplan fix to explicitly route 9001 to the Trunk
# Since we forced Extension 9001 in users/devices but it's not a real phone (it's a trunk on 5070),
# We create a custom dialplan context
cat << 'DIALPLAN' >> /etc/asterisk/extensions_custom.conf

[from-internal-custom]
exten => 9001,1,Dial(PJSIP/9001@ai_phone_trunk,30,r)
exten => 9001,n,Hangup()
DIALPLAN

# 5. Reload FreePBX configuration
fwconsole reload

echo "✅ FreePBX routing configured successfully!"
echo "You can now dial 9001 from any phone connected to FreePBX."
