// In-memory session cache for AI Chatbot (Web and Facebook Messenger)
// Now also persists conversations to MongoDB for admin viewing
const Conversation = require('../models/Conversation');

const sessionCache = new Map();

// Session timeout: 30 minutes
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

const cleanupExpiredSessions = () => {
    const now = Date.now();
    for (const [userId, sessionData] of sessionCache.entries()) {
        if (now - sessionData.lastAccessed > SESSION_TIMEOUT_MS) {
            sessionCache.delete(userId);
        }
    }
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

const getSession = (userId) => {
    if (!sessionCache.has(userId)) {
        sessionCache.set(userId, { history: [], lastAccessed: Date.now() });
    }
    const session = sessionCache.get(userId);
    session.lastAccessed = Date.now();
    return session;
};

const getUserHistory = (userId) => {
    return getSession(userId).history;
};

const addUserMessage = (userId, message) => {
    const session = getSession(userId);
    session.history.push({ role: 'user', text: message });
    // Keep only last 20 messages to avoid context overflow
    if (session.history.length > 20) session.history = session.history.slice(-20);
};

const addAssistantMessage = (userId, message) => {
    const session = getSession(userId);
    session.history.push({ role: 'model', text: message });
};

/**
 * Persist a message to MongoDB Conversation collection
 * This is fire-and-forget (async, no await needed at call site) so it doesn't slow down chat
 * @param {string} sessionId - unique session/device identifier
 * @param {string} source - 'web' | 'messenger' | 'comment'
 * @param {string} role - 'user' | 'model'
 * @param {string} text - message text
 * @param {object} extra - { senderName, senderId, metadata }
 */
const persistMessage = async (sessionId, source, role, text, extra = {}) => {
    try {
        const update = {
            $push: { messages: { role, text, timestamp: new Date() } },
            $set: { lastActivity: new Date() }
        };

        // Set fields only on creation (first message)
        const setOnInsert = { sessionId, source };
        if (extra.senderName) setOnInsert.senderName = extra.senderName;
        if (extra.senderId) setOnInsert.senderId = extra.senderId;
        if (extra.metadata) setOnInsert.metadata = extra.metadata;

        update.$setOnInsert = setOnInsert;

        // Also update senderName if provided (may change for messenger)
        if (extra.senderName) {
            update.$set.senderName = extra.senderName;
        }

        await Conversation.findOneAndUpdate(
            { sessionId, source },
            update,
            { upsert: true, new: true }
        );
    } catch (err) {
        console.error('[SessionCache] Error persisting message:', err.message);
    }
};

/**
 * Load conversation history from MongoDB for a given sessionId
 * Returns the messages array or empty array if not found
 */
const loadConversationHistory = async (sessionId, source = 'web') => {
    try {
        const conv = await Conversation.findOne({ sessionId, source }).lean();
        if (conv && conv.messages && conv.messages.length > 0) {
            return conv.messages.map(m => ({ role: m.role, text: m.text }));
        }
        return [];
    } catch (err) {
        console.error('[SessionCache] Error loading conversation:', err.message);
        return [];
    }
};

module.exports = {
    getUserHistory,
    addUserMessage,
    addAssistantMessage,
    persistMessage,
    loadConversationHistory
};
