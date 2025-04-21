import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import { BaseTestPlugin } from './plugins/basePlugin.js';
import { DependencyAnalyzer } from './dependencyAnalyzer.js';

const execAsync = promisify(exec);

export class TestRunner {
    constructor(config) {
        this.config = config;
        this.dependencyAnalyzer = new DependencyAnalyzer(config);
        this.dependencyGraph = null;
    }

    async initialize() {
        // Build dependency graph
        this.dependencyGraph = await this.dependencyAnalyzer.analyze();
    }

    async findAffectedTests(changedFiles) {
        if (!this.dependencyGraph) {
            await this.initialize();
        }

        const affectedTests = new Set();
        const visitedFiles = new Set();

        const visitFile = (file) => {
            if (visitedFiles.has(file)) return;
            visitedFiles.add(file);

            // If this is a test file, add it to affected tests
            if (this.dependencyAnalyzer.testToFileMap.has(file)) {
                affectedTests.add(file);
            }

            // Visit all files that depend on this file
            for (const edge of this.dependencyGraph.edges) {
                if (edge.to === file) {
                    visitFile(edge.from);
                }
            }
        };

        // Start with changed files
        for (const file of changedFiles) {
            visitFile(file);
        }

        return Array.from(affectedTests);
    }

    async runTests(affectedModules) {
        const testResults = [];
        
        // Load the appropriate plugin based on configuration
        const plugin = await this.loadPlugin(this.config.testFramework);
        
        for (const module of affectedModules) {
            const moduleConfig = this.config.modules.find(m => m.name === module);
            if (!moduleConfig || !moduleConfig.testPath) {
                console.log(chalk.yellow(`⚠️  No test configuration found for module: ${module}`));
                continue;
            }
            
            console.log(chalk.blue(`🧪 Running tests for module: ${module}`));
            
            try {
                const command = await plugin.runTests(moduleConfig.testPath, {
                    maxShards: moduleConfig.maxShards,
                    otherArgs: moduleConfig.testArgs
                });
                
                console.log(chalk.blue(`   Command: ${command}`));
                
                const { stdout, stderr } = await execAsync(command);
                
                testResults.push({
                    module,
                    success: true,
                    output: stdout
                });
                
                console.log(chalk.green(`✅ Tests passed for module: ${module}`));
            } catch (error) {
                testResults.push({
                    module,
                    success: false,
                    error: error.message
                });
                
                console.log(chalk.red(`❌ Tests failed for module: ${module}`));
                console.log(error.message);
            }
        }
        
        return testResults;
    }

    async loadPlugin(framework) {
        try {
            const pluginModule = await import(`./plugins/${framework}Plugin.js`);
            const PluginClass = pluginModule[`${framework.charAt(0).toUpperCase() + framework.slice(1)}Plugin`];
            return new PluginClass(this.config);
        } catch (error) {
            throw new Error(`Failed to load plugin for framework: ${framework}. Error: ${error.message}`);
        }
    }
} 