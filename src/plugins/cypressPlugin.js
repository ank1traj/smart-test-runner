import { BaseTestPlugin } from './basePlugin.js';
import os from 'os';

export class CypressPlugin extends BaseTestPlugin {
    async runTests(testPath, options) {
        const shardCount = await this.getShardCount(options);
        const args = this.getDefaultArgs() + ' ' + (options.otherArgs || '');
        
        return `npx cypress run --spec "${testPath}/**/*" --parallel --ci-build-id ${Date.now()} --record ${args}`;
    }

    async getShardCount(options) {
        const cpuCount = os.cpus().length;
        return Math.min(
            cpuCount,
            options.maxShards || this.config.maxShards || cpuCount
        );
    }

    getDefaultArgs() {
        return `--browser=${this.config.browser || 'chrome'} --headless`;
    }

    validateConfig() {
        if (this.config.browser && typeof this.config.browser !== 'string') {
            throw new Error('Cypress browser must be a string');
        }
        return true;
    }
} 