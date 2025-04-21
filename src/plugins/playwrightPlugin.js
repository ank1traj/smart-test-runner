import { BaseTestPlugin } from './basePlugin.js';
import os from 'os';

export class PlaywrightPlugin extends BaseTestPlugin {
    async runTests(testPath, options) {
        const shardCount = await this.getShardCount(options);
        const args = this.getDefaultArgs() + ' ' + (options.otherArgs || '');
        
        return `npx playwright test ${testPath} --workers=${shardCount} ${args}`;
    }

    async getShardCount(options) {
        const cpuCount = os.cpus().length;
        return Math.min(
            cpuCount,
            options.maxShards || this.config.maxShards || cpuCount
        );
    }

    getDefaultArgs() {
        return `--reporter=${this.config.reporter || 'html'} --headed=false --retries=2`;
    }

    validateConfig() {
        if (this.config.reporter && typeof this.config.reporter !== 'string') {
            throw new Error('Playwright reporter must be a string');
        }
        return true;
    }
} 