import axios from 'axios';
import { URLSearchParams } from 'url';

/**
 * FreePBX M2M API Client
 * Handles OAuth2 Client Credentials flow and GraphQL queries
 */
export class FreePBXClient {
    /**
     * @param {Object} options
     * @param {string} options.clientId - OAuth2 Client ID
     * @param {string} options.clientSecret - OAuth2 Client Secret
     * @param {string} options.apiUrl - GraphQL Endpoint (e.g. https://ip/admin/api/api/gql)
     */
    constructor(options) {
        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
        this.apiUrl = options.apiUrl;

        // Improve URL resolution
        if (this.apiUrl) {
            // Clean up common copy-paste noise
            this.apiUrl = this.apiUrl.trim()
                .replace(/^[Ll]:\s*/, '') // Remove prompt label "L: "
                .replace(/^Graphql URL.*:\s*/i, '') // Remove label "Graphql URL (optional...): "
                .replace(/\s+/g, ''); // Remove all spaces

            // Bail if empty after cleaning
            if (!this.apiUrl) {
                this.apiUrl = null;
                this.tokenUrl = null;
            } else {
                // Basic protocol validation
                if (!this.apiUrl.startsWith('http://') && !this.apiUrl.startsWith('https://')) {
                    this.apiUrl = 'https://' + this.apiUrl;
                }

                // If user provides a bare domain/IP, append the standard GraphQL path
                if (!this.apiUrl.includes('/admin/api/') && !this.apiUrl.endsWith('.php')) {
                    this.apiUrl = this.apiUrl.replace(/\/$/, '') + '/admin/api/api/gql';
                }

                // Resolve Token URL from GraphQL URL
                this.tokenUrl = this.apiUrl.replace(/\/gql$/, '/token');
            }
        } else {
            this.tokenUrl = null;
        }

        this.accessToken = null;
        this.tokenExpiresAt = null;
    }

    /**
     * Get an access token using Client Credentials grant
     * @returns {Promise<string>} Access token
     */
    async getToken() {
        // Return cached token if still valid (with 30s buffer)
        if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt - 30000) {
            return this.accessToken;
        }

        if (!this.clientId || !this.clientSecret || !this.tokenUrl) {
            throw new Error('FreePBX API credentials or URL missing');
        }

