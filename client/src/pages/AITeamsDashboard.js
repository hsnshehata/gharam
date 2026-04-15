import React, { useState } from 'react';
import AIAgentsManager from './AIAgentsManager';
import AITeamsManager from './AITeamsManager';
import DynamicTeamAI from './DynamicTeamAI';
import { Container, Tabs, Tab } from 'react-bootstrap';

export default function AITeamsDashboard() {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <Container fluid className="py-4" dir="rtl">
      <div className="mb-4">
        <h1 className="h3 fw-bold d-flex align-items-center gap-2">
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
