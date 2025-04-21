import { analyzeChanges } from './analyzer.js';
import { runTests } from './testRunner.js';
import { loadConfig } from './config.js';
import { generateVisualization } from './visualizer.js';
import chalk from 'chalk';

async function main() {
    try {
        console.log(chalk.blue('🔍 Analyzing code changes...'));
        const config = await loadConfig();
        const { affectedModules, dependencyGraph } = await analyzeChanges(config);
        
        if (affectedModules.length === 0) {
            console.log(chalk.green('✅ No tests need to be run - no relevant changes detected'));
            return;
        }

        // Generate and display the dependency graph
        const graphPath = await generateVisualization(affectedModules, dependencyGraph, config);
        console.log(chalk.blue(`📊 Generated dependency graph: ${graphPath}`));
        console.log(chalk.blue('   Open the HTML file in your browser to view the visualization'));
        
        console.log(chalk.yellow(`📋 Running tests for affected modules: ${affectedModules.join(', ')}`));
        await runTests(affectedModules, config);
        
    } catch (error) {
        console.error(chalk.red('❌ Error:', error.message));
        process.exit(1);
    }
}

main(); 