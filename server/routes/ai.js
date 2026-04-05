const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const SystemSetting = require('../models/SystemSetting');
const multer = require('multer');
const googleTTS = require('google-tts-api');
const { processAiChat, DEFAULT_PROMPT } = require('../services/aiService');

// Configure multer for voice messages
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/ai/prompt
router.get('/prompt', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        const setting = await SystemSetting.findOne({ key: 'ai_system_prompt' });
        res.json({ success: true, data: setting ? setting.value : DEFAULT_PROMPT });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/ai/prompt
router.post('/prompt', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ message: 'Prompt missing' });

        await SystemSetting.findOneAndUpdate(
            { key: 'ai_system_prompt' },
            { value: prompt, updatedAt: Date.now() },
            { upsert: true, new: true }
        );
        res.json({ success: true, message: 'تم الحفظ بنجاح' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/ai/chat
router.post('/chat', upload.single('audio'), async (req, res) => {
    try {
        let { messages } = req.body;
        // If coming from FormData, messages might be a JSON string
        if (typeof messages === 'string') {
            try { messages = JSON.parse(messages); } catch (e) { }
        }

        if (!messages || !messages.length) return res.status(400).json({ message: 'Missing messages' });

        let fileBuffer = null;
        let fileMimeType = null;

        if (req.file) {
            fileBuffer = req.file.buffer;
            fileMimeType = req.file.mimetype;
        }

        let reply;
        try {
            reply = await processAiChat(messages, fileBuffer, fileMimeType, false);
        } catch (genErr) {
            console.error('Gemini error:', genErr);
            return res.status(500).json({ message: genErr.message || 'خطأ في التواصل مع الذكاء الاصطناعي' });
        }

        // Generate Audio Response (Base64 parts to avoid browser blocks)
        let audioParts = [];
        try {
            const axios = require('axios');
            // Split audio into chunks because Google TTS has 200 char limit
            const cleanReply = reply.replace(/[*#]/g, '').slice(0, 800); // Clean and limit for TTS stability
            const urls = googleTTS.getAllAudioUrls(cleanReply, {
                lang: 'ar',
                slow: false,
                host: 'https://translate.google.com',
            });

            // Fetch each chunk and convert to base64
            for (const item of urls) {
                try {
                    const audioRes = await axios.get(item.url, { responseType: 'arraybuffer' });
                    const base64 = Buffer.from(audioRes.data).toString('base64');
                    audioParts.push(`data:audio/mpeg;base64,${base64}`);
                } catch (fetchErr) {
                    console.error('Error fetching TTS chunk:', fetchErr.message);
                }
            }
        } catch (ttsErr) {
            console.error('TTS error:', ttsErr);
        }

        res.json({ success: true, reply, audioParts });
    } catch (err) {
        console.error('Request error:', err);
        res.status(500).json({ message: 'خطأ داخلي في الخادم' });
    }
});

module.exports = router;
