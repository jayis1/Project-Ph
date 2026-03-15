import { test } from 'node:test';
import assert from 'node:assert';
import { generateDockerCompose, generateEnvFile } from '../lib/docker.js';

test('docker compose generation', async (t) => {
  await t.test('generates compose with default port 5060 when no drachtioPort specified', () => {
    const config = {
      server: {
        externalIp: '192.168.1.50',
        httpPort: 3000,
        geminiApiPort: 3333
      },
      paths: {
        voiceApp: '/app/voice-app'
      },
      secrets: {
        drachtio: 'test-secret-123',
        freeswitch: 'test-secret-456'
      }
    };

    const compose = generateDockerCompose(config);

    // Should use default port 5060 in drachtio command
    assert.ok(compose.includes('--contact "sip:*:5060;transport=tcp,udp"'),
      'Should use port 5060 by default');
  });

  await t.test('generates compose with port 5070 when drachtioPort is 5070', () => {
    const config = {
      server: {
        externalIp: '192.168.1.50',
        httpPort: 3000,
        geminiApiPort: 3333
      },
      paths: {
        voiceApp: '/app/voice-app'
      },
      secrets: {
        drachtio: 'test-secret-123',
        freeswitch: 'test-secret-456'
      },
      deployment: {
        pi: {
          drachtioPort: 5070
        }
      }
    };

    const compose = generateDockerCompose(config);

    // Should use port 5070 when specified in config
    assert.ok(compose.includes('--contact "sip:*:5070;transport=tcp,udp"'),
      'Should use port 5070 when Pi config specifies it');
  });

  await t.test('generates compose with port 5060 when drachtioPort explicitly set to 5060', () => {
    const config = {
      server: {
        externalIp: '192.168.1.50',
        httpPort: 3000,
        geminiApiPort: 3333
      },
      paths: {
        voiceApp: '/app/voice-app'
      },
      secrets: {
        drachtio: 'test-secret-123',
        freeswitch: 'test-secret-456'
      },
      deployment: {
        pi: {
          drachtioPort: 5060
        }
      }
    };

    const compose = generateDockerCompose(config);

    assert.ok(compose.includes('--contact "sip:*:5060;transport=tcp,udp"'),
      'Should use port 5060 when explicitly specified');
  });

  await t.test('preserves other compose settings when using custom port', () => {
    const config = {
      server: {
        externalIp: '192.168.1.50',
        httpPort: 3000,
        geminiApiPort: 3333
      },
      paths: {
        voiceApp: '/app/voice-app'
      },
      secrets: {
        drachtio: 'test-secret-123',
        freeswitch: 'test-secret-456'
      },
      deployment: {
        pi: {
          drachtioPort: 5070
        }
      }
    };

    const compose = generateDockerCompose(config);

    // Verify other settings remain intact
    assert.ok(compose.includes('network_mode: host'), 'Should use host networking');
    assert.ok(compose.includes('--sip-port 5080'), 'FreeSWITCH should use port 5080');
    assert.ok(compose.includes('--port 9022'), 'Drachtio should use port 9022');
    assert.ok(compose.includes('EXTERNAL_IP=192.168.1.50'), 'Should use configured external IP');
  });

  await t.test('generates env file with Ollama API URL', () => {
    const config = {
      server: {
        externalIp: '192.168.1.50',
        httpPort: 3000
      },
      sip: {
        domain: 'freepbx.local',
        registrar: '192.168.1.10'
      },
      devices: [
        {
          extension: '9000',
          authId: 'user123',
          password: 'pass123'
        }
      ],
      api: {
        ollama: { apiUrl: 'http://host.docker.internal:11434', model: 'qwen2.5:14b' },
        localSttUrl: 'http://host.docker.internal:8080/v1',
        localTtsUrl: 'http://host.docker.internal:5002/api/tts'
      },
      secrets: {
        drachtio: 'drachtio-secret',
        freeswitch: 'fs-secret'
      },
      deployment: {
        mode: 'both'
      }
    };

    const envFile = generateEnvFile(config);

    assert.ok(envFile.includes('OLLAMA_API_URL=http://host.docker.internal:11434'),
      'Should include Ollama API URL');
    assert.ok(envFile.includes('OLLAMA_MODEL=qwen2.5:14b'),
      'Should include Ollama model');
    assert.ok(envFile.includes('LOCAL_STT_URL=http://host.docker.internal:8080/v1'),
      'Should include local STT URL');
    assert.ok(envFile.includes('LOCAL_TTS_URL=http://host.docker.internal:5002/api/tts'),
      'Should include local TTS URL');
  });

  await t.test('generates env file with SIP configuration', () => {
    const config = {
      server: {
        externalIp: '192.168.1.50',
        httpPort: 3000
      },
      sip: {
        domain: 'freepbx.local',
        registrar: '192.168.1.10'
      },
      devices: [
        {
          extension: '9000',
          authId: 'user123',
          password: 'pass123'
        }
      ],
      api: {
        ollama: { apiUrl: 'http://host.docker.internal:11434', model: 'llama3' }
      },
      secrets: {
        drachtio: 'drachtio-secret',
        freeswitch: 'fs-secret'
      },
      deployment: {
        mode: 'standard'
      }
    };

    const envFile = generateEnvFile(config);

    assert.ok(envFile.includes('SIP_DOMAIN=freepbx.local'),
      'Should include SIP domain');
    assert.ok(envFile.includes('SIP_REGISTRAR=192.168.1.10'),
      'Should include SIP registrar');
    assert.ok(envFile.includes('SIP_EXTENSION=9000'),
      'Should include SIP extension');
    assert.ok(envFile.includes('SIP_AUTH_ID=user123'),
      'Should include SIP auth ID');
    assert.ok(envFile.includes('SIP_PASSWORD=pass123'),
      'Should include SIP password');
  });

  await t.test('generates env file with drachtio and freeswitch secrets', () => {
    const config = {
      server: {
        externalIp: '192.168.1.50',
        httpPort: 3000
      },
      sip: {
        domain: 'freepbx.local',
        registrar: '192.168.1.10'
      },
      devices: [
        {
          extension: '9000',
          authId: 'user123',
          password: 'pass123'
        }
      ],
      api: {
        ollama: { apiUrl: 'http://host.docker.internal:11434', model: 'llama3' }
      },
      secrets: {
        drachtio: 'my-drachtio-secret',
        freeswitch: 'my-fs-secret'
      },
      deployment: {
        mode: 'both'
      }
    };

    const envFile = generateEnvFile(config);

    assert.ok(envFile.includes('DRACHTIO_SECRET=my-drachtio-secret'),
      'Should include drachtio secret');
    assert.ok(envFile.includes('EXTERNAL_IP=192.168.1.50'),
      'Should include external IP');
    assert.ok(envFile.includes('HTTP_PORT=3000'),
      'Should include HTTP port');
  });

  await t.test('generates env file with default Ollama values when not configured', () => {
    const config = {
      server: {
        externalIp: '192.168.1.50',
        httpPort: 3000
      },
      sip: {
        domain: 'freepbx.local',
        registrar: '192.168.1.10'
      },
      devices: [
        {
          extension: '9000',
          authId: 'user123',
          password: 'pass123'
        }
      ],
      api: {},
      secrets: {
        drachtio: 'drachtio-secret',
        freeswitch: 'fs-secret'
      },
      deployment: {
        mode: 'both'
      }
    };

    const envFile = generateEnvFile(config);

    // Should use defaults when Ollama is not explicitly configured
    assert.ok(envFile.includes('OLLAMA_API_URL=http://host.docker.internal:11434'),
      'Should use default Ollama API URL');
    assert.ok(envFile.includes('OLLAMA_MODEL=llama3'),
      'Should use default Ollama model');
  });
});
