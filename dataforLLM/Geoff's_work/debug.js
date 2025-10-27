// Debug routes - Handle debug data and tool events
const express = require('express');
const { handleDebugDataRequest, handleToolEventsStream } = require('../services/toolEventService');
const { log } = require('../utils/logger');

const router = express.Router();

// Debug data endpoint - completely separate from content
router.get('/debug/:requestId', handleDebugDataRequest);

// Tool events endpoint - Server-Sent Events for real-time tool data
router.get('/tools/:requestId', handleToolEventsStream);

// Logging endpoint for frontend
router.post('/log', (req, res) => {
    try {
        const { level, component, message, data } = req.body;
        // Format the message but skip timestamp (log() will add it)
        const logMessage = `[${level}] [${component}] ${message}`;
        // Use the log function to maintain consistency with backend logging
        log(logMessage, data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;