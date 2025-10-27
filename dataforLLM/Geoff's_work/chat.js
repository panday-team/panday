// Chat routes - Handle chat operations and messaging
const express = require('express');
const { db } = require('../config/database');
const { processChatRequest, saveTurnDebugData, getTurnDebugData, getAllTurnDebugData, createChatBranch, getChatBranches, getActiveChatBranch, setActiveChatBranch } = require('../services/chatService');
const { log } = require('../utils/logger');

const router = express.Router();

// Utility function to extract preview text from multimodal content
function extractPreviewText(content) {
    if (typeof content === 'string') {
        return content;
    }
    if (Array.isArray(content)) {
        // Extract text from multimodal array
        const textPart = content.find(part => part.type === 'text');
        const filesPart = content.find(part => part.type === 'files');
        const imageParts = content.filter(part => part.type === 'image');
        
        // Priority: text content first
        if (textPart && textPart.text) {
            // If there's text plus other content, show text with indicators
            const extras = [];
            if (filesPart && filesPart.files && filesPart.files.length > 0) {
                if (filesPart.files.length === 1) {
                    const file = filesPart.files[0];
                    const fileName = file.fileName || file.name || file.originalName || 'Unknown file';
                    extras.push(`[File] ${fileName}`);
                } else {
                    extras.push(`[${filesPart.files.length} files]`);
                }
            }
            if (imageParts.length > 0) {
                if (imageParts.length === 1) {
                    extras.push('[Image]');
                } else {
                    extras.push(`[${imageParts.length} images]`);
                }
            }
            
            if (extras.length > 0) {
                return `${textPart.text} + ${extras.join(' + ')}`;
            }
            return textPart.text;
        } 
        // No text content, show files/images only
        else {
            const parts = [];
            if (filesPart && filesPart.files && filesPart.files.length > 0) {
                if (filesPart.files.length === 1) {
                    const file = filesPart.files[0];
                    const fileName = file.fileName || file.name || file.originalName || 'Unknown file';
                    parts.push(`[File] ${fileName}`);
                } else {
                    parts.push(`[${filesPart.files.length} files]`);
                }
            }
            if (imageParts.length > 0) {
                if (imageParts.length === 1) {
                    parts.push('[Image]');
                } else {
                    parts.push(`[${imageParts.length} images]`);
                }
            }
            if (parts.length > 0) {
                return parts.join(' + ');
            } else {
                return '[Multimodal content]';
            }
        }
    }
    // Handle any other data types gracefully
    if (typeof content === 'object' && content !== null) {
        return '[Complex content]';
    }
    return String(content || '');
}

