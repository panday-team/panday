// Settings routes - Handle application settings
const express = require('express');
const https = require('https');
const http = require('http');
const { 
    getActiveProfileSettings,
    updateActiveProfile,
    loadProfiles, 
    switchProfile, 
    saveAsProfile, 
    deleteProfile 
} = require('../services/settingsService');
const { log } = require('../utils/logger');

const router = express.Router();

// Get settings
router.get('/settings', (req, res) => {
    try {
        const settings = getActiveProfileSettings();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save settings
router.post('/settings', (req, res) => {
    try {
        const result = updateActiveProfile(req.body);
        if (result.success) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Models endpoint - proxy to avoid CORS
router.post('/models', async (req, res) => {
    // Clean logging removed
    try {
        const { apiUrl, apiKey } = req.body;
        
        if (!apiUrl) {
            return res.status(400).json({ error: 'API URL is required' });
        }
        
        // Detect API provider type
        const isGoogleAPI = apiUrl.toLowerCase().includes('google');
        const isAnthropicAPI = apiUrl.toLowerCase().includes('anthropic.com');
        
        let targetUrl;
        let headers = { 'Content-Type': 'application/json' };
        
        if (isGoogleAPI && apiKey) {
            // For Google APIs, use query parameter authentication
            targetUrl = `${apiUrl}/models?key=${apiKey}`;
        } else if (isAnthropicAPI) {
            // For Anthropic APIs, use x-api-key header and anthropic-version
            targetUrl = `${apiUrl}/models`;
            if (apiKey) {
                headers['x-api-key'] = apiKey;
                headers['anthropic-version'] = '2023-06-01';
            }
        } else {
            // For other APIs, use standard Bearer token
            targetUrl = `${apiUrl}/models`;
            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }
        }
        
        const url = new URL(targetUrl);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: 'GET',
            headers: headers
        };
        
        const httpModule = url.protocol === 'https:' ? https : http;
        const apiReq = httpModule.request(options, (apiRes) => {
            let data = '';
            
            apiRes.on('data', (chunk) => {
                data += chunk;
            });
            
            apiRes.on('end', () => {
                if (apiRes.statusCode === 200) {
                    try {
                        const parsedData = JSON.parse(data);
                        res.json(parsedData);
                    } catch (parseError) {
                        res.status(500).json({ error: 'Failed to parse API response' });
                    }
                } else {
                    res.status(apiRes.statusCode).json({ 
                        error: `API error: ${apiRes.statusCode} ${apiRes.statusMessage}`,
                        details: data
                    });
                }
            });
        });
        
        apiReq.on('error', (error) => {
            log('Models API request error:', error);
            res.status(500).json({ error: `Connection error: ${error.message}` });
        });
        
        apiReq.end();
        
    } catch (error) {
        log('Models endpoint error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test connection endpoint - proxy to avoid CORS
router.post('/test-connection', async (req, res) => {
    // Clean logging removed
    try {
        const { apiUrl, apiKey, modelName } = req.body;
        
        if (!apiUrl || !modelName) {
            return res.status(400).json({ error: 'API URL and model name are required' });
        }
        
        const testData = {
            model: modelName,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1,
            stream: false
        };
        
        // Detect API provider type
        const isGoogleAPI = apiUrl.toLowerCase().includes('google');
        const isAnthropicAPI = apiUrl.toLowerCase().includes('anthropic.com');
        
        let targetUrl;
        let requestData;
        let headers = {'Content-Type': 'application/json'};
        
        if (isAnthropicAPI && apiKey) {
            // For Anthropic APIs, use different format
            targetUrl = `${apiUrl}/messages`;
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
            
            requestData = {
                model: modelName,
                max_tokens: 1,
                messages: [{ role: 'user', content: 'test' }]
            };
        } else if (isGoogleAPI && apiKey) {
            // For Google APIs, use different endpoint and format
            // Strip 'models/' prefix if it exists
            const cleanModelName = modelName.startsWith('models/') ? modelName.substring(7) : modelName;
            
            // Detect model type and use appropriate endpoint
            const isEmbeddingModel = cleanModelName.includes('embedding');
            const endpoint = isEmbeddingModel ? 'embedContent' : 'generateContent';
            targetUrl = `${apiUrl}/models/${cleanModelName}:${endpoint}?key=${apiKey}`;
            
            // Debug logging removed
            // Use different request format based on model type
            if (isEmbeddingModel) {
                requestData = {
                    content: {
                        parts: [{ text: 'test' }]
                    }
                };
            } else {
                requestData = {
                    contents: [{
                        parts: [{ text: 'test' }]
                    }]
                };
            }
        } else {
            // For other APIs, use standard OpenAI format
            targetUrl = `${apiUrl}/chat/completions`;
            requestData = testData;
            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }
        }
        
        headers['Content-Length'] = Buffer.byteLength(JSON.stringify(requestData));
        
        const url = new URL(targetUrl);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: 'POST',
            headers: headers
        };
        
        const httpModule = url.protocol === 'https:' ? https : http;
        const apiReq = httpModule.request(options, (apiRes) => {
            let data = '';
            
            apiRes.on('data', (chunk) => {
                data += chunk;
            });
            
            apiRes.on('end', () => {
                if (apiRes.statusCode === 200) {
                    res.json({ success: true, message: 'Connection test successful' });
                } else {
                    res.status(apiRes.statusCode).json({ 
                        error: `API error: ${apiRes.statusCode} ${apiRes.statusMessage}`,
                        details: data
                    });
                }
            });
        });
        
        apiReq.on('error', (error) => {
            log('Test connection error:', error);
            res.status(500).json({ error: `Connection error: ${error.message}` });
        });
        
        apiReq.write(JSON.stringify(requestData));
        apiReq.end();
        
    } catch (error) {
        log('Test connection endpoint error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PROFILES API ENDPOINTS

// Get all profiles and active profile
router.get('/profiles', (req, res) => {
    try {
        const profilesData = loadProfiles();
        res.json(profilesData);
    } catch (error) {
        log('[PROFILES] Get profiles error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Switch to a different profile
router.post('/profiles/switch', (req, res) => {
    try {
        const { profileName } = req.body;
        
        if (!profileName) {
            return res.status(400).json({ error: 'Profile name is required' });
        }
        
        const result = switchProfile(profileName);
        
        if (result.success) {
            res.json({ success: true, message: `Switched to profile: ${profileName}` });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        log('[PROFILES] Switch profile error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save current settings as a new profile
router.post('/profiles/save', (req, res) => {
    try {
        const { profileName, settings } = req.body;
        
        if (!profileName || !settings) {
            return res.status(400).json({ error: 'Profile name and settings are required' });
        }
        
        const result = saveAsProfile(profileName, settings);
        
        if (result.success) {
            res.json({ success: true, message: `Profile saved: ${profileName}` });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        log('[PROFILES] Save profile error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete a profile
router.delete('/profiles/:profileName', (req, res) => {
    try {
        const { profileName } = req.params;
        
        const result = deleteProfile(profileName);
        
        if (result.success) {
            res.json({ success: true, message: `Profile deleted: ${profileName}` });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        log('[PROFILES] Delete profile error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;