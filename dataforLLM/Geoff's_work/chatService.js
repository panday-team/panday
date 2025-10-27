// Chat Service - Handle AI chat logic, streaming, and tool execution with adapters per api
// ===== NEW FILE HANDLING FUNCTIONS =====

/**
 * Extract file content from multimodal message content
 * @param {Array|string} content - Message content (array for multimodal, string for text-only)
 * @returns {Object} - { textContent, files, images, hasFiles }
 */
function extractFilesFromContent(content) {
    // Initialize return object
    const result = {
        textContent: '',
        files: [],
        images: [],
        hasFiles: false
    };
    
    if (typeof content === 'string') {
        // Simple text content, no files
        result.textContent = content;
        return result;
    }
    
    if (!Array.isArray(content)) {
        // Unknown content type, treat as text
        result.textContent = String(content || '');
        return result;
    }
    
    // Process multimodal array content
    content.forEach(part => {
        if (part.type === 'text') {
            result.textContent = part.text || '';
        } else if (part.type === 'image') {
            result.images.push(part);
        } else if (part.type === 'files' && part.files && Array.isArray(part.files)) {
            // New file structure
            result.files = part.files;
            result.hasFiles = true;
        }
    });
    
    return result;
}

/**
 * Concatenate file content to text content for AI processing
 * @param {string} textContent - Original user text
 * @param {Array} files - Array of file objects with extractedText
 * @returns {string} - Concatenated content ready for AI
 */
function concatenateFileContent(textContent, files) {
    let finalText = textContent || '';
    
    if (files && Array.isArray(files) && files.length > 0) {
        files.forEach(file => {
            if (file.extractedText) {
                finalText += `\n\n\`\`\`userdocument\nFile: ${file.fileName}\n${file.extractedText}\n\`\`\``;
            }
        });
        
        log(`[FILE-PROCESSING] Concatenated ${files.length} file(s) to message content`);
    }
    
    return finalText;
}

/**
 * Create multimodal content with separated files for storage
 * This preserves the original structure while also providing concatenated content for AI
 * @param {string} userText - User's actual text input
 * @param {Array} files - File objects array
 * @param {Array} images - Image objects array
 * @returns {Object} - { originalContent, concatenatedContent }
 */
function createSeparatedFileContent(userText, files, images) {
    const hasFiles = files && files.length > 0;
    const hasImages = images && images.length > 0;
    
    let originalContent, concatenatedContent;
    
    if (hasFiles || hasImages) {
        // Create multimodal array preserving file structure
        originalContent = [];
        
        // Add text part
        if (userText || hasFiles) {
            originalContent.push({
                type: 'text',
                text: userText || ''
            });
        }
        
        // Add images
        if (hasImages) {
            originalContent.push(...images);
        }
        
        // Add files as separate part
        if (hasFiles) {
            originalContent.push({
                type: 'files',
                files: files
            });
        }
        
        // Create concatenated version for AI
        concatenatedContent = concatenateFileContent(userText, files);
        
    } else {
        // Simple text content
        originalContent = userText || '';
        concatenatedContent = userText || '';
    }
    
    return { originalContent, concatenatedContent };
}

/**
 * Process message content for AI consumption
 * Extracts files and creates concatenated content while preserving original structure
 * @param {Array|string} messageContent - Original message content from frontend
 * @returns {Object} - { aiContent, originalContent, fileMetadata }
 */
function processMessageForAI(messageContent) {
    const extracted = extractFilesFromContent(messageContent);
    const { textContent, files, images, hasFiles } = extracted;
    
    let aiContent;
    
    if (hasFiles || images.length > 0) {
        // Create multimodal content for AI with concatenated text
        aiContent = [];
        
        // Add concatenated text (user text + file contents)
        const concatenatedText = concatenateFileContent(textContent, files);
        if (concatenatedText) {
            aiContent.push({
                type: 'text',
                text: concatenatedText
            });
        }
        
        // Add images (unchanged)
        if (images.length > 0) {
            aiContent.push(...images);
        }
    } else {
        // Simple text content
        aiContent = textContent;
    }
    
    return {
        aiContent,
        originalContent: messageContent,
        fileMetadata: {
            hasFiles,
            fileCount: files.length,
            imageCount: images.length,
            files: files
        }
    };
}
const https = require('https');
const http = require('http');
const { log } = require('../utils/logger');

// Simple debug flag for adapter logs - set DEBUG=1 to enable
const DEBUG_ADAPTERS = process.env.DEBUG === '1';
const { getCurrentSettings } = require('./settingsService');
const { executeMCPTool, getAvailableToolsForChat } = require('./mcpService');
const { addToolEvent, storeDebugData } = require('./toolEventService');

// Update debug data for the most recent message of a specific role in a turn
async function updateMessageDebugData(chatId, role, turnNumber, debugData) {
    const { db } = require('../config/database');
    
    try {
        const debugDataJson = debugData ? JSON.stringify(debugData) : null;
        
        // Update the most recent message of the specified role in the specified turn
        const updateStmt = db.prepare(
            'UPDATE messages SET debug_data = ? WHERE chat_id = ? AND role = ? AND turn_number = ? AND id = (SELECT MAX(id) FROM messages WHERE chat_id = ? AND role = ? AND turn_number = ?)'
        );
        const result = updateStmt.run(debugDataJson, chatId, role, turnNumber, chatId, role, turnNumber);
        
        if (result.changes > 0) {
            log(`[CHAT-UPDATE] Updated debug data for ${role} message in turn ${turnNumber}`);
        } else {
            log(`[CHAT-UPDATE] No message found to update for ${role} in turn ${turnNumber}`);
        }
        
    } catch (err) {
        log('[CHAT-UPDATE] Error updating message debug data:', err);
        throw err;
    }
}

// Turn-based debug data functions
async function saveTurnDebugData(chatId, turnNumber, debugData) {
    const { db } = require('../config/database');
    
    try {
        const debugDataJson = JSON.stringify(debugData);
        
        // Get active branch for this chat
        const activeBranch = getActiveChatBranch(chatId);
        if (!activeBranch) {
            log(`[TURN-DEBUG] No active branch found for chat ${chatId}, cannot save debug data`);
            return null;
        }
        
        // First check if a message exists for this turn
        const checkStmt = db.prepare(`
            SELECT id FROM branch_messages 
            WHERE branch_id = ? AND turn_number = ?
            LIMIT 1
        `);
        const existing = checkStmt.get(activeBranch.id, turnNumber);
        
        let result;
        if (existing) {
            // Update existing message
            const updateStmt = db.prepare(`
                UPDATE branch_messages 
                SET debug_data = ?
                WHERE branch_id = ? AND turn_number = ?
            `);
            result = updateStmt.run(debugDataJson, activeBranch.id, turnNumber);
        } else {
            // Insert placeholder message with debug data
            const insertStmt = db.prepare(`
                INSERT INTO branch_messages (branch_id, turn_number, role, content, debug_data, timestamp)
                VALUES (?, ?, 'user', '', ?, datetime('now'))
            `);
            result = insertStmt.run(activeBranch.id, turnNumber, debugDataJson);
        }
        
        log(`[TURN-DEBUG] Updated debug data for turn ${turnNumber} in chat ${chatId} (branch: ${activeBranch.branch_name})`);
        return result;
        
    } catch (err) {
        log('[TURN-DEBUG] Error saving turn debug data:', err);
        throw err;
    }
}

