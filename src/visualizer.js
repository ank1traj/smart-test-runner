import express from 'express';
import { writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function generateVisualization(affectedModules, dependencyGraph, config) {
    const nodes = [];
    const edges = [];
    
    // Create nodes for all modules
    config.modules.forEach(module => {
        nodes.push({
            id: module.name,
            label: module.name,
            color: affectedModules.includes(module.name) ? '#ff6b6b' : '#4ecdc4',
            shape: 'box',
            font: {
                size: 16,
                color: affectedModules.includes(module.name) ? '#ffffff' : '#000000'
            }
        });
    });
    
    // Create edges for dependencies
    config.modules.forEach(module => {
        if (module.dependencies) {
            module.dependencies.forEach(dep => {
                edges.push({
                    from: module.name,
                    to: dep,
                    arrows: 'to',
                    color: affectedModules.includes(module.name) || affectedModules.includes(dep) ? '#ff6b6b' : '#4ecdc4'
                });
            });
        }
    });
    
    const html = generateHTML(nodes, edges);
    const outputPath = path.join(process.cwd(), 'dependency-graph.html');
    await writeFile(outputPath, html);
    
    return outputPath;
}

function generateHTML(nodes, edges) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Module Dependency Graph</title>
    <script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
    <style type="text/css">
        #mynetwork {
            width: 100%;
            height: 800px;
            border: 1px solid lightgray;
        }
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }
        .legend {
            margin: 20px 0;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .legend-item {
            display: inline-block;
            margin-right: 20px;
        }
        .color-box {
            display: inline-block;
            width: 20px;
            height: 20px;
            margin-right: 5px;
            vertical-align: middle;
        }
    </style>
</head>
<body>
    <h1>Module Dependency Graph</h1>
    <div class="legend">
        <div class="legend-item">
            <span class="color-box" style="background-color: #4ecdc4;"></span>
            Unaffected Module
        </div>
        <div class="legend-item">
            <span class="color-box" style="background-color: #ff6b6b;"></span>
            Affected Module
        </div>
    </div>
    <div id="mynetwork"></div>
    <script type="text/javascript">
        const nodes = new vis.DataSet(${JSON.stringify(nodes)});
        const edges = new vis.DataSet(${JSON.stringify(edges)});
        
        const container = document.getElementById('mynetwork');
        const data = {
            nodes: nodes,
            edges: edges
        };
        const options = {
            nodes: {
                shape: 'box',
                margin: 10,
                widthConstraint: {
                    minimum: 100
                }
            },
            edges: {
                smooth: {
                    type: 'cubicBezier',
                    forceDirection: 'horizontal',
                    roundness: 0.4
                }
            },
            layout: {
                hierarchical: {
                    direction: 'LR',
                    sortMethod: 'directed'
                }
            },
            physics: {
                hierarchicalRepulsion: {
                    nodeDistance: 200
                }
            }
        };
        const network = new vis.Network(container, data, options);
    </script>
</body>
</html>
    `;
} 