        try {
            // FreePBX (League/OAuth2) often expects form-data for the token endpoint
            // and Basic Auth for client identification
            const params = new URLSearchParams();
            params.append('grant_type', 'client_credentials');

            const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

            const response = await axios.post(this.tokenUrl, params.toString(), {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${authHeader}`
                }
            });

            if (response.data && response.data.access_token) {
                this.accessToken = response.data.access_token;
                // Set expiry if provided, default to 1 hour
                const expiresIn = response.data.expires_in || 3600;
                this.tokenExpiresAt = Date.now() + (expiresIn * 1000);
                return this.accessToken;
            }

            throw new Error('Invalid response from token endpoint');
        } catch (error) {
            let msg = error.message;
            if (error.response?.data) {
                if (typeof error.response.data === 'string') {
                    msg = error.response.data;
                } else if (error.response.data.message) {
                    msg = error.response.data.message;
                } else if (error.response.data.error_description) {
                    msg = error.response.data.error_description;
                } else if (error.response.data.error) {
                    msg = error.response.data.error;
                }
            }

            // Helpful hint for the specific error encountered
            if (msg.includes('grant type is not supported')) {
                msg += ' (Ensure "Client Credentials" is enabled in FreePBX API Settings for this application)';
            }

            throw new Error(`FreePBX Auth Failed: ${msg}`);
        }
    }

    /**
     * Execute a GraphQL query or mutation
     * @param {string} query - GraphQL query string
     * @param {Object} variables - GraphQL variables
     * @returns {Promise<Object>} GraphQL response data
     */
    async query(query, variables = {}) {
        const token = await this.getToken();

        try {
            const response = await axios.post(this.apiUrl, {
                query,
                variables
            }, {
                timeout: 15000,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Sangoma P330/4.5.3'
                }
            });

            if (response.data && response.data.errors) {
                const errorMsg = response.data.errors.map(e => e.message).join(', ');
                throw new Error(`GraphQL Error: ${errorMsg}`);
            }

            return response.data?.data;
        } catch (error) {
            if (error.response?.status === 401) {
                // Token might have expired unexpectedly, clear cache and retry once
                this.accessToken = null;
                return this.query(query, variables);
            }

            // Extract detailed error information for 400 Bad Request
            if (error.response?.data) {
                const details = JSON.stringify(error.response.data);
                throw new Error(`GraphQL Request Failed (${error.response.status}): ${details}`);
            }
            throw error;
        }
    }

    /**
     * Find an extension's internal ID by its number
     * @param {string} extensionNumber
     * @returns {Promise<string|null>} Internal ID
     */
    async findExtensionId(extensionNumber) {
        // fetchAllExtensions returns an ExtensionConnection
        // which contains an 'extension' field that is the actual list
        const q = `query { fetchAllExtensions { extension { id extensionId } } }`;
        const res = await this.query(q);

        const list = res?.fetchAllExtensions?.extension;

        if (!Array.isArray(list)) {
            // Log for debugging if structure is unexpected
            console.error(`[DEBUG] Unexpected fetchAllExtensions structure. Expected res.fetchAllExtensions.extension array, got:`, JSON.stringify(res));
            return null;
        }

        const ext = list.find(e => e.extensionId === extensionNumber);
        if (ext) {
            // Try using the pure extension number as ID (parsed as int)
            return parseInt(ext.extensionId, 10) || null;
        }
        return null;
    }

    /**
     * Update an extension's name and caller ID
     * @param {string} extension - Extension number
     * @param {string} name - Display name
     * @param {string} outboundCid - Outbound Caller ID
     * @returns {Promise<Object>} Mutation result
     */
    async updateExtension(extension, name, outboundCid) {
        const extensionId = await this.findExtensionId(extension);
        if (!extensionId) {
            throw new Error(`Could not find internal ID for extension ${extension}`);
        }

        const mutation = `
            mutation ($extensionId: ID!, $name: String!, $outboundCid: String!) {
                updateExtension(input: {
                    extensionId: $extensionId,
                    name: $name,
                    outboundCid: $outboundCid
                }) {
                    status
                    message
                }
            }
        `;
        return this.query(mutation, { extensionId, name, outboundCid });
    }

    /**
     * Create or update an inbound route pointing to an extension
     * @param {string} extension - Extension number
     * @param {string} did - DID number (optional)
     * @param {string} cid - CID number (optional)
     */
    async addInboundRoute(targetExtension, did = '', cid = '') {
        const destination = `from-did-direct,${targetExtension},1`;
        const input = {
            destination,
            description: "Gemini Phone: AI Route",
            extension: did || null,
            cidnum: cid || null
        };

        const mutation = `
mutation($input: addInboundRouteInput!) {
    addInboundRoute(input: $input) {
        status
        message
    }
}
`;
        return this.query(mutation, { input });
    }

    /**
     * Check if a Ring Group exists
     * @param {string} grpnum - Ring Group number
     * @returns {Promise<boolean>} True if exists
     */
    async ringGroupExists(grpnum) {
        try {
            const query = `query { fetchAllRingGroups { ringgroups { groupNumber } } }`;
            const res = await this.query(query);
            const ringgroups = res?.fetchAllRingGroups?.ringgroups || [];
            return ringgroups.some(rg => rg.groupNumber === grpnum);
        } catch (error) {
            console.warn('Could not check Ring Group existence:', error.message);
            return false;
        }
    }

    /**
     * Check if an IVR exists
     * NOTE: IVR is not exposed in FreePBX GraphQL API, always returns false
     * @param {string} _id - IVR ID (unused - IVR not supported in API)
     * @returns {Promise<boolean>} True if exists
     */
    async ivrExists(_id) {
        // IVR is not available in FreePBX GraphQL API
        console.warn('IVR queries not supported by FreePBX GraphQL API - skipping IVR provisioning');
        return false;
    }

    /**
     * Create or update a Ring Group
     * @param {string} grpnum - Ring Group number (e.g., "8000")
     * @param {string} description - Ring Group description
     * @param {string[]} extensionList - Array of extensions to include
     * @param {string} strategy - Ring strategy: "ringall", "hunt", "memoryhunt", "firstavailable", "firstnotonphone"
     * @returns {Promise<Object>} Mutation result
     */
    async createOrUpdateRingGroup(grpnum, description, extensionList, strategy = 'ringall') {
        const exists = await this.ringGroupExists(grpnum);

        // Both addRingGroup and updateRingGroup use the same field names now
        const input = {
            groupNumber: grpnum,
            description: description,
            strategy: strategy,
            extensionList: extensionList.join('-'),
            ringTime: '20',
            groupPrefix: '',
            callerMessage: '',
            postAnswer: '',
            alertInfo: '',
            needConf: false,
            ignoreCallForward: false
        };

        const mutation = exists ? `
mutation($input: updateRingGroupInput!) {
    updateRingGroup(input: $input) {
        status
        message
    }
}
` : `
mutation($input: addRingGroupInput!) {
    addRingGroup(input: $input) {
        status
        message
    }
}
`;
        return this.query(mutation, { input });
    }

    /**
     * Create a Ring Group (legacy - use createOrUpdateRingGroup instead)
     * @param {string} grpnum - Ring Group number (e.g., "8000")
     * @param {string} description - Ring Group description
     * @param {string[]} extensionList - Array of extensions to include
     * @param {string} strategy - Ring strategy: "ringall", "hunt", "memoryhunt", "firstavailable", "firstnotonphone"
     * @returns {Promise<Object>} Mutation result
     */
    async createRingGroup(grpnum, description, extensionList, strategy = 'ringall') {
        const input = {
            groupNumber: grpnum,
            description: description,
            strategy: strategy,
            extensionList: extensionList.join('-'), // FreePBX expects dash-separated list apparently, or maybe newlines? Let's check docs or try dash
            ringTime: '20',
            groupPrefix: '',
            callerMessage: '',
            postAnswer: '',
            alertInfo: '',
            needConf: false,
            ignoreCallForward: false
        };

        const mutation = `
mutation($input: addRingGroupInput!) {
    addRingGroup(input: $input) {
        status
        message
    }
}
`;
        return this.query(mutation, { input });
    }

    /**
     * Create or update an IVR menu
     * @param {string} id - IVR ID/number (e.g., "7000")
     * @param {string} name - IVR name
     * @param {string} description - IVR description
     * @param {string} announcement - Recording ID for the announcement
     * @param {Object} entries - IVR entries mapping (e.g., {"1": "ext-local,9000,1", "2": "ext-local,9001,1"})
     * @returns {Promise<Object>} Mutation result
     */
    async createOrUpdateIVR(id, name, description, announcement, entries) {
        const exists = await this.ivrExists(id);
        const input = {
            id,
            name,
            description,
            announcement,
            directdial: 'CHECKED', // Allow direct dial
            invalid_loops: '3',
            invalid_retry_recording: announcement,
            invalid_destination: 'app-blackhole,hangup,1',
            invalid_recording: '0',
            retvm: 'CHECKED',
            timeout_time: '10',
            timeout_recording: '0',
            timeout_retry_recording: announcement,
            timeout_loops: '3',
            timeout_append_announce: false,
            timeout_destination: 'app-blackhole,hangup,1',
            // Convert entries object to the format FreePBX expects
            entries: Object.entries(entries).map(([digit, destination]) => ({
                selection: digit,
                dest: destination,
                ivr_ret: '0'
            }))
        };

        const mutationType = exists ? 'updateIVR' : 'addIVR';
        const mutation = `
mutation($input: ${mutationType}Input!) {
    ${mutationType}(input: $input) {
        status
        message
    }
}
`;
        return this.query(mutation, { input });
    }

    /**
     * Create an IVR menu (legacy - use createOrUpdateIVR instead)
     * @param {string} id - IVR ID/number (e.g., "7000")
     * @param {string} name - IVR name
     * @param {string} description - IVR description
     * @param {string} announcement - Recording ID for the announcement
     * @param {Object} entries - IVR entries mapping (e.g., {"1": "ext-local,9000,1", "2": "ext-local,9001,1"})
     * @returns {Promise<Object>} Mutation result
     */
    async createIVR(id, name, description, announcement, entries) {
        const input = {
            id,
            name,
            description,
            announcement,
            directdial: 'CHECKED', // Allow direct dial
            invalid_loops: '3',
            invalid_retry_recording: announcement,
            invalid_destination: 'app-blackhole,hangup,1',
            invalid_recording: '0',
            retvm: 'CHECKED',
            timeout_time: '10',
            timeout_recording: '0',
            timeout_retry_recording: announcement,
            timeout_loops: '3',
            timeout_append_announce: false,
            timeout_destination: 'app-blackhole,hangup,1',
            // Convert entries object to the format FreePBX expects
            entries: Object.entries(entries).map(([digit, destination]) => ({
                selection: digit,
                dest: destination,
                ivr_ret: '0'
            }))
        };

        const mutation = `
mutation($input: addIVRInput!) {
    addIVR(input: $input) {
        status
        message
    }
}
`;
        return this.query(mutation, { input });
    }

    /**
     * Apply configuration (reload Asterisk)
     * @returns {Promise<Object>} Mutation result
     */
    async applyConfig() {
        const mutation = `
            mutation {
    doreload(input: { clientMutationId: "gemini-phone" }) {
        status
        message
    }
}
`;
        return this.query(mutation);
    }

    /**
     * Test connectivity and credentials
     * @returns {Promise<{ valid: boolean, error?: string }>} True if connection is valid
     */
    async testConnection() {
        if (!this.apiUrl || this.apiUrl === 'https://') {
            return { valid: false, error: 'Incomplete or missing API URL' };
        }
        try {
            // Standard GraphQL introspection query - works on every GraphQL server
            const q = `query { __typename } `;
            await this.query(q);
            return { valid: true };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
}
