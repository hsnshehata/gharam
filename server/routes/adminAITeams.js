const express = require('express');
const axios = require('axios');
const router = express.Router();
const AITeam = require('../models/AITeam');
const AIAgent = require('../models/AIAgent');
const AITeamSession = require('../models/AITeamSession');
const protect = require('../middleware/authenticate');
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') next();
    else res.status(403).json({ error: 'الصلاحية غير متوفرة' });
};

// ===========================
// ذاكرة مؤقتة لأخطاء الـ Frontend (تُنظف كل 10 دقائق تلقائياً)
// ===========================
const frontendErrorLog = [];
const MAX_ERRORS = 30;

// POST /api/admin/teams/report-error - يُرسل من المتصفح
router.post('/report-error', protect, async (req, res) => {
    const { message, source, stack, url } = req.body;
    if (!message) return res.status(400).json({ error: 'رسالة الخطأ مطلوبة' });
    frontendErrorLog.unshift({
        message, source, stack, url,
        time: new Date().toISOString()
    });
    // حفاظاً على الذاكرة: الاحتفاظ بآخر MAX_ERRORS خطأ فقط 
    if (frontendErrorLog.length > MAX_ERRORS) frontendErrorLog.length = MAX_ERRORS;
    res.json({ success: true });
});

// GET /api/admin/teams/frontend-errors - لأدوات الفريق
router.get('/frontend-errors', protect, adminOnly, (req, res) => {
    res.json({ success: true, errors: frontendErrorLog.slice(0, 10) });
});

// دالة مساعد لقراءة الأخطاء (تُستخدم من الأداة)
function getRecentFrontendErrors() {
    return frontendErrorLog.slice(0, 10);
}

