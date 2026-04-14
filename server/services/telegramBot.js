const TelegramBot = require('node-telegram-bot-api');
const TelegramAccount = require('../models/TelegramAccount');
const AdminConversation = require('../models/AdminConversation');
const { processAdminChat, generateChatTitle } = require('./adminAiService');

let bot;

const initTelegramBot = () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.log('[Telegram Bot] لا يوجد TELEGRAM_BOT_TOKEN، تم إيقاف البوت.');
        return;
    }

    bot = new TelegramBot(token, { polling: true });
    console.log('[Telegram Bot] يعمل بنجاح 🚀');

    bot.on('polling_error', (error) => {
        // Silently ignore or just log briefly. Usually EFATAL AggregateError happens on cold starts when DNS is still resolving
        if (!error.message.includes('EFATAL')) {
            console.error('[Telegram Bot] Polling Error:', error.message);
        }
    });

    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text || '';

        try {
            // Check if account is linked
            const account = await TelegramAccount.findOne({ telegramId: chatId.toString() });
            
            if (!account) {
                bot.sendMessage(chatId, `حسابك غير مربوط بالنظام.\n\nالمعرف الخاص بك هو:\n\`${chatId}\`\n\nيرجى إرسال هذا المعرف للإدارة لربط حسابك.`, { parse_mode: 'Markdown' });
                return;
            }

            if (!text && !msg.voice) {
                return; // ignore non-text/voice for now
            }

            // Display typing action
            bot.sendChatAction(chatId, 'typing');

            // Find or create conversation
            let conv = await AdminConversation.findOne({ telegramAccountId: account._id }).sort({ lastActivity: -1 });
            let isNew = false;
            
            if (!conv) {
                conv = new AdminConversation({ telegramAccountId: account._id, messages: [] });
                isNew = true;
            }

            // Push user message
            let userText = text;
            if (!userText && msg.voice) {
                userText = 'رسالة صوتية (تليجرام)';
            }
            conv.messages.push({ role: 'user', text: userText });
            conv.lastActivity = Date.now();
            await conv.save();

            // Prepare messages for AI (limit history for tokens if needed, e.g. last 10 messages)
            const msgsForAi = conv.messages.slice(-10);

            // Construct dummy user for processAdminChat
            const dummyUser = {
                _id: account._id,
                role: account.role,
                username: account.name
            };

            // Call AI module
            let replyText = 'حدث خطأ غير متوقع.';
            try {
                // Here we don't pass audio fileBuffer for simplicity unless we download it from telegram
                replyText = await processAdminChat(msgsForAi, dummyUser, null, null);
            } catch (aiErr) {
                console.error('[Telegram Bot] AI Error:', aiErr);
                replyText = 'أعتذر، حدث خطأ في معالجة طلبك بالمحرك الذكي.';
            }

            // Save bot reply
            conv.messages.push({ role: 'model', text: replyText });
            conv.lastActivity = Date.now();
            await conv.save();

            // Send reply back to Telegram
            await sendTelegramMessageWithFallback(chatId, replyText);

            // Generate title if new
            if (isNew) {
                try {
                    const title = await generateChatTitle(userText);
                    conv.title = title || userText.substring(0, 20) + '...';
                    await conv.save();
                } catch (tErr) {
                    console.error('[Telegram Bot] Title generation error', tErr);
                }
            }

        } catch (err) {
            console.error('[Telegram Bot] Error processing message:', err);
            bot.sendMessage(chatId, 'حدث خطأ في النظام. يرجى المحاولة لاحقاً.');
        }
    });

    // Also handle /start
    bot.onText(/\/start/, (msg) => {
        // Just send a welcome, the general message handler will catch it too, but we can prevent double reply
        // Well, the general message handler WILL capture it, so we don't need a separate /start handler unless we want specific text.
        // let's do nothing on /start so 'message' handler does its thing.
    });
};

const sendTelegramMessageWithFallback = async (chatId, text) => {
    if (!bot) return;
    
    // Split by newlines to avoid breaking markdown entities mid-sentence
    const maxLength = 3900; // Slightly under 4096 to be safe
    let chunks = [];
    let currentChunk = '';

    const lines = text.split('\n');
    for (const line of lines) {
        if ((currentChunk.length + line.length + 1) > maxLength) {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = line;
            
            // If a single line is still too long, we have to brute-force split it
            while (currentChunk.length > maxLength) {
                chunks.push(currentChunk.substring(0, maxLength));
                currentChunk = currentChunk.substring(maxLength);
            }
        } else {
            currentChunk += (currentChunk ? '\n' : '') + line;
        }
    }
    if (currentChunk) chunks.push(currentChunk);

    for (const chunk of chunks) {
        try {
            await bot.sendMessage(chatId, chunk, { parse_mode: 'Markdown' });
        } catch (err) {
            // If markdown parsing fails, fallback to plain text
            console.warn(`[Telegram Bot] Markdown parse failed for chat ${chatId}, falling back to plain text. Error: ${err.message}`);
            try {
                await bot.sendMessage(chatId, chunk);
            } catch (fallbackErr) {
                console.error(`[Telegram Bot] Send error for chat ${chatId}:`, fallbackErr.message);
            }
        }
    }
}

const sendToAdmins = async (text) => {
    if (!bot) return;
    try {
        const accounts = await TelegramAccount.find();
        for (const account of accounts) {
            await sendTelegramMessageWithFallback(account.telegramId, text);
        }
    } catch (err) {
        console.error('[Telegram Bot] Error sending to admins:', err);
    }
};

module.exports = { initTelegramBot, sendToAdmins };
