const TelegramBot = require('node-telegram-bot-api');
const TelegramAccount = require('../models/TelegramAccount');
const AdminConversation = require('../models/AdminConversation');
const { processAdminChat, generateChatTitle } = require('./adminAiService');

const MODEL_CANDIDATES = [
    'gemini-3.1-pro-preview',
    'gemini-2.5-pro',
    'o4-mini',
    'o3-mini',
    'gpt-5.4-mini',
    'gpt-5-mini'
];

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
        const msg = error.message || '';
        
        // 409 = نسختان من البوت تعملان في نفس الوقت (مثل أثناء Deploy جديد على Render)
        // الحل: نوقف الـ polling في هذه النسخة فوراً، والنسخة الجديدة ستأخذ الدور
        if (msg.includes('409') || msg.includes('Conflict')) {
            console.warn('[Telegram Bot] 409 Conflict - نسخة أخرى تعمل، إيقاف الـ polling في هذه النسخة...');
            bot.stopPolling().catch(() => {});
            return;
        }
        
        // تجاهل أخطاء DNS العادية أثناء البدء
        if (!msg.includes('EFATAL') && !msg.includes('ENOTFOUND')) {
            console.error('[Telegram Bot] Polling Error:', msg);
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

            if (!text && !msg.voice && !msg.photo) {
                return; // ignore non-text/voice/photo for now
            }

            // Display typing action
            bot.sendChatAction(chatId, 'typing');

            if (text === '⚙️ إعدادات الذكاء الاصطناعي') {
                return bot.sendMessage(chatId, 'اختر وضع المحرك الذكي:', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: (account.aiMode === 'auto' ? '✅ ' : '') + 'متقدم وتلقائي', callback_data: 'mode_auto' }],
                            [{ text: (account.aiMode === 'fast' ? '✅ ' : '') + 'سريع (للمهام البسيطة)', callback_data: 'mode_fast' }],
                            [{ text: (account.aiMode === 'specific' ? '✅ ' : '') + 'متقدم (اختيار مودل)', callback_data: 'mode_specific' }]
                        ]
                    }
                });
            }

            if (text === '🔄 محادثة جديدة') {
                await AdminConversation.create({ telegramAccountId: account._id, messages: [] });
                return bot.sendMessage(chatId, 'تم بدء محادثة جديدة. تفضل بطرح سؤالك!', {
                    reply_markup: {
                        keyboard: [
                            ['⚙️ إعدادات الذكاء الاصطناعي', '🔄 محادثة جديدة']
                        ],
                        resize_keyboard: true,
                        persistent: true
                    }
                });
            }

            // Find or create conversation
            let conv = await AdminConversation.findOne({ telegramAccountId: account._id }).sort({ lastActivity: -1 });
            let isNew = false;
            
            if (!conv) {
                conv = new AdminConversation({ telegramAccountId: account._id, messages: [] });
                isNew = true;
            }

            // التحقق من وجود صورة وتنزيلها
            let fileBuffer = null;
            let fileMimeType = null;
            let userText = msg.caption || text || '';

            if (msg.photo && msg.photo.length > 0) {
                try {
                    const axios = require('axios');
                    // الحصول على أعلى جودة للصورة (آخر عنصر في المصفوفة)
                    const fileId = msg.photo[msg.photo.length - 1].file_id;
                    const fileLink = await bot.getFileLink(fileId);
                    
                    const response = await axios.get(fileLink, { responseType: 'arraybuffer' });
                    fileBuffer = Buffer.from(response.data, 'binary');
                    fileMimeType = 'image/jpeg'; // الصور المرفوعة لتليجرام تكون دائماً بتنسيق JPEG
                    
                    if (!userText) {
                        userText = 'تفضل هذه الصورة. الرجاء تحليلها لمعرفة محتواها أو استخدمها كمرجع بناءً على تعليماتي السابقة.';
                    }
                } catch (e) {
                    console.error('[Telegram Bot] Error downloading photo:', e.message);
                    bot.sendMessage(chatId, 'حدث خطأ أثناء محاولة تحميل الصورة الخاصة بك.');
                }
            }

            // Push user message
            if (!userText && msg.voice) {
                userText = 'رسالة صوتية (تليجرام)';
            }
            conv.messages.push({ role: 'user', text: userText });
            
            // تحديد سقف للرسائل لمنع تضخم قاعدة البيانات
            if (conv.messages.length > 50) {
                conv.messages = conv.messages.slice(-50);
            }
            
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
            let aiSuccess = true;
            try {
                let fastMode = account.aiMode === 'fast';
                let specificModel = account.aiMode === 'specific' ? account.specificModel : null;
                // arguments: msgsForAi, fullUser, fileBuffer, fileMimeType, additionalPrompt, onToolCall, fastMode, specificModel
                replyText = await processAdminChat(msgsForAi, dummyUser, fileBuffer, fileMimeType, null, null, fastMode, specificModel);
            } catch (aiErr) {
                console.error('[Telegram Bot] AI Error:', aiErr);
                replyText = 'أعتذر، حدث خطأ في معالجة طلبك بالمحرك الذكي.';
                aiSuccess = false;
            }

            // Save bot reply
            if (aiSuccess) {
                conv.messages.push({ role: 'model', text: replyText });
                if (conv.messages.length > 50) conv.messages = conv.messages.slice(-50);
                conv.lastActivity = Date.now();
                await conv.save();
            }

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
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, 'أهلاً بك في المساعد الذكي لإدارة غرام سلطان بيوتي سنتر.\nيمكنك البدء بطرح أسئلتك أو تغيير الإعدادات من القائمة السفلية.', {
            reply_markup: {
                keyboard: [
                    ['⚙️ إعدادات الذكاء الاصطناعي', '🔄 محادثة جديدة']
                ],
                resize_keyboard: true,
                persistent: true
            }
        });
    });

    bot.on('callback_query', async (query) => {
        const data = query.data;
        const chatId = query.message.chat.id;
        const account = await TelegramAccount.findOne({ telegramId: chatId.toString() });
        if (!account) return;

        try {
            if (data === 'mode_auto') {
                bot.answerCallbackQuery(query.id, { text: 'تم التغيير للوضع التلقائي المتقدم' });
                bot.editMessageText('تم اختيار الوضع التلقائي المتقدم بنجاح ✅', { chat_id: chatId, message_id: query.message.message_id });
                account.aiMode = 'auto';
                account.specificModel = null;
                account.save().catch(e => console.error("Error saving mode_auto:", e));
            } else if (data === 'mode_fast') {
                bot.answerCallbackQuery(query.id, { text: 'تم التغيير للوضع السريع' });
                bot.editMessageText('تم اختيار الوضع السريع بنجاح ⚡', { chat_id: chatId, message_id: query.message.message_id });
                account.aiMode = 'fast';
                account.specificModel = null;
                account.save().catch(e => console.error("Error saving mode_fast:", e));
            } else if (data === 'mode_specific') {
                bot.answerCallbackQuery(query.id);
                const inline_keyboard = [];
                let currentRow = [];
                for(let i = 0; i < MODEL_CANDIDATES.length; i++) {
                    const m = MODEL_CANDIDATES[i];
                    currentRow.push({ text: (account.specificModel === m ? '✅ ' : '') + m, callback_data: 'model_' + m });
                    if(currentRow.length === 2 || i === MODEL_CANDIDATES.length - 1) {
                        inline_keyboard.push(currentRow);
                        currentRow = [];
                    }
                }
                bot.editMessageText('اختر المودل الذي تريده:', {
                    chat_id: chatId, 
                    message_id: query.message.message_id,
                    reply_markup: { inline_keyboard }
                });
            } else if (data.startsWith('model_')) {
                const modelName = data.replace('model_', '');
                bot.answerCallbackQuery(query.id, { text: 'تم تفعيل المودل: ' + modelName });
                bot.editMessageText('تم تفعيل مودل: ' + modelName + ' ✅', { chat_id: chatId, message_id: query.message.message_id });
                account.aiMode = 'specific';
                account.specificModel = modelName;
                account.save().catch(e => console.error("Error saving specific mode:", e));
            }
        } catch(err) {
            console.error('[Telegram Bot] Callback query error:', err);
        }
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
            await bot.sendMessage(chatId, chunk, { 
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [['⚙️ إعدادات الذكاء الاصطناعي', '🔄 محادثة جديدة']],
                    resize_keyboard: true,
                    persistent: true
                }
            });
        } catch (err) {
            // محاولة الإرسال بصيغة HTML لو الماركدوان فشل (أكثر استقراراً للأكواد والروابط)
            try {
                const escapedHtml = chunk
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
                
                // تحويل الماركدوان البسيط لـ HTML
                const htmlChunk = escapedHtml
                    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                    .replace(/\*(.*?)\*/g, '<i>$1</i>')
                    .replace(/`(.*?)`/g, '<code>$1</code>');

                await bot.sendMessage(chatId, htmlChunk, { parse_mode: 'HTML' });
            } catch (htmlErr) {
                console.warn(`[Telegram Bot] HTML fallback failed for chat ${chatId}: ${htmlErr.message}`);
                // الفشل النهائي: إرسال نص عادي
                await bot.sendMessage(chatId, chunk);
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
