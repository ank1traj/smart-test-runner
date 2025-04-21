import { JestPlugin } from './jestPlugin.js';
import { CypressPlugin } from './cypressPlugin.js';

const plugins = {
    jest: JestPlugin,
    cypress: CypressPlugin
};

export async function loadPlugin(framework, config) {
    const PluginClass = plugins[framework];
    if (!PluginClass) {
        throw new Error(`Unsupported test framework: ${framework}`);
    }
    return new PluginClass(config);
} 