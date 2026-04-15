const express = require('express');
const router = express.Router();
const AIAgent = require('../models/AIAgent');
const { protect, adminOnly } = require('../middleware/authenticate');

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
router.get('/meta', protect, adminOnly, (req, res) => {
  res.json({
    success: true,
    models: OPENROUTER_MODELS,
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
