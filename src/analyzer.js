import simpleGit from 'simple-git';
import { Graph } from 'graphlib';
import path from 'path';
import fs from 'fs/promises';

export async function analyzeChanges(config) {
    const git = simpleGit();
    const changedFiles = await getChangedFiles(git);
    const dependencyGraph = await buildDependencyGraph(config);
    
    const affectedModules = new Set();
    
    for (const file of changedFiles) {
        const module = findModuleForFile(file, config);
        if (module) {
            affectedModules.add(module);
            // Add all dependent modules
            const dependents = getDependentModules(module, dependencyGraph);
            dependents.forEach(dep => affectedModules.add(dep));
        }
    }
    
    return {
        affectedModules: Array.from(affectedModules),
        dependencyGraph
    };
}

async function getChangedFiles(git) {
    const status = await git.status();
    return [
        ...status.modified,
        ...status.created,
        ...status.deleted,
        ...status.renamed.map(r => r.to)
    ];
}

async function buildDependencyGraph(config) {
    const graph = new Graph();
    
    // Add all modules as nodes
    config.modules.forEach(module => {
        graph.setNode(module.name);
    });
    
    // Add dependencies between modules
    for (const module of config.modules) {
        if (module.dependencies) {
            module.dependencies.forEach(dep => {
                graph.setEdge(module.name, dep);
            });
        }
    }
    
    return graph;
}

function findModuleForFile(filePath, config) {
    for (const module of config.modules) {
        if (filePath.startsWith(module.path)) {
            return module.name;
        }
    }
    return null;
}

function getDependentModules(module, graph) {
    const dependents = new Set();
    const visited = new Set();
    
    function visit(node) {
        if (visited.has(node)) return;
        visited.add(node);
        
        // Get all nodes that depend on this node
        const incoming = graph.inEdges(node);
        if (incoming) {
            incoming.forEach(edge => {
                dependents.add(edge.v);
                visit(edge.v);
            });
        }
    }
    
    visit(module);
    return dependents;
} 