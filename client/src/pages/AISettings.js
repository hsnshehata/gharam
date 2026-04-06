import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Spinner } from 'react-bootstrap';
import axios from 'axios';
import { API_BASE } from '../utils/apiBase';

const TABS = [
    { id: 'prompt', label: 'تعليمات البوت', icon: '📝' },
    { id: 'admin_prompt', label: 'مساعد الإدارة', icon: '🧠' },
    { id: 'conversations', label: 'سجل المحادثات', icon: '💬' },
    { id: 'settings', label: 'الإعدادات', icon: '⚙️' },
];

const SOURCE_LABELS = {
    web: { label: 'ويب', icon: '🌐', color: '#3498db' },
    messenger: { label: 'ماسنجر', icon: '💬', color: '#0084ff' },
    comment: { label: 'تعليق', icon: '💭', color: '#e67e22' },
};

function AISettings() {
    const [activeTab, setActiveTab] = useState('prompt');

    return (
        <div style={styles.page} dir="rtl" className="ai-settings-page">
            <style>{`
                @media (max-width: 768px) {
                    .ai-settings-page .header-content { flex-direction: column; align-items: flex-start !important; gap: 8px !important; }
                    .ai-settings-page .tab-bar { overflow-x: auto; padding: 0 10px !important; }
                    .ai-settings-page .tab-btn { padding: 10px 15px !important; font-size: 13px !important; }
                    .ai-settings-page .conv-container { flex-direction: column !important; }
                    .ai-settings-page .conv-list { width: 100% !important; min-width: 100% !important; max-height: 40vh; overflow-y: auto; border-left: none !important; border-bottom: 1px solid var(--border, #e6dfd4); }
                    .ai-settings-page .conv-toolbar { padding: 10px !important; justify-content: center; }
                    .ai-settings-page .stats-bar { flex-wrap: wrap; }
                    .ai-settings-page .stat-card { min-width: 45% !important; flex: 1 1 45% !important; margin-bottom: 10px; border-right: none !important; border-bottom: 3px solid; }
                    .ai-settings-page .prompt-toolbar { flex-direction: column; align-items: flex-start !important; }
                    .ai-settings-page .prompt-toolbar-left { margin-bottom: 10px; width: 100%; justify-content: space-between; gap: 8px !important; }
                    .ai-settings-page .prompt-toolbar-right { width: 100%; }
                    .ai-settings-page .prompt-save-btn { width: 100%; justify-content: center; }
                    .ai-settings-page .conv-search-wrapper { min-width: 100% !important; margin-bottom: 10px; }
                    .ai-settings-page .filter-chips { justify-content: center; flex-wrap: wrap; }
                }
            `}</style>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerContent} className="header-content">
                    <div style={styles.headerIcon}>🤖</div>
                    <div>
                        <h1 style={styles.title}>لوحة تحكم الذكاء الاصطناعي</h1>
                        <p style={styles.subtitle}>إدارة البوت · سجل المحادثات · التعليمات</p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div style={styles.tabBar} className="tab-bar">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className="tab-btn"
                        style={{
                            ...styles.tabBtn,
                            ...(activeTab === tab.id ? styles.tabBtnActive : {})
                        }}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span style={styles.tabIcon}>{tab.icon}</span>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div style={styles.tabContent}>
                {activeTab === 'prompt' && <PromptTab />}
                {activeTab === 'admin_prompt' && <AdminPromptTab />}
                {activeTab === 'conversations' && <ConversationsTab />}
                {activeTab === 'settings' && <SettingsTab />}
            </div>
        </div>
    );
}