function getTurnDebugData(chatId, turnNumber) {
    const { db } = require('../config/database');
    
    try {
        // Get active branch for this chat
        const activeBranch = getActiveChatBranch(chatId);
        if (!activeBranch) {
            log(`[TURN-DEBUG] No active branch found for chat ${chatId}`);
            return null;
        }
        
        // Get debug data from branch_messages for the specific turn
        const stmt = db.prepare(`
            SELECT debug_data 
            FROM branch_messages 
            WHERE branch_id = ? AND turn_number = ? AND debug_data IS NOT NULL
            LIMIT 1
        `);
        const result = stmt.get(activeBranch.id, turnNumber);
        
        if (result && result.debug_data) {
            const debugData = JSON.parse(result.debug_data);
            log(`[TURN-DEBUG] Retrieved debug data for turn ${turnNumber} in chat ${chatId} (branch: ${activeBranch.branch_name})`);
            return debugData;
        } else {
            log(`[TURN-DEBUG] No debug data found for turn ${turnNumber} in chat ${chatId}`);
            return null;
        }
        
    } catch (err) {
        log('[TURN-DEBUG] Error getting turn debug data:', err);
        return null;
    }
}

function getAllTurnDebugData(chatId) {
    const { db } = require('../config/database');
    
    try {
        // Get active branch for this chat
        const activeBranch = getActiveChatBranch(chatId);
        if (!activeBranch) {
            log(`[TURN-DEBUG] No active branch found for chat ${chatId}`);
            return {};
        }
        
        // Get all debug data from branch_messages
        const stmt = db.prepare(`
            SELECT turn_number, debug_data 
            FROM branch_messages 
            WHERE branch_id = ? AND debug_data IS NOT NULL
            ORDER BY turn_number ASC
        `);
        const rows = stmt.all(activeBranch.id);
        
        const turnDebugMap = {};
        rows.forEach(row => {
            try {
                turnDebugMap[row.turn_number] = JSON.parse(row.debug_data);
            } catch (parseError) {
                log(`[TURN-DEBUG] Error parsing debug data for turn ${row.turn_number}:`, parseError);
            }
        });
        
        log(`[TURN-DEBUG] Retrieved debug data for ${rows.length} turns in chat ${chatId} (branch: ${activeBranch.branch_name})`);
        return turnDebugMap;
        
    } catch (err) {
        log('[TURN-DEBUG] Error getting all turn debug data:', err);
        return {};
    }
}

// Get current turn number for a chat
function getCurrentTurnNumber(chat_id) {
    if (!chat_id) {
        return 0; // Default to turn 0
    }
    
    const { db } = require('../config/database');
    
    try {
        const stmt = db.prepare('SELECT turn_number FROM chats WHERE id = ?');
        const result = stmt.get(chat_id);
        const currentTurn = result ? (result.turn_number || 0) : 0;
        log(`[CURRENT-TURN] Chat ${chat_id}: current turn = ${currentTurn}`);
        return currentTurn;
    } catch (err) {
        log('[CHAT-TURN] Error getting current turn:', err);
        return 0; // Default to turn 0 on error
    }
}

function incrementTurnNumber(chat_id) {
    if (!chat_id) {
        return;
    }
    
    const { db } = require('../config/database');
    
    try {
        const stmt = db.prepare('UPDATE chats SET turn_number = turn_number + 1 WHERE id = ?');
        const result = stmt.run(chat_id);
        
        if (result.changes > 0) {
            const newTurn = getCurrentTurnNumber(chat_id);
            log(`[INCREMENT-TURN] Chat ${chat_id}: incremented to turn ${newTurn}`);
        } else {
            log(`[INCREMENT-TURN] Chat ${chat_id}: no chat found to increment`);
        }
    } catch (err) {
        log('[INCREMENT-TURN] Error incrementing turn:', err);
    }
}

function getChatHistoryForAPI(chat_id) {
    if (!chat_id) {
        return [];
    }
    
    const { db } = require('../config/database');
    const messages = [];
    
    try {
        // Everything-is-a-branch system: Always use the active branch
        log(`[CHAT-HISTORY] Getting history from active branch for chat ${chat_id}`);
        
        // Get the active branch
        const activeBranchStmt = db.prepare(`
            SELECT id, branch_name
            FROM chat_branches
            WHERE chat_id = ? AND is_active = TRUE
            LIMIT 1
        `);
        const activeBranch = activeBranchStmt.get(chat_id);
        
        if (!activeBranch) {
            log(`[CHAT-HISTORY] No active branch found for chat ${chat_id} - this shouldn't happen in everything-is-a-branch system`);
            return [];
        }
        
        // Get all messages from the active branch including new file fields
        // FILTER OUT ERROR MESSAGES: Only include successful messages in AI history
        const messagesStmt = db.prepare(`
            SELECT role, content, turn_number, tool_calls, tool_call_id, tool_name, original_content, file_metadata
            FROM branch_messages
            WHERE branch_id = ? AND error_state IS NULL
            ORDER BY timestamp ASC
        `);
        const branchMessages = messagesStmt.all(activeBranch.id);
        
        log(`[CHAT-HISTORY] Retrieved ${branchMessages.length} successful messages (errors filtered out)`);
        
        branchMessages.forEach(row => {
            // Process saved messages to ensure AI gets correct content
            let finalContent = row.content;
            
            // If this message has original content and file metadata, we need to process it for AI
            if (row.original_content && row.file_metadata) {
                try {
                    const originalContent = typeof row.original_content === 'string' && row.original_content.startsWith('[') 
                        ? JSON.parse(row.original_content)
                        : row.original_content;
                    const fileMetadata = JSON.parse(row.file_metadata);
                    
                    // If there are files, re-process for AI to get concatenated content
                    if (fileMetadata.hasFiles) {
                        const processedMessage = processMessageForAI(originalContent);
                        finalContent = processedMessage.aiContent;
                        log(`[CHAT-HISTORY] Reprocessed message with ${fileMetadata.fileCount} file(s) for AI`);
                    }
                } catch (e) {
                    log(`[CHAT-HISTORY] Error processing file metadata: ${e.message}`);
                    // Fall back to stored content
                }
            }
            
            // Parse content - handle both string and JSON (multimodal) content
            let parsedContent = finalContent;
            if (typeof finalContent === 'string' && finalContent.startsWith('[')) {
                try {
                    // Try to parse as JSON array (multimodal content)
                    parsedContent = JSON.parse(finalContent);
                } catch (e) {
                    // If parsing fails, keep as string
                    parsedContent = finalContent;
                }
            }
            
            const message = {
                role: row.role,
                content: parsedContent,
                turn_number: row.turn_number
            };
            
            // Add tool data if present
            if (row.tool_calls) {
                try {
                    message.tool_calls = JSON.parse(row.tool_calls);
                } catch (e) {
                    log(`[CHAT-HISTORY] Error parsing tool_calls: ${e.message}`);
                }
            }
            if (row.tool_call_id) {
                message.tool_call_id = row.tool_call_id;
            }
            if (row.tool_name) {
                message.tool_name = row.tool_name;
            }
            
            messages.push(message);
        });
        
        log(`[CHAT-HISTORY] Retrieved ${messages.length} messages from branch '${activeBranch.branch_name}'`);
        return messages;
        
    } catch (err) {
        log('[CHAT-HISTORY] Error getting chat history:', err);
        throw new Error(`Failed to load chat history: ${err.message}`);
    }
}
// Save complete message structure to database (everything-is-a-branch system)
async function saveCompleteMessageToDatabase(chatId, messageData, blocks = null, turnNumber = null, errorState = null) {
    // Everything goes through branches now - this is just a wrapper for saveMessageToBranch
    return await saveMessageToBranch(chatId, messageData, blocks, turnNumber, errorState);
}

