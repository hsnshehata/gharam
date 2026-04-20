const express = require('express');
const router = express.Router();
const AIAgent = require('../models/AIAgent');
const protect = require('../middleware/authenticate');
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') next();
    else res.status(403).json({ error: 'الصلاحية غير متوفرة' });
};

// --- الموديلات الافتراضية (Models) ---
const OPENROUTER_MODELS = [
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nvidia Nemotron 120B', desc: 'Reasoning + multi-agent' },
  { id: 'openai/gpt-oss-120b:free', name: 'GPT-OSS 120B', desc: 'Reasoning + tool use' },
  { id: 'z-ai/glm-4.5-air:free', name: 'GLM 4.5 Air', desc: 'Thinking mode' },
  { id: 'google/gemma-4-31b-it:free', name: 'Google Gemma 4', desc: 'Multilingual + reasoning' },
  { id: 'minimax/minimax-m2.5:free', name: 'Minimax', desc: 'Agent-optimized' }
];

// --- النماذج الجاهزة للموظفين (Templates) ---
const TEMPLATES = [
  { templateId: 'zain', name: 'زين', role: 'قائد الفريق الإداري', emoji: '🧑‍💼', color: 'blue', modelName: 'nvidia/nemotron-3-super-120b-a12b:free', systemInstruction: 'أنت زين، قائد الفريق الإداري. تتولى إدارة العمليات، توزيع المهام، ومتابعة جميع الأمور الإدارية لضمان سير العمل بكفاءة عالية في المركز.' },
  { templateId: 'afrakoush', name: 'عفركوش', role: 'قائد فريق التطوير', emoji: '🛠️', color: 'purple', modelName: 'openai/gpt-oss-120b:free', systemInstruction: 'أنت عفركوش، قائد فريق التطوير (رئيس المهندسين). مسئول عن البرمجة، كتابة الأكواد، وتحليل النظم التقنية وتطويرها بأفضل المعايير.' },
  { templateId: 'ghena', name: 'غنى', role: 'قائدة فريق التسويق', emoji: '📈', color: 'pink', modelName: 'minimax/minimax-m2.5:free', systemInstruction: 'أنت غنى، قائدة فريق التسويق. متخصصة في وضع الخطط التسويقية، متابعة وسائل التواصل الاجتماعي، وتحليل السوق لزيادة مبيعات المركز.' },
  { templateId: 'hassan', name: 'حسن', role: 'مطور واجهات', emoji: '💻', color: 'gray', modelName: 'z-ai/glm-4.5-air:free', systemInstruction: 'أنت حسن، مطور واجهات. تعمل مع عفركوش لتنفيذ التصميمات وكتابة أكواد React بشكل نظيف وسريع.' },
  { templateId: 'amany', name: 'أماني', role: 'محللة بيانات', emoji: '📊', color: 'indigo', modelName: 'google/gemma-4-31b-it:free', systemInstruction: 'أنت أماني، محللة بيانات. تقرأين البيانات والتقارير وتستخرجين المؤشرات ليدعم القادة اتخاذ القرارات الصحيحة.' },
  { templateId: 'gharam', name: 'غرام', role: 'مسئولة مبيعات', emoji: '💰', color: 'yellow', modelName: 'google/gemma-4-31b-it:free', systemInstruction: 'أنت غرام، مسئولة المبيعات. دورك الأساسي هو الرد على العملاء وتحويل الاستفسارات إلى حجوزات فعلية بأسلوب جذاب.' },
  { templateId: 'medhat', name: 'مدحت', role: 'مساعد إداري', emoji: '📝', color: 'gray', modelName: 'google/gemma-4-31b-it:free', systemInstruction: 'أنت مدحت، مساعد إداري مساعد لزين. تساعد في ترتيب الجداول، تسجيل البيانات الروتينية ومتابعة المهام اليومية.' },
  { templateId: 'mohamed', name: 'محمد', role: 'مطور خلفي (Backend)', emoji: '⚙️', color: 'gray', modelName: 'z-ai/glm-4.5-air:free', systemInstruction: 'أنت محمد، مهندس Backend. تدعم فريق التطوير بإنشاء قواعد البيانات وتأمين الـ APIs.' },
  { templateId: 'reham', name: 'ريهام', role: 'مصممة جرافيك', emoji: '🎨', color: 'pink', modelName: 'minimax/minimax-m2.5:free', systemInstruction: 'أنت ريهام، مصممة جرافيك. تصنعين التصميمات المرئية والصور الجذابة لحملات المركز.' },
  { templateId: 'raheel', name: 'رحيل', role: 'مراجعة جودة', emoji: '✅', color: 'green', modelName: 'z-ai/glm-4.5-air:free', systemInstruction: 'أنت رحيل، مراجعة جودة. تقومين بمراجعة الأعمال والمخرجات قبل الاعتماد لضمان عدم وجود أخطاء.' }
];

