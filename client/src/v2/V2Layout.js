import React, { useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './v2.css';

/* ═══════════════════════════════════════
   V2 SIDEBAR
   ═══════════════════════════════════════ */
function V2Sidebar({ user, collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const isSupervisor = user?.role === 'supervisor';

  const navItems = useMemo(() => {
    const items = [];

    // القسم الرئيسي
    items.push({ section: 'الرئيسية' });
    items.push({ to: '/v2/dashboard', icon: '📊', label: 'شغل إنهاردة' });
    items.push({ to: '/v2/employee-dashboard', icon: '🪪', label: 'لوحة الموظف' });

    if (isAdmin || isSupervisor) {
      items.push({ section: 'العمليات' });
      items.push({ to: '/v2/bookings', icon: '📋', label: 'الحجوزات' });
      items.push({ to: '/v2/instant-services', icon: '⚡', label: 'الخدمات الفورية' });
      items.push({ to: '/v2/expenses', icon: '💸', label: 'المصروفات والسلف' });
      items.push({ to: '/v2/hall-supervision', icon: '🏛️', label: 'إشراف الصالة' });
      items.push({ to: '/v2/employee-reports', icon: '📈', label: 'تقارير الموظفين' });
    }

    if (isAdmin) {
      items.push({ section: 'الإدارة' });
      items.push({ to: '/v2/packages', icon: '📦', label: 'الباكدجات والخدمات' });
      items.push({ to: '/v2/points', icon: '🏆', label: 'نقاط الموظفين' });
      items.push({ to: '/v2/users', icon: '👥', label: 'الموظفين' });
      items.push({ to: '/v2/reports', icon: '📑', label: 'التقارير المالية' });

      items.push({ section: 'أدوات ذكية' });
      items.push({ to: '/v2/ai-settings', icon: '🤖', label: 'الذكاء الاصطناعي' });
      items.push({ to: '/v2/gallery-admin', icon: '🖼️', label: 'المعرض' });
    }

    return items;
  }, [isAdmin, isSupervisor]);

  const handleNav = useCallback((to) => {
    navigate(to);
    setMobileOpen(false);
  }, [navigate, setMobileOpen]);

  return (
    <>
      <div className={`v2-sidebar-overlay ${mobileOpen ? 'visible' : ''}`} onClick={() => setMobileOpen(false)} />
      <aside className={`v2-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="v2-sidebar-header">
          <img src="/logo.png" alt="Logo" className="v2-sidebar-logo" />
          <span className="v2-sidebar-brand">غرام سلطان</span>
        </div>

        <nav className="v2-sidebar-nav">
          {navItems.map((item, i) => {
            if (item.section) {
              return (
                <div className="v2-nav-section" key={`section-${i}`}>
                  <div className="v2-nav-section-title">{item.section}</div>
                </div>
              );
            }
            const isActive = location.pathname === item.to;
            return (
              <button
                key={item.to}
                className={`v2-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNav(item.to)}
                title={collapsed ? item.label : undefined}
              >
                <span className="v2-nav-icon">{item.icon}</span>
                <span className="v2-nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="v2-sidebar-footer">
          <button className="v2-switch-btn" onClick={() => navigate('/dashboard')} title="العودة للإصدار القديم">
            ↩️ <span className="v2-nav-label">الإصدار القديم</span>
          </button>
          <button
            className="v2-sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            style={{ marginTop: 8 }}
          >
            {collapsed ? '→' : '←'}
            <span className="v2-nav-label">{collapsed ? '' : 'تصغير'}</span>
          </button>
        </div>
      </aside>
    </>
  );
}

/* ═══════════════════════════════════════
   V2 TOPBAR
   ═══════════════════════════════════════ */
function V2TopBar({ user, collapsed, setMobileOpen }) {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('v2-theme') === 'dark'; } catch { return false; }
  });

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    try { localStorage.setItem('v2-theme', next ? 'dark' : 'light'); } catch {}
    // Toggle class on v2-root
    const root = document.querySelector('.v2-root');
    if (root) {
      root.classList.toggle('v2-dark', next);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const initials = user?.username ? user.username.charAt(0).toUpperCase() : '?';

  return (
    <div className={`v2-topbar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="v2-topbar-title">
        <button
          className="v2-topbar-btn"
          onClick={() => setMobileOpen(true)}
          style={{ display: 'none' }}
          id="v2-mobile-menu-btn"
        >
          ☰
        </button>
        <span>لوحة التحكم</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--v2-primary)', fontWeight: 700, background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: 6 }}>V2</span>
      </div>
      <div className="v2-topbar-actions">
        <button className="v2-topbar-btn v2-topbar-hide-mobile" onClick={toggleTheme}>
          {dark ? '☀️ فاتح' : '🌙 داكن'}
        </button>
        <button className="v2-topbar-btn v2-topbar-hide-mobile" onClick={handleLogout}>
          خروج
        </button>
        <div className="v2-topbar-avatar" title={user?.username}>
          {initials}
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════
   V2 BOTTOM NAV (Mobile)
   ═══════════════════════════════════════ */
function V2BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const items = [
    { to: '/v2/dashboard', icon: '📊', label: 'اليوم' },
    { to: '/v2/bookings', icon: '📋', label: 'حجوزات' },
    { to: '/v2/instant-services', icon: '⚡', label: 'فوري' },
    { to: '/v2/expenses', icon: '💸', label: 'مصاريف' },
    { to: '/v2/employee-dashboard', icon: '🪪', label: 'حسابي' },
  ];

  return (
    <div className="v2-bottom-nav">
      <div className="v2-bottom-nav-inner">
        {items.map(item => (
          <button
            key={item.to}
            className={`v2-bottom-nav-item ${location.pathname === item.to ? 'active' : ''}`}
            onClick={() => navigate(item.to)}
          >
            <span className="v2-bottom-nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   V2 LAYOUT
   ═══════════════════════════════════════ */
export function V2Layout({ user, setUser, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Apply dark class on mount
  React.useEffect(() => {
    const root = document.querySelector('.v2-root');
    if (!root) return;
    try {
      if (localStorage.getItem('v2-theme') === 'dark') {
        root.classList.add('v2-dark');
      }
    } catch {}
  }, []);

  // Show mobile menu button
  React.useEffect(() => {
    const btn = document.getElementById('v2-mobile-menu-btn');
    const check = () => {
      if (btn) btn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div className="v2-layout">
      <V2Sidebar
        user={user}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className={`v2-main ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <V2TopBar user={user} collapsed={collapsed} setMobileOpen={setMobileOpen} />
        <div className="v2-content">
          {children}
        </div>
      </div>
      <V2BottomNav />
    </div>
  );
}

export default V2Layout;
