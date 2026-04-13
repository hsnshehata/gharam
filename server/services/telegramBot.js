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
            // Telegram has a max message length of 4096, so we split if needed
            const maxLength = 4000;
            for (let i = 0; i < replyText.length; i += maxLength) {
                await bot.sendMessage(chatId, replyText.substring(i, i + maxLength), { parse_mode: 'Markdown' });
            }

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


const sendToAdmins = async (text) => {
    if (!bot) return;
    try {
        const accounts = await TelegramAccount.find();
        for (const account of accounts) {
            try {
                // Telegram max length is 4096
                const maxLength = 4000;
                for (let i = 0; i < text.length; i += maxLength) {
                    await bot.sendMessage(account.telegramId, text.substring(i, i + maxLength), { parse_mode: 'Markdown' });
                }
            } catch (err) {
                console.error(`[Telegram Bot] Send error for chat ${account.telegramId}:`, err.message);
            }
        }
    } catch (err) {
        console.error('[Telegram Bot] Error sending to admins:', err);
    }
};

module.exports = { initTelegramBot, sendToAdmins };
