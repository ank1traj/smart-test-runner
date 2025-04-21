import { BaseTestPlugin } from './basePlugin.js';
import os from 'os';

export class SeleniumPlugin extends BaseTestPlugin {
    async runTests(testPath, options) {
        const shardCount = await this.getShardCount(options);
        const args = this.getDefaultArgs() + ' ' + (options.otherArgs || '');
        
        return `npx mocha ${testPath}/**/*.test.js --parallel ${shardCount} ${args}`;
    }

    async getShardCount(options) {
        const cpuCount = os.cpus().length;
        return Math.min(
            cpuCount,
            options.maxShards || this.config.maxShards || cpuCount
        );
    }

    getDefaultArgs() {
        return `--timeout=${this.config.timeout || 30000} --reporter=${this.config.reporter || 'spec'}`;
    }

    validateConfig() {
        if (this.config.timeout && typeof this.config.timeout !== 'number') {
            throw new Error('Selenium timeout must be a number');
        }
        if (this.config.reporter && typeof this.config.reporter !== 'string') {
            throw new Error('Selenium reporter must be a string');
        }
        return true;
    }
} 