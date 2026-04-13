const cron = require('node-cron');
const ScheduledTask = require('../models/ScheduledTask');
const { processAdminChat } = require('./adminAiService');
const { sendToAdmins } = require('./telegramBot');

// Map to keep track of active scheduled tasks
const activeCronJobs = {};

/**
 * Execute a task prompt using admin AI
 * @param {string} prompt The command to execute
 */
const executeTaskPrompt = async (prompt) => {
    try {
        console.log(`[CronService] Executing task prompt: ${prompt.substring(0, 50)}...`);
        // We use a dummy user representing the System
        const dummyUser = { _id: null, role: 'owner', username: 'System Cron' };
        
        // Let the AI process the task.
        const replyText = await processAdminChat(
            [{ role: 'user', text: prompt }], 
            dummyUser, 
            null, 
            null,
            "هذا التقرير يتم توليده كإشعار إداري تلقائي وسيتم إرساله على التليجرام. يرجى عدم استخدام الجداول (Tables) إطلاقاً لأنها لا تعمل بشكل جيد على شاشات الموبايل في التليجرام. استبدلها بقوائم نقطية واضحة (Bullet Points)."
        );
        
        // The prompt itself should instruct Afrakoush to send telegram. 
        // But if we want to guarantee telegram output dynamically, we can inspect it.
        // For the static daily brief, the prompt will instruct the AI to use `send_telegram_to_admins` tool if we build one,
        // or we can just send the replyText directly to admins if we do it here. 
        // For maximum flexibility, we'll let the AI use a notification tool. Or we can just broadacast the AI's final answer.
        // Actually, if a cron job runs, it has no UI. The only output medium is Telegram.
        // So we ALWAYS send the AI's response to Telegram admins.
        await sendToAdmins(`🔔 **إشعار النظام الذكي**\n\n${replyText}`);
        
    } catch (err) {
        console.error('[CronService] Error executing task:', err);
    }
};

/**
 * Schedule a task dynamically
 * @param {Object} task ScheduledTask document
 */
const scheduleTask = (task) => {
    // If it's already running, stop it first
    if (activeCronJobs[task._id.toString()]) {
        activeCronJobs[task._id.toString()].stop();
        delete activeCronJobs[task._id.toString()];
    }

    if (!task.isActive) return;

    if (task.scheduleType === 'cron' && task.cronExpression) {
        if (!cron.validate(task.cronExpression)) {
            console.error(`[CronService] Invalid cron expression for task ${task._id}: ${task.cronExpression}`);
            return;
        }

        const job = cron.schedule(task.cronExpression, async () => {
            await executeTaskPrompt(task.prompt);
            await ScheduledTask.findByIdAndUpdate(task._id, { lastRun: new Date() });
        }, {
            timezone: 'Africa/Cairo'
        });
        
        activeCronJobs[task._id.toString()] = job;
        console.log(`[CronService] Scheduled cron task: ${task.title} (${task.cronExpression})`);
    } else if (task.scheduleType === 'once' && task.runAt) {
        const now = new Date();
        const runAt = new Date(task.runAt);
        
        if (runAt > now) {
            const delay = runAt.getTime() - now.getTime();
            const timeout = setTimeout(async () => {
                await executeTaskPrompt(task.prompt);
                await ScheduledTask.findByIdAndUpdate(task._id, { 
                    lastRun: new Date(),
                    isActive: false // One-time tasks disable themselves after running
                });
                delete activeCronJobs[task._id.toString()];
            }, delay);
            
            activeCronJobs[task._id.toString()] = {
                stop: () => clearTimeout(timeout)
            };
            console.log(`[CronService] Scheduled one-time task: ${task.title} at ${runAt}`);
        } else {
            console.log(`[CronService] Skipped past task: ${task.title}`);
        }
    }
};

/**
 * Cancel a specific task
 */
const cancelTask = (taskId) => {
    if (activeCronJobs[taskId]) {
        activeCronJobs[taskId].stop();
        delete activeCronJobs[taskId];
        console.log(`[CronService] Cancelled task: ${taskId}`);
    }
};

/**
 * Initialize the cron service (called on server start)
 */
const initCronService = async () => {
    // 1. Establish the Daily Brief (if it doesn't exist, create it)
    let dailyBrief = await ScheduledTask.findOne({ isSystem: true, title: 'الملخص اليومي (11 مساءً)' });
    
    if (!dailyBrief) {
        const briefPrompt = `قم بإنشاء الملخص اليومي للمركز:
1. قارن إيرادات اليوم الحالي بإيرادات أمس.
2. حدد من هو أنشط موظف اليوم (أعلى تحصيل).
3. ابحث في محادثات العملاء العامة (مثل فيسبوك) عن أي شكاوى أو استياء.
قم بصياغة رسالة احترافية ومختصرة لمدير المركز، ولا تستخدم جداول نهائياً، فقط استخدم الرصاص (bullet points).`;

        dailyBrief = new ScheduledTask({
            title: 'الملخص اليومي (11 مساءً)',
            prompt: briefPrompt,
            scheduleType: 'cron',
            cronExpression: '0 23 * * *', // Every day at 23:00 (11 PM)
            isSystem: true
        });
        await dailyBrief.save();
    }

    // 2. Load all active tasks from MongoDB
    try {
        const tasks = await ScheduledTask.find({ isActive: true });
        for (const task of tasks) {
            scheduleTask(task);
        }
        console.log(`[CronService] Loaded ${tasks.length} active scheduled tasks.`);
    } catch (err) {
        console.error('[CronService] Error loading tasks:', err);
    }
};

module.exports = {
    initCronService,
    scheduleTask,
    cancelTask
};
