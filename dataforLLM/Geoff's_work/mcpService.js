// MCP Service - Model Context Protocol integration
const fs = require('fs');
const path = require('path');
const { log } = require('../utils/logger');

// Simple MCP integration (server-side only)
let mcpClient = null;
let mcpConnected = false;
let mcpTools = [];

// Initialize MCP
async function initMCP() {
    try {
        const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
        const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
        mcpClient = { Client, StdioClientTransport, connections: [], tools: [] };
        return true;
    } catch (error) {
        log('[MCP] SDK not available');
        return false;
    }
}

// Get MCP config path
function getMcpConfigPath() {
    // For portable mode, use the path set by Electron
    if (process.env.PORTABLE_USERDATA_PATH) {
        return path.join(process.env.PORTABLE_USERDATA_PATH, 'mcp_config.json');
    } else {
        return path.join(__dirname, '..', '..', 'userdata', 'mcp_config.json');
    }
}

// Get enabled tools path
function getEnabledToolsPath() {
    // For portable mode, use the path set by Electron
    if (process.env.PORTABLE_USERDATA_PATH) {
        return path.join(process.env.PORTABLE_USERDATA_PATH, 'enabled_tools.json');
    } else {
        return path.join(__dirname, '..', '..', 'userdata', 'enabled_tools.json');
    }
}

// Get MCP status
function getMcpStatus() {
    return {
        connected: mcpConnected,
        servers: mcpClient ? mcpClient.connections.map(c => ({
            name: c.name,
            connected: true,
            tools: c.tools.map(t => t.name)
        })) : [],
        totalTools: mcpTools.length,
        toolDefinitions: mcpTools.map(tool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: 'object',
                    properties: tool.schema?.inputSchema?.properties || {},
                    required: tool.schema?.inputSchema?.required || []
                }
            }
        }))
    };
}

// Connect to MCP servers
async function connectMcp() {
    try {
        const mcpReady = await initMCP();
        if (!mcpReady) {
            return { success: false, error: 'MCP SDK not available' };
        }
        
        // Load config - create default if it doesn't exist
        const configPath = getMcpConfigPath();
        if (!fs.existsSync(configPath)) {
            // Create default config
            const defaultConfig = {
                "mcpServers": {
                    "filesystem": {
                        "command": "npx",
                        "args": ["-y", "@modelcontextprotocol/server-filesystem", "./"],
                        "env": {}
                    }
                }
            };
            fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
            log('[MCP] Created default config file');
        }
        
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (!config.mcpServers) {
            return { success: false, error: 'No servers configured' };
        }
        
        // Reset
        mcpClient.connections = [];
        mcpTools = [];
        
        let connected = 0;
        
        // Connect to servers
        for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
            try {
                const client = new mcpClient.Client({ name: 'SimpleChatJS', version: '1.0.0' });
                const transport = new mcpClient.StdioClientTransport({
                    command: serverConfig.command,
                    args: serverConfig.args || [],
                    env: { ...process.env, ...(serverConfig.env || {}) }
                });
                
                await client.connect(transport);
                const toolsResult = await client.listTools();
                
                mcpClient.connections.push({
                    name,
                    client,
                    config: serverConfig,
                    tools: toolsResult.tools || []
                });
                
                // Add tools
                for (const tool of toolsResult.tools || []) {
                    mcpTools.push({
                        name: tool.name,
                        description: tool.description || '',
                        serverName: name,
                        client,
                        schema: tool
                    });
                }
                
                connected++;
                log(`[MCP] Connected to ${name} with ${toolsResult.tools.length} tools`);
            } catch (error) {
                log(`[MCP] Failed to connect to ${name}:`, error.message);
            }
        }
        
        mcpConnected = connected > 0;
        
        if (connected > 0) {
            log(`[MCP] Connected to ${connected} servers, ${mcpTools.length} tools total`);
            return { success: true, toolCount: mcpTools.length, connectedServers: connected };
        } else {
            return { success: false, error: 'Failed to connect to any servers' };
        }
        
    } catch (error) {
        log('[MCP] Connection error:', error);
        return { success: false, error: error.message };
    }
}

// Disconnect from MCP servers
async function disconnectMcp() {
    try {
        if (mcpClient && mcpClient.connections) {
            for (const conn of mcpClient.connections) {
                try {
                    await conn.client.close();
                } catch (error) {
                    log(`[MCP] Error closing ${conn.name}:`, error.message);
                }
            }
            mcpClient.connections = [];
        }
        
        mcpTools = [];
        mcpConnected = false;
        
        log('[MCP] Disconnected from all servers');
        return { success: true, message: 'Disconnected' };
    } catch (error) {
        log('[MCP] Disconnect error:', error);
        return { success: false, error: error.message };
    }
}

