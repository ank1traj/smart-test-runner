import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function analyzeCodebase() {
    try {
        // 1. Find all test files
        const testFiles = await findTestFiles();
        
        // 2. Group tests by module
        const modules = await groupTestsByModule(testFiles);
        
        // 3. Analyze dependencies
        const dependencies = await analyzeDependencies(modules);
        
        // 4. Generate configuration
        await generateConfig(modules, dependencies);
        
        console.log('✅ Codebase analysis completed!');
        console.log('Review and customize smart-test-runner.config.json');
        
    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
        process.exit(1);
    }
}

async function findTestFiles() {
    const testPatterns = [
        '**/*.test.js',
        '**/*.spec.js',
        '**/*.e2e.js',
        '**/__tests__/**/*.js',
        '**/tests/**/*.js'
    ];
    
    const findCommand = `find . -type f \\( ${testPatterns.map(p => `-name "${p}"`).join(' -o ')} \\)`;
    const { stdout } = await execAsync(findCommand);
    
    return stdout.split('\n').filter(Boolean);
}

async function groupTestsByModule(testFiles) {
    const modules = new Map();
    
    for (const testFile of testFiles) {
        const modulePath = await findModulePath(testFile);
        if (!modulePath) continue;
        
        const moduleName = path.basename(modulePath);
        if (!modules.has(moduleName)) {
            modules.set(moduleName, {
                name: moduleName,
                path: modulePath,
                testPath: path.dirname(testFile),
                testFiles: []
            });
        }
        
        modules.get(moduleName).testFiles.push(testFile);
    }
    
    return Array.from(modules.values());
}

async function findModulePath(testFile) {
    // Look for the closest package.json or similar module indicator
    let currentDir = path.dirname(testFile);
    while (currentDir !== '/') {
        try {
            const files = await fs.readdir(currentDir);
            if (files.includes('package.json')) {
                return currentDir;
            }
            currentDir = path.dirname(currentDir);
        } catch (error) {
            break;
        }
    }
    return null;
}

async function analyzeDependencies(modules) {
    const dependencies = new Map();
    
    for (const module of modules) {
        const moduleDeps = await findModuleDependencies(module);
        dependencies.set(module.name, moduleDeps);
    }
    
    return dependencies;
}

async function findModuleDependencies(module) {
    try {
        const packageJsonPath = path.join(module.path, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        
        const deps = new Set();
        
        // Check dependencies
        if (packageJson.dependencies) {
            for (const dep of Object.keys(packageJson.dependencies)) {
                if (modules.some(m => m.name === dep)) {
                    deps.add(dep);
                }
            }
        }
        
        // Check devDependencies
        if (packageJson.devDependencies) {
            for (const dep of Object.keys(packageJson.devDependencies)) {
                if (modules.some(m => m.name === dep)) {
                    deps.add(dep);
                }
            }
        }
        
        return Array.from(deps);
    } catch (error) {
        return [];
    }
}

async function generateConfig(modules, dependencies) {
    const config = {
        testFramework: "playwright", // Change based on your framework
        modules: modules.map(module => ({
            name: module.name,
            path: module.path,
            testPath: module.testPath,
            dependencies: dependencies.get(module.name) || [],
            maxShards: 4 // Default value, adjust as needed
        })),
        maxShards: 8,
        frameworkConfig: {
            playwright: {
                reporter: "html",
                retries: 2
            }
        }
    };
    
    await fs.writeFile(
        'smart-test-runner.config.json',
        JSON.stringify(config, null, 2)
    );
}

analyzeCodebase(); 