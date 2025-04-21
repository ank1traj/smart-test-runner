import { TestRunner } from './testRunner.js';

async function main() {
    try {
        const config = await loadConfig();
        const testRunner = new TestRunner(config);
        
        // Initialize dependency analyzer
        await testRunner.initialize();

        // Get changed files from git
        const changedFiles = await getChangedFiles();
        
        // Find affected tests
        const affectedTests = await testRunner.findAffectedTests(changedFiles);
        
        if (affectedTests.length === 0) {
            console.log('No affected tests found.');
            return;
        }

        // Run tests
        await testRunner.runTests(affectedTests);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// ... rest of existing code ... 