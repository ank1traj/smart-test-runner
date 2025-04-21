export class BaseTestPlugin {
    constructor(config) {
        this.config = config;
    }

    async runTests(testPath, options) {
        throw new Error('runTests method must be implemented by the plugin');
    }

    async getShardCount(options) {
        throw new Error('getShardCount method must be implemented by the plugin');
    }

    getDefaultArgs() {
        return '';
    }

    validateConfig() {
        return true;
    }
} 