// Save message to current active branch (everything-is-a-branch system)
async function saveMessageToBranch(chatId, messageData, blocks = null, turnNumber = null, errorState = null) {
    const { db } = require('../config/database');
    
    try {
        // Get active branch
        const activeBranch = getActiveChatBranch(chatId);
        if (!activeBranch) {
            // No branches exist, create main branch first
            log(`[BRANCHING] No active branch for chat ${chatId}, creating main branch`);
            const newBranch = await createChatBranch(chatId);
            await setActiveChatBranch(chatId, newBranch.branchId);
            return saveMessageToBranch(chatId, messageData, blocks, turnNumber);
        }
        
        // Prepare message data
        const content = Array.isArray(messageData.content) 
            ? JSON.stringify(messageData.content)  // JSON stringify multimodal content
            : messageData.content || '';  // Keep strings as-is
        const role = messageData.role || 'user';
        const toolCalls = messageData.tool_calls ? JSON.stringify(messageData.tool_calls) : null;
        const toolCallId = messageData.tool_call_id || null;
        const toolName = messageData.tool_name || null;
        const blocksJson = blocks ? JSON.stringify(blocks) : null;
        const debugData = messageData.debug_data ? JSON.stringify(messageData.debug_data) : null;
        
        // Handle original content and file metadata
        const originalContent = messageData.originalContent 
            ? (Array.isArray(messageData.originalContent) 
                ? JSON.stringify(messageData.originalContent) 
                : messageData.originalContent)
            : null;
        const fileMetadata = messageData.fileMetadata ? JSON.stringify(messageData.fileMetadata) : null;
        
        // Use turn number or get next
        let finalTurnNumber = turnNumber;
        if (finalTurnNumber === null) {
            finalTurnNumber = getCurrentTurnNumber(chatId);
        }
        
        // Insert message into branch with new file handling fields and error_state
        const insertStmt = db.prepare(`
            INSERT INTO branch_messages 
            (branch_id, role, content, turn_number, tool_calls, tool_call_id, tool_name, blocks, debug_data, original_content, file_metadata, error_state)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = insertStmt.run(
            activeBranch.id, role, content, finalTurnNumber,
            toolCalls, toolCallId, toolName, blocksJson, debugData, originalContent, fileMetadata, errorState
        );
        
        // Update chat's updated_at timestamp
        const updateChatStmt = db.prepare('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        updateChatStmt.run(chatId);
        
        log(`[BRANCHING] Saved ${role} message to branch '${activeBranch.branch_name}' (turn ${finalTurnNumber})`);
        return result.lastInsertRowid;
        
    } catch (error) {
        log('[BRANCHING] Error saving message to branch:', error);
        throw error;
    }
}

// Import adapter system
const responseAdapterFactory = require('../adapters/ResponseAdapterFactory');
const UnifiedResponse = require('../adapters/UnifiedResponse');

// Handle chat with potential tool calls
async function handleChatWithTools(res, messages, tools, chatId, debugData = null, responseCounter = 1, requestId = null, existingDebugData = null, conductorPhase = null, blockToolExecution = false, blockRecursiveToolResponse = false, userTurnNumber = null) {
    const currentSettings = getCurrentSettings();
    
    // Ensure we have a model name
    if (!currentSettings.modelName) {
        res.status(400).json({ error: 'No model specified. Please configure a model in settings.' });
        return;
    }
    
    // Get the appropriate adapter for current settings
    const adapter = responseAdapterFactory.getAdapter(currentSettings);
    log(`[ADAPTER] Using ${adapter.providerName} adapter`);
    
    // Set up tool event emitter for the adapter
    adapter.setToolEventEmitter((eventType, data, reqId) => {
        if (reqId) {
            addToolEvent(reqId, { type: eventType, data: data });
        }
    });
    
    // Create unified request
    const unifiedRequest = responseAdapterFactory.createUnifiedRequest(messages, tools, currentSettings.modelName);
    
    // Convert to provider-specific format
    const requestData = adapter.convertRequest(unifiedRequest);
    
    // Set up streaming response FIRST
    if (!res.headersSent) {
        const headers = {
            'Content-Type': 'text/plain',
            'Transfer-Encoding': 'chunked'
        };
        
        if (requestId) {
            headers['X-Request-Id'] = requestId;
        }
        
        // Include the actual AI request in response headers for frontend debug panel
        if (requestData) {
            headers['X-Actual-Request'] = encodeURIComponent(JSON.stringify(requestData));
        }
        
        res.writeHead(200, headers);
    }
    
    // Initialize debug data and turn number
    let collectedDebugData = existingDebugData;
    
    // Use the user turn number provided by frontend
    let currentTurn;
    if (collectedDebugData && collectedDebugData.currentTurn) {
        // Reuse existing turn from recursive calls
        currentTurn = collectedDebugData.currentTurn;
    } else {
        // Use the turn number from frontend, or calculate if not provided
        currentTurn = userTurnNumber || (chatId ? getCurrentTurnNumber(chatId) + 1 : 1);
    }
    
    // Calculate next sequence step from existing debug data to maintain sequential order across recursive calls
    let sequenceStep = 1;
    if (collectedDebugData) {
        const sequenceCount = (collectedDebugData.sequence && Array.isArray(collectedDebugData.sequence)) ? collectedDebugData.sequence.length : 0;
        const httpSequenceCount = (collectedDebugData.httpSequence && Array.isArray(collectedDebugData.httpSequence)) ? collectedDebugData.httpSequence.length : 0;
        sequenceStep = sequenceCount + httpSequenceCount + 1;
    }
    
    if (debugData && requestId && !collectedDebugData) {
        collectedDebugData = {
            requestId: requestId,
            currentTurn: currentTurn,
            sequence: [],
            metadata: {
                endpoint: adapter.getEndpointUrl(currentSettings),
                timestamp: new Date().toISOString(),
                tools: tools.length,
                provider: adapter.providerName,
                model: currentSettings.modelName
            },
            rawData: {
                httpResponse: {
                    statusCode: null,
                    statusMessage: null,
                    headers: null
                },
                errors: []
            }
        };
    } else if (collectedDebugData && !collectedDebugData.currentTurn) {
        // Store turn number in existing debug data if not already set
        collectedDebugData.currentTurn = currentTurn;
    }
    
    // Get provider-specific URL and headers
    const targetUrl = adapter.getEndpointUrl(currentSettings);
    const headers = adapter.getHeaders(currentSettings);
    headers['Content-Length'] = Buffer.byteLength(JSON.stringify(requestData));
    
    if (DEBUG_ADAPTERS) {
        log(`[${adapter.providerName.toUpperCase()}-DEBUG] URL:`, targetUrl);
        log(`[${adapter.providerName.toUpperCase()}-DEBUG] Request Body:`, JSON.stringify(requestData, null, 2));
    }
    
    // Store the REAL request data in the user's debug data    
    if (chatId && currentTurn) {
        try {
            const userDebugData = getTurnDebugData(chatId, currentTurn);
            
            if (userDebugData) {
                // Store the ACTUAL request that gets sent to AI with real tool definitions
                userDebugData.actualHttpRequest = {
                    url: targetUrl,
                    method: 'POST',
                    headers: { ...headers },
                    body: requestData // This is the REAL request with full tool definitions
                };
                
                // Save back to the same turn
                saveTurnDebugData(chatId, currentTurn, userDebugData);
            } else {
                log('[DEBUG-STORE] FAIL - No user debug data found');
            }
        } catch (error) {
            log('[DEBUG-STORE] ERROR:', error.message);
        }
    } else {
        log('[DEBUG-STORE] SKIP - Missing chatId or currentTurn');
    }
    
    log('[ACTUAL-REQUEST] Sending to API:', JSON.stringify(requestData, null, 2));
    
    const url = new URL(targetUrl);
    const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'POST',
        headers: headers
    };
    
    // Create unified response object
    const unifiedResponse = new UnifiedResponse().setProvider(adapter.providerName);
    const context = adapter.createContext(currentSettings.modelName);
    
    // Make HTTP request
    const httpModule = url.protocol === 'https:' ? https : http;
    const apiReq = httpModule.request(options, (apiRes) => {
        // Capture debug data
        if (collectedDebugData && collectedDebugData.rawData) {
            collectedDebugData.rawData.httpResponse = {
                statusCode: apiRes.statusCode,
                statusMessage: apiRes.statusMessage,
                headers: apiRes.headers
            };
        }
        
        if (apiRes.statusCode !== 200) {
            let errorData = '';
            apiRes.on('data', (chunk) => {
                errorData += chunk.toString();
            });
            apiRes.on('end', () => {
                log(`[${adapter.providerName.toUpperCase()}-ERROR] Status:`, apiRes.statusCode);
                log(`[${adapter.providerName.toUpperCase()}-ERROR] Response:`, errorData);
                if (collectedDebugData && collectedDebugData.rawData && collectedDebugData.rawData.errors) {
                    collectedDebugData.rawData.errors.push({ type: 'http_error', message: errorData });
                }
                
                // Parse and show the actual API error message to the user
                let userErrorMessage = `API error: ${apiRes.statusCode} ${apiRes.statusMessage}`;
                
                try {
                    // Try to parse the error response and extract useful details
                    const errorObj = JSON.parse(errorData);
                    if (errorObj.error && errorObj.error.message) {
                        userErrorMessage = `[${apiRes.statusCode}] ${errorObj.error.message}`;
                    } else if (errorObj.message) {
                        userErrorMessage = `[${apiRes.statusCode}] ${errorObj.message}`;
                    } else if (errorObj.detail) {
                        userErrorMessage = `[${apiRes.statusCode}] ${errorObj.detail}`;
                    }
                } catch (parseError) {
                    // If error response isn't JSON, show raw error data if it's reasonable length
                    if (errorData && errorData.length < 500) {
                        userErrorMessage = `[${apiRes.statusCode}] ${errorData.trim()}`;
                    }
                }
                
                // IMPROVED ERROR HANDLING: Save error message and burn the turn
                if (chatId && currentTurn) {
                    const errorMessage = {
                        role: 'assistant',
                        content: userErrorMessage,
                        debug_data: collectedDebugData
                    };
                    saveCompleteMessageToDatabase(chatId, errorMessage, null, currentTurn, 'api_error')
                        .then(() => {
                            incrementTurnNumber(chatId); // Burn the turn
                            log(`[ERROR-HANDLING] Saved API error message and burned turn ${currentTurn}`);
                        })
                        .catch(saveError => {
                            log(`[ERROR-HANDLING] Failed to save error message: ${saveError.message}`);
                        });
                }
                
                res.write(userErrorMessage);
                res.end();
            });
            return;
        }
        
        // Stream response processing
        apiRes.on('data', (chunk) => {
            try {
                // Process chunk with adapter
                const result = adapter.processChunk(chunk, unifiedResponse, context);
                
                // Handle any events generated - THIS IS CRITICAL FOR TOOL DROPDOWNS!
                for (const event of result.events) {
                    if (event.type === 'tool_call_detected' && requestId) {
                        addToolEvent(requestId, {
                            type: 'tool_call_detected',
                            data: {
                                name: event.data.toolName,
                                id: event.data.toolId
                            }
                        });
                        if (DEBUG_ADAPTERS) log(`[ADAPTER-TOOL-EVENT] Tool call detected:`, event.data.toolName);
                    }
                }
                
                // Update context
                Object.assign(context, result.context);
                
                // Stream any new content to client
                let newContent = '';
                if (unifiedResponse.content && context.lastContentLength !== unifiedResponse.content.length) {
                    newContent = unifiedResponse.content.slice(context.lastContentLength || 0);
                    if (newContent) {
                        res.write(newContent);
                        context.lastContentLength = unifiedResponse.content.length;
                        
                        // Capture the actual content being sent to frontend for debug
                        if (collectedDebugData) {
                            if (!collectedDebugData.streamedContent) {
                                collectedDebugData.streamedContent = '';
                            }
                            collectedDebugData.streamedContent += newContent;
                        }
                    }
                }
                
                // Add to debug data (accumulate response chunks)
                if (collectedDebugData) {
                    if (!collectedDebugData.rawResponseChunks) {
                        collectedDebugData.rawResponseChunks = [];
                    }
                    collectedDebugData.rawResponseChunks.push({
                        chunk: chunk.toString(),
                        timestamp: new Date().toISOString()
                    });
                }
                
            } catch (error) {
                console.error(`[${adapter.providerName.toUpperCase()}-ADAPTER] Error processing chunk:`, error);
                if (collectedDebugData && collectedDebugData.rawData && collectedDebugData.rawData.errors) {
                    collectedDebugData.rawData.errors.push({ type: 'processing_error', message: error.message });
                }
            }
        });
        
        apiRes.on('end', async () => {
            log(`[${adapter.providerName.toUpperCase()}-ADAPTER] Stream ended`);
            
            // Add response step to debug sequence
            if (collectedDebugData && collectedDebugData.sequence) {
                const responseStep = {
                    type: 'response',
                    step: sequenceStep++,
                    timestamp: new Date().toISOString(),
                    data: {
                        raw_http_response: {
                            status: collectedDebugData.rawData.httpResponse.statusCode,
                            provider: adapter.providerName,
                            response_chunks: collectedDebugData.rawResponseChunks || []
                        },
                        content: collectedDebugData.streamedContent || 'No content streamed',
                        has_tool_calls: unifiedResponse.hasToolCalls()
                    }
                };
                collectedDebugData.sequence.push(responseStep);
            }
            
            // Capture complete HTTP response (REAL data)
            if (collectedDebugData && requestId) {
                if (!collectedDebugData.httpSequence) {
                    collectedDebugData.httpSequence = [];
                }
                
                collectedDebugData.httpSequence.push({
                    type: 'http_response',
                    sequence: sequenceStep++,
                    timestamp: new Date().toISOString(),
                    content: unifiedResponse.content || '',
                    toolCalls: unifiedResponse.toolCalls || [],
                    hasToolCalls: unifiedResponse.hasToolCalls()
                });
                
                log(`[SEQUENTIAL-DEBUG] Captured HTTP response, hasTools: ${unifiedResponse.hasToolCalls()}`);
            }
            
            // Handle tool calls if any
            if (unifiedResponse.hasToolCalls() && !blockToolExecution) {
                log(`[ADAPTER] Processing ${unifiedResponse.toolCalls.length} tool calls`);
                
                // Add tool execution steps to debug sequence
                if (collectedDebugData && collectedDebugData.sequence) {
                    for (const toolCall of unifiedResponse.toolCalls) {
                        collectedDebugData.sequence.push({
                            type: 'tool_execution',
                            step: sequenceStep++,
                            timestamp: new Date().toISOString(),
                            data: {
                                tool_name: toolCall.function.name,
                                tool_id: toolCall.id,
                                arguments: JSON.parse(toolCall.function.arguments)
                            }
                        });
                    }
                }
                
                // Execute tools and continue conversation
                await executeToolCallsAndContinue(
                    res, unifiedResponse.toolCalls, messages, tools, chatId, 
                    unifiedResponse.content, collectedDebugData, responseCounter, 
                    requestId, conductorPhase, blockRecursiveToolResponse, userTurnNumber
                );
            } else {
                // No tool calls, finish response
                res.end();
                
                // Increment turn number now that conversation is complete
                if (chatId) {
                    incrementTurnNumber(chatId);
                }
                
                // Save final assistant response to history before ending
                // Save in both conductor mode and simple chat mode
                if (chatId && unifiedResponse.content) {
                    log(`[CHAT-SAVE] About to save final assistant response:`);
                    log(`[CHAT-SAVE] Content length: ${unifiedResponse.content.length}`);
                    log(`[CHAT-SAVE] Content preview: "${unifiedResponse.content.substring(0, 200)}..."`);
                    log(`[CHAT-SAVE] Turn number: ${currentTurn}`);
                    
                    const finalAssistantMessage = {
                        role: 'assistant',
                        content: unifiedResponse.content
                    };
                    try {
                        await saveCompleteMessageToDatabase(chatId, finalAssistantMessage, null, currentTurn);
                        log(`[CHAT-SAVE] Successfully saved final assistant response to history`);
                    } catch (error) {
                        log(`[CHAT-SAVE] Error saving final assistant response: ${error.message}`);
                    }
                } else {
                    log(`[CHAT-SAVE] NOT saving final response - chatId: ${chatId}, content length: ${unifiedResponse.content ? unifiedResponse.content.length : 'null'}`);
                }
                
                // Store debug data with complete history
                if (collectedDebugData && requestId) {
                    // Add complete chat history to debug data
                    if (chatId) {
                        try {
                            // Get the complete history
                            collectedDebugData.completeMessageHistory = getChatHistoryForAPI(chatId);
                            
                            // Get the current turn number for debug panel consistency
                            // This ensures "Messages In This Turn" works when reloading saved chats
                            collectedDebugData.currentTurnNumber = getCurrentTurnNumber(chatId);
                            collectedDebugData.currentTurnMessages = null; // Will be fetched by frontend as needed
                        } catch (error) {
                            collectedDebugData.completeMessageHistory = { error: error.message };
                            collectedDebugData.currentTurnMessages = { error: error.message };
                            collectedDebugData.currentTurnNumber = null;
                        }
                    }
                    
                    storeDebugData(requestId, collectedDebugData);
                    log(`[ADAPTER-DEBUG] Debug data stored for request:`, requestId);
                }
            }
        });
    });
    
    apiReq.on('error', (error) => {
        log(`[${adapter.providerName.toUpperCase()}] Request error:`, error);
        if (collectedDebugData && collectedDebugData.rawData && collectedDebugData.rawData.errors) {
            collectedDebugData.rawData.errors.push({ type: 'request_error', message: error.message });
        }
        
        // IMPROVED ERROR HANDLING: Save connection error and burn the turn
        if (chatId && currentTurn) {
            const errorMessage = {
                role: 'assistant',
                content: `Connection error: ${error.message}`,
                debug_data: collectedDebugData
            };
            saveCompleteMessageToDatabase(chatId, errorMessage, null, currentTurn, 'connection_error')
                .then(() => {
                    incrementTurnNumber(chatId); // Burn the turn
                    log(`[ERROR-HANDLING] Saved connection error and burned turn ${currentTurn}`);
                })
                .catch(saveError => {
                    log(`[ERROR-HANDLING] Failed to save connection error: ${saveError.message}`);
                });
        }
        
        res.write(`Connection error: ${error.message}`);
        res.end();
    });
    
    // Capture ACTUAL HTTP request payload being sent
    const actualRequestPayload = JSON.stringify(requestData);
    
    // Add to sequential debug data (real HTTP request)
    if (collectedDebugData && requestId) {
        if (!collectedDebugData.httpSequence) {
            collectedDebugData.httpSequence = [];
        }
        
        // Only add HTTP request to debug data if it's not the first request
        // The first request is initiated in the user bubble phase and already logged there
        if (collectedDebugData.httpSequence.length > 0 || responseCounter > 1) {
            const requestSequenceNumber = sequenceStep++;
            
            collectedDebugData.httpSequence.push({
                type: 'http_request',
                sequence: requestSequenceNumber,
                timestamp: new Date().toISOString(),
                payload: JSON.parse(actualRequestPayload),  // Store as object for debug panel
                rawPayload: actualRequestPayload            // Store as string for exact representation
            });
            

        } else {
            log(`[SEQUENTIAL-DEBUG] Skipping first HTTP request debug - already captured in user phase`);
        }
    }
    
    apiReq.write(actualRequestPayload);
    apiReq.end();
}

// Execute tool calls and continue conversation
async function executeToolCallsAndContinue(res, toolCalls, messages, tools, chatId, assistantMessage, debugData, responseCounter, requestId, conductorPhase, blockRecursiveToolResponse, userTurnNumber) {
    // Get the turn number from debug data (calculated once at conversation start)
    const currentTurn = debugData && debugData.currentTurn ? debugData.currentTurn : 1;
    
    // Add assistant message with tool calls to conversation
    const assistantMessageWithTools = {
        role: 'assistant',
        content: assistantMessage || '',
        tool_calls: toolCalls
    };
    messages.push(assistantMessageWithTools);
    
    // Save assistant message with tool calls to database
    if (chatId) {
        await saveCompleteMessageToDatabase(chatId, assistantMessageWithTools, null, currentTurn);
        log(`[CHAT-SAVE] Saved assistant message with ${toolCalls.length} tool calls`);
    }
    
    // Execute each tool call
    for (const toolCall of toolCalls) {
        log(`[TOOL-EXECUTION] Executing tool: ${toolCall.function.name}`);
        
        if (requestId) {
            addToolEvent(requestId, {
                type: 'tool_execution_start',
                data: {
                    name: toolCall.function.name, 
                    id: toolCall.id,
                    arguments: JSON.parse(toolCall.function.arguments)
                }
            });
        }
        
        try {
            const toolArgs = JSON.parse(toolCall.function.arguments);
            const toolResult = await executeMCPTool(toolCall.function.name, toolArgs);
            
            const toolMessage = {
                role: 'tool',
                tool_call_id: toolCall.id,
                tool_name: toolCall.function.name,  // Add tool name for Gemini conversion
                content: JSON.stringify(toolResult)
            };
            messages.push(toolMessage);
            
            // Save tool message to database
            if (chatId) {
                await saveCompleteMessageToDatabase(chatId, toolMessage, null, currentTurn);
                log(`[CHAT-SAVE] Saved tool response for ${toolCall.function.name}`);
            }
            
            if (requestId) {
                addToolEvent(requestId, {
                    type: 'tool_execution_complete',
                    data: {
                        name: toolCall.function.name, 
                        id: toolCall.id,
                        status: 'success',
                        result: toolResult 
                    }
                });
            }
            
            // Add tool result to debug sequence
            if (debugData && debugData.sequence) {
                // Calculate next sequence step from existing debug data
                const sequenceCount = debugData.sequence.length;
                const httpSequenceCount = debugData.httpSequence ? debugData.httpSequence.length : 0;
                const nextStep = sequenceCount + httpSequenceCount + 1;
                
                debugData.sequence.push({
                    type: 'tool_result',
                    step: nextStep,
                    timestamp: new Date().toISOString(),
                    data: {
                        tool_name: toolCall.function.name,
                        tool_id: toolCall.id,
                        status: 'success',
                        result: toolResult
                    }
                });
            }
            
        } catch (error) {
            log(`[TOOL-EXECUTION] Error executing tool ${toolCall.function.name}:`, error);
            
            const errorMessage = {
                role: 'tool',
                tool_call_id: toolCall.id,
                tool_name: toolCall.function.name,  // Add tool name for Gemini conversion
                content: JSON.stringify({ error: error.message })
            };
            messages.push(errorMessage);
            
            // Save tool error message to database
            if (chatId) {
                await saveCompleteMessageToDatabase(chatId, errorMessage, null, currentTurn);
                log(`[CHAT-SAVE] Saved tool error for ${toolCall.function.name}`);
            }
            
            if (requestId) {
                addToolEvent(requestId, {
                    type: 'tool_execution_complete',
                    data: {
                        name: toolCall.function.name, 
                        id: toolCall.id,
                        status: 'error',
                        error: error.message 
                    }
                });
            }
            
            // Add tool error to debug sequence
            if (debugData && debugData.sequence) {
                // Calculate next sequence step from existing debug data
                const sequenceCount = debugData.sequence.length;
                const httpSequenceCount = debugData.httpSequence ? debugData.httpSequence.length : 0;
                const nextStep = sequenceCount + httpSequenceCount + 1;
                
                debugData.sequence.push({
                    type: 'tool_result',
                    step: nextStep,
                    timestamp: new Date().toISOString(),
                    data: {
                        tool_name: toolCall.function.name,
                        tool_id: toolCall.id,
                        status: 'error',
                        error: error.message
                    }
                });
            }
        }
    }
    
    // Continue conversation with tool results
    await handleChatWithTools(res, messages, tools, chatId, debugData, responseCounter + 1, requestId, debugData, conductorPhase, false, false, userTurnNumber);
}

// Process chat request (entry point from routes)
async function processChatRequest(req, res) {
    try {
        const { message, chat_id, conductor_mode, enabled_tools, conductor_phase, message_role, block_tool_execution, block_recursive_call, request_id, user_turn_number } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
                
        // Build messages for API - get chat history first
        const messages = getChatHistoryForAPI(chat_id);

        // Log what's in history
        log(`[CHAT-DEBUG] Current history count: ${messages.length}`);
        
        // PROCESS MESSAGE FOR AI: Extract files and create concatenated content
        const processedMessage = processMessageForAI(message);
        const { aiContent, originalContent, fileMetadata } = processedMessage;
        
        // Log file processing details
        if (fileMetadata.hasFiles) {
            log(`[FILE-PROCESSING] Processed message with ${fileMetadata.fileCount} file(s) and ${fileMetadata.imageCount} image(s)`);
        }
        
        // Inject system prompt if this is the first message in the conversation/branch
        if (messages.length === 1) {
            const currentSettings = getCurrentSettings();
            if (currentSettings.enableSystemPrompt && currentSettings.systemPrompt && currentSettings.systemPrompt.trim()) {
                const systemMessage = {
                    role: 'system',
                    content: currentSettings.systemPrompt.trim()
                };
                
                // Prepend system prompt to messages array
                messages.unshift(systemMessage);
                log(`[SYSTEM-PROMPT] Added system prompt to first message in conversation`);
                
                // Save system prompt to database (it becomes part of chat history)
                if (chat_id) {
                    try {
                        await saveCompleteMessageToDatabase(chat_id, systemMessage);
                        log(`[SYSTEM-PROMPT] Saved system prompt to chat history`);
                    } catch (error) {
                        log(`[SYSTEM-PROMPT] Error saving system prompt to history: ${error.message}`);
                    }
                }
            }
        }
        
        // Check if we have any messages at all
        if (messages.length === 0) {
            // No chat_id and no message - this shouldn't happen but handle gracefully
            throw new Error('No message provided and no chat history available');
        }
        
        // Get available tools
        const tools = getAvailableToolsForChat(enabled_tools);
        
        // Call the AI API with tools and capture debug data
        const currentSettings = getCurrentSettings();
        const debugData = {
            requestStart: Date.now(),
            endpoint: 'will_be_set_by_adapter',
            settings: currentSettings,
            toolsEnabled: tools.length
        };
        
        // Use provided request ID or generate unique request ID for debug data
        const { generateRequestId, initializeToolEvents } = require('./toolEventService');
        const requestId = request_id || generateRequestId();
        
        log(`[CHAT] Using request ID: ${requestId} (provided: ${!!request_id})`);
        
        // Initialize tool events for this request
        initializeToolEvents(requestId);
        
        await handleChatWithTools(res, messages, tools, chat_id, debugData, 1, requestId, null, conductor_phase, block_tool_execution, block_recursive_call, user_turn_number);
        // Response is handled in handleChatWithTools via streaming
        
    } catch (error) {
        log('[CHAT] Error:', error);
        
        // IMPROVED ERROR HANDLING: Save processing error and burn the turn
        if (chat_id && user_turn_number) {
            const errorMessage = {
                role: 'assistant',
                content: `Processing error: ${error.message}`,
                debug_data: { error: error.message, stack: error.stack }
            };
            saveCompleteMessageToDatabase(chat_id, errorMessage, null, user_turn_number, 'processing_error')
                .then(() => {
                    incrementTurnNumber(chat_id); // Burn the turn
                    log(`[ERROR-HANDLING] Saved processing error and burned turn ${user_turn_number}`);
                })
                .catch(saveError => {
                    log(`[ERROR-HANDLING] Failed to save processing error: ${saveError.message}`);
                });
        }
        
        // Only send error response if headers haven't been sent yet
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        } else {
            // If streaming has started, we can't send JSON, so just end the stream
            res.write(`\n[ERROR] ${error.message}`);
            res.end();
        }
    }
}

// ===== TURN VERSIONING SYSTEM =====

// Create a new version for a turn by copying existing messages
async function createTurnVersion(chatId, turnNumber, isRetry = false) {
    const { db } = require('../config/database');
    
    try {
        db.prepare('BEGIN TRANSACTION').run();
        
        // Get existing messages for this turn AND all previous turns (for complete version 1)
        const getMessagesStmt = db.prepare(`
            SELECT id, role, content, tool_calls, tool_call_id, tool_name, blocks, debug_data
            FROM messages 
            WHERE chat_id = ? AND turn_number <= ?
            ORDER BY timestamp ASC
        `);
        const messages = getMessagesStmt.all(chatId, turnNumber);
        
        if (messages.length === 0) {
            throw new Error(`No messages found for turn ${turnNumber}`);
        }
        
        // Get next version number
        const getVersionStmt = db.prepare(`
            SELECT COALESCE(MAX(version_number), 0) + 1 as next_version
            FROM turn_versions 
            WHERE chat_id = ? AND turn_number = ?
        `);
        let { next_version } = getVersionStmt.get(chatId, turnNumber) || { next_version: 1 };
        
        // If this is the first version being created, always create version 1 from existing data first
        if (next_version === 1) {
            // Create version 1 (original)
            const insertVersion1Stmt = db.prepare(`
                INSERT INTO turn_versions (chat_id, turn_number, version_number, is_active)
                VALUES (?, ?, 1, TRUE)
            `);
            const version1Result = insertVersion1Stmt.run(chatId, turnNumber);
            const version1Id = version1Result.lastInsertRowid;
            
            // Copy existing messages to version 1
            const insertMessageStmt = db.prepare(`
                INSERT INTO message_versions 
                (turn_version_id, original_message_id, role, content, tool_calls, tool_call_id, tool_name, blocks, debug_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            messages.forEach(msg => {
                insertMessageStmt.run(
                    version1Id, msg.id, msg.role, msg.content,
                    msg.tool_calls, msg.tool_call_id, msg.tool_name, msg.blocks, msg.debug_data
                );
            });
            
            log(`[VERSIONING] Created version 1 for turn ${turnNumber} with ${messages.length} messages`);
            // Now increment version number for the retry
            next_version = 2;
            log(`[VERSIONING] Incremented next_version to ${next_version} for retry`);
        }
        
        // Create new version (for retry)
        const insertVersionStmt = db.prepare(`
            INSERT INTO turn_versions (chat_id, turn_number, version_number, is_active)
            VALUES (?, ?, ?, FALSE)
        `);
        const versionResult = insertVersionStmt.run(chatId, turnNumber, next_version);
        const newVersionId = versionResult.lastInsertRowid;
        
        // For retry, copy all messages from BEFORE this turn (truncate at this point)
        if (isRetry) {
            // Get all messages from this chat that come BEFORE this turn
            const previousMessagesStmt = db.prepare(`
                SELECT id, role, content, tool_calls, tool_call_id, tool_name, blocks, debug_data, turn_number
                FROM messages 
                WHERE chat_id = ? AND turn_number < ?
                ORDER BY timestamp ASC
            `);
            const previousMessages = previousMessagesStmt.all(chatId, turnNumber);
            
            const insertMessageStmt = db.prepare(`
                INSERT INTO message_versions 
                (turn_version_id, original_message_id, role, content, tool_calls, tool_call_id, tool_name, blocks, debug_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            // Copy all previous messages to this version (creates truncated history)
            previousMessages.forEach(msg => {
                insertMessageStmt.run(
                    newVersionId, msg.id, msg.role, msg.content,
                    msg.tool_calls, msg.tool_call_id, msg.tool_name, msg.blocks, msg.debug_data
                );
            });
            
            log(`[VERSIONING] Created retry version ${next_version} for turn ${turnNumber} with ${previousMessages.length} previous messages (truncated history)`);
        }
        
        db.prepare('COMMIT').run();
        
        log(`[VERSIONING] Returning version info: versionNumber=${next_version}, turnNumber=${turnNumber}`);
        return {
            versionId: newVersionId,
            versionNumber: next_version,
            turnNumber: turnNumber
        };
        
    } catch (error) {
        try { db.prepare('ROLLBACK').run(); } catch (rollbackErr) { /* ignore */ }
        log('[VERSIONING] Error creating turn version:', error);
        throw error;
    }
}

// Get all versions for a turn
function getTurnVersions(chatId, turnNumber) {
    const { db } = require('../config/database');
    
    try {
        const stmt = db.prepare(`
            SELECT tv.version_number, tv.is_active, tv.created_at,
                   COUNT(mv.id) as message_count
            FROM turn_versions tv
            LEFT JOIN message_versions mv ON tv.id = mv.turn_version_id
            WHERE tv.chat_id = ? AND tv.turn_number = ?
            GROUP BY tv.id, tv.version_number, tv.is_active, tv.created_at
            ORDER BY tv.version_number ASC
        `);
        
        const versions = stmt.all(chatId, turnNumber);
        log(`[VERSIONING] Found ${versions.length} versions for turn ${turnNumber}:`, versions.map(v => `v${v.version_number}(active:${v.is_active})`));
        return versions;
        
    } catch (error) {
        log('[VERSIONING] Error getting turn versions:', error);
        return [];
    }
}

// Get active version number for a turn
function getActiveTurnVersion(chatId, turnNumber) {
    const { db } = require('../config/database');
    
    try {
        const stmt = db.prepare(`
            SELECT version_number 
            FROM turn_versions 
            WHERE chat_id = ? AND turn_number = ? AND is_active = TRUE
        `);
        
        const result = stmt.get(chatId, turnNumber);
        const activeVersion = result ? result.version_number : 1;
        log(`[VERSIONING] Active version for turn ${turnNumber}: ${activeVersion} (found record: ${!!result})`);
        return activeVersion;
        
    } catch (error) {
        log('[VERSIONING] Error getting active version:', error);
        return 1;
    }
}

// Set active version for a turn
function setActiveTurnVersion(chatId, turnNumber, versionNumber) {
    const { db } = require('../config/database');
    
    try {
        db.prepare('BEGIN TRANSACTION').run();
        
        // Deactivate all versions for this turn
        const deactivateStmt = db.prepare(`
            UPDATE turn_versions 
            SET is_active = FALSE 
            WHERE chat_id = ? AND turn_number = ?
        `);
        deactivateStmt.run(chatId, turnNumber);
        
        // Activate the specified version
        const activateStmt = db.prepare(`
            UPDATE turn_versions 
            SET is_active = TRUE 
            WHERE chat_id = ? AND turn_number = ? AND version_number = ?
        `);
        const result = activateStmt.run(chatId, turnNumber, versionNumber);
        
        db.prepare('COMMIT').run();
        
        if (result.changes > 0) {
            log(`[VERSIONING] Activated version ${versionNumber} for turn ${turnNumber}`);
            return true;
        } else {
            log(`[VERSIONING] Version ${versionNumber} not found for turn ${turnNumber}`);
            return false;
        }
        
    } catch (error) {
        try { db.prepare('ROLLBACK').run(); } catch (rollbackErr) { /* ignore */ }
        log('[VERSIONING] Error setting active version:', error);
        return false;
    }
}

// Save messages to a specific version
async function saveMessagesToVersion(versionId, messages) {
    const { db } = require('../config/database');
    
    try {
        const insertStmt = db.prepare(`
            INSERT INTO message_versions 
            (turn_version_id, role, content, tool_calls, tool_call_id, tool_name, blocks, debug_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        messages.forEach(msg => {
            insertStmt.run(
                versionId, msg.role, msg.content,
                msg.tool_calls ? JSON.stringify(msg.tool_calls) : null,
                msg.tool_call_id, msg.tool_name,
                msg.blocks ? JSON.stringify(msg.blocks) : null,
                msg.debug_data ? JSON.stringify(msg.debug_data) : null
            );
        });
        
        log(`[VERSIONING] Saved ${messages.length} messages to version ${versionId}`);
        return true;
        
    } catch (error) {
        log('[VERSIONING] Error saving messages to version:', error);
        throw error;
    }
}

// ===== CHAT BRANCHING FUNCTIONS =====

// Create a new branch from a specific turn point (for retry)
async function createChatBranch(chatId, branchPoint = null) {
    const { db } = require('../config/database');
    
    try {
        db.prepare('BEGIN TRANSACTION').run();
        
        // Get the next branch name (Branch 1, Branch 2, etc.)
        const getBranchCountStmt = db.prepare(`
            SELECT COUNT(*) as count
            FROM chat_branches 
            WHERE chat_id = ?
        `);
        const { count } = getBranchCountStmt.get(chatId) || { count: 0 };
        const branchName = count === 0 ? 'main' : `Branch ${count + 1}`;
        
        // Get the currently active branch
        const getActiveBranchStmt = db.prepare(`
            SELECT id, branch_name
            FROM chat_branches 
            WHERE chat_id = ? AND is_active = TRUE
            LIMIT 1
        `);
        const activeBranch = getActiveBranchStmt.get(chatId);
        
        // Create new branch
        const insertBranchStmt = db.prepare(`
            INSERT INTO chat_branches (chat_id, branch_name, parent_branch_id, branch_point_turn, is_active)
            VALUES (?, ?, ?, ?, ?)
        `);
        const branchResult = insertBranchStmt.run(
            chatId, 
            branchName, 
            activeBranch ? activeBranch.id : null, 
            branchPoint,
            count === 0 ? 1 : 0 // First branch (main) should be active (1=TRUE, 0=FALSE)
        );
        const newBranchId = branchResult.lastInsertRowid;
        
        // Copy messages up to the branch point
        let messagesToCopy = [];
        
        if (activeBranch) {
            // Get messages from active branch up to branch point
            if (branchPoint !== null) {
                // Copy messages before the branch point
                const getMessagesStmt = db.prepare(`
                    SELECT original_message_id, role, content, turn_number, tool_calls, tool_call_id, tool_name, blocks, debug_data, edit_count, edited_at
                    FROM branch_messages 
                    WHERE branch_id = ? AND turn_number < ?
                    ORDER BY timestamp ASC
                `);
                messagesToCopy = getMessagesStmt.all(activeBranch.id, branchPoint);
            }
        } else {
            // No active branch found
            if (count === 0) {
                // This is normal when creating the very first main branch
                log(`[BRANCHING] Creating first main branch for chat ${chatId} - no active branch expected`);
                // No messages to copy for the first branch
            } else {
                // This shouldn't happen for non-main branches - they should have a parent
                log(`[BRANCHING] ERROR: No active branch found for chat ${chatId} when creating branch ${count + 1} - this violates everything-is-a-branch principle`);
                throw new Error(`No active branch found for chat ${chatId}. Every chat must have a main branch before creating additional branches.`);
            }
        }
        
        // Copy messages to new branch
        if (messagesToCopy.length > 0) {
            const insertMessageStmt = db.prepare(`
                INSERT INTO branch_messages 
                (branch_id, original_message_id, role, content, turn_number, tool_calls, tool_call_id, tool_name, blocks, debug_data, edit_count, edited_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            messagesToCopy.forEach(msg => {
                insertMessageStmt.run(
                    newBranchId, msg.original_message_id, msg.role, msg.content, msg.turn_number,
                    msg.tool_calls, msg.tool_call_id, msg.tool_name, msg.blocks, msg.debug_data,
                    msg.edit_count || 0, msg.edited_at
                );
            });
        }
        
        // CRITICAL FIX: Reset chat turn number to branch point for retry
        // This ensures new messages use the retry turn number instead of creating new turns
        if (branchPoint !== null) {
            const updateTurnStmt = db.prepare(`
                UPDATE chats SET turn_number = ? WHERE id = ?
            `);
            updateTurnStmt.run(branchPoint - 1, chatId); // Set to branchPoint - 1 so next increment makes it branchPoint
            log(`[BRANCHING] Reset chat ${chatId} turn number to ${branchPoint - 1} for retry`);
            
            // CRITICAL FIX #2: Delete any existing messages for the retry turn in the new branch
            // This prevents duplicate content when retrying
            const deleteRetryTurnStmt = db.prepare(`
                DELETE FROM branch_messages 
                WHERE branch_id = ? AND turn_number >= ?
            `);
            const deletedCount = deleteRetryTurnStmt.run(newBranchId, branchPoint).changes;
            log(`[BRANCHING] Deleted ${deletedCount} existing messages for turn ${branchPoint}+ in new branch for clean retry`);
        }
        
        db.prepare('COMMIT').run();
        
        log(`[BRANCHING] Created branch '${branchName}' for chat ${chatId} with ${messagesToCopy.length} messages (branch point: ${branchPoint})`);
        return {
            branchId: newBranchId,
            branchName: branchName,
            branchPoint: branchPoint
        };
        
    } catch (error) {
        try { db.prepare('ROLLBACK').run(); } catch (rollbackErr) { /* ignore */ }
        log('[BRANCHING] Error creating chat branch:', error);
        throw error;
    }
}

// Get all branches for a chat
function getChatBranches(chatId) {
    const { db } = require('../config/database');
    
    try {
        const stmt = db.prepare(`
            SELECT cb.id, cb.branch_name, cb.parent_branch_id, cb.branch_point_turn, cb.is_active, cb.created_at,
                   COUNT(bm.id) as message_count,
                   pcb.branch_name as parent_branch_name
            FROM chat_branches cb
            LEFT JOIN branch_messages bm ON cb.id = bm.branch_id
            LEFT JOIN chat_branches pcb ON cb.parent_branch_id = pcb.id
            WHERE cb.chat_id = ?
            GROUP BY cb.id, cb.branch_name, cb.parent_branch_id, cb.branch_point_turn, cb.is_active, cb.created_at, pcb.branch_name
            ORDER BY cb.created_at ASC
        `);
        
        const branches = stmt.all(chatId);
        log(`[BRANCHING] Found ${branches.length} branches for chat ${chatId}:`, branches.map(b => `${b.branch_name}(active:${b.is_active})`));
        return branches;
        
    } catch (error) {
        log('[BRANCHING] Error getting chat branches:', error);
        return [];
    }
}

// Get active branch for a chat
function getActiveChatBranch(chatId) {
    const { db } = require('../config/database');
    
    try {
        const stmt = db.prepare(`
            SELECT id, branch_name
            FROM chat_branches 
            WHERE chat_id = ? AND is_active = TRUE
            LIMIT 1
        `);
        
        const result = stmt.get(chatId);
        if (result) {
            log(`[BRANCHING] Active branch for chat ${chatId}: ${result.branch_name}`);
            return result;
        } else {
            log(`[BRANCHING] No active branch found for chat ${chatId}`);
            return null;
        }
        
    } catch (error) {
        log('[BRANCHING] Error getting active branch:', error);
        return null;
    }
}

// Set active branch for a chat
function setActiveChatBranch(chatId, branchId) {
    const { db } = require('../config/database');
    
    try {
        db.prepare('BEGIN TRANSACTION').run();
        
        // Deactivate all branches for this chat
        const deactivateStmt = db.prepare(`
            UPDATE chat_branches 
            SET is_active = FALSE 
            WHERE chat_id = ?
        `);
        deactivateStmt.run(chatId);
        
        // Activate the specified branch
        const activateStmt = db.prepare(`
            UPDATE chat_branches 
            SET is_active = TRUE 
            WHERE id = ? AND chat_id = ?
        `);
        const result = activateStmt.run(branchId, chatId);
        
        if (result.changes === 0) {
            throw new Error(`Branch ${branchId} not found for chat ${chatId}`);
        }
        
        db.prepare('COMMIT').run();
        
        // Get branch name for logging
        const getBranchStmt = db.prepare(`
            SELECT branch_name 
            FROM chat_branches 
            WHERE id = ?
        `);
        const branch = getBranchStmt.get(branchId);
        
        log(`[BRANCHING] Activated branch '${branch?.branch_name}' (${branchId}) for chat ${chatId}`);
        return true;
        
    } catch (error) {
        try { db.prepare('ROLLBACK').run(); } catch (rollbackErr) { /* ignore */ }
        log('[BRANCHING] Error setting active branch:', error);
        throw error;
    }
}

/**
 * Utility function to create file-separated content for saving
 * This helps frontends transition to the new structure
 * @param {string} userText - User's text input
 * @param {Array} files - Array of processed file objects
 * @param {Array} images - Array of image objects
 * @returns {Object} - { content, originalContent, fileMetadata }
 */
function createMessageWithSeparatedFiles(userText, files = [], images = []) {
    const hasFiles = files && files.length > 0;
    const hasImages = images && images.length > 0;
    
    let content, originalContent;
    
    if (hasFiles || hasImages) {
        // Create multimodal content
        originalContent = [];
        
        // Add text part
        if (userText || hasFiles) {
            originalContent.push({
                type: 'text',
                text: userText || ''
            });
        }
        
        // Add images
        if (hasImages) {
            originalContent.push(...images);
        }
        
        // Add files as separate part
        if (hasFiles) {
            originalContent.push({
                type: 'files',
                files: files
            });
        }
        
        // Process for AI (with concatenated content)
        const processed = processMessageForAI(originalContent);
        content = processed.aiContent;
        
    } else {
        // Simple text content
        content = userText || '';
        originalContent = userText || '';
    }
    
    const fileMetadata = {
        hasFiles,
        fileCount: files.length,
        imageCount: images.length,
        files: files
    };
    
    return {
        content,
        originalContent,
        fileMetadata
    };
}

module.exports = {
    handleChatWithTools,
    processChatRequest,
    saveCompleteMessageToDatabase,
    updateMessageDebugData,
    getChatHistoryForAPI,
    getCurrentTurnNumber,
    incrementTurnNumber,
    // Turn-based debug data functions
    saveTurnDebugData,
    getTurnDebugData,
    getAllTurnDebugData,
    // Chat branching functions
    createChatBranch,
    getChatBranches,
    getActiveChatBranch,
    setActiveChatBranch,
    // File handling functions
    extractFilesFromContent,
    concatenateFileContent,
    createSeparatedFileContent,
    processMessageForAI,
    createMessageWithSeparatedFiles,
};