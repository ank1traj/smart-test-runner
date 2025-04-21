import fs from 'fs/promises';
import path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class DependencyAnalyzer {
    constructor(config) {
        this.config = config;
        this.fileToTestMap = new Map();
        this.testToFileMap = new Map();
        this.importDependencies = new Map();
        this.pathAliases = this.loadPathAliases();
        this.monorepoConfig = this.loadMonorepoConfig();
        this.testEnvironment = process.env.NODE_ENV || 'test';
        this.jestConfig = this.loadJestConfig();
        this.envVars = this.loadEnvVars();
    }

    loadPathAliases() {
        try {
            // Try to load from tsconfig.json
            const tsconfig = require(path.join(process.cwd(), 'tsconfig.json'));
            return tsconfig.compilerOptions?.paths || {};
        } catch {
            try {
                // Try to load from webpack config
                const webpackConfig = require(path.join(process.cwd(), 'webpack.config.js'));
                return webpackConfig.resolve?.alias || {};
            } catch {
                return {};
            }
        }
    }

    loadMonorepoConfig() {
        try {
            // Try to load from lerna.json
            const lernaConfig = require(path.join(process.cwd(), 'lerna.json'));
            return {
                packages: lernaConfig.packages || ['packages/*'],
                type: 'lerna'
            };
        } catch {
            try {
                // Try to load from pnpm-workspace.yaml
                const pnpmConfig = require('yaml').parse(
                    fs.readFileSync(path.join(process.cwd(), 'pnpm-workspace.yaml'), 'utf-8')
                );
                return {
                    packages: pnpmConfig.packages || [],
                    type: 'pnpm'
                };
            } catch {
                return null;
            }
        }
    }

    loadJestConfig() {
        try {
            // Try to load from jest.config.js
            return require(path.join(process.cwd(), 'jest.config.js'));
        } catch {
            try {
                // Try to load from package.json
                const pkg = require(path.join(process.cwd(), 'package.json'));
                return pkg.jest || {};
            } catch {
                return {};
            }
        }
    }

    loadEnvVars() {
        try {
            // Load from .env.test
            const envPath = path.join(process.cwd(), `.env.${this.testEnvironment}`);
            if (fs.existsSync(envPath)) {
                const envContent = fs.readFileSync(envPath, 'utf-8');
                return envContent.split('\n')
                    .filter(line => line && !line.startsWith('#'))
                    .reduce((acc, line) => {
                        const [key, value] = line.split('=');
                        acc[key.trim()] = value.trim();
                        return acc;
                    }, {});
            }
        } catch {
            return {};
        }
    }

    resolveAliasedPath(importPath) {
        for (const [alias, paths] of Object.entries(this.pathAliases)) {
            if (importPath.startsWith(alias)) {
                const basePath = paths[0].replace('/*', '');
                return importPath.replace(alias, basePath);
            }
        }
        return importPath;
    }

    isMonorepoImport(importPath) {
        if (!this.monorepoConfig) return false;
        
        // Check if import is from another package in the monorepo
        const packagePattern = new RegExp(`^@[^/]+/|^(${this.monorepoConfig.packages.join('|')})/`);
        return packagePattern.test(importPath);
    }

    resolveMonorepoImport(importPath) {
        if (!this.monorepoConfig) return importPath;
        
        // Resolve package name from import path
        const packageMatch = importPath.match(/^(@[^/]+\/[^/]+|[^/]+)/);
        if (!packageMatch) return importPath;
        
        const packageName = packageMatch[1];
        
        // Find the package directory
        for (const packagePattern of this.monorepoConfig.packages) {
            const packageDir = path.join(process.cwd(), packagePattern.replace('*', packageName));
            if (fs.existsSync(packageDir)) {
                return path.join(packageDir, importPath.replace(packageName, 'src'));
            }
        }
        
        return importPath;
    }

    isCSSModule(filePath) {
        return filePath.endsWith('.module.css') || filePath.endsWith('.module.scss');
    }

    isMockFile(filePath) {
        return filePath.includes('__mocks__') || filePath.includes('.mock.');
    }

    isTestUtility(filePath) {
        return filePath.includes('test-utils') || 
               filePath.includes('testing-library') ||
               this.jestConfig.setupFilesAfterEnv?.includes(filePath);
    }

    async analyze() {
        // 1. Build file to test mapping
        await this.buildFileTestMappings();
        
        // 2. Analyze imports
        await this.analyzeImports();
        
        // 3. Build dependency graph
        return this.buildDependencyGraph();
    }

    async buildFileTestMappings() {
        // Find all source and test files
        const sourceFiles = await this.findFiles(this.config.sourcePatterns || ['**/*.js', '**/*.ts', '**/*.tsx']);
        const testFiles = await this.findFiles(this.config.testPatterns || [
            '**/*.test.js',
            '**/*.spec.js',
            '**/*.e2e.js',
            '**/__tests__/**/*.js'
        ]);

        // Map source files to test files
        for (const sourceFile of sourceFiles) {
            const testFile = this.findCorrespondingTestFile(sourceFile, testFiles);
            if (testFile) {
                this.fileToTestMap.set(sourceFile, testFile);
                if (!this.testToFileMap.has(testFile)) {
                    this.testToFileMap.set(testFile, new Set());
                }
                this.testToFileMap.get(testFile).add(sourceFile);
            }
        }
    }

    findCorrespondingTestFile(sourceFile, testFiles) {
        const sourceDir = path.dirname(sourceFile);
        const sourceName = path.basename(sourceFile, path.extname(sourceFile));
        
        // Try different test file naming conventions
        const possibleTestNames = [
            `${sourceName}.test`,
            `${sourceName}.spec`,
            `${sourceName}.e2e`,
            path.join('__tests__', sourceName)
        ];
        
        for (const testName of possibleTestNames) {
            const testFile = testFiles.find(file => 
                file.includes(testName) && 
                path.dirname(file).startsWith(sourceDir)
            );
            if (testFile) return testFile;
        }
        
        return null;
    }

    async analyzeImports() {
        const sourceFiles = Array.from(this.fileToTestMap.keys());
        
        for (const file of sourceFiles) {
            try {
                const content = await fs.readFile(file, 'utf-8');
                const ast = parse(content, {
                    sourceType: 'module',
                    plugins: ['jsx', 'typescript', 'dynamicImport']
                });
                
                const imports = new Set();
                traverse(ast, {
                    ImportDeclaration: ({ node }) => {
                        if (node.importKind === 'type') return;
                        
                        const importPath = node.source.value;
                        
                        // Handle CSS modules
                        if (importPath.endsWith('.module.css') || importPath.endsWith('.module.scss')) {
                            const cssModulePath = this.resolveImportPath(file, importPath);
                            imports.add(cssModulePath);
                            return;
                        }
                        
                        // Handle environment-specific imports
                        if (importPath.includes('.test.') || importPath.includes('.prod.')) {
                            const envSpecificPath = this.resolveImportPath(
                                file, 
                                importPath.replace(/\.(test|prod)\./, `.${this.testEnvironment}.`)
                            );
                            if (fs.existsSync(envSpecificPath)) {
                                imports.add(envSpecificPath);
                                return;
                            }
                        }
                        
                        if (this.isLocalImport(importPath) || this.isMonorepoImport(importPath)) {
                            let resolvedPath = this.resolveAliasedPath(importPath);
                            if (this.isMonorepoImport(resolvedPath)) {
                                resolvedPath = this.resolveMonorepoImport(resolvedPath);
                            }
                            imports.add(this.resolveImportPath(file, resolvedPath));
                        }
                    },
                    CallExpression: ({ node }) => {
                        // Handle jest.mock() calls
                        if (node.callee.object?.name === 'jest' && 
                            node.callee.property?.name === 'mock') {
                            const mockPath = node.arguments[0]?.value;
                            if (mockPath && this.isLocalImport(mockPath)) {
                                const resolvedPath = this.resolveImportPath(file, mockPath);
                                // Add both the mock file and the original file
                                imports.add(resolvedPath);
                                imports.add(resolvedPath.replace('__mocks__/', ''));
                            }
                        }
                        // Handle require() calls
                        if (node.callee.name === 'require' && node.arguments[0]) {
                            const importPath = node.arguments[0].value;
                            if (importPath && this.isLocalImport(importPath)) {
                                imports.add(this.resolveImportPath(file, importPath));
                            }
                        }
                        // Handle dynamic imports
                        if (node.callee.type === 'Import') {
                            const importPath = node.arguments[0].value;
                            if (importPath && this.isLocalImport(importPath)) {
                                imports.add(this.resolveImportPath(file, importPath));
                            }
                        }
                    },
                    ConditionalExpression: ({ node }) => {
                        // Handle conditional imports
                        if (node.consequent.type === 'CallExpression' && 
                            node.consequent.callee.name === 'require') {
                            const importPath = node.consequent.arguments[0].value;
                            if (importPath && this.isLocalImport(importPath)) {
                                imports.add(this.resolveImportPath(file, importPath));
                            }
                        }
                        if (node.alternate.type === 'CallExpression' && 
                            node.alternate.callee.name === 'require') {
                            const importPath = node.alternate.arguments[0].value;
                            if (importPath && this.isLocalImport(importPath)) {
                                imports.add(this.resolveImportPath(file, importPath));
                            }
                        }
                    },
                    MemberExpression: ({ node }) => {
                        // Handle process.env access
                        if (node.object?.name === 'process' && 
                            node.property?.name === 'env') {
                            const envVar = node.parent?.property?.name;
                            if (envVar && this.envVars[envVar]) {
                                // Mark this file as environment-dependent
                                this.markAsEnvDependent(file);
                            }
                        }
                    }
                });
                
                // Add test utility dependencies
                if (this.isTestFile(file)) {
                    for (const setupFile of this.jestConfig.setupFilesAfterEnv || []) {
                        imports.add(path.resolve(process.cwd(), setupFile));
                    }
                }
                
                this.importDependencies.set(file, Array.from(imports));
            } catch (error) {
                console.warn(`Failed to analyze imports in ${file}:`, error.message);
            }
        }
    }

    isLocalImport(importPath) {
        return !importPath.startsWith('.') && !importPath.startsWith('/');
    }

    resolveImportPath(sourceFile, importPath) {
        // Resolve the import path to an actual file
        const sourceDir = path.dirname(sourceFile);
        const modulePath = path.join(sourceDir, importPath);
        
        // Try different extensions
        const extensions = ['.js', '.ts', '.tsx', '/index.js', '/index.ts', '/index.tsx'];
        for (const ext of extensions) {
            const fullPath = modulePath + ext;
            if (fs.existsSync(fullPath)) {
                return fullPath;
            }
        }
        
        return importPath;
    }

    buildDependencyGraph() {
        const graph = {
            nodes: new Set(),
            edges: new Set()
        };
        
        // Add all files and their test mappings
        for (const [sourceFile, testFile] of this.fileToTestMap) {
            graph.nodes.add(sourceFile);
            graph.nodes.add(testFile);
            graph.edges.add({ from: sourceFile, to: testFile, type: 'test' });
        }
        
        // Add import dependencies
        for (const [sourceFile, imports] of this.importDependencies) {
            for (const importFile of imports) {
                if (graph.nodes.has(importFile)) {
                    graph.edges.add({ from: sourceFile, to: importFile, type: 'import' });
                }
            }
        }
        
        return graph;
    }

    isTestFile(filePath) {
        return filePath.includes('.test.') || 
               filePath.includes('.spec.') || 
               filePath.includes('__tests__');
    }

    async findFiles(patterns) {
        const findCommand = `find . -type f \\( ${patterns.map(p => `-name "${p}"`).join(' -o ')} \\)`;
        const { stdout } = await execAsync(findCommand);
        return stdout.split('\n').filter(Boolean);
    }

    markAsEnvDependent(file) {
        if (!this.envDependentFiles) {
            this.envDependentFiles = new Set();
        }
        this.envDependentFiles.add(file);
    }

    async findAffectedTests(changedFiles) {
        const affectedTests = new Set();
        const visitedFiles = new Set();
        
        const visitFile = (file) => {
            if (visitedFiles.has(file)) return;
            visitedFiles.add(file);
            
            // If this is a test file, add it to affected tests
            if (this.isTestFile(file)) {
                affectedTests.add(file);
            }
            
            // If this file is environment-dependent, mark all test files as affected
            if (this.envDependentFiles?.has(file)) {
                for (const testFile of this.testToFileMap.keys()) {
                    affectedTests.add(testFile);
                }
                return;
            }
            
            // Visit all files that depend on this file
            const dependencies = this.importDependencies.get(file) || [];
            for (const dep of dependencies) {
                visitFile(dep);
            }
        };
        
        // Start with changed files
        for (const file of changedFiles) {
            visitFile(file);
        }
        
        return Array.from(affectedTests);
    }
} 