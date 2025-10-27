// Database configuration and setup
const Database = require('better-sqlite3');
const path = require('path');
const { log } = require('../utils/logger');
const fs = require('fs');

// Ensure userdata directory exists
let userdataDir;
if (process.env.PORTABLE_USERDATA_PATH) {
    // Electron portable mode - use path set by main process
    userdataDir = process.env.PORTABLE_USERDATA_PATH;
} else {
    // Running as normal Node.js - use project directory
    userdataDir = path.join(__dirname, '..', '..', 'userdata');
}
if (!fs.existsSync(userdataDir)) {
    fs.mkdirSync(userdataDir, { recursive: true });
}

// Database file path
const dbPath = path.join(userdataDir, 'chats.db');

// Database connection - initialize immediately with basic connection
// This ensures db is never undefined when imported
let db = new Database(dbPath);

// Initialize database schema
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        try {
            // Create tables
            db.exec(`CREATE TABLE IF NOT EXISTS chats (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
            
            // Settings table for application configuration
            db.exec(`CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )`);
            
            // Add turn_number to chats table for proper turn tracking
            try {
                db.exec(`ALTER TABLE chats ADD COLUMN turn_number INTEGER DEFAULT 0`);
            } catch (err) {
                // Column likely already exists
                if (!err.message.includes('duplicate column name')) {
                    log('[DB] Error adding turn_number to chats:', err.message);
                }
            }
            
            // Everything-is-a-branch system: Every chat gets a main branch from creation
            db.exec(`CREATE TABLE IF NOT EXISTS chat_branches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chat_id TEXT NOT NULL,
                branch_name TEXT NOT NULL,
                parent_branch_id INTEGER,
                branch_point_turn INTEGER,
                is_active BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(chat_id, branch_name),
                FOREIGN KEY (chat_id) REFERENCES chats (id),
                FOREIGN KEY (parent_branch_id) REFERENCES chat_branches (id)
            )`);
            
            // This is now the ONLY message table - everything goes through branches
            db.exec(`CREATE TABLE IF NOT EXISTS branch_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                branch_id INTEGER NOT NULL,
                original_message_id INTEGER,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                turn_number INTEGER NOT NULL,
                tool_calls TEXT,
                tool_call_id TEXT,
                tool_name TEXT,
                blocks TEXT,
                debug_data TEXT,
                edit_count INTEGER DEFAULT 0,
                edited_at DATETIME,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (branch_id) REFERENCES chat_branches (id)
            )`);
            
            // Add new fields for file handling separation
            try {
                db.exec(`ALTER TABLE branch_messages ADD COLUMN original_content TEXT`);
                log('[DB] Added original_content column to branch_messages');
            } catch (err) {
                // Column likely already exists
                if (!err.message.includes('duplicate column name')) {
                    log('[DB] Error adding original_content:', err.message);
                }
            }
            
            try {
                db.exec(`ALTER TABLE branch_messages ADD COLUMN file_metadata TEXT`);
                log('[DB] Added file_metadata column to branch_messages');
            } catch (err) {
                // Column likely already exists
                if (!err.message.includes('duplicate column name')) {
                    log('[DB] Error adding file_metadata:', err.message);
                }
            }
            
            // Add error_state column for tracking errored messages
            try {
                db.exec(`ALTER TABLE branch_messages ADD COLUMN error_state TEXT DEFAULT NULL`);
                log('[DB] Added error_state column to branch_messages');
            } catch (err) {
                // Column likely already exists
                if (!err.message.includes('duplicate column name')) {
                    log('[DB] Error adding error_state:', err.message);
                }
            }
            
            // FULL MIGRATION: Move everything to branch-based system and drop old tables
            try {
                log('[DB] Starting FULL migration to everything-is-a-branch system...');
                
                // Step 1: Migrate any remaining data from old messages table
                const oldTableExists = db.prepare(`
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name='messages'
                `).get();
                
                if (oldTableExists) {
                    log('[DB] Found old messages table, migrating data...');
                    
                    // Get all chats that have messages but no main branch
                    const chatsWithoutBranchStmt = db.prepare(`
                        SELECT DISTINCT m.chat_id
                        FROM messages m
                        LEFT JOIN chat_branches cb ON m.chat_id = cb.chat_id AND cb.branch_name = 'main'
                        WHERE cb.id IS NULL
                        ORDER BY m.chat_id
                    `);
                    const chatsWithoutBranch = chatsWithoutBranchStmt.all();
                    
                    for (const chat of chatsWithoutBranch) {
                        // Create main branch for this chat
                        const insertBranchStmt = db.prepare(`
                            INSERT INTO chat_branches (chat_id, branch_name, parent_branch_id, branch_point_turn, is_active)
                            VALUES (?, 'main', NULL, NULL, TRUE)
                        `);
                        const branchResult = insertBranchStmt.run(chat.chat_id);
                        const branchId = branchResult.lastInsertRowid;
                        
                        // Get all messages for this chat
                        const messagesStmt = db.prepare(`
                            SELECT id, role, content, turn_number, tool_calls, tool_call_id, tool_name, blocks, debug_data, edit_count, edited_at, timestamp
                            FROM messages 
                            WHERE chat_id = ?
                            ORDER BY timestamp ASC
                        `);
                        const messages = messagesStmt.all(chat.chat_id);
                        
                        // Copy all messages to main branch
                        const insertMessageStmt = db.prepare(`
                            INSERT INTO branch_messages 
                            (branch_id, original_message_id, role, content, turn_number, tool_calls, tool_call_id, tool_name, blocks, debug_data, edit_count, edited_at, timestamp)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `);
                        
                        for (const msg of messages) {
                            insertMessageStmt.run(
                                branchId, msg.id, msg.role, msg.content, msg.turn_number || 1,
                                msg.tool_calls, msg.tool_call_id, msg.tool_name, msg.blocks, msg.debug_data,
                                msg.edit_count || 0, msg.edited_at, msg.timestamp
                            );
                        }
                        
                        log(`[DB] Migrated chat ${chat.chat_id} to main branch with ${messages.length} messages`);
                    }
                    
                    // Step 2: Migrate debug data from turn_debug_data to branch_messages
                    log('[DB] Migrating debug data to branch messages...');
                    const debugDataExists = db.prepare(`
                        SELECT name FROM sqlite_master 
                        WHERE type='table' AND name='turn_debug_data'
                    `).get();
                    
                    if (debugDataExists) {
                        // Get all debug data
                        const debugDataStmt = db.prepare(`
                            SELECT chat_id, turn_number, debug_data
                            FROM turn_debug_data
                        `);
                        const debugDataRows = debugDataStmt.all();
                        
                        // Update branch_messages with debug data
                        const updateDebugStmt = db.prepare(`
                            UPDATE branch_messages 
                            SET debug_data = ?
                            WHERE branch_id IN (
                                SELECT cb.id FROM chat_branches cb 
                                WHERE cb.chat_id = ? AND cb.branch_name = 'main'
                            )
                            AND turn_number = ?
                            AND debug_data IS NULL
                        `);
                        
                        for (const debugRow of debugDataRows) {
                            updateDebugStmt.run(debugRow.debug_data, debugRow.chat_id, debugRow.turn_number);
                        }
                        
                        log(`[DB] Migrated ${debugDataRows.length} debug data entries to branch messages`);
                    }
                    
                    // Step 3: Drop old tables after successful migration
                    log('[DB] Dropping old tables...');
                    db.exec('DROP TABLE IF EXISTS messages');
                    db.exec('DROP TABLE IF EXISTS turn_debug_data');
                    log('[DB] Successfully dropped old tables: messages, turn_debug_data');
                }
                
                // Step 4: Ensure ALL existing chats have main branches
                const chatsWithoutMainBranchStmt = db.prepare(`
                    SELECT c.id 
                    FROM chats c
                    LEFT JOIN chat_branches cb ON c.id = cb.chat_id AND cb.branch_name = 'main'
                    WHERE cb.id IS NULL
                `);
                const chatsWithoutMainBranch = chatsWithoutMainBranchStmt.all();
                
                const createMainBranchStmt = db.prepare(`
                    INSERT INTO chat_branches (chat_id, branch_name, parent_branch_id, branch_point_turn, is_active)
                    VALUES (?, 'main', NULL, NULL, TRUE)
                `);
                
                for (const chat of chatsWithoutMainBranch) {
                    createMainBranchStmt.run(chat.id);
                    log(`[DB] Created main branch for existing chat ${chat.id}`);
                }
                
                log(`[DB] FULL migration to everything-is-a-branch completed!`);
                
            } catch (migrationError) {
                log('[DB] Error during full migration:', migrationError.message);
                // Don't fail initialization if migration fails, but log it clearly
                log('[DB] MIGRATION FAILED - system may have inconsistent state');
            }
            
            log('[DB] Database initialized successfully');
            resolve();
        } catch (err) {
            log('[DB] Error initializing database:', err.message);
            reject(err);
        }
    });
}

// Graceful database shutdown
function closeDatabase() {
    return new Promise((resolve) => {
        try {
            if (db) {
                db.close();
                log('[DATABASE] Closed successfully.');
            }
            resolve();
        } catch (err) {
            log('[DATABASE] Error closing database:', err.message);
            resolve();
        }
    });
}

module.exports = {
    db,  // Export the database instance directly
    initializeDatabase,
    closeDatabase
};