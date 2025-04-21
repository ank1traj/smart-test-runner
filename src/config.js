import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'smart-test-runner.config.json');
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        
        validateConfig(config);
        return config;
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error('Configuration file not found. Please create smart-test-runner.config.json');
        }
        throw error;
    }
}

function validateConfig(config) {
    // Validate test framework
    if (!config.testFramework || typeof config.testFramework !== 'string') {
        throw new Error('Configuration must include a "testFramework" string property');
    }

    // Validate modules
    if (!config.modules || !Array.isArray(config.modules)) {
        throw new Error('Configuration must include a "modules" array');
    }
    
    for (const module of config.modules) {
        if (!module.name || typeof module.name !== 'string') {
            throw new Error('Each module must have a "name" string property');
        }
        if (!module.path || typeof module.path !== 'string') {
            throw new Error('Each module must have a "path" string property');
        }
        if (!module.testPath || typeof module.testPath !== 'string') {
            throw new Error('Each module must have a "testPath" string property');
        }
        if (module.dependencies && !Array.isArray(module.dependencies)) {
            throw new Error('Module dependencies must be an array');
        }
        if (module.maxShards && (typeof module.maxShards !== 'number' || module.maxShards < 1)) {
            throw new Error('Module maxShards must be a positive number');
        }
        if (module.testArgs && typeof module.testArgs !== 'string') {
            throw new Error('Module testArgs must be a string');
        }
    }
    
    // Validate global settings
    if (config.maxShards && (typeof config.maxShards !== 'number' || config.maxShards < 1)) {
        throw new Error('Global maxShards must be a positive number');
    }
    
    // Validate framework-specific config
    if (!config.frameworkConfig || typeof config.frameworkConfig !== 'object') {
        throw new Error('Configuration must include a "frameworkConfig" object');
    }
    
    const frameworkConfig = config.frameworkConfig[config.testFramework];
    if (!frameworkConfig) {
        throw new Error(`Framework configuration not found for ${config.testFramework}`);
    }
} 