// GET /api/admin/agents/meta
// جلب الموديلات والنماذج الجاهزة لإنشاء وكلاء
router.get('/meta', protect, adminOnly, async (req, res) => {
  let openRouterModels = [];
  
  try {
    if (process.env.OPENROUTER_API_KEY) {
      const axios = require('axios');
      const response = await axios.get('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
        }
      });
      const CHAT_INCOMPATIBLE = ['lyria', 'llama-guard', 'whisper', 'dall-e'];
      const validModels = response.data.data.filter(m => !CHAT_INCOMPATIBLE.some(x => m.id.includes(x)));
      
      openRouterModels = validModels.map(m => {
        const isFree = m.pricing && m.pricing.prompt === "0" && m.pricing.completion === "0";
        return {
          id: m.id,
          name: m.name,
          desc: isFree ? `Free` : `Paid`
        };
      });
    }
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error.message);
  }

  // النماذج الثابتة مع بيانات المزود والمفتاح المطلوب
  const staticModels = [
    // ─── Google Gemini → GEMINI_API_KEY ───
    { id: 'gemini-2.5-flash',               name: 'Gemini 2.5 Flash',           desc: 'Google - Fast',       provider: 'google', isFree: true },
    { id: 'gemini-2.5-pro',                 name: 'Gemini 2.5 Pro',             desc: 'Google - Powerful',   provider: 'google', isFree: true },
    { id: 'gemini-3-flash-preview',         name: 'Gemini 3 Flash Preview',     desc: 'Google - Very Fast',  provider: 'google', isFree: true },
    { id: 'gemini-3.1-flash-lite-preview',  name: 'Gemini 3.1 Flash Lite',      desc: 'Google - Lite',       provider: 'google', isFree: true },
    { id: 'gemini-3.1-pro-preview',         name: 'Gemini 3.1 Pro Preview',     desc: 'Google - Powerful',   provider: 'google', isFree: true },
    // ─── OpenAI → OPENAI_API_KEY ───
    { id: 'gpt-4o-mini',  name: 'GPT-4o Mini',          desc: 'OpenAI - Fast',      provider: 'openai', isFree: false },
    { id: 'o4-mini',      name: 'O4 Mini (Reasoning)',   desc: 'OpenAI - Reasoning', provider: 'openai', isFree: false },
    { id: 'o3-mini',      name: 'O3 Mini (Reasoning)',   desc: 'OpenAI - Reasoning', provider: 'openai', isFree: false },
    { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini',         desc: 'OpenAI - Pro',       provider: 'openai', isFree: false },
    { id: 'gpt-5-mini',   name: 'GPT-5 Mini',           desc: 'OpenAI - Pro',       provider: 'openai', isFree: false },
    { id: 'gpt-5.4',      name: 'GPT-5.4',              desc: 'OpenAI - Pro',       provider: 'openai', isFree: false },
  ];

  // إثراء نماذج OpenRouter بالمزود والتسعير
  const enrichedOpenRouter = openRouterModels.map(m => ({
    ...m,
    provider: 'openrouter',
    isFree: m.desc === 'Free',
  }));

  res.json({
    success: true,
    models: [...staticModels, ...enrichedOpenRouter],
    templates: TEMPLATES
  });
});


// GET /api/admin/agents
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const agents = await AIAgent.find().sort({ createdAt: -1 });
    res.json({ success: true, agents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/agents
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const newAgent = new AIAgent(req.body);
    await newAgent.save();
    res.status(201).json({ success: true, agent: newAgent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/agents/:id
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const updatedAgent = await AIAgent.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedAgent) return res.status(404).json({ error: 'العضو غير موجود' });
    res.json({ success: true, agent: updatedAgent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/agents/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const deletedAgent = await AIAgent.findByIdAndDelete(req.params.id);
    if (!deletedAgent) return res.status(404).json({ error: 'العضو غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
