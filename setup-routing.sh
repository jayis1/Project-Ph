#!/bin/bash
set -e

echo "Setting up AI Phone Routing in FreePBX..."

# 1. Clean up any existing duplicates
mysql -u root asterisk -e "
DELETE FROM users WHERE extension = '9001';
DELETE FROM devices WHERE id = '9001';
DELETE FROM pjsip WHERE id = '9001' OR id = 'to_ai_phone';
DELETE FROM trunks WHERE trunkid = 9001 OR channelid = 'to_ai_phone';
DELETE FROM incoming WHERE destination LIKE '%9001%';
FLUSH PRIVILEGES;
"

# 2. Create the AI Phone SIP Extension (9001)
mysql -u root asterisk -e "
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
"

# 2. Create the internal SIP Trunk to Drachtio (Port 5070)
mysql -u root asterisk -e '
INSERT IGNORE INTO trunks (trunkid, name, tech, outcid, keepcid, maxchans, failscript, dialoutprefix, channelid, usercontext, provider, disabled, `continue`)
VALUES
(9001, "ai_phone_trunk", "pjsip", "", "off", "", "", "", "to_ai_phone", "", "", "off", "off");

INSERT IGNORE INTO pjsip (id, keyword, data, flags) VALUES ("to_ai_phone", "endpoint", "to_ai_phone", 24);
INSERT IGNORE INTO pjsip (id, keyword, data, flags) VALUES 
("to_ai_phone", "context", "from-internal", 0),
("to_ai_phone", "disallow", "all", 0),
("to_ai_phone", "allow", "ulaw,alaw", 0),
("to_ai_phone", "aors", "to_ai_phone", 0),
("to_ai_phone", "sipdriver", "chan_pjsip", 0),
("to_ai_phone", "direct_media", "no", 0),
("to_ai_phone", "force_rport", "yes", 0),
("to_ai_phone", "rewrite_contact", "yes", 0),
("to_ai_phone", "rtp_symmetric", "yes", 0);

INSERT IGNORE INTO pjsip (id, keyword, data, flags) VALUES ("to_ai_phone", "aor", "to_ai_phone", 24);
INSERT IGNORE INTO pjsip (id, keyword, data, flags) VALUES ("to_ai_phone", "contact", "sip:127.0.0.1:5070", 0);
'

# 3. Create the Inbound Route back to AI (Catch-all for the Trunk or Dialplan)
# This routes all calls coming IN from the PBX to the AI Trunk
mysql -u root asterisk -e "
INSERT IGNORE INTO incoming (cidnum, extension, destination, description, pmmaxretries, pmminlength) VALUES ('', '9001', 'from-did-direct,9001,1', 'To_AI_Phone', '', '');
"

# 4. Create the Outbound Route (AI calling out)
mysql -u root asterisk -e "
INSERT IGNORE INTO outbound_routes (route_id, name, outboundcid, emergency_route, intramcompany, mohclass, time_group_id) 
VALUES (1, 'From_AI_Phone', '', '', '', 'default', 0)
ON DUPLICATE KEY UPDATE name='From_AI_Phone';

INSERT IGNORE INTO outbound_route_patterns (route_id, match_pattern_pass, match_pattern_prefix, match_pattern_pass_replace) 
VALUES (1, 'X.', '', '');

INSERT IGNORE INTO outbound_route_trunks (route_id, trunk_id, seq) 
VALUES (1, 9001, 0);
"

# 5. Fix the GUI Apply Config State
mysql -u root asterisk -e "
UPDATE admin SET value = 'true' WHERE variable = 'need_reload';
"

# 4. Dialplan fix to explicitly route 9001 to the Trunk
# Since we forced Extension 9001 in users/devices but it's not a real phone (it's a trunk on 5070),
# We create a custom dialplan context
cat << 'DIALPLAN' >> /etc/asterisk/extensions_custom.conf

[from-internal-custom]
exten => 9001,1,Dial(PJSIP/9001@to_ai_phone,30,r)
exten => 9001,n,Hangup()
DIALPLAN

# 5. Reload FreePBX configuration
fwconsole reload

echo "✅ FreePBX routing configured successfully!"
echo "You can now dial 9001 from any phone connected to FreePBX."
