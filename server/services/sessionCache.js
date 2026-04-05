// In-memory session cache for AI Chatbot (Web and Facebook Messenger)
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

module.exports = {
    getUserHistory,
    addUserMessage,
    addAssistantMessage
};
