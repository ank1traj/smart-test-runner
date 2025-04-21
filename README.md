# Smart Test Runner

A framework-agnostic tool that intelligently runs tests based on code changes, ensuring that only relevant tests are executed. It supports multiple test frameworks including Playwright, Cypress, and Selenium.

## Features

- 🎯 **Smart Test Selection**: Only runs tests affected by code changes
- 🔄 **Dependency Analysis**: Automatically detects and handles module dependencies
- 📊 **Visual Dependency Graph**: Interactive visualization of module relationships
- ⚡ **Parallel Execution**: Intelligent sharding for faster test execution
- 🛠️ **Framework Agnostic**: Works with Playwright, Cypress, Selenium, and more
- 🔍 **Code Analysis**: Automatically analyzes your codebase structure
- 🎨 **Beautiful UI**: Clear console output and visualizations

## Installation

```bash
# Install the package
npm install smart-test-runner --save-dev

# Run the setup script
npm run setup:smart-test
```

## Quick Start

1. **Analyze Your Codebase**:
```bash
npm run analyze:codebase
```
This will analyze your codebase and generate an initial configuration.

2. **Review Configuration**:
Open `smart-test-runner.config.json` and customize as needed:
```json
{
    "testFramework": "playwright",
    "modules": [
        {
            "name": "auth",
            "path": "src/auth",
            "testPath": "src/auth/tests",
            "dependencies": [],
            "maxShards": 4
        }
    ],
    "frameworkConfig": {
        "playwright": {
            "reporter": "html",
            "retries": 2
        }
    }
}
```

3. **Run Tests**:
```bash
npm run test:smart
```

## Configuration

### Global Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `testFramework` | Your test framework (playwright, cypress, selenium) | - |
| `maxShards` | Maximum number of parallel test executions | 8 |

### Module Settings

| Setting | Description | Required |
|---------|-------------|----------|
| `name` | Unique identifier for the module | Yes |
| `path` | Path to the module's source code | Yes |
| `testPath` | Path to the module's test files | Yes |
| `dependencies` | Array of module names this module depends on | No |
| `maxShards` | Maximum shards for this module | No |
| `testArgs` | Framework-specific test arguments | No |

### Framework-Specific Settings

#### Playwright
```json
{
    "frameworkConfig": {
        "playwright": {
            "reporter": "html",
            "retries": 2,
            "timeout": 30000
        }
    }
}
```

#### Cypress
```json
{
    "frameworkConfig": {
        "cypress": {
            "browser": "chrome",
            "headless": true
        }
    }
}
```

#### Selenium
```json
{
    "frameworkConfig": {
        "selenium": {
            "timeout": 30000,
            "reporter": "spec"
        }
    }
}
```

## How It Works

1. **Change Detection**:
   - Monitors git changes
   - Identifies affected files
   - Maps files to modules

2. **Dependency Analysis**:
   - Builds dependency graph
   - Identifies affected modules
   - Includes dependent modules

3. **Test Execution**:
   - Calculates optimal shard count
   - Runs tests in parallel
   - Provides detailed results

4. **Visualization**:
   - Generates interactive dependency graph
   - Highlights affected modules
   - Shows test execution status

## Adding a New Test Framework

1. Create a new plugin in `src/plugins/`:
```javascript
import { BaseTestPlugin } from './basePlugin.js';

export class YourFrameworkPlugin extends BaseTestPlugin {
    async runTests(testPath, options) {
        // Implement test execution logic
    }

    async getShardCount(options) {
        // Implement sharding logic
    }

    getDefaultArgs() {
        // Return default framework arguments
    }

    validateConfig() {
        // Validate framework-specific config
    }
}
```

2. Update configuration:
```json
{
    "testFramework": "your-framework",
    "frameworkConfig": {
        "your-framework": {
            // Framework-specific settings
        }
    }
}
```

## CI/CD Integration

Add to your CI/CD pipeline:
```yaml
steps:
  - name: Run Smart Tests
    run: npm run test:smart
```

## Best Practices

1. **Module Organization**:
   - Keep modules independent
   - Define clear dependencies
   - Use consistent test paths

2. **Sharding**:
   - Adjust shard counts based on test size
   - Monitor test execution times
   - Balance between speed and resource usage

3. **Dependencies**:
   - Keep dependency chains short
   - Avoid circular dependencies
   - Document module relationships

## Troubleshooting

### Common Issues

1. **Tests Not Running**:
   - Check module paths in config
   - Verify test file patterns
   - Check framework configuration

2. **Slow Execution**:
   - Adjust shard counts
   - Review module dependencies
   - Check framework settings

3. **Dependency Issues**:
   - Review dependency graph
   - Check for circular dependencies
   - Verify module paths

### Debugging

1. **Enable Verbose Output**:
```bash
DEBUG=smart-test-runner npm run test:smart
```

2. **Check Dependency Graph**:
   - Open `dependency-graph.html`
   - Review module relationships
   - Verify affected modules

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT

## Support

For issues and feature requests, please use the GitHub issue tracker. 