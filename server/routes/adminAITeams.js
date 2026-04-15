const express = require('express');
const router = express.Router();
const AITeam = require('../models/AITeam');
const AIAgent = require('../models/AIAgent');
const AITeamSession = require('../models/AITeamSession');
const { runAgent } = require('../services/teamAiService');
const { protect, adminOnly } = require('../middleware/auth');

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

// POST /api/admin/teams/run — تشغيل المهمة مع SSE
router.post('/run', protect, adminOnly, async (req, res) => {
  const { teamId, task } = req.body;
  if (!task || task.trim().length < 5) {
    return res.status(400).json({ error: 'المهمة قصيرة جداً' });
  }

  const team = await AITeam.findById(teamId).populate('leader').populate('members');
  if(!team) return res.status(404).json({error: 'الفريق غير موجود'});

  // إعداد SSE
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const sendEvent = (type, data) => res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);

  // حفظ الجلسة البدائية
  const session = new AITeamSession({
    adminId: req.user._id,
    teamId: team._id,
    task: task.trim(),
    status: 'running',
    log: []
  });
  await session.save();

  try {
    sendEvent('start', { message: `جاري تشغيل ${team.name}` });
    
    let teamContext = `[المهمة الأصلية]: ${task.trim()}`;
    const startTime = Date.now();
    const agentsToRun = [team.leader, ...team.members];

    for (const agent of agentsToRun) {
      if(!agent) continue;
      
      sendEvent('agent_start', {
        agentId: agent._id,
        agentName: agent.name,
        agentRole: agent.role,
        agentEmoji: agent.emoji
      });

      const result = await runAgent(
        agent,
        task,
        teamContext,
        (chunk) => sendEvent('agent_chunk', { agentId: agent._id, chunk }),
        req.user
      );

      teamContext += `\n\n--- مساهمة ${agent.name} (${agent.role}) ---\n${result.content}`;
      
      session.log.push({
          agentId: agent._id,
          agentName: agent.name,
          agentRole: agent.role,
          agentEmoji: agent.emoji,
          content: result.content,
          status: result.success ? 'done' : 'error',
          duration: result.duration
      });

      sendEvent('agent_done', {
        agentId: agent._id,
        duration: result.duration,
        status: result.success ? 'done' : 'error'
      });
    }

    session.status = 'completed';
    session.totalDuration = Date.now() - startTime;
    session.completedAt = new Date();
    await session.save();

    sendEvent('complete', {
      message: 'الفريق أنهى عمله بنجاح!',
      finalResult: teamContext
    });
  } catch (error) {
    console.error('Team run error:', error);
    session.status = 'failed';
    await session.save();
    sendEvent('error', { message: error.message });
  } finally {
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// GET /api/admin/teams/sessions
router.get('/sessions', protect, adminOnly, async (req, res) => {
  try {
    const sessions = await AITeamSession.find({ adminId: req.user._id })
      .populate('teamId')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
