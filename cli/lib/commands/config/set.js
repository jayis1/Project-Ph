import { loadConfig, saveConfig } from '../../config.js';
import chalk from 'chalk';
import lodash from 'lodash';

const { set } = lodash;

export async function setConfig(key, value) {
    try {
        if (!key || value === undefined) {
            console.error(chalk.red('Error: usage is "gemini-phone config set <key> <value>"'));
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
