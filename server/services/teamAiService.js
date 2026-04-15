const axios = require('axios');
const { adminTools, createAdminFunctions } = require('./adminAiService');

// Helper: Convert Gemini tool schema to OpenAI format for OpenRouter
const geminiToolsToOpenAI = (geminiTools) => {
    const openaiTools = [];
    for (const toolGroup of geminiTools) {
        for (const decl of toolGroup.functionDeclarations || []) {
            const params = { type: 'object', properties: {}, required: decl.parameters?.required || [] };
            for (const [key, val] of Object.entries(decl.parameters?.properties || {})) {
                params.properties[key] = {
                    type: val.type?.toLowerCase() === 'number' ? 'number' : 'string',
                    description: val.description || ''
                };
            }
            openaiTools.push({
                type: 'function',
                function: { name: decl.name, description: decl.description, parameters: params }
            });
        }
    }
    return openaiTools;
};

async function runAgent(agent, task, context, onChunk, user) {
  const startTime = Date.now();
  try {
    // إعداد مسار المحادثة
    const messages = [
      {
        role: 'system',
        content: `${agent.systemInstruction}`
      },
      {
        role: 'user',
        content: `المهمة الأساسية:\n${task}\n\nالسياق وما تم إنجازه حتى الآن:\n${context}\n\nأضف مساهمتك بناءً على تخصصك ودورك.`
      }
    ];

    // استدعاء OpenRouter
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) throw new Error('مفتاح الاوبن راوتر غير متوفر');

    const tools = geminiToolsToOpenAI(adminTools);
    const availableFunctions = createAdminFunctions(user || {});

    let fullContent = '';
    let isFinished = false;
    let iterationCount = 0;

    // حلقة لتنفيذ الأدوات بشكل متسلسل إن طلب النموذج ذلك
    while (!isFinished && iterationCount < 5) {
      iterationCount++;

      const body = {
        model: agent.modelName || 'google/gemma-4-31b-it:free',
        messages,
        stream: true,
        tools: tools,
        tool_choice: "auto"
      };
      
      // النماذج التي تدعم Reasoning
      if (agent.modelName && agent.modelName.includes('nemotron')) {
         body.reasoning = { enabled: true };
      }

      const response = await axios({
        method: 'post',
        url: 'https://openrouter.ai/api/v1/chat/completions',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        data: body,
        responseType: 'stream'
      });

      let currentMsgContent = '';
      let toolCalls = {}; // index -> object
      
      // التعامل مع الـ Stream
      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
          if (line === 'data: [DONE]') continue;
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const delta = data.choices[0].delta;

              if (delta.content) {
                 currentMsgContent += delta.content;
                 fullContent += delta.content;
                 if (onChunk) onChunk(delta.content);
              }

              if (delta.tool_calls) {
                 for (const tc of delta.tool_calls) {
                     const idx = tc.index;
                     if (!toolCalls[idx]) {
                         // أداة جديدة يتم استدعاؤها
                         const name = tc.function?.name || 'أداة';
                         toolCalls[idx] = { id: tc.id, type: 'function', function: { name: name, arguments: '' } };
                         
                         const notification = `\n\n> ⚙️ جاري استخدام الأداة: **${name}**...\n\n`;
                         fullContent += notification;
                         if (onChunk) onChunk(notification);
                     }
                     if (tc.function && tc.function.arguments) {
                         toolCalls[idx].function.arguments += tc.function.arguments;
                     }
                 }
              }
            } catch (e) {
              // تجاهل أخطاء البارسينج في النص غير المكتمل
            }
          }
        }
      }

      // إضافة رسالة المساعد للـ History
      const assistantMsg = { role: 'assistant', content: currentMsgContent || null };
      const toolCallsArray = Object.values(toolCalls);
      if (toolCallsArray.length > 0) {
          assistantMsg.tool_calls = toolCallsArray;
      }
      messages.push(assistantMsg);

      // إذا كان هناك أدوات يجب تنفيذها
      if (toolCallsArray.length > 0) {
          for (const tc of toolCallsArray) {
              const funcName = tc.function.name;
              const funcArgsString = tc.function.arguments || '{}';
              let argsObj = {};
              try { argsObj = JSON.parse(funcArgsString); } catch (e) { console.error('خطأ في بارسينج معاملات الأداة'); }

              let funcResult = { error: `الأداة ${funcName} غير مدعومة.` };
              if (availableFunctions[funcName]) {
                  try {
                      funcResult = await availableFunctions[funcName](argsObj);
                  } catch (e) {
                      funcResult = { error: 'حدث خطأ غير متوقع أثناء تنفيذ الأداة: ' + e.message };
                  }
              }

              // طباعة النتيجة مباشرة للمستخدم إذا كانت الأداة تصدر صورة أو محتوى مرئي
              if (funcResult && funcResult.imageResult) {
                  const notif = `\n${funcResult.imageResult}\n`;
                  fullContent += notif;
                  if (onChunk) onChunk(notif);
              }

              const resultStr = typeof funcResult === 'string' ? funcResult : JSON.stringify(funcResult);
              
              messages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  name: funcName,
                  content: resultStr
              });
          }
          // الحلقة ستستمر لترسل النتائج إلى النموذج
      } else {
          // لم يتم استدعاء أدوات جديدة -> انتهت المهمة
          isFinished = true;
      }
    } // نهاية حلقة التنفيذ

    return {
      success: true,
      content: fullContent,
      duration: Date.now() - startTime
    };
  } catch (error) {
    console.error('Agent execution error:', error.message);
    const errMessage = 'حدث خطأ أثناء التنفيذ: ' + (error.response?.data?.error?.message || error.message);
    if (onChunk) onChunk(`\n❌ ${errMessage}\n`);
    return {
      success: false,
      content: errMessage,
      duration: Date.now() - startTime
    };
  }
}

module.exports = { runAgent };
