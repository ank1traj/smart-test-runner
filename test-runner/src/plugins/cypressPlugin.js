import { BaseTestPlugin } from './basePlugin.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export class CypressPlugin extends BaseTestPlugin {
    constructor(config) {
        super(config);
        this.name = 'cypress';
    }

    async runTests(testFiles, options = {}) {
        const { headless = true, browser = 'chrome' } = options;
        
        // Build Cypress command
        let command = 'npx cypress run';
        
        if (headless) {
            command += ' --headless';
        }
        
        if (browser) {
            command += ` --browser ${browser}`;
        }
        
        // Add specific test files if provided
        if (testFiles && testFiles.length > 0) {
            command += ` --spec "${testFiles.join(',')}"`;
        }
        
        try {
            const { stdout, stderr } = await execAsync(command);
            return {
                success: true,
                output: stdout,
                error: stderr
            };
        } catch (error) {
            return {
                success: false,
                output: error.stdout,
                error: error.stderr
            };
        }
    }

    async findTestFiles(changedFiles) {
        // For Cypress, we need to find the corresponding test files
        // in the e2e directory
        const testFiles = new Set();
        
        for (const file of changedFiles) {
            // If the file is already a test file, add it
            if (file.includes('e2e/') && (file.endsWith('.test.js') || file.endsWith('.spec.js'))) {
                testFiles.add(file);
                continue;
            }
            
            // Try to find corresponding test file
            const relativePath = path.relative('src', file);
            const testPath = path.join('e2e', relativePath)
                .replace(/\.(js|ts|tsx)$/, '.test.js');
            
            if (fs.existsSync(testPath)) {
                testFiles.add(testPath);
            }
        }
        
        return Array.from(testFiles);
    }
} 