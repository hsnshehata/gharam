const axios = require('axios');
const { adminTools, createAdminFunctions, DEFAULT_ADMIN_PROMPT } = require('./adminAiService');

// Helper: Convert Gemini tool schema to OpenAI format for OpenRouter
const geminiToolsToOpenAI = (geminiTools) => {
    const openaiTools = [];
    for (const toolGroup of geminiTools) {
        for (const decl of toolGroup.functionDeclarations || []) {
            const hasProps = Object.keys(decl.parameters?.properties || {}).length > 0;
            const params = { type: 'object', properties: {} };
            
            if (decl.parameters?.required && decl.parameters.required.length > 0) {
                params.required = decl.parameters.required;
            }

            for (const [key, val] of Object.entries(decl.parameters?.properties || {})) {
                params.properties[key] = {
                    type: val.type?.toLowerCase() === 'number' ? 'number' : val.type?.toLowerCase() === 'boolean' ? 'boolean' : 'string',
                    description: val.description || ''
                };
            }
            
            const toolObj = {
                type: 'function',
                function: { name: decl.name, description: decl.description }
            };
            if (hasProps) {
                toolObj.function.parameters = params;
            }
            openaiTools.push(toolObj);
        }
    }
    return openaiTools;
};

async function runAgent(agent, task, context, onChunk, user, disableTools = false) {
  const startTime = Date.now();
  try {
    // إعداد مسار المحادثة
    const messages = [
      {
        role: 'system',
        content: `${agent.systemInstruction}\n\n=== دليل النظام البرمجي لغرام سلطان ===\nآتياً الهيكل البرمجي الكامل ودليل الـ APIs. اعتمد عليه حرفياً لفهم الكود والمساعدة فيه:\n\n${DEFAULT_ADMIN_PROMPT}`
      },
      {
        role: 'user',
        content: `المهمة الأساسية:\n${task}\n\nالسياق وما تم إنجازه حتى الآن:\n${context}\n\nأضف مساهمتك بناءً على تخصصك ودورك.\n\n⚠️ قوانين صارمة ملزمة:\n1. يُمنع منعاً باتاً التعديل على ملفات النظام الأساسية بأي شكل من الأشكال (لا توجّه القائد لتعديل الملفات نهائياً).\n2. لإنشاء أي وظائف، قواعد بيانات (Schemas)، أو مسارات خلفية (APIs) جديدة، يجب أن توجّه القائد لاستخدام أداة (manage_dynamic_tools) لإنشاء الأداة والدوال المطلوبة، وذلك لأنكما تملكان وصولاً كاملاً لقواعد البيانات.\n3. لتصميم أي صفحات أو مكونات واجهة مستخدم (UI Components)، يجب توجيه القائد لاستخدام أداة (build_afrakoush_page).\n4. دورك هو قراءة النظام بعمق، تصحيح الأخطاء، وكتابة الأكواد والمقترحات المثالية ليعمل بها قائد الفريق باستخدام الأدوات الديناميكية حصراً.`
      }
    ];

// استنتاج المزود والمفتاح من اسم النموذج
function getProviderConfig(modelId) {
    const id = (modelId || '').toLowerCase();
    
    // 1. OpenAI Native
    if (id.startsWith('gpt-') || id.startsWith('o1-') || id.startsWith('o3-') || id.startsWith('o4-')) {
        const key = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : null;
        if (!key) throw new Error('مفتاح OpenAI غير متوفر في إعدادات البيئة لنموذج: ' + modelId);
        return {
            url: 'https://api.openai.com/v1/chat/completions',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            }
        };
    }
    
    // 2. Google Gemini Native (OpenAI compatibility endpoint)
    if (id.startsWith('gemini')) {
        const key = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
        if (!key) throw new Error('مفتاح Gemini غير متوفر في إعدادات البيئة لنموذج: ' + modelId);
        return {
            url: `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            }
        };
    }

    // 3. OpenRouter (Default wrapper)
    const key = process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.trim() : null;
    if (!key) throw new Error('مفتاح OpenRouter غير متوفر لنموذج: ' + modelId);
    return {
        url: 'https://openrouter.ai/api/v1/chat/completions',
        headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://gharam.art',
            'X-OpenRouter-Title': 'Gharam Team AI'
        }
    };
}

    const safeToolNames = [
        'list_codebase_directory', 
        'view_codebase_file', 
        'search_codebase_content', 
        'get_employees_overview', 
        'query_operations', 
        'query_financials_and_expenses', 
        'get_financial_report', 
        'analyze_public_conversations', 
        'get_facebook_insights', 
        'generate_image'
    ];

    const safeAdminTools = adminTools.map(group => {
        const clone = JSON.parse(JSON.stringify(group));
        clone.functionDeclarations = (clone.functionDeclarations || []).filter(f => safeToolNames.includes(f.name));
        return clone;
    }).filter(group => group.functionDeclarations.length > 0);

    const tools = disableTools ? undefined : geminiToolsToOpenAI(safeAdminTools);
    const availableFunctions = createAdminFunctions(user || {});

    let fullContent = '';
    let isFinished = false;
    let iterationCount = 0;

    // النموذج النشط (يبدأ بالأساسي وينتقل للاحتياطي عند الفشل)
    let activeModel = agent.modelName || 'google/gemma-4-31b-it:free';
    const fallbackModel = agent.fallbackModel || '';
    let usingFallback = false;

    // حلقة لتنفيذ الأدوات بشكل متسلسل إن طلب النموذج ذلك
    while (!isFinished && iterationCount < 15) {
      iterationCount++;

      const body = {
        model: activeModel,
        messages,
        stream: true
      };
      if (tools) body.tools = tools;
      
      // النماذج التي تدعم Reasoning
      if (activeModel && (activeModel.includes('nemotron') || activeModel.includes('minimax') || activeModel.includes('gpt-oss'))) {
         body.reasoning = { enabled: true };
      }

      let response = null;
      let axiosErr = null;
      
      let retryCount = 0;
      let keySuccess = false;

      while (retryCount < 5 && !keySuccess) {
          try {
              const apiConfig = getProviderConfig(activeModel);
              
              response = await axios({
                  method: 'post',
                  url: apiConfig.url,
                  headers: apiConfig.headers,
                  data: body,
                  responseType: 'stream'
              });
              keySuccess = true;
              axiosErr = null; // تفريغ الخطأ إن نجح
          } catch (err) {
              axiosErr = err;
              const errStatus = err.response?.status;
              const errMsg = (err.response?.data?.error?.message || err.message || '').toLowerCase();
              
              // مفتاح غير مصرح (خاطئ) - لا داعي للـ retry المستمر العبثي
              if (errStatus === 401 || errStatus === 403) {
                  console.warn(`[Agent ${agent.name}] مفتاح غير مصرح (${errStatus}) لنموذج ${activeModel}`);
                  break; 
              }
                  
                  const isToolError = body.tools && body.tools.length > 0 && 
                      (
                          (errStatus && [400, 404, 422].includes(errStatus)) || 
                          errMsg.includes('tool') || 
                          errMsg.includes('schema') ||
                          errMsg.includes('no endpoints found')
                      );
                  
                  if (isToolError) {
                      delete body.tools;
                      // مسح كل آثار الأدوات من تاريخ المحادثة (role:'tool', tool_calls, tool_call_id)
                      body.messages = body.messages
                          .filter(m => m.role !== 'tool') // حذف ردود الأدوات السابقة كلياً
                          .map(m => {
                              const mCopy = { ...m };
                              if (mCopy.tool_calls) delete mCopy.tool_calls;
                              if (mCopy.tool_call_id) delete mCopy.tool_call_id;
                              return mCopy;
                          });
                      const dropMsg = `\n*(هذا النموذج لا يدعم الأدوات - تم التعامل معه بدونها)*\n`;
                      fullContent += dropMsg;
                      if (onChunk) onChunk(dropMsg);
                      // نجرب نفس المفتاح بدون أدوات
                      continue; 
                  } else if (errStatus === 429 || errStatus === 402 || errMsg.includes('429') || errMsg.includes('402')) {
                      // إذا وصل النموذج الأساسي لحدوده وهناك احتياطي، انتقل إليه تلقائياً
                      if (!usingFallback && fallbackModel) {
                          const switchMsg = `\n\n> 🔄 **النموذج الأساسي وصل لحدوده — تحويل للنموذج الاحتياطي: ${fallbackModel}**\n\n`;
                          fullContent += switchMsg;
                          if (onChunk) onChunk(switchMsg);
                          activeModel = fallbackModel;
                          usingFallback = true;
                          body.model = fallbackModel;
                          retryCount = 0; // أعد عداد المحاولات للنموذج الجديد
                      } else {
                          retryCount++; // ✅ كان مفقوداً: retryCount لم يكن يتزايد!
                          if (retryCount < 5) {
                              const delay = 2000 + Math.random() * 3000;
                              await new Promise(r => setTimeout(r, delay));
                          } else {
                              break; // تجاوز الحد الأقصى للمحاولات، تخرج
                          }
                      }
                  } else if (errStatus === 503) {
                      // 503 = الخدمة غير متاحة — تحويل فوري للاحتياطي بدون انتظار
                      if (!usingFallback && fallbackModel) {
                          const switchMsg = `\n\n> 🔄 **النموذج غير متاح (503) — تحويل فوري للاحتياطي: ${fallbackModel}**\n\n`;
                          fullContent += switchMsg;
                          if (onChunk) onChunk(switchMsg);
                          activeModel = fallbackModel;
                          usingFallback = true;
                          body.model = fallbackModel;
                          retryCount = 0;
                          continue;
                      } else {
                          break; // لا يوجد احتياطي، نخرج
                      }
                  } else if (errStatus === 500 || errStatus === 502 || errStatus === 528) {
                      // أخطاء سيرفر مؤقتة — نعيد المحاولة ثم نحول للاحتياطي
                      if (!usingFallback && fallbackModel && retryCount >= 1) {
                          const switchMsg = `\n\n> 🔄 **خطأ في النموذج (${errStatus}) — تحويل للاحتياطي: ${fallbackModel}**\n\n`;
                          fullContent += switchMsg;
                          if (onChunk) onChunk(switchMsg);
                          activeModel = fallbackModel;
                          usingFallback = true;
                          body.model = fallbackModel;
                          retryCount = 0;
                      } else if (retryCount < 4) {
                          retryCount++;
                          const delay = 1500 + Math.random() * 2000;
                          await new Promise(r => setTimeout(r, delay));
                      }
                  } else {
                      // خطأ غير متوقع، نكسر الـ retry ونكمل للمفتاح التالي
                      break; 
                  }
              }
      }
      
      if (!response && axiosErr) {
          throw axiosErr;
      }

      let currentMsgContent = '';
      let currentReasoningContent = ''; // لجمع الـ Reasoning إن وجد
      let reasoningDetailsObj = null; // للاحتفاظ بتفاصيل Reasoning
      let toolCalls = {}; // index -> object
      
      // التعامل مع الـ Stream
      let streamBuffer = '';
      for await (const chunk of response.data) {
        streamBuffer += chunk.toString();
        const lines = streamBuffer.split('\n');
        streamBuffer = lines.pop(); // Keep the incomplete line in the buffer
        
        for (let line of lines) {
          line = line.trim();
          if (!line) continue;
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
              
              // Handle reasoning (think tokens/details)
              if (delta.reasoning) {
                  currentReasoningContent += delta.reasoning;
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
                     if (tc.extra_content) {
                         toolCalls[idx].extra_content = tc.extra_content;
                     }
                 }
              }
            } catch (e) {
              // تجاهل أخطاء البارسينج النادرة
            }
          }
        }
      }

    // إضافة رسالة المساعد للـ History
    const assistantMsg = { role: 'assistant', content: currentMsgContent || '' };
    if (currentReasoningContent) assistantMsg.reasoning = currentReasoningContent; // reasoning فقط للسياق، لا يُرسل للنموذج
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
              try { 
                  argsObj = JSON.parse(funcArgsString); 
              } catch (e) { 
                  if (funcArgsString.includes('}{')) {
                      try {
                          const arr = JSON.parse(`[${funcArgsString.replace(/}\s*{/g, '},{')}]`);
                          argsObj = Object.assign({}, ...arr);
                      } catch(err2) {
                          console.error(`[Agent] خطأ نهائي في بارسينج معاملات الأداة ${funcName}:`, funcArgsString);
                      }
                  } else {
                      console.error(`[Agent] خطأ في بارسينج معاملات الأداة ${funcName}:`, funcArgsString.substring(0, 200)); 
                  }
              }

              let funcResult = { error: `الأداة ${funcName} غير مدعومة.` };
              if (availableFunctions[funcName]) {
                  try {
                      funcResult = await availableFunctions[funcName](argsObj);
                  } catch (e) {
                      funcResult = { error: 'حدث خطأ غير متوقع أثناء تنفيذ الأداة: ' + e.message };
                  }
              }

              // طباعة النتيجة مباشرة للمستخدم إذا كانت الأداة تصدر صورة أو محتوى مرئي
              const imageDisplay = funcResult?.markdownToOutput || funcResult?.imageResult;
              if (imageDisplay) {
                  const notif = `\n${imageDisplay}\n`;
                  fullContent += notif;
                  if (onChunk) onChunk(notif);
              }

              const resultStr = typeof funcResult === 'string' ? funcResult : JSON.stringify(funcResult);
              
              messages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
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

// دالة سريعة لاستخلاص المهام باستخدام موديل سريع بصيغة JSON
async function extractTasksFromPlan(planText, membersStr) {
    try {
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
        if (!OPENROUTER_API_KEY) return [];

        const systemPrompt = `أنت نظام استخلاص مهام. لديك نص (خطة) من قائد الفريق. مهمتك استخراج المهام التي وكلها القائد للأعضاء المتاحين.
يجب أن ترجع النتيجة كـ Array of Objects بصيغة JSON فقط، بدون أي نص إضافي، كما يلي:
[
  { "agentId": "الرقم التعريفي (ID) للعضو المذكور في الخطة", "subTask": "المهمة التي طلب منه القائد تنفيذها هنا مفصلة" }
]
الأعضاء القابلون للتفويض (مع تجاهل القائد نفسه إن كان موجوداً):
${membersStr}
إذا لم يُكلف أحد بشيء رد بـ [] (مصفوفة فارغة). يجب أن يكون JSON نقي فقط.`;

        const response = await axios({
            method: 'post',
            url: 'https://openrouter.ai/api/v1/chat/completions',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://gharam.art',
                'X-OpenRouter-Title': 'Gharam Team AI'
            },
            data: {
                model: 'google/gemini-2.5-flash:free',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `خطة القائد:\n${planText}` }
                ],
                response_format: { type: 'json_object' }
            }
        });

        let content = response.data?.choices?.[0]?.message?.content || '[]';
        // التنظيف واستخراج المصفوفة من الـ JSON المُرجع
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(content);
    } catch (e) {
        console.error('[Extraction Error]', e.message);
        return [];
    }
}

module.exports = { runAgent, geminiToolsToOpenAI, extractTasksFromPlan };