// Get all chats (everything-is-a-branch system)
router.get('/chats', (req, res) => {
    // Get chats with their last message content from active branches
    const query = `
        SELECT 
            c.id,
            c.title,
            c.created_at,
            c.updated_at,
            COALESCE(bm.content, '') as last_message
        FROM chats c
        LEFT JOIN chat_branches cb ON c.id = cb.chat_id AND cb.is_active = TRUE
        LEFT JOIN (
            SELECT 
                branch_id,
                content,
                ROW_NUMBER() OVER (PARTITION BY branch_id ORDER BY timestamp DESC) as rn
            FROM branch_messages
            WHERE role = 'user'
        ) bm ON cb.id = bm.branch_id AND bm.rn = 1
        ORDER BY c.updated_at DESC
    `;
    
    try {
        const rows = db.prepare(query).all();
        log(`[CHATS] Found ${rows ? rows.length : 0} chats:`, rows);
        // Transform the data to match frontend expectations
        const chats = (rows || []).map(row => {
            let processedLastMessage = row.last_message || '';
            
            // Process multimodal content for preview
            if (processedLastMessage && (processedLastMessage.startsWith('[') || processedLastMessage.startsWith('{'))) {
                try {
                    const parsed = JSON.parse(processedLastMessage);
                    processedLastMessage = extractPreviewText(parsed);
                } catch (e) {
                    // If parsing fails, keep original
                    processedLastMessage = row.last_message || '';
                }
            }
            
            // Convert SQLite timestamp to ISO string for consistent parsing
            const timestamp = row.updated_at || row.created_at;
            const isoTimestamp = timestamp ? new Date(timestamp + 'Z').toISOString() : new Date().toISOString();
            
            return {
                chat_id: row.id,
                title: row.title,
                last_message: processedLastMessage,
                last_updated: isoTimestamp
            };
        });
        res.json(chats);
    } catch (err) {
        log('[CHATS] List error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create new chat (everything-is-a-branch system)
router.post('/chats', async (req, res) => {
    const { chat_id, title } = req.body;
    
    if (!chat_id) {
        return res.status(400).json({ error: 'chat_id is required' });
    }
    
    try {
        // Create chat in chats table
        const stmt = db.prepare('INSERT OR REPLACE INTO chats (id, title, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)');
        const result = stmt.run(chat_id, title || 'New Chat');
        
        // ALWAYS create a main branch for every new chat (everything-is-a-branch)
        const { createChatBranch, setActiveChatBranch } = require('../services/chatService');
        
        // Check if main branch already exists
        const existingBranchStmt = db.prepare(`
            SELECT id FROM chat_branches 
            WHERE chat_id = ? AND branch_name = 'main'
        `);
        const existingBranch = existingBranchStmt.get(chat_id);
        
        if (!existingBranch) {
            // Create main branch for this chat
            const newBranch = await createChatBranch(chat_id);
            await setActiveChatBranch(chat_id, newBranch.branchId);
            log(`[CHAT-CREATE] Created main branch for new chat ${chat_id}`);
        }
        
        res.json({ success: true, chat_id });
    } catch (err) {
        log('[CHAT] Create error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get chat history including errored messages for UI display
router.get('/chat/:id/history-complete', (req, res) => {
    const chatId = req.params.id;
    
    try {
        log(`[HISTORY-COMPLETE] Getting complete history including errors for chat ${chatId}`);
        
        // Get the active branch
        const activeBranchStmt = db.prepare(`
            SELECT id, branch_name
            FROM chat_branches
            WHERE chat_id = ? AND is_active = TRUE
            LIMIT 1
        `);
        const activeBranch = activeBranchStmt.get(chatId);
        
        if (!activeBranch) {
            log(`[HISTORY-COMPLETE] No active branch found for chat ${chatId}`);
            return res.json({ messages: [] });
        }
        
        // Get ALL messages including errored ones
        const messagesStmt = db.prepare(`
            SELECT id, original_message_id, role, content, turn_number, tool_calls, tool_call_id, tool_name, blocks, debug_data, edit_count, edited_at, timestamp, original_content, file_metadata, error_state
            FROM branch_messages
            WHERE branch_id = ?
            ORDER BY timestamp ASC
        `);
        const branchMessages = messagesStmt.all(activeBranch.id);
        
        const messages = branchMessages.map(row => {
            const parsedBlocks = row.blocks ? JSON.parse(row.blocks) : null;
            const debugData = row.debug_data ? JSON.parse(row.debug_data) : null;
            
            // Parse file metadata
            let originalContent = null;
            let fileMetadata = null;
            
            if (row.original_content) {
                try {
                    originalContent = typeof row.original_content === 'string' && row.original_content.startsWith('[')
                        ? JSON.parse(row.original_content)
                        : row.original_content;
                } catch (e) {
                    log(`[HISTORY-COMPLETE] Error parsing original_content: ${e.message}`);
                }
            }
            
            if (row.file_metadata) {
                try {
                    fileMetadata = JSON.parse(row.file_metadata);
                } catch (e) {
                    log(`[HISTORY-COMPLETE] Error parsing file_metadata: ${e.message}`);
                }
            }
            
            // Parse content
            let parsedContent = row.content;
            if (typeof row.content === 'string' && row.content.startsWith('[')) {
                try {
                    parsedContent = JSON.parse(row.content);
                } catch (e) {
                    parsedContent = row.content;
                }
            }
            
            const message = {
                id: row.original_message_id || row.id,
                role: row.role,
                content: parsedContent,
                timestamp: row.timestamp,
                turn_number: row.turn_number,
                edit_count: row.edit_count || 0,
                edited_at: row.edited_at,
                debug_data: debugData,
                blocks: parsedBlocks,
                error_state: row.error_state // Include error state for UI
            };
            
            // Add file handling fields if present
            if (originalContent !== null) {
                message.original_content = originalContent;
            }
            if (fileMetadata !== null) {
                message.file_metadata = fileMetadata;
            }
            
            // Add tool data if present
            if (row.tool_calls) {
                try {
                    message.tool_calls = JSON.parse(row.tool_calls);
                } catch (e) {
                    log(`[HISTORY-COMPLETE] Error parsing tool_calls: ${e.message}`);
                }
            }
            if (row.tool_call_id) {
                message.tool_call_id = row.tool_call_id;
            }
            if (row.tool_name) {
                message.tool_name = row.tool_name;
            }
            
            return message;
        });
        
        log(`[HISTORY-COMPLETE] Retrieved ${messages.length} messages (including errors) from branch '${activeBranch.branch_name}'`);
        res.json({ messages });
        
    } catch (err) {
        log('[HISTORY-COMPLETE] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get chat history (everything-is-a-branch system) - FILTERED for AI
router.get('/chat/:id/history', (req, res) => {
    const chatId = req.params.id;
    
    try {
        // Everything-is-a-branch: Always use active branch
        log(`[HISTORY] Getting history from active branch for chat ${chatId}`);
        
        // Get the active branch
        const activeBranchStmt = db.prepare(`
            SELECT id, branch_name
            FROM chat_branches
            WHERE chat_id = ? AND is_active = TRUE
            LIMIT 1
        `);
        const activeBranch = activeBranchStmt.get(chatId);
        
        if (!activeBranch) {
            log(`[HISTORY] No active branch found for chat ${chatId} - this shouldn't happen in everything-is-a-branch system`);
            return res.json({ messages: [] });
        }
        
        // Get all messages from the active branch (including new file handling fields)
        const messagesStmt = db.prepare(`
            SELECT id, original_message_id, role, content, turn_number, tool_calls, tool_call_id, tool_name, blocks, debug_data, edit_count, edited_at, timestamp, original_content, file_metadata
            FROM branch_messages
            WHERE branch_id = ?
            ORDER BY timestamp ASC
        `);
        const branchMessages = messagesStmt.all(activeBranch.id);
        
        const messages = branchMessages.map(row => {
            const parsedBlocks = row.blocks ? JSON.parse(row.blocks) : null;
            const debugData = row.debug_data ? JSON.parse(row.debug_data) : null;            
            // Parse new file handling fields
            let originalContent = null;
            let fileMetadata = null;
            
            if (row.original_content) {
                try {
                    originalContent = typeof row.original_content === 'string' && row.original_content.startsWith('[')
                        ? JSON.parse(row.original_content)
                        : row.original_content;
                } catch (e) {
                    log(`[HISTORY] Error parsing original_content: ${e.message}`);
                }
            }
            
            if (row.file_metadata) {
                try {
                    fileMetadata = JSON.parse(row.file_metadata);
                } catch (e) {
                    log(`[HISTORY] Error parsing file_metadata: ${e.message}`);
                }
            }
            
            // Parse content - handle both string and JSON (multimodal) content
            let parsedContent = row.content;
            if (typeof row.content === 'string' && row.content.startsWith('[')) {
                try {
                    // Try to parse as JSON array (multimodal content)
                    parsedContent = JSON.parse(row.content);
                } catch (e) {
                    // If parsing fails, keep as string
                    parsedContent = row.content;
                }
            }
            
            log(`[HISTORY] Loading blocks for ${row.role} message in turn ${row.turn_number}:`, parsedBlocks ? parsedBlocks.map(b => ({ type: b.type, id: b.id })) : 'null');
            
            const message = {
                id: row.original_message_id || row.id, // Use original ID if available for editing compatibility
                role: row.role,
                content: parsedContent,
                timestamp: row.timestamp,
                turn_number: row.turn_number,
                edit_count: row.edit_count || 0,
                edited_at: row.edited_at,
                debug_data: debugData,
                blocks: parsedBlocks
            };
            
            // Add new file handling fields if present
            if (originalContent !== null) {
                message.original_content = originalContent;
            }
            if (fileMetadata !== null) {
                message.file_metadata = fileMetadata;
            }
            
            // Add tool data if present
            if (row.tool_calls) {
                try {
                    message.tool_calls = JSON.parse(row.tool_calls);
                } catch (e) {
                    log(`[HISTORY] Error parsing tool_calls: ${e.message}`);
                }
            }
            if (row.tool_call_id) {
                message.tool_call_id = row.tool_call_id;
            }
            if (row.tool_name) {
                message.tool_name = row.tool_name;
            }
            
            return message;
        });
        
        log(`[HISTORY] Retrieved ${messages.length} successful messages from branch '${activeBranch.branch_name}' (errors filtered out)`);
        res.json({ messages });
        
    } catch (err) {
        log('[HISTORY] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete chat
router.delete('/chat/:id', (req, res) => {
    const chatId = req.params.id;
    
    try {
        // Begin transaction
        db.prepare('BEGIN TRANSACTION').run();
        
        // Everything-is-a-branch: Delete all branch messages and branches for this chat
        // First delete all branch messages
        const deleteBranchMessages = db.prepare(`
            DELETE FROM branch_messages 
            WHERE branch_id IN (SELECT id FROM chat_branches WHERE chat_id = ?)
        `);
        deleteBranchMessages.run(chatId);
        
        // Then delete all branches for this chat
        const deleteBranches = db.prepare('DELETE FROM chat_branches WHERE chat_id = ?');
        deleteBranches.run(chatId);
        
        // Finally delete the chat itself
        const deleteChat = db.prepare('DELETE FROM chats WHERE id = ?');
        deleteChat.run(chatId);
        
        // Commit transaction
        db.prepare('COMMIT').run();
        
        log(`[CHAT] Deleted chat: ${chatId}`);
        res.json({ success: true });
    } catch (err) {
        // Rollback on error
        try { db.prepare('ROLLBACK').run(); } catch (rollbackErr) { /* ignore */ }
        
        log('[CHAT] Error deleting chat:', err);
        res.status(500).json({ error: err.message });
    }
});

// Save message using unified approach
router.post('/message', async (req, res) => {
    try {
        const { chat_id, role, content, turn_number, blocks, tool_calls, tool_call_id, tool_name, original_content, file_metadata } = req.body;
        
        if (!chat_id || !role || content === null || content === undefined) {
            return res.status(400).json({ error: 'chat_id, role, and content are required' });
        }
        
        // Create complete message structure with all possible fields
        const completeMessage = {
            role: role,
            content: content
        };
        
        // Add tool-specific fields if present
        if (tool_calls) completeMessage.tool_calls = tool_calls;
        if (tool_call_id) completeMessage.tool_call_id = tool_call_id;
        if (tool_name) completeMessage.tool_name = tool_name;
        
        // Add new file handling fields if present
        if (original_content !== undefined) completeMessage.originalContent = original_content;
        if (file_metadata !== undefined) completeMessage.fileMetadata = file_metadata;
        
        // Use the unified save function
        const { saveCompleteMessageToDatabase, incrementTurnNumber } = require('../services/chatService');
        // Use turn number provided by frontend
        await saveCompleteMessageToDatabase(chat_id, completeMessage, blocks, turn_number);
        
        // Increment turn number when user sends a message (starts new conversation turn)
        if (role === 'user') {
            incrementTurnNumber(chat_id);
        }
        
        res.json({ success: true });
        
    } catch (error) {
        log('[MESSAGE] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update chat title
router.patch('/chat/:id/title', (req, res) => {
    const chatId = req.params.id;
    const { title } = req.body;
    
    if (!title) {
        return res.status(400).json({ error: 'title is required' });
    }
    
    try {
        const stmt = db.prepare('UPDATE chats SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        const result = stmt.run(title, chatId);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Chat not found' });
        }
        
        log(`[CHAT] Updated title for chat ${chatId} to "${title}"`);
        res.json({ success: true, chat_id: chatId, title: title });
    } catch (err) {
        log('[CHAT] Error updating title:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get clean chat history in API format (for user debug panels)
router.get('/chat/:id/api-history', (req, res) => {
    const chatId = req.params.id;
    
    try {
        const { getChatHistoryForAPI } = require('../services/chatService');
        const apiHistory = getChatHistoryForAPI(chatId);
        res.json(apiHistory);
    } catch (err) {
        log('[API-HISTORY] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get current turn number for a chat
router.get('/chat/:id/current-turn', (req, res) => {
    const { id: chatId } = req.params;
    
    try {
        const { getCurrentTurnNumber } = require('../services/chatService');
        const turnNumber = getCurrentTurnNumber(chatId);
        res.json({ turn_number: turnNumber });
    } catch (err) {
        log('[CURRENT-TURN] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update debug data for a message
router.patch('/message/debug', async (req, res) => {
    try {
        const { chat_id, role, turn_number, debug_data } = req.body;
        
        if (!chat_id || !role || !turn_number) {
            return res.status(400).json({ error: 'chat_id, role, and turn_number are required' });
        }
        
        const { updateMessageDebugData } = require('../services/chatService');
        await updateMessageDebugData(chat_id, role, turn_number, debug_data);
        
        res.json({ success: true });
        
    } catch (error) {
        log('[UPDATE-DEBUG] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Turn data endpoints (RESTful design)
// Save turn data
router.post('/chat/:id/turns/:turnNumber', async (req, res) => {
    try {
        const { id: chatId, turnNumber } = req.params;
        const { data } = req.body;
        const turnNum = parseInt(turnNumber, 10);
        
        if (isNaN(turnNum)) {
            return res.status(400).json({ error: 'Invalid turn number' });
        }
        
        if (!data) {
            return res.status(400).json({ error: 'data is required' });
        }
        
        await saveTurnDebugData(chatId, turnNum, data);
        res.json({ success: true });
        
    } catch (error) {
        log('[TURN-DATA-SAVE] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get turn data
router.get('/chat/:id/turns/:turnNumber', (req, res) => {
    try {
        const { id: chatId, turnNumber } = req.params;
        const turnNum = parseInt(turnNumber, 10);
        
        if (isNaN(turnNum)) {
            return res.status(400).json({ error: 'Invalid turn number' });
        }
        
        const turnData = getTurnDebugData(chatId, turnNum);
        
        if (turnData) {
            res.json(turnData);
        } else {
            res.status(404).json({ error: 'Turn data not found' });
        }
        
    } catch (error) {
        log('[TURN-DATA-GET] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get messages for a specific turn
router.get('/chat/:id/turn/:turnNumber', (req, res) => {
    try {
        const { id: chatId, turnNumber } = req.params;
        const turnNum = parseInt(turnNumber, 10);
        
        if (isNaN(turnNum)) {
            return res.status(400).json({ error: 'Invalid turn number' });
        }
        
        // Get all messages for this turn from the current active branch
        // First, get the active branch for this chat
        const activeBranchStmt = db.prepare(`
            SELECT id FROM chat_branches 
            WHERE chat_id = ? AND is_active = TRUE 
            LIMIT 1
        `);
        const activeBranch = activeBranchStmt.get(chatId);
        
        let messages = [];
        
        if (activeBranch) {
            // Get messages from the active branch
            log(`[TURN-MESSAGES] Getting messages from active branch ${activeBranch.id} for turn ${turnNum}`);
            const stmt = db.prepare(`
                SELECT id, role, content, timestamp, blocks, turn_number, 
                       edit_count, edited_at 
                FROM branch_messages 
                WHERE branch_id = ? AND turn_number = ? 
                ORDER BY timestamp ASC
            `);
            messages = stmt.all(activeBranch.id, turnNum);
        } else {
            // Everything-is-a-branch: No active branch should never happen
            log(`[TURN-MESSAGES] ERROR: No active branch found for chat ${chatId} - this violates everything-is-a-branch principle`);
            return res.status(500).json({ error: `No active branch found for chat ${chatId}. Every chat must have a main branch.` });
        }
        
        log(`[TURN-MESSAGES] Found ${messages.length} messages for turn ${turnNum} in chat ${chatId}`);
        
        // Parse blocks for each message and handle multimodal content
        const processedMessages = messages.map(msg => {
            let processedContent = msg.content;
            
            // Parse JSON stringified multimodal content
            if (typeof msg.content === 'string' && msg.content.startsWith('[')) {
                try {
                    processedContent = JSON.parse(msg.content);
                } catch (e) {
                    // If parsing fails, keep as string
                    processedContent = msg.content;
                }
            }
            
            return {
                ...msg,
                content: processedContent,
                blocks: msg.blocks ? JSON.parse(msg.blocks) : null,
                edit_count: msg.edit_count || 0
            };
        });
        
        res.json({ messages: processedMessages });
        
    } catch (error) {
        log('[TURN-MESSAGES] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all turn data for a chat
router.get('/chat/:id/turns', (req, res) => {
    try {
        const { id: chatId } = req.params;
        
        const turnDataMap = getAllTurnDebugData(chatId);
        res.json(turnDataMap);
        
    } catch (error) {
        log('[ALL-TURN-DATA] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Main chat endpoint that frontend expects
router.post('/chat', processChatRequest);

// ===== TURN VERSIONING ENDPOINTS =====

// Create new branch for retry from a specific turn
router.post('/chat/:id/turn/:turnNumber/retry', async (req, res) => {
    try {
        const { id: chatId, turnNumber } = req.params;
        const turnNum = parseInt(turnNumber, 10);
        
        if (isNaN(turnNum)) {
            return res.status(400).json({ error: 'Invalid turn number' });
        }
        
        const branchInfo = await createChatBranch(chatId, turnNum);
        
        // Set the new branch as active
        await setActiveChatBranch(chatId, branchInfo.branchId);
        
        res.json({ 
            success: true, 
            branchId: branchInfo.branchId,
            branchName: branchInfo.branchName,
            branchPoint: branchInfo.branchPoint
        });
        
    } catch (error) {
        log('[RETRY] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all branches for a chat
router.get('/chat/:id/branches', (req, res) => {
    try {
        const { id: chatId } = req.params;
        
        const branches = getChatBranches(chatId);
        const activeBranch = getActiveChatBranch(chatId);
        
        const responseData = { 
            branches,
            activeBranch,
            totalBranches: branches.length
        };
        
        log(`[BRANCHES] API response for chat ${chatId}: activeBranch=${activeBranch?.branch_name}, totalBranches=${branches.length}`);
        
        res.json(responseData);
        
    } catch (error) {
        log('[BRANCHES] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Switch to a specific branch
router.post('/chat/:id/branch/:branchId/activate', (req, res) => {
    try {
        const { id: chatId, branchId } = req.params;
        const branchIdNum = parseInt(branchId, 10);
        
        if (isNaN(branchIdNum)) {
            return res.status(400).json({ error: 'Invalid branch ID' });
        }
        
        const success = setActiveChatBranch(chatId, branchIdNum);
        
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Branch not found' });
        }
        
    } catch (error) {
        log('[ACTIVATE-BRANCH] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
// Edit message content
router.patch('/message/:id', async (req, res) => {
    try {
        const messageId = parseInt(req.params.id, 10);
        const { content, original_content, file_metadata } = req.body;
        
        if (isNaN(messageId)) {
            return res.status(400).json({ error: 'Invalid message ID' });
        }
        
        if (!content || (typeof content === 'string' && content.trim() === '')) {
            return res.status(400).json({ error: 'Content is required' });
        }
        
        // Try to find the message in branch_messages first (for branching system)
        let currentMessage = null;
        let isInBranch = false;
        
        // First, try to find in branch_messages table
        const getBranchMessageStmt = db.prepare(`
            SELECT content, edit_count, edited_at, branch_id 
            FROM branch_messages 
            WHERE id = ?
        `);
        currentMessage = getBranchMessageStmt.get(messageId);
        
        if (currentMessage) {
            isInBranch = true;
            log(`[EDIT] Found message ${messageId} in branch_messages table`);
        } else {
            // Everything-is-a-branch: All messages should be in branch_messages
            log(`[EDIT] Message ${messageId} not found in branch_messages - this shouldn't happen in everything-is-a-branch system`);
        }
        
        if (!currentMessage) {
            return res.status(404).json({ error: 'Message not found' });
        }
        
        const newEditCount = (currentMessage.edit_count || 0) + 1;
        let result;
        
        if (isInBranch) {
            // Update message in branch_messages table (no original_content column here)
            log(`[EDIT] Updating message ${messageId} in branch_messages table`);
            const updateBranchStmt = db.prepare(`
                UPDATE branch_messages 
                SET content = ?, 
                    original_content = ?,
                    file_metadata = ?,
                    edit_count = ?, 
                    edited_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `);
            result = updateBranchStmt.run(
                Array.isArray(content) ? JSON.stringify(content) : content,
                original_content ? JSON.stringify(original_content) : null,
                file_metadata ? JSON.stringify(file_metadata) : null,
                newEditCount,
                messageId
            );
        } else {
            // Update message in original messages table (has original_content column)
            log(`[EDIT] Updating message ${messageId} in original messages table`);
            const originalContent = currentMessage.original_content || currentMessage.content;
            const updateOriginalStmt = db.prepare(`
                UPDATE messages 
                SET content = ?, 
                    original_content = ?, 
                    edit_count = ?, 
                    edited_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `);
            result = updateOriginalStmt.run(
                Array.isArray(content) ? JSON.stringify(content) : content,
                originalContent,
                newEditCount,
                messageId
            );
        }
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Message not found' });
        }
        
        log(`[EDIT] Updated message ${messageId}, edit count: ${newEditCount}`);
        
        res.json({ 
            success: true, 
            message_id: messageId, 
            edit_count: newEditCount,
            edited_at: new Date().toISOString()
        });
        
    } catch (error) {
        log('[EDIT] Error updating message:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get message by ID for editing
router.get('/message/:id', (req, res) => {
    try {
        const messageId = parseInt(req.params.id, 10);
        
        if (isNaN(messageId)) {
            return res.status(400).json({ error: 'Invalid message ID' });
        }
        
        const stmt = db.prepare(`
            SELECT id, chat_id, role, content, original_content, 
                   edit_count, edited_at, timestamp, turn_number 
            FROM messages WHERE id = ?
        `);
        const message = stmt.get(messageId);
        
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        
        res.json(message);
        
    } catch (error) {
        log('[GET-MESSAGE] Error:', error);
        res.status(500).json({ error: error.message });
    }
});