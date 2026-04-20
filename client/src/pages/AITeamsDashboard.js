import React, { useState } from 'react';
import AIAgentsManager from './AIAgentsManager';
import AITeamsManager from './AITeamsManager';
import DynamicTeamAI from './DynamicTeamAI';
import { Container, Tabs, Tab } from 'react-bootstrap';

export default function AITeamsDashboard() {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <Container fluid className="py-4 ai-premium-dashboard-container" dir="rtl">
      <style>{`
        .ai-premium-dashboard-container {
            background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
            min-height: 100vh;
        }

        /* Tabs Styling */
        .ai-premium-dashboard-container .nav-tabs {
            border-bottom: 2px solid #e2e8f0;
            gap: 0.5rem;
        }
        .ai-premium-dashboard-container .nav-tabs .nav-link {
            border: none;
            color: #64748b;
            font-weight: 600;
            padding: 1rem 1.5rem;
            border-radius: 12px 12px 0 0;
            transition: all 0.3s ease;
            position: relative;
        }
        .ai-premium-dashboard-container .nav-tabs .nav-link:hover {
            color: #028090;
            background: rgba(2, 128, 144, 0.05);
        }
        .ai-premium-dashboard-container .nav-tabs .nav-link.active {
            color: #028090;
            background: transparent;
        }
        .ai-premium-dashboard-container .nav-tabs .nav-link.active::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #028090, #005f73);
            border-radius: 3px 3px 0 0;
        }

        /* Beautiful Cards */
        .ai-premium-container .card, .ai-premium-dashboard-container .tab-content > .tab-pane > div {
            background: rgba(255, 255, 255, 0.85) !important;
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.5) !important;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
        }
        .ai-premium-container .card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
        }

        /* Premium Titles */
        .premium-title {
            background: linear-gradient(45deg, #028090, #0a9396, #94d2bd);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0px 4px 15px rgba(2, 128, 144, 0.2);
        }

        /* Buttons & Inputs */
        .ai-premium-container .form-control, .ai-premium-container .form-select {
            border-radius: 10px;
            border: 1px solid #cbd5e1;
            padding: 0.75rem 1rem;
            transition: all 0.2s ease;
            background: rgba(255,255,255,0.9);
        }
        .ai-premium-container .form-control:focus, .ai-premium-container .form-select:focus {
            box-shadow: 0 0 0 4px rgba(2, 128, 144, 0.15);
            border-color: #028090;
        }
        .ai-premium-container .btn-primary {
            background: linear-gradient(135deg, #028090 0%, #005f73 100%);
            border: none;
            border-radius: 10px;
            font-weight: 600;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .ai-premium-container .btn-primary:hover {
            transform: scale(1.02);
            box-shadow: 0 4px 15px rgba(2, 128, 144, 0.4);
        }

        /* Badges & Micro-animations */
        .ai-premium-badge {
            animation: pulse-soft 2s infinite ease-in-out;
        }
        @keyframes pulse-soft {
            0% { box-shadow: 0 0 0 0 rgba(2, 128, 144, 0.4); }
            70% { box-shadow: 0 0 0 6px rgba(2, 128, 144, 0); }
            100% { box-shadow: 0 0 0 0 rgba(2, 128, 144, 0); }
        }
      `}</style>

      <div className="mb-4">
        <h1 className="h3 fw-bold d-flex align-items-center gap-2 premium-title">
          🦾 فريق الموظفين AI
        </h1>
        <p className="text-muted small mt-1">
          إدارة المساعدين، تشكيل الفِرق، ومتابعة المهام من شاشة واحدة.
        </p>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onSelect={(k) => setActiveTab(k)} 
        className="mb-4 border-bottom-0"
        dir="rtl"
      >
        <Tab eventKey="chat" title="💬 محادثات الفرق (العمليات الفورية)">
          <DynamicTeamAI isNested={true} />
        </Tab>
        <Tab eventKey="teams" title="🤝 بناء الفرق (Teams)">
          <AITeamsManager isNested={true} />
        </Tab>
        <Tab eventKey="agents" title="👥 إدارة المساعدين (Agents)">
          <AIAgentsManager isNested={true} />
        </Tab>
      </Tabs>
    </Container>
  );
}
