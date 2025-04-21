# Smart Test Runner

A smart test runner that analyzes code dependencies and runs only affected tests.

## Features

- Analyzes code dependencies to determine affected tests
- Supports both unit tests (Jest) and E2E tests (Cypress)
- Handles various import types and edge cases
- Supports monorepo structures
- Environment-aware test running

## Installation

```bash
# Install globally
npm install -g ./test-runner

# Or install locally in your project
npm install ./test-runner --save-dev
```

## Usage

```bash
# Run all affected tests
smart-test

# Run only unit tests
smart-test --unit

# Run only E2E tests
smart-test --e2e

# Run tests for specific files
smart-test --files src/components/Button.js

# Run tests with specific environment
smart-test --env test
```

## Configuration

Create a `test-runner.config.js` in your project root:

```javascript
module.exports = {
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
```

## How It Works

1. Analyzes code dependencies using AST parsing
2. Tracks changes in source files
3. Determines which tests are affected by changes
4. Runs only the affected tests
5. Supports various test frameworks through plugins

## Supported Test Frameworks

- Jest (unit tests)
- Cypress (E2E tests)
- More frameworks can be added through plugins 