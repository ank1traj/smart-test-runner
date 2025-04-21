import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const defaultConfig = {
    // Source code patterns
    sourcePatterns: ['src/**/*.js', 'src/**/*.ts', 'src/**/*.tsx'],
    
    // Test file patterns
    testPatterns: {
        unit: ['src/**/*.test.js', 'src/**/*.spec.js'],
        e2e: ['e2e/**/*.test.js', 'e2e/**/*.spec.js']
    },
    
    // Test framework configurations
    frameworks: {
        unit: 'jest',
        e2e: 'cypress'
    },
    
    // Environment configurations
    environments: {
        test: {
            NODE_ENV: 'test'
        },
        development: {
            NODE_ENV: 'development'
        }
    }
};

export async function loadConfig() {
    try {
        // Try to load from test-runner.config.js
        const configPath = path.join(process.cwd(), 'test-runner.config.js');
        if (fs.existsSync(configPath)) {
            const config = require(configPath);
            return { ...defaultConfig, ...config };
        }
        
        // Try to load from package.json
        const pkgPath = path.join(process.cwd(), 'package.json');
        if (fs.existsSync(pkgPath)) {
            const pkg = require(pkgPath);
            if (pkg['test-runner']) {
                return { ...defaultConfig, ...pkg['test-runner'] };
            }
        }
        
        return defaultConfig;
    } catch (error) {
        console.warn('Failed to load configuration:', error.message);
        return defaultConfig;
    }
} 