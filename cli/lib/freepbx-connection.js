import { exec } from 'child_process';
import { promisify } from 'util';
import mysql from 'mysql2/promise';

const execAsync = promisify(exec);

/**
 * FreePBX Connection Manager
 * Handles SSH and MySQL connections to FreePBX server
 */

/**
 * Test SSH connectivity to FreePBX server
 * @param {object} config - SSH configuration
 * @param {string} config.host - FreePBX hostname/IP
 * @param {string} config.user - SSH username (default: root)
 * @param {string} config.password - SSH password
 * @returns {Promise<object>} Result with success flag and message
 */
export async function testSSHConnection(config) {
    const { host, user = 'root', password } = config;

    // Local execution support
    if (host === 'localhost' || host === '127.0.0.1') {
        try {
            const { stdout } = await execAsync('echo "LOCAL_OK"');
            if (stdout.trim() === 'LOCAL_OK') {
                return {
                    success: true,
                    message: 'Local execution successful'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `Local execution failed: ${error.message}`
            };
        }
    }

    if (!host || !password) {
        return {
            success: false,
            error: 'Missing required SSH configuration (host, password)'
        };
    }

    try {
        // Test SSH with simple command
        const cmd = `sshpass -p "${password}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ${user}@${host} "echo 'SSH_OK'"`;
        const { stdout } = await execAsync(cmd);

        if (stdout.trim() === 'SSH_OK') {
            return {
                success: true,
                message: 'SSH connection successful'
            };
        } else {
            return {
                success: false,
                error: 'SSH connection failed: unexpected response'
            };
        }
    } catch (error) {
        return {
            success: false,
            error: `SSH connection failed: ${error.message}`
        };
    }
}

/**
 * Test MySQL connectivity to FreePBX database
 * @param {object} config - MySQL configuration
 * @param {string} config.host - MySQL hostname/IP
 * @param {number} config.port - MySQL port (default: 3306)
 * @param {string} config.user - MySQL username
 * @param {string} config.password - MySQL password
 * @param {string} config.database - Database name (default: asterisk)
 * @returns {Promise<object>} Result with success flag and message
 */
export async function testMySQLConnection(config) {
    const {
        host,
        port = 3306,
        user,
        password,
        database = 'asterisk'
    } = config;

    if (!host || !user || !password) {
        return {
            success: false,
            error: 'Missing required MySQL configuration (host, user, password)'
        };
    }

    let connection;

    try {
        connection = await mysql.createConnection({
            host,
            port,
            user,
            password,
            database,
            connectTimeout: 5000
        });

        // Test query
        const [rows] = await connection.execute('SELECT 1 as test');

        if (rows[0].test === 1) {
            return {
                success: true,
                message: 'MySQL connection successful'
            };
        } else {
            return {
                success: false,
                error: 'MySQL connection failed: unexpected response'
            };
        }
    } catch (error) {
        return {
            success: false,
            error: `MySQL connection failed: ${error.message}`
        };
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

/**
 * Create MySQL connection pool
 * @param {object} config - MySQL configuration
 * @returns {Promise<object>} MySQL connection pool
 */
export async function createMySQLPool(config) {
    const {
        host,
        port = 3306,
        user,
        password,
        database = 'asterisk'
    } = config;

    return mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 10000
    });
}

/**
 * Execute SSH command on FreePBX server
 * @param {object} sshConfig - SSH configuration
 * @param {string} command - Command to execute
 * @param {object} options - Execution options
 * @param {number} options.timeout - Timeout in milliseconds (default: 30000)
 * @returns {Promise<object>} Result with stdout, stderr, and success flag
 */
export async function executeSSHCommand(sshConfig, command, options = {}) {
    const { host, user = 'root', password } = sshConfig;
    const { timeout = 30000 } = options;

    if (!host) {
        throw new Error('Missing SSH host configuration');
    }

    // Local execution support
    if (host === 'localhost' || host === '127.0.0.1') {
        try {
            const { stdout, stderr } = await execAsync(command, {
                timeout,
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });

            return {
                success: true,
                stdout: stdout.trim(),
                stderr: stderr.trim()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                stdout: error.stdout || '',
                stderr: error.stderr || ''
            };
        }
    }

    if (!password) {
        throw new Error('Missing SSH password configuration');
    }

    try {
        const escapedCommand = command.replace(/"/g, '\\"');
        const cmd = `sshpass -p "${password}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ${user}@${host} "${escapedCommand}"`;

        const { stdout, stderr } = await execAsync(cmd, {
            timeout,
            maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });

        return {
            success: true,
            stdout: stdout.trim(),
            stderr: stderr.trim()
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            stdout: error.stdout || '',
            stderr: error.stderr || ''
        };
    }
}

/**
 * Execute MySQL query on FreePBX database
 * @param {object} pool - MySQL connection pool
 * @param {string} query - SQL query
 * @param {array} params - Query parameters
 * @returns {Promise<object>} Query result
 */
export async function executeMySQLQuery(pool, query, params = []) {
    try {
        const [rows] = await pool.execute(query, params);
        return {
            success: true,
            rows
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Execute MySQL query via SSH (fallback method)
 * @param {object} sshConfig - SSH configuration
 * @param {object} mysqlConfig - MySQL configuration
 * @param {string} query - SQL query
 * @returns {Promise<object>} Query result
 */
export async function executeMySQLQueryViaSSH(sshConfig, mysqlConfig, query) {
    const { user = 'freepbxuser', password, database = 'asterisk' } = mysqlConfig;

    const escapedQuery = query.replace(/"/g, '\\"').replace(/'/g, "\\'");
    const mysqlCmd = `mysql -u ${user} -p${password} ${database} -e "${escapedQuery}"`;

    return executeSSHCommand(sshConfig, mysqlCmd);
}

/**
 * Test FreePBX is running and accessible
 * @param {object} sshConfig - SSH configuration
 * @returns {Promise<object>} Result with success flag and FreePBX version
 */
export async function testFreePBXRunning(sshConfig) {
    try {
        const result = await executeSSHCommand(sshConfig, 'fwconsole --version');

        if (result.success && result.stdout) {
            return {
                success: true,
                version: result.stdout,
                message: 'FreePBX is running'
            };
        } else {
            return {
                success: false,
                error: 'FreePBX command failed'
            };
        }
    } catch (error) {
        return {
            success: false,
            error: `FreePBX check failed: ${error.message}`
        };
    }
}

/**
 * Reload FreePBX configuration
 * @param {object} sshConfig - SSH configuration
 * @returns {Promise<object>} Result with success flag
 */
export async function reloadFreePBX(sshConfig) {
    try {
        const result = await executeSSHCommand(
            sshConfig,
            'fwconsole reload',
            { timeout: 60000 } // 60 second timeout for reload
        );

        if (result.success) {
            return {
                success: true,
                message: 'FreePBX configuration reloaded'
            };
        } else {
            return {
                success: false,
                error: result.error || 'Reload command failed'
            };
        }
    } catch (error) {
        return {
            success: false,
            error: `FreePBX reload failed: ${error.message}`
        };
    }
}

/**
 * Validate all FreePBX connections
 * @param {object} config - Complete configuration
 * @param {object} config.ssh - SSH configuration
 * @param {object} config.mysql - MySQL configuration
 * @returns {Promise<object>} Validation results
 */
export async function validateConnections(config) {
    const results = {
        ssh: await testSSHConnection(config.ssh),
        mysql: await testMySQLConnection(config.mysql),
        freepbx: await testFreePBXRunning(config.ssh)
    };

    const allSuccess = results.ssh.success && results.mysql.success && results.freepbx.success;

    return {
        success: allSuccess,
        results,
        message: allSuccess ? 'All connections validated' : 'Some connections failed'
    };
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @returns {Promise<any>} Function result
 */
export async function retryWithBackoff(fn, options = {}) {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 10000
    } = options;

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt < maxRetries) {
                const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}