// ============================================================
//  TAB 1: PROMPT EDITOR
// ============================================================
function PromptTab() {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const textareaRef = useRef(null);
    const highlightRef = useRef(null);
    const searchInputRef = useRef(null);

    useEffect(() => {
        const fetchPrompt = async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/ai/prompt`, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                if (res.data.success) setPrompt(res.data.data);
            } catch (err) {
                setError('حدث خطأ أثناء جلب إعدادات الذكاء الاصطناعي');
            } finally {
                setLoading(false);
            }
        };
        fetchPrompt();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                setIsSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 100);
            }
            if (e.key === 'Escape' && isSearchOpen) {
                setIsSearchOpen(false);
                setSearchQuery('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSearchOpen]);

    const searchMatches = useMemo(() => {
        if (!searchQuery || searchQuery.length < 1) return [];
        const matches = [];
        const lowerPrompt = prompt.toLowerCase();
        const lowerQuery = searchQuery.toLowerCase();
        let idx = lowerPrompt.indexOf(lowerQuery);
        while (idx !== -1) {
            matches.push(idx);
            idx = lowerPrompt.indexOf(lowerQuery, idx + 1);
        }
        return matches;
    }, [prompt, searchQuery]);

    const scrollToMatch = useCallback((matchIdx) => {
        if (!textareaRef.current || searchMatches.length === 0) return;
        const textarea = textareaRef.current;
        const pos = searchMatches[matchIdx];
        if (pos === undefined) return;
        const textBefore = prompt.substring(0, pos);
        const linesBefore = textBefore.split('\n').length;
        const lineHeight = 24;
        const scrollTarget = (linesBefore - 3) * lineHeight;
        textarea.scrollTop = Math.max(0, scrollTarget);
        if (highlightRef.current) {
            highlightRef.current.scrollTop = textarea.scrollTop;
        }
    }, [searchMatches, prompt]);

    useEffect(() => {
        if (searchMatches.length > 0) {
            setCurrentMatchIndex(0);
            scrollToMatch(0);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, searchMatches.length]);

    const goToNextMatch = () => {
        if (searchMatches.length === 0) return;
        const next = (currentMatchIndex + 1) % searchMatches.length;
        setCurrentMatchIndex(next);
        scrollToMatch(next);
    };
    const goToPrevMatch = () => {
        if (searchMatches.length === 0) return;
        const prev = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
        setCurrentMatchIndex(prev);
        scrollToMatch(prev);
    };
    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? goToPrevMatch() : goToNextMatch(); }
    };
    const handleScroll = () => {
        if (highlightRef.current && textareaRef.current) {
            highlightRef.current.scrollTop = textareaRef.current.scrollTop;
            highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    const highlightedHTML = useMemo(() => {
        if (!searchQuery || searchMatches.length === 0) return '';
        const escaped = prompt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const lowerPrompt = prompt.toLowerCase();
        const lowerQuery = searchQuery.toLowerCase();
        let result = '';
        let lastIdx = 0;
        let matchCount = 0;
        let idx = lowerPrompt.indexOf(lowerQuery);
        while (idx !== -1) {
            result += escaped.substring(lastIdx, idx);
            const match = escaped.substring(idx, idx + searchQuery.length);
            const isCurrent = matchCount === currentMatchIndex;
            result += `<mark class="${isCurrent ? 'search-current' : 'search-match'}">${match}</mark>`;
            lastIdx = idx + searchQuery.length;
            matchCount++;
            idx = lowerPrompt.indexOf(lowerQuery, idx + 1);
        }
        result += escaped.substring(lastIdx);
        return result;
    }, [prompt, searchQuery, searchMatches, currentMatchIndex]);

    const handleSave = async (e) => {
        e.preventDefault();
        setMessage(''); setError(''); setSaving(true);
        try {
            const res = await axios.post(`${API_BASE}/api/ai/prompt`, { prompt }, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            if (res.data.success) { setMessage(res.data.message || 'تم الحفظ بنجاح'); setTimeout(() => setMessage(''), 4000); }
        } catch (err) {
            setError(err.response?.data?.message || 'حدث خطأ أثناء الحفظ');
            setTimeout(() => setError(''), 5000);
        } finally { setSaving(false); }
    };

    const lineCount = prompt.split('\n').length;
    const charCount = prompt.length;

    if (loading) return (
        <div style={styles.loadingWrapper}>
            <Spinner animation="border" style={{ color: '#1fb6a6' }} />
            <div style={{ marginTop: 16, color: '#888', fontSize: 14 }}>جاري تحميل التعليمات...</div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Messages */}
            {message && <div style={styles.successToast}><span>✅</span> {message}</div>}
            {error && <div style={styles.errorToast}><span>❌</span> {error}</div>}

            {/* Toolbar */}
            <div style={styles.toolbar} className="prompt-toolbar">
                <div style={styles.toolbarLeft} className="prompt-toolbar-left">
                    <button type="button" style={{ ...styles.toolBtn, ...(isSearchOpen ? styles.toolBtnActive : {}) }}
                        onClick={() => { setIsSearchOpen(!isSearchOpen); if (!isSearchOpen) setTimeout(() => searchInputRef.current?.focus(), 100); else setSearchQuery(''); }}
                        title="بحث (Ctrl+F)" className="prompt-tool-btn">🔍 بحث</button>
                    <button type="button" style={styles.toolBtn} onClick={() => setIsCollapsed(!isCollapsed)} className="prompt-tool-btn">
                        {isCollapsed ? '📖 توسيع' : '📕 طي'}
                    </button>
                    <div style={styles.statsChip}>
                        <span>📝 {lineCount} سطر</span>
                        <span style={styles.statsDivider}>|</span>
                        <span>🔤 {charCount.toLocaleString()} حرف</span>
                    </div>
                </div>
                <div style={styles.toolbarRight} className="prompt-toolbar-right">
                    <button type="button" style={{ ...styles.saveBtn, opacity: saving || !prompt.trim() ? 0.6 : 1 }}
                        onClick={handleSave} disabled={saving || !prompt.trim()} className="prompt-save-btn">
                        {saving ? (<><Spinner animation="border" size="sm" style={{ marginLeft: 8 }} /> جاري الحفظ...</>) : (<>💾 حفظ التعديلات</>)}
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            {isSearchOpen && (
                <div style={styles.searchBar}>
                    <div style={styles.searchInputWrapper}>
                        <span style={styles.searchIcon}>🔍</span>
                        <input ref={searchInputRef} type="text" value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleSearchKeyDown}
                            placeholder="ابحث في التعليمات..." style={styles.searchInput} autoFocus />
                        {searchQuery && (
                            <span style={styles.matchCount}>
                                {searchMatches.length > 0 ? `${currentMatchIndex + 1}/${searchMatches.length}` : 'لا نتائج'}
                            </span>
                        )}
                    </div>
                    <div style={styles.searchActions}>
                        <button type="button" onClick={goToPrevMatch} disabled={searchMatches.length === 0} style={styles.searchNavBtn} title="السابقة">▲</button>
                        <button type="button" onClick={goToNextMatch} disabled={searchMatches.length === 0} style={styles.searchNavBtn} title="التالية">▼</button>
                        <button type="button" onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} style={styles.searchCloseBtn} title="إغلاق">✕</button>
                    </div>
                </div>
            )}

            {/* Editor Area */}
            {!isCollapsed && (
                <div style={styles.editorWrapper}>
                    <div style={styles.lineNumbers}>
                        {Array.from({ length: lineCount }, (_, i) => (
                            <div key={i} style={styles.lineNumber}>{i + 1}</div>
                        ))}
                    </div>
                    {searchQuery && searchMatches.length > 0 && (
                        <div ref={highlightRef} style={styles.highlightOverlay} dangerouslySetInnerHTML={{ __html: highlightedHTML }} />
                    )}
                    <textarea ref={textareaRef} value={prompt} onChange={(e) => setPrompt(e.target.value)}
                        onScroll={handleScroll}
                        placeholder="اكتبي التعليمات هنا...&#10;&#10;مثال:&#10;أنت مساعد ذكي لصالون تجميل غرام سلطان.&#10;عليك الإجابة عن استفسارات العملاء بأدب..."
                        style={styles.textarea} spellCheck={false} />
                </div>
            )}

            {isCollapsed && (
                <div style={styles.collapsedPreview}>
                    <div style={styles.collapsedText}>
                        {prompt.slice(0, 200)}...
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
                        📝 {lineCount} سطر · 🔤 {charCount.toLocaleString()} حرف · اضغط "توسيع" لعرض المحرر
                    </div>
                </div>
            )}

            <div style={styles.tipsBar}>
                <span style={styles.tipItem}>💡 <kbd style={styles.kbd}>Ctrl+F</kbd> للبحث</span>
                <span style={styles.tipItem}>⏎ <kbd style={styles.kbd}>Enter</kbd> التالية</span>
                <span style={styles.tipItem}>⇧ <kbd style={styles.kbd}>Shift+Enter</kbd> السابقة</span>
            </div>

            <style>{`
                .search-match { background: rgba(255, 213, 79, 0.35); color: inherit; border-radius: 2px; padding: 1px 0; }
                .search-current { background: rgba(255, 152, 0, 0.7); color: #fff; border-radius: 2px; padding: 1px 0; box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.4); }
            `}</style>
        </div>
    );
}

// ============================================================
//  TAB 2: CONVERSATIONS LOG
// ============================================================
function ConversationsTab() {
    const [conversations, setConversations] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedConv, setSelectedConv] = useState(null);
    const [selectedConvData, setSelectedConvData] = useState(null);
    const [loadingConv, setLoadingConv] = useState(false);
    const [sourceFilter, setSourceFilter] = useState('');
    const [searchText, setSearchText] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const chatEndRef = useRef(null);
    const authHeaders = { headers: { 'x-auth-token': localStorage.getItem('token') } };

    const fetchStats = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/ai/conversations/stats`, authHeaders);
            if (res.data.success) setStats(res.data.data);
        } catch (err) { console.error('Error fetching stats:', err); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchConversations = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 30 };
            if (sourceFilter) params.source = sourceFilter;
            if (searchText.trim()) params.search = searchText.trim();
            const res = await axios.get(`${API_BASE}/api/ai/conversations`, { ...authHeaders, params });
            if (res.data.success) {
                setConversations(res.data.data);
                setTotalPages(res.data.totalPages || 1);
            }
        } catch (err) { console.error('Error fetching conversations:', err); }
        finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sourceFilter, searchText, page]);

    useEffect(() => { fetchStats(); }, [fetchStats]);
    useEffect(() => { fetchConversations(); }, [fetchConversations]);

    const loadConversation = async (conv) => {
        setSelectedConv(conv._id);
        setLoadingConv(true);
        try {
            const res = await axios.get(`${API_BASE}/api/ai/conversations/${conv._id}`, authHeaders);
            if (res.data.success) setSelectedConvData(res.data.data);
        } catch (err) { console.error('Error loading conversation:', err); }
        finally { setLoadingConv(false); }
    };

    useEffect(() => {
        if (selectedConvData) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedConvData]);

    const handleDelete = async (convId) => {
        if (!window.confirm('هل أنت متأكد من حذف هذه المحادثة؟')) return;
        try {
            await axios.delete(`${API_BASE}/api/ai/conversations/${convId}`, authHeaders);
            setConversations(prev => prev.filter(c => c._id !== convId));
            if (selectedConv === convId) { setSelectedConv(null); setSelectedConvData(null); }
            fetchStats();
        } catch (err) { console.error('Error deleting conversation:', err); }
    };

    const handleDeleteAll = async () => {
        const label = sourceFilter ? SOURCE_LABELS[sourceFilter]?.label : 'جميع';
        if (!window.confirm(`هل أنت متأكد من حذف ${label} المحادثات؟`)) return;
        try {
            const params = sourceFilter ? { source: sourceFilter } : {};
            await axios.delete(`${API_BASE}/api/ai/conversations`, { ...authHeaders, params });
            setConversations([]);
            setSelectedConv(null);
            setSelectedConvData(null);
            fetchStats();
        } catch (err) { console.error('Error deleting all:', err); }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now - d;
        if (diff < 60000) return 'الآن';
        if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} دقيقة`;
        if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} ساعة`;
        if (diff < 172800000) return 'أمس';
        return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Stats Bar */}
            {stats && (
                <div style={styles.statsBar} className="stats-bar">
                    <div style={{ ...styles.statCard, borderBottomColor: SOURCE_LABELS.web.color }} className="stat-card" onClick={() => { setSourceFilter(''); setPage(1); }}>
                        <div style={styles.statNumber}>{stats.total}</div>
                        <div style={styles.statLabel}>إجمالي المحادثات</div>
                    </div>
                    <div style={{ ...styles.statCard, borderRight: `3px solid ${SOURCE_LABELS.web.color}`, borderBottomColor: SOURCE_LABELS.web.color }} className="stat-card"
                        onClick={() => { setSourceFilter(sourceFilter === 'web' ? '' : 'web'); setPage(1); }}>
                        <div style={styles.statNumber}>{stats.web}</div>
                        <div style={styles.statLabel}>🌐 ويب</div>
                    </div>
                    <div style={{ ...styles.statCard, borderRight: `3px solid ${SOURCE_LABELS.messenger.color}`, borderBottomColor: SOURCE_LABELS.messenger.color }} className="stat-card"
                        onClick={() => { setSourceFilter(sourceFilter === 'messenger' ? '' : 'messenger'); setPage(1); }}>
                        <div style={styles.statNumber}>{stats.messenger}</div>
                        <div style={styles.statLabel}>💬 ماسنجر</div>
                    </div>
                    <div style={{ ...styles.statCard, borderRight: `3px solid ${SOURCE_LABELS.comment.color}`, borderBottomColor: SOURCE_LABELS.comment.color }} className="stat-card"
                        onClick={() => { setSourceFilter(sourceFilter === 'comment' ? '' : 'comment'); setPage(1); }}>
                        <div style={styles.statNumber}>{stats.comment}</div>
                        <div style={styles.statLabel}>💭 تعليقات</div>
                    </div>
                    <div style={{ ...styles.statCard, borderBottomColor: SOURCE_LABELS.web.color }} className="stat-card">
                        <div style={styles.statNumber}>{stats.totalMessages}</div>
                        <div style={styles.statLabel}>إجمالي الرسائل</div>
                    </div>
                </div>
            )}

            {/* Search & Filters */}
            <div style={styles.convToolbar} className="conv-toolbar">
                <div style={styles.convSearchWrapper} className="conv-search-wrapper">
                    <span style={{ opacity: 0.5 }}>🔍</span>
                    <input type="text" value={searchText} onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
                        placeholder="بحث في المحادثات..." style={styles.convSearchInput} />
                </div>
                <div style={styles.filterChips} className="filter-chips">
                    <button style={{ ...styles.filterChip, ...(sourceFilter === '' ? styles.filterChipActive : {}) }}
                        onClick={() => { setSourceFilter(''); setPage(1); }}>الكل</button>
                    {Object.entries(SOURCE_LABELS).map(([key, val]) => (
                        <button key={key} style={{
                            ...styles.filterChip,
                            ...(sourceFilter === key ? { ...styles.filterChipActive, background: val.color, borderColor: val.color } : {})
                        }} onClick={() => { setSourceFilter(sourceFilter === key ? '' : key); setPage(1); }}>
                            {val.icon} {val.label}
                        </button>
                    ))}
                </div>
                {conversations.length > 0 && (
                    <button style={styles.deleteAllBtn} onClick={handleDeleteAll} title="حذف الكل">🗑️ حذف الكل</button>
                )}
            </div>

            {/* Main Content: Split View */}
            <div style={styles.convContainer} className="conv-container">
                {/* Conversation List */}
                <div style={styles.convList} className="conv-list">
                    {loading ? (
                        <div style={styles.loadingWrapper}>
                            <Spinner animation="border" size="sm" style={{ color: '#1fb6a6' }} />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div style={styles.emptyState}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                            <div style={{ color: '#888' }}>لا توجد محادثات</div>
                        </div>
                    ) : (
                        <>
                            {conversations.map(conv => {
                                const src = SOURCE_LABELS[conv.source] || SOURCE_LABELS.web;
                                return (
                                    <div key={conv._id} style={{
                                        ...styles.convItem,
                                        ...(selectedConv === conv._id ? styles.convItemActive : {})
                                    }} onClick={() => loadConversation(conv)}>
                                        <div style={styles.convItemHeader}>
                                            <span style={{ ...styles.sourceBadge, background: src.color }}>{src.icon}</span>
                                            <span style={styles.convName}>{conv.senderName || 'زائر'}</span>
                                            <span style={styles.convTime}>{formatDate(conv.lastActivity)}</span>
                                        </div>
                                        <div style={styles.convPreview}>
                                            {conv.lastMessage?.text?.slice(0, 60) || '...'}
                                        </div>
                                        <div style={styles.convMeta}>
                                            <span>{conv.messageCount} رسالة</span>
                                            <button style={styles.convDeleteBtn} onClick={(e) => { e.stopPropagation(); handleDelete(conv._id); }}>🗑️</button>
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div style={styles.pagination}>
                                    <button style={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</button>
                                    <span style={{ fontSize: 13, color: '#888' }}>{page} / {totalPages}</span>
                                    <button style={styles.pageBtn} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>→</button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Conversation Detail */}
                <div style={styles.convDetail}>
                    {!selectedConv ? (
                        <div style={styles.emptyState}>
                            <div style={{ fontSize: 64, marginBottom: 16 }}>💬</div>
                            <div style={{ color: '#888', fontSize: 15 }}>اختر محادثة لعرض التفاصيل</div>
                        </div>
                    ) : loadingConv ? (
                        <div style={styles.loadingWrapper}>
                            <Spinner animation="border" style={{ color: '#1fb6a6' }} />
                        </div>
                    ) : selectedConvData ? (
                        <div style={styles.convDetailInner}>
                            {/* Detail Header */}
                            <div style={styles.convDetailHeader}>
                                <div>
                                    <span style={{ ...styles.sourceBadge, background: SOURCE_LABELS[selectedConvData.source]?.color || '#888' }}>
                                        {SOURCE_LABELS[selectedConvData.source]?.icon}
                                    </span>
                                    <strong style={{ marginRight: 10 }}>{selectedConvData.senderName || 'زائر'}</strong>
                                    <span style={{ fontSize: 12, color: '#888' }}>
                                        · {SOURCE_LABELS[selectedConvData.source]?.label} · {selectedConvData.messages?.length || 0} رسالة
                                    </span>
                                </div>
                                <div style={{ fontSize: 12, color: '#999' }}>
                                    {selectedConvData.metadata?.ip && <span>IP: {selectedConvData.metadata.ip} · </span>}
                                    آخر نشاط: {formatDate(selectedConvData.lastActivity)}
                                </div>
                            </div>

                            {/* Messages */}
                            <div style={styles.convMessages}>
                                {[...(selectedConvData.messages || [])]
                                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                                    .map((msg, idx) => (
                                    <div key={idx} style={{
                                        ...styles.convMsg,
                                        ...(msg.role === 'user' ? styles.convMsgUser : styles.convMsgBot)
                                    }}>
                                        <div style={{ ...styles.convMsgRole, color: msg.role === 'user' ? '#1fb6a6' : '#8e44ad' }}>
                                            {msg.role === 'user' ? '👤 العميل' : '🤖 البوت'}
                                            <span style={styles.convMsgTime}>{formatTime(msg.timestamp)}</span>
                                        </div>
                                        <div style={styles.convMsgText}>{msg.text}</div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

// ============================================================
//  TAB 3: SETTINGS
// ============================================================
function SettingsTab() {
    const [botEnabled, setBotEnabled] = useState(true);
    const [memoryLimit, setMemoryLimit] = useState(10);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/ai/settings`, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                if (res.data.success) {
                    setBotEnabled(res.data.data.botEnabled);
                    setMemoryLimit(res.data.data.memoryLimit);
                }
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await axios.post(`${API_BASE}/api/ai/settings`, { botEnabled, memoryLimit }, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            if (res.data.success) {
                setMessage('تم حفظ الإعدادات بنجاح ✅');
                setTimeout(() => setMessage(''), 4000);
            }
        } catch (err) {
            setMessage('حدث خطأ أثناء الحفظ ❌');
            setTimeout(() => setMessage(''), 4000);
        } finally { setSaving(false); }
    };

    if (loading) return (
        <div style={styles.loadingWrapper}>
            <Spinner animation="border" style={{ color: '#1fb6a6' }} />
        </div>
    );

    return (
        <div style={styles.settingsPage}>
            {message && <div style={styles.settingsMessage}>{message}</div>}

            {/* Bot Toggle */}
            <div style={styles.settingCard}>
                <div style={styles.settingHeader}>
                    <div>
                        <div style={styles.settingTitle}>🤖 تفعيل البوت</div>
                        <div style={styles.settingDesc}>عند الإيقاف، لن يرد البوت على أي رسائل (ويب، ماسنجر، تعليقات)</div>
                    </div>
                    <button style={{ ...styles.toggleBtn, ...(botEnabled ? styles.toggleBtnOn : styles.toggleBtnOff) }}
                        onClick={() => setBotEnabled(!botEnabled)}>
                        <div style={{ ...styles.toggleDot, ...(botEnabled ? styles.toggleDotOn : styles.toggleDotOff) }} />
                    </button>
                </div>
                <div style={{ ...styles.statusBadge, background: botEnabled ? '#d4edda' : '#f8d7da', color: botEnabled ? '#155724' : '#721c24' }}>
                    {botEnabled ? '✅ البوت يعمل الآن' : '⛔ البوت متوقف'}
                </div>
            </div>

            {/* Memory Limit */}
            <div style={styles.settingCard}>
                <div style={styles.settingHeader}>
                    <div>
                        <div style={styles.settingTitle}>🧠 حد الذاكرة (عدد الرسائل)</div>
                        <div style={styles.settingDesc}>
                            عدد آخر رسائل يتم إرسالها للذكاء الاصطناعي عند كل محادثة. القيمة الحالية: <strong>{memoryLimit}</strong> رسالة
                        </div>
                    </div>
                </div>
                <div style={styles.sliderWrapper}>
                    <span style={styles.sliderLabel}>2</span>
                    <input type="range" min="2" max="30" value={memoryLimit} onChange={(e) => setMemoryLimit(Number(e.target.value))}
                        style={styles.slider} />
                    <span style={styles.sliderLabel}>30</span>
                </div>
                <div style={styles.sliderValueDisplay}>
                    <span style={styles.sliderValue}>{memoryLimit}</span>
                    <span style={{ fontSize: 12, color: '#888' }}>رسالة</span>
                </div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                    💡 قيمة منخفضة = توفير توكنز أكتر · قيمة عالية = ذاكرة أقوى للمحادثة
                </div>
            </div>

            {/* Auto Cleanup Info */}
            <div style={styles.settingCard}>
                <div style={styles.settingTitle}>🧹 التنظيف التلقائي</div>
                <div style={styles.settingDesc}>
                    يتم حذف المحادثات القديمة تلقائياً بعد <strong>30 يوم</strong> من آخر نشاط.
                    هذا يمنع تراكم البيانات في قاعدة البيانات.
                </div>
                <div style={{ ...styles.statusBadge, background: '#e8f8f5', color: '#1fb6a6', marginTop: 12 }}>
                    ✅ التنظيف التلقائي مُفعّل
                </div>
            </div>

            {/* Save Button */}
            <button style={{ ...styles.saveBtn, width: '100%', justifyContent: 'center', marginTop: 20 }}
                onClick={handleSave} disabled={saving}>
                {saving ? (<><Spinner animation="border" size="sm" style={{ marginLeft: 8 }} /> جاري الحفظ...</>) : (<>💾 حفظ الإعدادات</>)}
            </button>
        </div>
    );
}

// ============================================================
//  STYLES
// ============================================================
const styles = {
    page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Tajawal', sans-serif" },
    loadingWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40vh' },
    header: { padding: '20px 28px 16px', borderBottom: '1px solid var(--border, #e6dfd4)' },
    headerContent: { display: 'flex', alignItems: 'center', gap: 16 },
    headerIcon: { fontSize: 36, width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #1fb6a6, #168a7d)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 20px rgba(31, 182, 166, 0.25)' },
    title: { margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text, #1d130d)' },
    subtitle: { margin: '4px 0 0', fontSize: 13, color: 'var(--muted, #5e5146)', lineHeight: 1.5 },

    // Tab Bar
    tabBar: { display: 'flex', gap: 4, padding: '0 28px', borderBottom: '1px solid var(--border, #e6dfd4)', background: 'var(--card, #fdfbf9)' },
    tabBtn: { background: 'none', border: 'none', borderBottom: '3px solid transparent', padding: '14px 22px', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: 'var(--muted, #888)', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', fontFamily: 'inherit', whiteSpace: 'nowrap' },
    tabBtnActive: { color: '#1fb6a6', borderBottomColor: '#1fb6a6', background: 'rgba(31, 182, 166, 0.05)' },
    tabIcon: { fontSize: 18 },
    tabContent: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },

    // Toasts
    successToast: { margin: '12px 28px', background: '#d4edda', color: '#155724', padding: '10px 16px', borderRadius: 10, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 },
    errorToast: { margin: '12px 28px', background: '#f8d7da', color: '#721c24', padding: '10px 16px', borderRadius: 10, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 },

    // Toolbar
    toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 28px', borderBottom: '1px solid var(--border, #e6dfd4)', flexWrap: 'wrap', gap: 10 },
    toolbarLeft: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
    toolbarRight: { display: 'flex', alignItems: 'center', gap: 12 },
    toolBtn: { background: 'var(--card, #fff)', border: '1px solid var(--border, #e6dfd4)', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--text, #333)', transition: 'all 0.2s', fontFamily: 'inherit' },
    toolBtnActive: { background: 'rgba(31, 182, 166, 0.1)', borderColor: '#1fb6a6', color: '#1fb6a6' },
    statsChip: { fontSize: 13, color: 'var(--muted, #888)', display: 'flex', gap: 8, alignItems: 'center' },
    statsDivider: { opacity: 0.3 },
    saveBtn: { background: 'linear-gradient(135deg, #1fb6a6, #168a7d)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 28px', cursor: 'pointer', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.3s ease', boxShadow: '0 6px 18px rgba(31, 182, 166, 0.3)', fontFamily: 'inherit' },

    // Search
    searchBar: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 28px', borderBottom: '1px solid var(--border, #e6dfd4)', background: 'var(--card, #fdfbf9)' },
    searchInputWrapper: { flex: 1, display: 'flex', alignItems: 'center', background: 'var(--bg, #f9f6f1)', border: '2px solid var(--border, #e6dfd4)', borderRadius: 12, padding: '0 14px' },
    searchIcon: { fontSize: 16, marginLeft: 8, opacity: 0.5 },
    searchInput: { flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '10px 8px', fontSize: 15, color: 'var(--text, #333)', fontFamily: 'inherit' },
    matchCount: { fontSize: 12, color: '#888', background: 'rgba(0,0,0,0.05)', padding: '3px 10px', borderRadius: 8, fontWeight: 600, whiteSpace: 'nowrap' },
    searchActions: { display: 'flex', gap: 4 },
    searchNavBtn: { width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border, #ddd)', background: 'var(--card, #fff)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text, #333)' },
    searchCloseBtn: { width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border, #ddd)', background: 'var(--card, #fff)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e74c3c', fontWeight: 700 },

    // Editor
    editorWrapper: { flex: 1, position: 'relative', display: 'flex', minHeight: 'calc(100vh - 340px)', maxHeight: 'calc(100vh - 340px)', overflow: 'hidden' },
    lineNumbers: { width: 50, flexShrink: 0, background: 'var(--card, #fdfbf9)', borderLeft: '1px solid var(--border, #e6dfd4)', padding: '18px 0', overflow: 'hidden', userSelect: 'none' },
    lineNumber: { height: 24, lineHeight: '24px', fontSize: 12, color: 'var(--muted, #bbb)', textAlign: 'center', fontFamily: "'Courier New', monospace" },
    highlightOverlay: { position: 'absolute', top: 0, right: 50, left: 0, bottom: 0, padding: '18px 24px', fontSize: 16, lineHeight: '24px', fontFamily: "'Tajawal', sans-serif", whiteSpace: 'pre-wrap', wordWrap: 'break-word', overflow: 'hidden', pointerEvents: 'none', color: 'transparent', direction: 'rtl' },
    textarea: { flex: 1, border: 'none', outline: 'none', resize: 'none', padding: '18px 24px', fontSize: 16, lineHeight: '24px', fontFamily: "'Tajawal', sans-serif", background: 'transparent', color: 'var(--text, #1d130d)', direction: 'rtl', caretColor: '#1fb6a6', width: '100%' },
    tipsBar: { display: 'flex', gap: 20, padding: '8px 28px', borderTop: '1px solid var(--border, #e6dfd4)', background: 'var(--card, #fdfbf9)', flexWrap: 'wrap' },
    tipItem: { fontSize: 12, color: 'var(--muted, #888)', display: 'flex', alignItems: 'center', gap: 4 },
    kbd: { background: 'var(--bg, #f0f0f0)', border: '1px solid var(--border, #ddd)', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontFamily: 'monospace', display: 'inline-block' },
    collapsedPreview: { padding: '24px 28px', background: 'var(--card, #fdfbf9)', borderBottom: '1px solid var(--border, #e6dfd4)', flex: 1 },
    collapsedText: { fontSize: 14, color: '#666', lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'hidden', background: 'rgba(0,0,0,0.02)', padding: 16, borderRadius: 12, border: '1px dashed #ddd' },

    // Conversations
    statsBar: { display: 'flex', gap: 12, padding: '16px 28px', overflowX: 'auto', flexShrink: 0 },
    statCard: { flex: '1 1 0', minWidth: 100, background: 'var(--card, #fff)', border: '1px solid var(--border, #e6dfd4)', borderRadius: 14, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' },
    statNumber: { fontSize: 24, fontWeight: 800, color: '#1fb6a6' },
    statLabel: { fontSize: 12, color: '#888', marginTop: 4 },

    convToolbar: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 28px', borderBottom: '1px solid var(--border, #e6dfd4)', flexWrap: 'wrap' },
    convSearchWrapper: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg, #f9f6f1)', border: '1px solid var(--border, #e6dfd4)', borderRadius: 12, padding: '0 14px', flex: 1, minWidth: 200 },
    convSearchInput: { flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '10px 8px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text, #333)' },
    filterChips: { display: 'flex', gap: 6 },
    filterChip: { background: 'var(--card, #fff)', border: '1px solid var(--border, #e6dfd4)', borderRadius: 20, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text, #555)', transition: 'all 0.2s', fontFamily: 'inherit', whiteSpace: 'nowrap' },
    filterChipActive: { background: '#1fb6a6', color: '#fff', borderColor: '#1fb6a6' },
    deleteAllBtn: { background: 'none', border: '1px solid #e74c3c', borderRadius: 10, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#e74c3c', transition: 'all 0.2s', fontFamily: 'inherit' },

    convContainer: { display: 'flex', flex: 1, overflow: 'hidden' },
    convList: { width: 360, minWidth: 300, borderLeft: '1px solid var(--border, #e6dfd4)', overflowY: 'auto', background: 'var(--card, #fdfbf9)' },
    convItem: { padding: '14px 20px', borderBottom: '1px solid var(--border, #f0ebe3)', cursor: 'pointer', transition: 'all 0.15s' },
    convItemActive: { background: 'rgba(31, 182, 166, 0.08)', borderRight: '3px solid #1fb6a6' },
    convItemHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
    sourceBadge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 8, fontSize: 14, color: '#fff', flexShrink: 0 },
    convName: { fontSize: 14, fontWeight: 700, color: 'var(--text, #333)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    convTime: { fontSize: 11, color: '#999', whiteSpace: 'nowrap' },
    convPreview: { fontSize: 13, color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 34, marginBottom: 4 },
    convMeta: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#aaa' },
    convDeleteBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, opacity: 0.4, transition: 'opacity 0.2s', padding: 4 },
    pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 16 },
    pageBtn: { background: 'var(--card, #fff)', border: '1px solid var(--border, #ddd)', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },

    convDetail: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    convDetailInner: { display: 'flex', flexDirection: 'column', height: '100%' },
    convDetailHeader: { padding: '16px 24px', borderBottom: '1px solid var(--border, #e6dfd4)', background: 'var(--card, #fdfbf9)', display: 'flex', flexDirection: 'column', gap: 4 },
    convMessages: { flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 },
    convMsg: { padding: '14px 18px', borderRadius: 12, lineHeight: 1.7, width: '100%' },
    convMsgUser: { background: '#e8f8f5', borderRight: '4px solid #1fb6a6' },
    convMsgBot: { background: '#f8f4ff', borderRight: '4px solid #8e44ad' },
    convMsgRole: { fontSize: 12, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 },
    convMsgTime: { fontSize: 10, color: '#bbb', fontWeight: 400, marginRight: 'auto' },
    convMsgText: { fontSize: 14, color: '#333', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },

    emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40 },

    // Settings
    settingsPage: { padding: '28px', maxWidth: 700, margin: '0 auto', width: '100%' },
    settingsMessage: { padding: '10px 16px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: '#e8f8f5', color: '#1fb6a6', marginBottom: 16, textAlign: 'center' },
    settingCard: { background: 'var(--card, #fff)', border: '1px solid var(--border, #e6dfd4)', borderRadius: 16, padding: '24px', marginBottom: 16 },
    settingHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
    settingTitle: { fontSize: 16, fontWeight: 800, color: 'var(--text, #333)', marginBottom: 6 },
    settingDesc: { fontSize: 13, color: '#888', lineHeight: 1.6 },
    statusBadge: { display: 'inline-block', padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, marginTop: 12 },

    toggleBtn: { width: 56, height: 30, borderRadius: 15, border: 'none', cursor: 'pointer', position: 'relative', transition: 'all 0.3s', flexShrink: 0 },
    toggleBtnOn: { background: '#1fb6a6' },
    toggleBtnOff: { background: '#ddd' },
    toggleDot: { width: 24, height: 24, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, transition: 'all 0.3s', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' },
    toggleDotOn: { right: 3 },
    toggleDotOff: { right: 29 },

    sliderWrapper: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 },
    sliderLabel: { fontSize: 13, color: '#888', fontWeight: 700, minWidth: 24, textAlign: 'center' },
    slider: { flex: 1, height: 6, appearance: 'none', background: '#e0e0e0', borderRadius: 3, outline: 'none', cursor: 'pointer', accentColor: '#1fb6a6' },
    sliderValueDisplay: { display: 'flex', alignItems: 'baseline', gap: 6, justifyContent: 'center', marginTop: 8 },
    sliderValue: { fontSize: 32, fontWeight: 800, color: '#1fb6a6' },
};

// ============================================================
//  TAB 2: ADMIN PROMPT EDITOR
// ============================================================
function AdminPromptTab() {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [allConvs, setAllConvs] = useState([]);
    const [showConvs, setShowConvs] = useState(false);
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/admin-ai/prompt`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                if (res.data.success) setPrompt(res.data.data);

                const convRes = await axios.get(`${API_BASE}/api/admin-ai/all-conversations`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                if (convRes.data.success) setAllConvs(convRes.data.data);

            } catch (err) {
                // Ignore conv loading error if supervisor
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        setError('');
        try {
            const res = await axios.post(`${API_BASE}/api/admin-ai/prompt`, { prompt }, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.data.success) {
                setMessage(res.data.message);
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            setError('حدث خطأ أثناء حفظ التعديلات');
            setTimeout(() => setError(''), 3000);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={styles.loadingWrapper}>
                <Spinner animation="border" size="sm" style={{ color: '#1fb6a6' }} />
                <span>جاري تحميل الإعدادات...</span>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
            <div style={{ ...styles.promptHeader, borderBottom: '3px solid #028090' }}>
                <h3 style={{ margin: 0, color: '#0f2736', fontWeight: 800 }}>🧠 تعليمات مساعد الإدارة</h3>
                <p style={{ margin: '8px 0 0', color: '#666', fontSize: 13 }}>هذا المساعد يقرأ من قاعدة البيانات مباشرة، هذه التعليمات تحدد شخصيته وطريقة صياغته لتقارير العمل.</p>
            </div>
            
            {message && <div style={styles.successToast}><span>✅</span> {message}</div>}
            {error && <div style={styles.errorToast}><span>❌</span> {error}</div>}

            <div style={styles.toolbar} className="prompt-toolbar">
                <div style={styles.toolbarLeft} className="prompt-toolbar-left" />
                <div style={styles.toolbarRight} className="prompt-toolbar-right">
                    <button type="button" style={{ ...styles.saveBtn, backgroundColor: '#028090', opacity: saving || !prompt.trim() ? 0.6 : 1 }}
                        onClick={handleSave} disabled={saving || !prompt.trim()} className="prompt-save-btn">
                        {saving ? (<><Spinner animation="border" size="sm" style={{ marginLeft: 8 }} /> جاري الحفظ...</>) : (<>💾 حفظ التعديلات</>)}
                    </button>
                </div>
            </div>

            <div style={{ position: 'relative', minHeight: 250, backgroundColor: '#1e1e1e', borderRadius: '0 0 16px 16px', overflow: 'hidden', marginBottom: 20 }}>
                <textarea
                    style={styles.promptTextarea}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="اكتب تعليمات مساعد الإدارة هنا..."
                    spellCheck="false"
                />
            </div>

            {/* Admin Conversations Observer */}
            {allConvs.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h4 style={{ margin: 0, fontWeight: 800, color: '#0f2736' }}>سجل محادثات المشرفين والمديرين 🕵️</h4>
                        <button style={{ ...styles.toolBtn, backgroundColor: '#f1f2f6', color: '#0f2736' }} onClick={() => setShowConvs(!showConvs)}>
                            {showConvs ? 'إخفاء السجل' : `عرض السجل (${allConvs.length})`}
                        </button>
                    </div>
                    {showConvs && (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table table-hover" style={{ textAlign: 'right', direction: 'rtl' }}>
                                <thead style={{ background: '#f8f9fa' }}>
                                    <tr>
                                        <th>العنوان</th>
                                        <th>المستخدم</th>
                                        <th>آخر تحديث</th>
                                        <th>عدد الرسائل</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allConvs.map(c => (
                                        <tr key={c._id}>
                                            <td style={{ fontWeight: 600 }}>{c.title}</td>
                                            <td>{c.userId?.username} <span style={{ fontSize: 11, color: '#888' }}>({c.userId?.role})</span></td>
                                            <td style={{ direction: 'ltr', textAlign: 'right' }}>{new Date(c.lastActivity).toLocaleString('ar-EG')}</td>
                                            <td>{c.messages?.length || 0} رسالة</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default AISettings;
