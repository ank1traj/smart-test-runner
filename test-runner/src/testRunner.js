import { DependencyAnalyzer } from './dependencyAnalyzer.js';
import { loadPlugin } from './plugins/pluginLoader.js';

export class TestRunner {
    constructor(config) {
        this.config = config;
        this.dependencyAnalyzer = new DependencyAnalyzer(config);
    }

    async initialize() {
        await this.dependencyAnalyzer.analyze();
    }

    async findAffectedTests(changedFiles) {
        return await this.dependencyAnalyzer.findAffectedTests(changedFiles);
    }

    async runTests(testFiles, options = {}) {
        const { type = 'all' } = options;
        const results = [];

        // Run unit tests if requested
        if (type === 'all' || type === 'unit') {
            const unitPlugin = await loadPlugin(this.config.frameworks.unit, this.config);
            const unitTests = testFiles.filter(file => 
                this.config.testPatterns.unit.some(pattern => 
                    file.match(new RegExp(pattern.replace('*', '.*')))
                )
            );
            
            if (unitTests.length > 0) {
                const unitResult = await unitPlugin.runTests(unitTests, options);
                results.push({
                    type: 'unit',
                    ...unitResult
                });
            }
        }

        // Run E2E tests if requested
        if (type === 'all' || type === 'e2e') {
            const e2ePlugin = await loadPlugin(this.config.frameworks.e2e, this.config);
            const e2eTests = testFiles.filter(file => 
                this.config.testPatterns.e2e.some(pattern => 
                    file.match(new RegExp(pattern.replace('*', '.*')))
                )
            );
            
            if (e2eTests.length > 0) {
                const e2eResult = await e2ePlugin.runTests(e2eTests, options);
                results.push({
                    type: 'e2e',
                    ...e2eResult
                });
            }
        }

        return results;
    }
} 