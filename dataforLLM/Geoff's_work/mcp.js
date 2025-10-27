// MCP routes - Handle Model Context Protocol operations
const express = require('express');
const { 
    getMcpStatus, 
    connectMcp, 
    disconnectMcp, 
    executeToolViaApi, 
    loadMcpConfig, 
    saveMcpConfig, 
    loadEnabledTools, 
    saveEnabledTools 
} = require('../services/mcpService');

const router = express.Router();

// Get MCP status
router.get('/mcp/status', (req, res) => {
    const status = getMcpStatus();
    res.json(status);
});

// Connect to MCP servers
router.post('/mcp/connect', async (req, res) => {
    const result = await connectMcp();
    if (result.success) {
        res.json(result);
    } else {
        res.status(400).json(result);
    }
});

// Disconnect from MCP servers
router.post('/mcp/disconnect', async (req, res) => {
    const result = await disconnectMcp();
    if (result.success) {
        res.json(result);
    } else {
        res.status(500).json(result);
    }
});

// Execute MCP tool
router.post('/mcp/execute', async (req, res) => {
    const { toolName, args } = req.body;
    const result = await executeToolViaApi(toolName, args);
    
    if (result.success) {
        res.json(result);
    } else {
        res.status(result.error ? 400 : 500).json(result);
    }
});

// Get MCP config
router.get('/mcp/config', (req, res) => {
    const result = loadMcpConfig();
    if (result.error) {
        res.status(500).json(result);
    } else {
        res.json(result);
    }
});

// Save MCP config
router.post('/mcp/config', (req, res) => {
    const { config } = req.body;
    const result = saveMcpConfig(config);
    
    if (result.success) {
        res.json(result);
    } else {
        res.status(400).json(result);
    }
});

// Get enabled tools
router.get('/enabled-tools', (req, res) => {
    const result = loadEnabledTools();
    if (result.error) {
        res.status(500).json(result);
    } else {
        res.json(result);
    }
});

// Save enabled tools
router.post('/enabled-tools', (req, res) => {
    const result = saveEnabledTools(req.body);
    if (result.success) {
        res.json(result);
    } else {
        res.status(500).json(result);
    }
});

module.exports = router;