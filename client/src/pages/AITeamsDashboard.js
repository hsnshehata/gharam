import React, { useState } from 'react';
import AIAgentsManager from './AIAgentsManager';
import AITeamsManager from './AITeamsManager';
import DynamicTeamAI from './DynamicTeamAI';

export default function AITeamsDashboard() {
  const [activeTab, setActiveTab] = useState('chat'); // 'agents', 'teams', 'chat'

  return (
    <div className="bg-gray-950 min-h-screen text-white" dir="rtl">
      {/* Header & Tabs */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 pt-6 pb-0">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              🦾 فريق الموظفين AI
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              إدارة المساعدين، تشكيل الفِرق، ومتابعة المهام من شاشة واحدة.
            </p>
          </div>

          <div className="flex gap-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('chat')}
              className={`pb-3 px-4 font-bold transition-all text-sm whitespace-nowrap border-b-2 ${
                activeTab === 'chat'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              💬 محادثات الفرق (العمليات الفورية)
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`pb-3 px-4 font-bold transition-all text-sm whitespace-nowrap border-b-2 ${
                activeTab === 'teams'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              🤝 بناء الفرق (Teams)
            </button>
            <button
              onClick={() => setActiveTab('agents')}
              className={`pb-3 px-4 font-bold transition-all text-sm whitespace-nowrap border-b-2 ${
                activeTab === 'agents'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              👥 إدارة المساعدين (Agents)
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full">
        {activeTab === 'chat' && (
          <div className="animate-fadeIn">
            <DynamicTeamAI isNested={true} />
          </div>
        )}
        {activeTab === 'teams' && (
          <div className="animate-fadeIn">
            <AITeamsManager isNested={true} />
          </div>
        )}
        {activeTab === 'agents' && (
          <div className="animate-fadeIn">
            <AIAgentsManager isNested={true} />
          </div>
        )}
      </div>
    </div>
  );
}