// Execute MCP tool
async function executeMCPTool(toolName, args) {
    if (!mcpConnected) {
        throw new Error('MCP not connected');
    }
    
    const tool = mcpTools.find(t => t.name === toolName);
    if (!tool) {
        throw new Error(`Tool '${toolName}' not found`);
    }
    
    log(`[MCP] Executing tool: ${toolName}`);
    const result = await tool.client.callTool({
        name: toolName,
        arguments: args
    });
    
    // Return the full raw MCP result as JSON - don't cherry-pick text
    const rawContent = JSON.stringify(result, null, 2);
    
    return {
        success: !result.isError,
        content: rawContent,
        isError: result.isError || false
    };
}

// Execute tool via API
async function executeToolViaApi(toolName, args) {
    try {
        if (!mcpConnected) {
            return { success: false, error: 'MCP not connected' };
        }
        
        const tool = mcpTools.find(t => t.name === toolName);
        if (!tool) {
            return { success: false, error: `Tool '${toolName}' not found` };
        }
        
        log(`[MCP] Executing tool: ${toolName}`);
        const result = await tool.client.callTool({
            name: toolName,
            arguments: args || {}
        });
        
        // Return full raw MCP result as JSON - don't cherry-pick text
        const rawContent = JSON.stringify(result, null, 2);
        
        return {
            success: !result.isError,
            content: rawContent,
            isError: result.isError || false
        };
        
    } catch (error) {
        log('[MCP] Tool execution error:', error);
        return {
            success: false,
            error: error.message,
            isError: true,
            content: `Error: ${error.message}`
        };
    }
}

// Load MCP config
function loadMcpConfig() {
    try {
        const configPath = getMcpConfigPath();
        if (fs.existsSync(configPath)) {
            const config = fs.readFileSync(configPath, 'utf8');
            return { config };
        } else {
            return { config: JSON.stringify({
                "mcpServers": {
                    "filesystem": {
                        "command": "npx",
                        "args": ["-y", "@modelcontextprotocol/server-filesystem", "./"],
                        "env": {}
                    }
                }
            }, null, 2) };
        }
    } catch (error) {
        log('[MCP] Config read error:', error);
        return { error: error.message };
    }
}

// Save MCP config
function saveMcpConfig(config) {
    try {
        // Validate JSON
        JSON.parse(config);
        
        const configPath = getMcpConfigPath();
        fs.writeFileSync(configPath, config, 'utf8');
        
        log('[MCP] Config saved successfully');
        return { success: true };
    } catch (error) {
        log('[MCP] Config save error:', error);
        return { error: error.message };
    }
}

// Load enabled tools
function loadEnabledTools() {
    try {
        const toolsPath = getEnabledToolsPath();
        if (fs.existsSync(toolsPath)) {
            const tools = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
            return tools;
        } else {
            // Return empty tools object
            return {};
        }
    } catch (error) {
        log('[TOOLS] Read error:', error);
        return { error: error.message };
    }
}

// Save enabled tools
function saveEnabledTools(tools) {
    try {
        const toolsPath = getEnabledToolsPath();
        fs.writeFileSync(toolsPath, JSON.stringify(tools, null, 2), 'utf8');
        log('[TOOLS] Enabled tools saved successfully');
        return { success: true };
    } catch (error) {
        log('[TOOLS] Save error:', error);
        return { error: error.message };
    }
}

// Get available tools for chat
function getAvailableToolsForChat(enabled_tools) {
    let availableTools = [];
    if (mcpConnected && mcpTools.length > 0) {
        log('[CHAT] Total MCP tools available:', mcpTools.length);
        log('[CHAT] Enabled tools filter:', enabled_tools);
        
        // Filter tools based on enabled_tools setting
        const filteredTools = mcpTools.filter(tool => {
            const toolKey = `${tool.serverName}.${tool.name}`;
            
            // If enabled_tools is provided, check if this tool is enabled
            if (enabled_tools) {
                const isEnabled = enabled_tools[toolKey] === true;
                log(`[CHAT] Tool ${toolKey}: ${isEnabled ? 'ENABLED' : 'DISABLED'}`);
                return isEnabled;
            }
            // If no enabled_tools filter provided, disable all tools by default (safer behavior)
            log(`[CHAT] Tool ${toolKey}: DISABLED (no filter - default disabled for security)`);
            return false;
        });
        
        log('[CHAT] Filtered tools count:', filteredTools.length);
        
        availableTools = filteredTools.map(tool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: 'object',
                    properties: tool.schema?.inputSchema?.properties || {},
                    required: tool.schema?.inputSchema?.required || []
                }
            }
        }));
    }
    return availableTools;
}

// Graceful shutdown
async function shutdownMcp() {
    if (mcpClient && mcpClient.connections) {
        for (const conn of mcpClient.connections) {
            try {
                await conn.client.close();
            } catch (error) {
                log('[MCP] Error closing connection:', error);
            }
        }
    }
}

module.exports = {
    initMCP,
    getMcpStatus,
    connectMcp,
    disconnectMcp,
    executeMCPTool,
    executeToolViaApi,
    loadMcpConfig,
    saveMcpConfig,
    loadEnabledTools,
    saveEnabledTools,
    getAvailableToolsForChat,
    shutdownMcp
};