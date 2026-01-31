#!/usr/bin/env node

/**
 * Debug script to inspect config structure
 */

import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const configPath = join(homedir(), '.gemini-phone', 'config.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));

console.log('Config structure:');
console.log(JSON.stringify(config, null, 2));