// GET /api/admin/teams
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const teams = await AITeam.find()
      .populate('leader')
      .populate('members')
      .sort({ createdAt: -1 });
    res.json({ success: true, teams });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/teams
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const newTeam = new AITeam(req.body);
    await newTeam.save();
    const populated = await newTeam.populate(['leader', 'members']);
    res.status(201).json({ success: true, team: populated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/teams/:id
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const updatedTeam = await AITeam.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
        .populate('leader')
        .populate('members');
    if (!updatedTeam) return res.status(404).json({ error: 'الفريق غير موجود' });
    res.json({ success: true, team: updatedTeam });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/teams/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const deletedTeam = await AITeam.findByIdAndDelete(req.params.id);
    if (!deletedTeam) return res.status(404).json({ error: 'الفريق غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/teams/stop/:sessionId - إيقاف المهمة
router.post('/stop/:sessionId', protect, adminOnly, async (req, res) => {
  try {
    const session = await AITeamSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });
    if (session.status !== 'running') return res.json({ success: true, message: 'الجلسة ليست تعمل' });
    session.status = 'stopped';
    await session.save();
    res.json({ success: true, message: 'تم إيقاف المهمة بنجاح' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/teams/sessions/:id/note — حقن ملاحظة حية من المستخدم أثناء تشغيل الفريق
router.post('/sessions/:id/note', protect, adminOnly, async (req, res) => {
  try {
    const { note } = req.body;
    if (!note || !note.trim()) return res.status(400).json({ error: 'الملاحظة فارغة' });
    const session = await AITeamSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });
    session.log.push({ type: 'user', content: note.trim(), pendingNote: true });
    await session.save();
    res.json({ success: true, message: 'تم حفظ توجيهك وسيراه القائد في تفكيره القادم' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===========================
// POST /api/admin/teams/run — محور التنفيذ الكامل (ReAct Orchestrator)
// ===========================
router.post('/run', protect, adminOnly, async (req, res) => {
  const { teamId, task, sessionId } = req.body;
  if (!task || task.trim().length < 5) {
    return res.status(400).json({ error: 'المهمة قصيرة جداً' });
  }

  const team = await AITeam.findById(teamId).populate('leader').populate('members');
  if (!team) return res.status(404).json({ error: 'الفريق غير موجود' });

  // إعداد SSE
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const sendEvent = (type, data) => {
      try {
          if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
              if (res.flush) res.flush();
          }
      } catch(e) { /* تجاهل أخطاء الكتابة لو قُطع الاتصال */ }
  };

  let session;
  let isStopped = false;

  // دالة للتحقق من الإيقاف
  const checkStopped = async () => {
    if (!session?._id) return false;
    const fresh = await AITeamSession.findById(session._id).select('status').lean();
    return fresh?.status === 'stopped';
  };

  try {
    // ========== استئناف جلسة قديمة أو بدء جديدة ==========
    let previousContext = '';
    if (sessionId) {
      // استئناف جلسة موجودة
      session = await AITeamSession.findById(sessionId);
      if (!session) return res.status(404).end();
      session.status = 'running';
      
      // حفظ رسالة المستخدم الحالية
      session.log.push({
        type: 'user',
        content: task.trim()
      });

      // بناء السياق من السجل القديم (بما فيه المستخدم)
      previousContext = session.log.map(l => {
        if (l.type === 'user') return `--- [المستخدم / القيادة العليا] ---\n${l.content}`;
        return `--- ${l.agentName} (${l.agentRole}) ---\n${l.content?.substring(0, 800) || ''}`;
      }).join('\n\n');
      
      // تقليص إجمالي لتجنب token overflow عند استئناف جلسات طويلة
      if (previousContext.length > 8000) previousContext = previousContext.substring(0, 8000) + '\n\n[...تم اقتصار السياق للحفاظ على سعة النموذج...]';
      await session.save();
    } else {
      // جلسة جديدة
      session = new AITeamSession({
        adminId: req.user.id || req.user._id,
        teamId: team._id,
        task: task.trim(),
        status: 'running',
        log: [{
          type: 'user',
          content: task.trim()
        }]
      });
      await session.save();
    }

    sendEvent('session_id', { sessionId: session._id });
    sendEvent('start', { message: `جاري تشغيل ${team.name}` });
    console.log(`[Team AI] Session ${session._id} started.`);

    const startTime = Date.now();

    // ========== بناء أدوات القائد الخاصة ==========
    const { runAgent } = require('../services/teamAiService');
    const { adminTools, createAdminFunctions, DEFAULT_ADMIN_PROMPT } = require('../services/adminAiService');
    const { geminiToolsToOpenAI } = require('../services/teamAiService');
    
    // تجميع الأدوات المتاحة
    const standardTools = geminiToolsToOpenAI(adminTools);

    // أداة تفويض المهام للأعضاء
    const delegateTool = {
      type: 'function',
      function: {
        name: 'delegate_task',
        description: `تُستخدم لتكليف أحد أعضاء الفريق بمهمة محددة وانتظار نتيجته قبل المتابعة. يمكنك استدعاء هذه الأداة مرات متعددة بترتيب لضمان أن كل عضو يراعي عمل الذي قبله. قائمة الأعضاء المتاحين:\n${team.members.map(m => `- الاسم: ${m.name} | التخصص: ${m.role} | المعرف: ${m._id}`).join('\n')}`,
        parameters: {
          type: 'object',
          properties: {
            member_id: { type: 'string', description: 'المعرف (ID) الدقيق للعضو من القائمة أعلاه' },
            instruction: { type: 'string', description: 'التعليمات المفصلة التي يجب على العضو تنفيذها، بما يشمل كل السياق اللازم' }
          },
          required: ['member_id', 'instruction']
        }
      }
    };

    // أداة قراءة أخطاء الكونسول من الـ Frontend
    const consoleTool = {
      type: 'function',
      function: {
        name: 'read_frontend_console',
        description: 'يقرأ آخر أخطاء الكونسول التي واجهها المستخدم في متصفحه. استخدمها لمعرفة إذا فشلت الصفحات التي تم بناؤها.'
      }
    };

    // الأدوات المدمجة للقائد
    const leaderTools = [delegateTool, consoleTool, ...standardTools];

    // دالة تنفيذ أدوات القائد (تشغيل عضو أو قراءة الأخطاء)
    const leaderFunctions = {
      ...createAdminFunctions(req.user),
      read_frontend_console: async () => {
        const errors = getRecentFrontendErrors();
        if (errors.length === 0) return JSON.stringify({ message: 'لا توجد أخطاء مسجلة مؤخراً في الواجهة. الكل يعمل بسلام.' });
        return JSON.stringify({ count: errors.length, errors });
      },
      delegate_task: async ({ member_id, instruction }) => {
        const member = team.members.find(m => String(m._id) === String(member_id));
        if (!member) return JSON.stringify({ error: `لا يوجد عضو بالمعرف ${member_id}` });
        
        // بناء السياق الكامل لهذا العضو (تضمين كل ما تم سابقاً)
        const memberContext = `[السياق الكامل للمهام السابقة في هذه الجلسة]:\n${session.log.map(l => `${l.agentName}: ${l.content}`).join('\n\n')}`;

        console.log(`[Team AI] Leader delegating to ${member.name}...`);
        sendEvent('agent_start', { 
          agentId: member._id, agentName: member.name, 
          agentRole: member.role, agentEmoji: member.emoji 
        });

        // فحص الإيقاف قبل تشغيل العضو
        if (await checkStopped()) {
          isStopped = true;
          return JSON.stringify({ error: 'تم إيقاف المهمة من قِبل المستخدم.' });
        }

        const memberResult = await runAgent(
          member,
          instruction,
          memberContext,
          (chunk) => sendEvent('agent_chunk', { agentId: member._id, chunk }),
          req.user,
          false // allowTools = true
        );

        session.log.push({
          agentId: member._id, agentName: member.name, agentRole: member.role, agentEmoji: member.emoji,
          content: memberResult.content, status: memberResult.success ? 'done' : 'error', duration: memberResult.duration
        });
        await session.save();

        sendEvent('agent_done', { 
          agentId: member._id, duration: memberResult.duration, 
          status: memberResult.success ? 'done' : 'error' 
        });

        return JSON.stringify({
          member: member.name,
          role: member.role,
          success: memberResult.success,
          result: memberResult.content.substring(0, 2000) // اقتصار للسياق
        });
      }
    };

    // استنتاج المزود والمفتاح من اسم النموذج
    function getProviderConfig(modelId) {
        const id = (modelId || '').toLowerCase();
        
        if (id.startsWith('gpt-') || id.startsWith('o1-') || id.startsWith('o3-') || id.startsWith('o4-')) {
            const key = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : null;
            if (!key) throw new Error('مفتاح OpenAI غير متوفر للقائد لنموذج: ' + modelId);
            return {
                url: 'https://api.openai.com/v1/chat/completions',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }
            };
        }
        
        if (id.startsWith('gemini')) {
            const key = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
            if (!key) throw new Error('مفتاح Gemini غير متوفر للقائد لنموذج: ' + modelId);
            return {
                url: `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }
            };
        }

        const key = process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.trim() : null;
        if (!key) throw new Error('مفتاح OpenRouter غير متوفر للقائد لنموذج: ' + modelId);
        return {
            url: 'https://openrouter.ai/api/v1/chat/completions',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://gharam.art',
                'X-OpenRouter-Title': 'Gharam Team Leader'
            }
        };
    }

    // تعليمات القائد (ReAct)
    const systemPrompt = `${team.leader.systemInstruction || ''}

===== تعليمات القيادة الصارمة (يُحظر مخالفتها) =====
أنت قائد الفريق ومسؤول عن إدارة الرؤية والمهمة من البداية للنهاية.

**آلية عملك الإلزامية (ReAct):**
1. حلّل المهمة وقرر التسلسل الصحيح بناءً على تخصصات موظفيك. لا تختار عشوائياً، استخدم الذراع المناسب.
2. **⛔ محظور صارم حول الكود الأساسي:** يُمنع التفكير في تعديل أو إضافة أي كود في ملفات النظام الأساسية بأدوات الملفات العادية.
3. التعديلات والإضافات تنفذ حصراً بالاعتماد الكلي على الآتي: للمسارات ونماذج قواعد البيانات استخدم (manage_dynamic_tools) وللواجهات استخدم (build_afrakoush_page).
4. وظيفتك التفويض: قبل استخدام أي أداة تنفيذية (مثل بناء واجهة أو أداة عبر الأدوات المذكورة)، يجب استدعاء [delegate_task] للمتخصص المناسب لإعداد الكود والمطلوب أولاً.
5. بمجرد أن ينهي الفريق عمله وتستلم جميع الأكواد جاهزة منهم، يجب عليك فوراً وعاجلاً استخدام الأدوات للتطبيق؛ ولا تعد لطلب [delegate_task] مرة أخرى في نفس المسألة حتى لا تقع في حلقة مفرغة (Infinite Loop)!
6. **استقبال التوجيهات الحية:** لو ظهر في سياق المحادثة رسالة "[توجيه حي من المدير أثناء التنفيذ]", التزم به واعكسه على خطواتك التالية.
7. **التقرير النهائي (إلزامي كلياً):** لا تنهِ المهمة أداً بردود مقتضبة. يجب أن تنهي المهمة بـ **تقرير شامل ومفصل جداً** يوضح: ماذا طلب منك، ماذا أنجز كل عضو، ما هي الواجهات والأدوات والدوال الديناميكية التي تم إنشاؤها في السيرفر وتخزينها، وإذا كان هناك شيء لم يُنفذ، اشرح للمدير سببه بوضوح مطلق، ثم انهِ المهمة بمخاطبته.

=== دليل النظام البرمجي لغرام سلطان ===
آتياً الهيكل البرمجي الكامل ودليل الـ APIs. أنت كقائد يجب أن تكون ملمّاً بمسارات النظام، وتوجه بها موظفيك متى ما استدعى الأمر. لا تطلب تصاريح للمعلومات الموجودة في الدليل التالي، بل استقِ منها مباشرة:

${DEFAULT_ADMIN_PROMPT}`;

    const previousContextMsg = previousContext ? 
      `\n\n[ذاكرة الجلسة - ما تم إنجازه في الجلسة السابقة]:\n${previousContext}` : '';

    const userMsg = `المهمة المطلوبة: ${task.trim()}${previousContextMsg}`;

    // حلقة ReAct للقائد
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMsg }
    ];

    let isFinished = false;
    let iteration = 0;
    const MAX_ITERATIONS = 40; // Increased to 40 to accommodate extremely complex tasks
    let leaderFullContent = '';

    while (!isFinished && iteration < MAX_ITERATIONS) {
      iteration++;

      // بدء فقاعة القائد في كل جولة لضمان فصل مراجعاته في الواجهة بدلاً من دمجها بفقاعة واحدة
      sendEvent('agent_start', { 
        agentId: team.leader._id, agentName: team.leader.name, 
        agentRole: team.leader.role, agentEmoji: team.leader.emoji 
      });

      if (await checkStopped()) {
        isStopped = true;
        break;
      }

      // حقن الملاحظات الحية من المستخدم أثناء تشغيل الفريق
      if (session?._id) {
        const freshSession = await AITeamSession.findById(session._id).lean();
        const pendingNotes = (freshSession?.log || []).filter(l => l.type === 'user' && l.pendingNote === true);
        if (pendingNotes.length > 0) {
          const noteTexts = pendingNotes.map(n => n.content).join('\n');
          messages.push({ role: 'user', content: `[توجيه حي من المدير أثناء التنفيذ - يجب مراعاته في الخطوات التالية]:\n${noteTexts}` });
          // مسح علامة الانتظار من قاعدة البيانات
          await AITeamSession.updateOne(
            { _id: session._id },
            { $set: { 'log.$[elem].pendingNote': false } },
            { arrayFilters: [{ 'elem.pendingNote': true }] }
          );
          const noteMsg = `\n\n> 📝 **تم استقبال توجيهك:**\n> ${noteTexts.replace(/\n/g, '\n> ')}\n\n`;
          sendEvent('agent_chunk', { agentId: team.leader._id, chunk: noteMsg });
          leaderFullContent += noteMsg;
        }
      }

      const body = {
        model: team.leader.modelName || 'google/gemini-2.5-flash',
        messages,
        stream: true,
        tools: leaderTools
      };

      let response = null;
      let lastErr = null;
      let retryCount = 0;
      let keySuccess = false;
      let leaderActiveModel = body.model; // النموذج النشط (قد يتغير للاحتياطي)
      const leaderFallbackModel = team.leader.fallbackModel || '';
      let leaderUsingFallback = false;
      
      while (retryCount < 5 && !keySuccess) {
        try {
          const apiConfig = getProviderConfig(leaderActiveModel);

          response = await axios({
            method: 'post',
            url: apiConfig.url,
            headers: apiConfig.headers,
            data: body,
            responseType: 'stream',
            timeout: 90000
          });
          lastErr = null;
          keySuccess = true;
          break; // نجح - تخرج
        } catch (err) {
          lastErr = err;
          const s = err.response?.status;
          const errMsg = (err.response?.data?.error?.message || err.message || '').toLowerCase();
          
          // طباعة تفاصيل الخطأ للتشخيص
          let errBody = '';
          try {
            if (err.response?.data) {
              if (typeof err.response.data === 'string') errBody = err.response.data;
              else if (typeof err.response.data.pipe === 'function') {
                const chunks = [];
                for await (const c of err.response.data) chunks.push(c);
                errBody = Buffer.concat(chunks).toString();
              }
            }
          } catch(e) {}
          console.warn(`[Team AI] Leader error ${s}: ${errBody || err.message}`);
          
          if (s === 401 || s === 403) {
            console.warn(`[Team AI] مفتاح غير مصرح (${s}) لقائد الفريق لنموذج ${leaderActiveModel}.`);
            break;
          } else if (s === 400) {
            // خطأ 400 — قد يكون بسبب الأدوات أو النموذج
            const isToolError = body.tools && body.tools.length > 0 && 
              (errMsg.includes('tool') || errMsg.includes('schema') || errMsg.includes('function') || errMsg.includes('malformed'));
            
            if (isToolError && body.tools) {
              // حذف الأدوات وإعادة المحاولة
              console.warn(`[Team AI] Leader: 400 tool error, retrying without tools...`);
              delete body.tools;
              body.messages = body.messages
                .filter(m => m.role !== 'tool')
                .map(m => {
                  const mCopy = { ...m };
                  if (mCopy.tool_calls) delete mCopy.tool_calls;
                  if (mCopy.tool_call_id) delete mCopy.tool_call_id;
                  return mCopy;
                });
              const dropMsg = `\n*(تم إزالة الأدوات مؤقتاً بسبب خطأ في التوافق)*\n`;
              leaderFullContent += dropMsg;
              sendEvent('agent_chunk', { agentId: team.leader._id, chunk: dropMsg });
              continue; // أعد المحاولة بدون أدوات
            }
            
            // خطأ 400 غير أدوات — جرب الاحتياطي
            if (!leaderUsingFallback && leaderFallbackModel) {
              console.warn(`[Team AI] Leader: 400 non-tool error, switching to fallback: ${leaderFallbackModel}`);
              const switchMsg = `\n\n> 🔄 **خطأ في النموذج (400) — تحويل للاحتياطي: ${leaderFallbackModel}**\n\n`;
              leaderFullContent += switchMsg;
              sendEvent('agent_chunk', { agentId: team.leader._id, chunk: switchMsg });
              leaderActiveModel = leaderFallbackModel;
              leaderUsingFallback = true;
              body.model = leaderFallbackModel;
              retryCount = 0;
              continue;
            }
            break; // لا يوجد fallback
          } else if (s === 429 || s === 500 || s === 503 || s === 502) {
            console.warn(`[Team AI] خطأ ${s} من القائد، انتظار 2ث...`);
            retryCount++;
            if (!leaderUsingFallback && leaderFallbackModel && (s === 503 || retryCount >= 2)) {
              const switchMsg = `\n\n> 🔄 **خطأ في النموذج (${s}) — تحويل للاحتياطي: ${leaderFallbackModel}**\n\n`;
              leaderFullContent += switchMsg;
              sendEvent('agent_chunk', { agentId: team.leader._id, chunk: switchMsg });
              leaderActiveModel = leaderFallbackModel;
              leaderUsingFallback = true;
              body.model = leaderFallbackModel;
              retryCount = 0;
              continue;
            }
            await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
          } else {
            console.warn(`[Team AI] خطأ غير متوقع:`, err.message);
            break;
          }
        }
      }
      if (!response && lastErr) throw lastErr;
      if (!response) throw new Error('فشل الاتصال بنموذج القائد');

      // قراءة الـ Stream
      let currentContent = '';
      let toolCalls = {};
      let streamBuffer = '';

      for await (const chunk of response.data) {
        if (isStopped || await checkStopped()) { isStopped = true; break; }
        streamBuffer += chunk.toString();
        const lines = streamBuffer.split('\n');
        streamBuffer = lines.pop(); // Keep incomplete line

        for (let line of lines) {
          line = line.trim();
          if (!line) continue;
          if (line === 'data: [DONE]' || !line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            const delta = data.choices?.[0]?.delta;
            if (!delta) continue;

            if (delta.content) {
              currentContent += delta.content;
              leaderFullContent += delta.content;
              sendEvent('agent_chunk', { agentId: team.leader._id, chunk: delta.content });
            }

            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index;
                if (!toolCalls[idx]) {
                  const name = tc.function?.name || 'أداة';
                  toolCalls[idx] = { id: tc.id, type: 'function', function: { name, arguments: '' } };
                  const note = `\n\n> ⚙️ جاري استخدام الأداة: **${name}**...\n\n`;
                  leaderFullContent += note;
                  sendEvent('agent_chunk', { agentId: team.leader._id, chunk: note });
                }
                if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
                if (tc.extra_content) toolCalls[idx].extra_content = tc.extra_content;
              }
            }
          } catch(e) { /* تجاهل */ }
        }
      }

      if (isStopped) break;

      const tcList = Object.values(toolCalls);
      
      // لقد انتهى بث القائد لهذه الجولة، نقوم بإنهاء فقاعته في الواجهة
      sendEvent('agent_done', { 
        agentId: team.leader._id, 
        duration: 0, 
        status: isStopped ? 'error' : 'done' 
      });

      if (tcList.length > 0) {
        // إضافة رسالة القائد للمحادثة
        messages.push({
          role: 'assistant',
          content: currentContent || null,
          tool_calls: tcList.map(tc => {
            const result = { id: tc.id, type: 'function', function: { name: tc.function.name, arguments: tc.function.arguments } };
            if (tc.extra_content) result.extra_content = tc.extra_content;
            return result;
          })
        });

        // تنفيذ كل أداة وإرجاع النتيجة
        for (const tc of tcList) {
          let result;
          try {
            const args = JSON.parse(tc.function.arguments || '{}');
            const fn = leaderFunctions[tc.function.name];
            if (fn) {
              result = await fn(args);
            } else {
              result = JSON.stringify({ error: `الأداة ${tc.function.name} غير متوفرة` });
            }
          } catch(e) {
            result = { error: e.message };
          }
          
          // طباعة النتيجة مباشرة للمستخدم إذا كانت الأداة تصدر صورة أو محتوى مرئي
          const imageDisplay = result?.markdownToOutput || result?.imageResult;
          if (imageDisplay) {
              const notif = `\n${imageDisplay}\n\n`;
              sendEvent('agent_chunk', { agentId: team.leader._id, chunk: notif });
              leaderFullContent += notif;
          }

          const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
          
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: resultStr
          });
        }
        // الحلقة تستمر لإعطاء النتيجة للقائد ليقيّمها
      } else {
        // لا أدوات = القائد انتهى من الكلام واقتنع بالعمل وأرسل التقرير
        isFinished = true;
      }
    }

    // حفظ مساهمة القائد النهائية إلى الجلسة
    const leaderDuration = Date.now() - startTime;
    session.log.push({
      agentId: team.leader._id, agentName: team.leader.name, agentRole: team.leader.role, agentEmoji: team.leader.emoji,
      content: leaderFullContent, status: isStopped ? 'error' : 'done', duration: leaderDuration
    });

    if (!isFinished && iteration >= MAX_ITERATIONS) {
      session.status = 'error';
      sendEvent('error', { message: '⛔ تعذر على الفريق إنهاء المهمة بسبب تجاوز أقصى عدد من التفاعلات المسموحة (40 خطوة).' });
    } else if (isStopped) {
      session.status = 'stopped';
      sendEvent('error', { message: '⛔ تم إيقاف المهمة من قِبل المستخدم.' });
    } else {
      session.status = 'completed';
      sendEvent('complete', { message: 'الفريق أنهى عمله بنجاح! 🎉', sessionId: session._id });
    }

    session.totalDuration = Date.now() - startTime;
    session.completedAt = new Date();
    await session.save();
    console.log(`[Team AI] Session ${session._id} → ${session.status}`);

  } catch (error) {
    console.error(`[Team AI] Run error:`, error);
    if (session?._id) {
        session.status = 'failed';
        await session.save().catch(() => {});
    }
    sendEvent('error', { message: error.message || 'حدث خطأ غير متوقع' });
  } finally {
    res.write('data: [DONE]\n\n');
    if (res.flush) res.flush();
    res.end();
  }
});

// GET /api/admin/teams/sessions
router.get('/sessions', protect, adminOnly, async (req, res) => {
  try {
    const sessions = await AITeamSession.find({ adminId: req.user.id || req.user._id })
      .populate('teamId')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/teams/sessions/:id - تفاصيل جلسة
router.get('/sessions/:id', protect, adminOnly, async (req, res) => {
  try {
    const s = await AITeamSession.findById(req.params.id).populate('teamId');
    if (!s) return res.status(404).json({ error: 'الجلسة غير موجودة' });
    res.json({ success: true, session: s });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/teams/sessions/:id - حذف محادثة
router.delete('/sessions/:id', protect, adminOnly, async (req, res) => {
  try {
    const s = await AITeamSession.findById(req.params.id);
    if (!s) return res.status(404).json({ error: 'المحادثة غير موجودة' });
    if (String(s.adminId) !== String(req.user.id || req.user._id)) {
      return res.status(403).json({ error: 'غير مصرح بحذف هذه المحادثة' });
    }
    await AITeamSession.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
