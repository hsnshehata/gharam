import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { V2Layout } from './V2Layout';
import V2Dashboard from './pages/V2Dashboard';
import './v2.css';

function V2App({ user, setUser }) {
  return (
    <div className="v2-root">
      <V2Layout user={user} setUser={setUser}>
        <Routes>
          <Route path="/dashboard" element={<V2Dashboard user={user} />} />
          {/* Placeholder routes — will be built in future phases */}
          <Route path="/bookings" element={<V2Placeholder title="الحجوزات" icon="📋" />} />
          <Route path="/instant-services" element={<V2Placeholder title="الخدمات الفورية" icon="⚡" />} />
          <Route path="/expenses" element={<V2Placeholder title="المصروفات والسلف" icon="💸" />} />
          <Route path="/hall-supervision" element={<V2Placeholder title="إشراف الصالة" icon="🏛️" />} />
          <Route path="/employee-reports" element={<V2Placeholder title="تقارير الموظفين" icon="📈" />} />
          <Route path="/packages" element={<V2Placeholder title="الباكدجات والخدمات" icon="📦" />} />
          <Route path="/points" element={<V2Placeholder title="نقاط الموظفين" icon="🏆" />} />
          <Route path="/users" element={<V2Placeholder title="الموظفين" icon="👥" />} />
          <Route path="/reports" element={<V2Placeholder title="التقارير المالية" icon="📑" />} />
          <Route path="/employee-dashboard" element={<V2Placeholder title="لوحة الموظف" icon="🪪" />} />
          <Route path="/ai-settings" element={<V2Placeholder title="الذكاء الاصطناعي" icon="🤖" />} />
          <Route path="/gallery-admin" element={<V2Placeholder title="المعرض" icon="🖼️" />} />
          <Route path="/" element={<Navigate to="/v2/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/v2/dashboard" replace />} />
        </Routes>
      </V2Layout>
    </div>
  );
}

/* Placeholder for pages not yet built */
function V2Placeholder({ title, icon }) {
  return (
    <div className="v2-empty" style={{ paddingTop: '80px' }}>
      <div className="v2-empty-icon">{icon}</div>
      <div className="v2-empty-text">{title}</div>
      <div className="v2-empty-sub">هذه الصفحة قيد الإنشاء... تابعنا قريباً 🚧</div>
    </div>
  );
}

export default V2App;
