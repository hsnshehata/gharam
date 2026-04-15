import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-hot-toast';

export default function DynamicTeamAI({ isNested = false }) {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [task, setTask] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState([]);
  const [activeAgentId, setActiveAgentId] = useState(null);
  const [completedAgentIds, setCompletedAgentIds] = useState([]);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchTeams = async () => {
    try {
      const res = await axios.get('/api/admin/teams');
      if (res.data.success) {
        setTeams(res.data.teams);
        if (res.data.teams.length > 0) {
            setSelectedTeam(res.data.teams[0]);
        }
      }
    } catch (err) {
      toast.error('فشل جلب الفرق');
    }
  };

  const handleTeamChange = (e) => {
    const tId = e.target.value;
    const t = teams.find(x => x._id === tId);
    setSelectedTeam(t);
  };

  const handleRun = async () => {
    if (!task.trim() || isRunning || !selectedTeam) return;

    setIsRunning(true);
    setMessages([]);
    setActiveAgentId(null);
    setCompletedAgentIds([]);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/teams/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ teamId: selectedTeam._id, task })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') { setIsRunning(false); break; }

          try {
            const event = JSON.parse(raw);
            handleEvent(event);
          } catch (err) {
            // تجاهل محتوى غير قابل للتحليل
          }
        }
      }
    } catch (error) {
      console.error(error);
      setIsRunning(false);
      toast.error('انقطع الاتصال أو حدث خطأ');
    }
  };

  const handleEvent = (event) => {
    switch (event.type) {
      case 'start':
        setMessages(prev => [...prev, { type: 'system', content: event.message }]);
        break;

      case 'agent_start':
        setActiveAgentId(event.agentId);
        setMessages(prev => [...prev, {
          type: 'agent',
          agentId: event.agentId,
          agentName: event.agentName,
          agentRole: event.agentRole,
          agentEmoji: event.agentEmoji,
          content: '',
          status: 'working'
        }]);
        break;

      case 'agent_chunk':
        setMessages(prev => prev.map((msg, i) => {
          if (i === prev.length - 1 && msg.agentId === event.agentId) {
            return { ...msg, content: msg.content + event.chunk };
          }
          return msg;
        }));
        break;

      case 'agent_done':
        setActiveAgentId(null);
        setCompletedAgentIds(prev => [...prev, event.agentId]);
        setMessages(prev => prev.map((msg, i) => {
          if (i === prev.length - 1 && msg.agentId === event.agentId) {
            return { ...msg, status: event.status, duration: event.duration };
          }
          return msg;
        }));
        break;

      case 'complete':
        setIsRunning(false);
        setMessages(prev => [...prev, { type: 'system', content: '🎉 ' + event.message }]);
        break;

      case 'error':
        setIsRunning(false);
        setMessages(prev => [...prev, { type: 'error', content: event.message }]);
        break;
      
      default:
        break;
    }
  };

  const currentAgents = selectedTeam ? [selectedTeam.leader, ...(selectedTeam.members || [])].filter(Boolean) : [];
  const percent = currentAgents.length > 0 ? Math.round((completedAgentIds.length / currentAgents.length) * 100) : 0;

  return (
    <div className={`${isNested ? '' : 'min-h-screen bg-gray-950 text-white'} w-full`} dir="rtl">
      {!isNested && (
        <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                👥 محادثات الفرق (Multi-Agent Teams)
              </h1>
              <p className="text-gray-400 text-sm mt-1">تفاعل حي مع فرقك التي أنشأتها</p>
            </div>
            <div>
              {teams.length > 0 ? (
                  <select 
                      value={selectedTeam?._id || ''} 
                      onChange={handleTeamChange}
                      disabled={isRunning}
                      className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                  >
                      {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
              ) : (
                  <span className="text-sm text-yellow-500">يرجى إنشاء فريق أولاً</span>
              )}
            </div>
          </div>
        </div>
      )}

      {isNested && (
        <div className="px-6 py-4 flex items-center justify-between bg-gray-900/50 border-b border-gray-800">
           <span className="text-gray-300 font-bold text-sm">التيم النشط:</span>
           {teams.length > 0 ? (
                <select 
                    value={selectedTeam?._id || ''} 
                    onChange={handleTeamChange}
                    disabled={isRunning}
                    className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                >
                    {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
            ) : (
                <span className="text-sm text-yellow-500">يرجى إنشاء فريق من تبويب بناء الفرق</span>
            )}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {selectedTeam && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h3 className="text-lg font-bold mb-4 border-b border-gray-800 pb-2">تشكيل الفريق: {selectedTeam.name}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {currentAgents.map((agent) => {
                const isActive = activeAgentId === agent._id;
                const isDone = completedAgentIds.includes(agent._id);
                return (
                  <div key={agent._id} className={`
                    rounded-xl border p-3 items-center text-center transition-all duration-300
                    ${isActive ? 'border-blue-500 bg-blue-500/10 scale-105 shadow-lg shadow-blue-500/20' : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'}
                    ${isDone ? 'opacity-50 border-green-500/30' : ''}
                  `}>
                    <div className={`text-3xl mb-2 ${isActive ? 'animate-bounce' : ''}`}>{agent.emoji}</div>
                    <div className="font-bold text-sm truncate">{agent.name}</div>
                    <div className="text-xs text-gray-400 truncate mt-1">{agent.role}</div>
                    {agent._id === selectedTeam.leader?._id && <div className="text-[10px] bg-yellow-500/20 text-yellow-500 mt-2 rounded-full py-0.5 px-2 w-max mx-auto border border-yellow-500/30">القائد</div>}
                  </div>
                );
              })}
            </div>
            {isRunning && (
                <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">تقدم الفريق</span>
                        <span className="text-sm font-bold">{percent}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                    </div>
                </div>
            )}
          </div>
        )}

        <div className="bg-gray-900 rounded-2xl border border-gray-800 flex flex-col" style={{height: '60vh'}}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {messages.length === 0 && (
                <div className="flex items-center justify-center h-full text-gray-500 flex-col gap-3">
                  <div className="text-6xl text-gray-700">✍️</div>
                  <p>اكتب مهمتك للفريق للبدء...</p>
                </div>
             )}
             {messages.map((msg, idx) => (
                <div key={idx}>
                    {msg.type === 'system' && <div className="text-center text-gray-500 text-xs my-4">{msg.content}</div>}
                    {msg.type === 'error' && <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg text-red-400 text-sm">❌ {msg.content}</div>}
                    {msg.type === 'agent' && (
                        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-3 border-b border-gray-700 pb-3">
                                <div className="text-2xl bg-gray-700 rounded-full w-10 h-10 flex items-center justify-center">{msg.agentEmoji}</div>
                                <div>
                                    <div className="font-bold text-sm text-blue-100">{msg.agentName}</div>
                                    <div className="text-xs text-gray-400">{msg.agentRole}</div>
                                </div>
                                <div className="mr-auto">
                                   {msg.status === 'working' ? <span className="flex items-center gap-2 text-xs text-blue-400">⚡ يعمل...</span> : <span className="text-xs text-green-400">✓ 완료 {(msg.duration/1000).toFixed(1)}s</span>}
                                </div>
                            </div>
                            <div className="text-gray-300 text-sm prose prose-invert max-w-none">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
             ))}
             <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-800 bg-gray-900/50">
             <div className="flex gap-2">
                 <textarea
                    value={task}
                    onChange={e => setTask(e.target.value)}
                    disabled={isRunning || !selectedTeam}
                    rows="2"
                    placeholder="اكتب المهمة المطلوبة للفريق..."
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-blue-500 disabled:opacity-50"
                 />
                 <button
                    disabled={!task.trim() || isRunning || !selectedTeam}
                    onClick={handleRun}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white px-6 rounded-xl font-bold transition-colors"
                 >
                    إرسال
                 </button>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
