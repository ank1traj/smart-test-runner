import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function setupTool() {
    try {
        // 1. Create necessary directories
        await createDirectories();
        
        // 2. Copy tool files
        await copyToolFiles();
        
        // 3. Install dependencies
        await installDependencies();
        
        // 4. Create initial config
        await createInitialConfig();
        
        console.log('✅ Smart Test Runner setup completed successfully!');
        console.log('Next steps:');
        console.log('1. Review and customize smart-test-runner.config.json');
        console.log('2. Add your test paths and dependencies');
        console.log('3. Run tests with: npm run test:smart');
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

async function createDirectories() {
    const dirs = [
        'src/plugins',
        'scripts'
    ];
    
    for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
    }
}

async function copyToolFiles() {
    const files = [
        { src: 'src/plugins/basePlugin.js', dest: 'src/plugins/basePlugin.js' },
        { src: 'src/plugins/playwrightPlugin.js', dest: 'src/plugins/playwrightPlugin.js' },
        { src: 'src/plugins/cypressPlugin.js', dest: 'src/plugins/cypressPlugin.js' },
        { src: 'src/plugins/seleniumPlugin.js', dest: 'src/plugins/seleniumPlugin.js' },
        { src: 'src/analyzer.js', dest: 'src/analyzer.js' },
        { src: 'src/config.js', dest: 'src/config.js' },
        { src: 'src/testRunner.js', dest: 'src/testRunner.js' },
        { src: 'src/visualizer.js', dest: 'src/visualizer.js' },
        { src: 'src/index.js', dest: 'src/index.js' }
    ];
    
    for (const file of files) {
        await fs.copyFile(file.src, file.dest);
    }
}

async function installDependencies() {
    const dependencies = [
        'simple-git',
        'graphlib',
        '@playwright/test',
        'dotenv',
        'chalk',
        'vis-network',
        'express'
    ];
    
    await execAsync(`npm install --save-dev ${dependencies.join(' ')}`);
}

async function createInitialConfig() {
    const config = {
        testFramework: "playwright", // Change this based on your test framework
        modules: [],
        maxShards: 8,
        frameworkConfig: {
            playwright: {
                reporter: "html",
                retries: 2
            },
            cypress: {
                browser: "chrome",
                headless: true
            },
            selenium: {
                timeout: 30000,
                reporter: "spec"
            }
        }
    };
    
    await fs.writeFile(
        'smart-test-runner.config.json',
        JSON.stringify(config, null, 2)
    );
}

setupTool(); 