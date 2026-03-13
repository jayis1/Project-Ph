import { loadConfig, saveConfig } from '../../config.js';
import chalk from 'chalk';

// Simple implementation of lodash.set
function set(obj, path, value) {
    if (Object(obj) !== obj) return obj;
    if (!path) return obj;

    const p = Array.isArray(path) ? path : path.split('.');

    p.slice(0, -1).reduce((a, c, i) => {
        if (Object(a[c]) !== a[c]) {
            a[c] = Math.abs(p[i + 1]) >> 0 === +p[i + 1] ? [] : {};
        }
        return a[c];
    }, obj)[p.pop()] = value;

    return obj;
}

export async function setConfig(key, value) {
    try {
        if (!key || value === undefined) {
            console.error(chalk.red('Error: usage is "ai-phone config set <key> <value>"'));
            process.exit(1);
        }

        const config = await loadConfig();

        // Handle boolean/number types crudely but effectively
        let typedValue = value;
        if (value === 'true') typedValue = true;
        if (value === 'false') typedValue = false;
        if (!isNaN(value) && value.trim() !== '') typedValue = Number(value);

        set(config, key, typedValue);

        await saveConfig(config);
        console.log(chalk.green(`✓ Updated ${key} = ${typedValue}`));

    } catch (error) {
        console.error(chalk.red('Error setting config:'), error.message);
        process.exit(1);
    }
}
