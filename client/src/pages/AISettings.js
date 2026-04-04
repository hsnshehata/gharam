import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Spinner } from 'react-bootstrap';
import axios from 'axios';
import { API_BASE } from '../utils/apiBase';

function AISettings() {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const textareaRef = useRef(null);
    const highlightRef = useRef(null);
    const searchInputRef = useRef(null);

    useEffect(() => {
        const fetchPrompt = async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/ai/prompt`, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                if (res.data.success) {
                    setPrompt(res.data.data);
                }
            } catch (err) {
                setError('حدث خطأ أثناء جلب إعدادات الذكاء الاصطناعي');
            } finally {
                setLoading(false);
            }
        };
        fetchPrompt();
    }, []);

    // Keyboard shortcut: Ctrl+F to open search
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

    // Search matches
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

    // Scroll textarea to current match
    const scrollToMatch = useCallback((matchIdx) => {
        if (!textareaRef.current || searchMatches.length === 0) return;
        const textarea = textareaRef.current;
        const pos = searchMatches[matchIdx];
        if (pos === undefined) return;

        // Only scroll the textarea to show the match — do NOT steal focus
        const textBefore = prompt.substring(0, pos);
        const linesBefore = textBefore.split('\n').length;
        const lineHeight = 24;
        const scrollTarget = (linesBefore - 3) * lineHeight;
        textarea.scrollTop = Math.max(0, scrollTarget);

        // Sync highlight overlay scroll
        if (highlightRef.current) {
            highlightRef.current.scrollTop = textarea.scrollTop;
        }
    }, [searchMatches, searchQuery, prompt]);

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
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) goToPrevMatch();
            else goToNextMatch();
        }
    };

    // Sync scroll between textarea and highlight overlay
    const handleScroll = () => {
        if (highlightRef.current && textareaRef.current) {
            highlightRef.current.scrollTop = textareaRef.current.scrollTop;
            highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    // Build highlighted HTML
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
            const before = escaped.substring(lastIdx, idx);
            const match = escaped.substring(idx, idx + searchQuery.length);
            const isCurrent = matchCount === currentMatchIndex;
            result += before;
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
        setMessage('');
        setError('');
        setSaving(true);
        try {
            const res = await axios.post(
                `${API_BASE}/api/ai/prompt`,
                { prompt },
                { headers: { 'x-auth-token': localStorage.getItem('token') } }
            );
            if (res.data.success) {
                setMessage(res.data.message || 'تم الحفظ بنجاح');
                setTimeout(() => setMessage(''), 4000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'حدث خطأ أثناء الحفظ');
            setTimeout(() => setError(''), 5000);
        } finally {
            setSaving(false);
        }
    };

    const lineCount = prompt.split('\n').length;
    const charCount = prompt.length;

    if (loading) {
        return (
            <div style={styles.loadingWrapper}>
                <Spinner animation="border" style={{ color: '#1fb6a6' }} />
                <div style={{ marginTop: 16, color: '#888', fontSize: 14 }}>جاري تحميل الإعدادات...</div>
            </div>
        );
    }

    return (
        <div style={styles.page} dir="rtl">
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerContent}>
                    <div style={styles.headerIcon}>🤖</div>
                    <div>
                        <h1 style={styles.title}>إعدادات الذكاء الاصطناعي</h1>
                        <p style={styles.subtitle}>تخصيص تعليمات البوت (System Prompt) · اكتبي التعليمات والمعلومات التي سيستخدمها البوت للرد على العملاء</p>
                    </div>
                </div>

                {/* Status Messages */}
                {message && (
                    <div style={styles.successToast}>
                        <span>✅</span> {message}
                    </div>
                )}
                {error && (
                    <div style={styles.errorToast}>
                        <span>❌</span> {error}
                    </div>
                )}
            </div>

            {/* Toolbar */}
            <div style={styles.toolbar}>
                <div style={styles.toolbarLeft}>
                    <button
                        type="button"
                        style={{ ...styles.toolBtn, ...(isSearchOpen ? styles.toolBtnActive : {}) }}
                        onClick={() => {
                            setIsSearchOpen(!isSearchOpen);
                            if (!isSearchOpen) setTimeout(() => searchInputRef.current?.focus(), 100);
                            else setSearchQuery('');
                        }}
                        title="بحث (Ctrl+F)"
                    >
                        🔍 بحث
                    </button>
                    <div style={styles.statsChip}>
                        <span>📝 {lineCount} سطر</span>
                        <span style={styles.statsDivider}>|</span>
                        <span>🔤 {charCount.toLocaleString()} حرف</span>
                    </div>
                </div>
                <div style={styles.toolbarRight}>
                    <button
                        type="button"
                        style={{ ...styles.saveBtn, opacity: saving || !prompt.trim() ? 0.6 : 1 }}
                        onClick={handleSave}
                        disabled={saving || !prompt.trim()}
                    >
                        {saving ? (
                            <><Spinner animation="border" size="sm" style={{ marginLeft: 8 }} /> جاري الحفظ...</>
                        ) : (
                            <>💾 حفظ التعديلات</>
                        )}
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            {isSearchOpen && (
                <div style={styles.searchBar}>
                    <div style={styles.searchInputWrapper}>
                        <span style={styles.searchIcon}>🔍</span>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            placeholder="ابحث في التعليمات..."
                            style={styles.searchInput}
                            autoFocus
                        />
                        {searchQuery && (
                            <span style={styles.matchCount}>
                                {searchMatches.length > 0 ? `${currentMatchIndex + 1}/${searchMatches.length}` : 'لا نتائج'}
                            </span>
                        )}
                    </div>
                    <div style={styles.searchActions}>
                        <button
                            type="button"
                            onClick={goToPrevMatch}
                            disabled={searchMatches.length === 0}
                            style={styles.searchNavBtn}
                            title="النتيجة السابقة (Shift+Enter)"
                        >▲</button>
                        <button
                            type="button"
                            onClick={goToNextMatch}
                            disabled={searchMatches.length === 0}
                            style={styles.searchNavBtn}
                            title="النتيجة التالية (Enter)"
                        >▼</button>
                        <button
                            type="button"
                            onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                            style={styles.searchCloseBtn}
                            title="إغلاق (Esc)"
                        >✕</button>
                    </div>
                </div>
            )}

            {/* Editor Area */}
            <div style={styles.editorWrapper}>
                {/* Line Numbers */}
                <div style={styles.lineNumbers}>
                    {Array.from({ length: lineCount }, (_, i) => (
                        <div key={i} style={styles.lineNumber}>{i + 1}</div>
                    ))}
                </div>

                {/* Highlight Overlay */}
                {searchQuery && searchMatches.length > 0 && (
                    <div
                        ref={highlightRef}
                        style={styles.highlightOverlay}
                        dangerouslySetInnerHTML={{ __html: highlightedHTML }}
                    />
                )}

                {/* Textarea */}
                <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onScroll={handleScroll}
                    placeholder="اكتبي التعليمات هنا...&#10;&#10;مثال:&#10;أنت مساعد ذكي لصالون تجميل غرام سلطان.&#10;عليك الإجابة عن استفسارات العملاء بأدب..."
                    style={styles.textarea}
                    spellCheck={false}
                />
            </div>

            {/* Tips */}
            <div style={styles.tipsBar}>
                <span style={styles.tipItem}>💡 اضغط <kbd style={styles.kbd}>Ctrl+F</kbd> للبحث</span>
                <span style={styles.tipItem}>⏎ <kbd style={styles.kbd}>Enter</kbd> النتيجة التالية</span>
                <span style={styles.tipItem}>⇧ <kbd style={styles.kbd}>Shift+Enter</kbd> السابقة</span>
            </div>

            <style>{`
                .search-match {
                    background: rgba(255, 213, 79, 0.35);
                    color: inherit;
                    border-radius: 2px;
                    padding: 1px 0;
                }
                .search-current {
                    background: rgba(255, 152, 0, 0.7);
                    color: #fff;
                    border-radius: 2px;
                    padding: 1px 0;
                    box-shadow: 0 0 0 2px rgba(255, 152, 0, 0.4);
                }
            `}</style>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Tajawal', sans-serif",
    },
    loadingWrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
    },
    header: {
        padding: '20px 28px 16px',
        borderBottom: '1px solid var(--border, #e6dfd4)',
        position: 'relative',
    },
    headerContent: {
        display: 'flex',
        alignItems: 'center',
        gap: 16,
    },
    headerIcon: {
        fontSize: 36,
        width: 56,
        height: 56,
        borderRadius: 16,
        background: 'linear-gradient(135deg, #1fb6a6, #168a7d)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 8px 20px rgba(31, 182, 166, 0.25)',
    },
    title: {
        margin: 0,
        fontSize: 22,
        fontWeight: 800,
        color: 'var(--text, #1d130d)',
    },
    subtitle: {
        margin: '4px 0 0',
        fontSize: 13,
        color: 'var(--muted, #5e5146)',
        lineHeight: 1.5,
    },
    successToast: {
        position: 'absolute',
        top: 12,
        left: 20,
        background: '#d4edda',
        color: '#155724',
        padding: '8px 16px',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        boxShadow: '0 6px 18px rgba(0,0,0,0.1)',
        animation: 'fadeIn 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },
    errorToast: {
        position: 'absolute',
        top: 12,
        left: 20,
        background: '#f8d7da',
        color: '#721c24',
        padding: '8px 16px',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        boxShadow: '0 6px 18px rgba(0,0,0,0.1)',
        animation: 'fadeIn 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },
    toolbar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 28px',
        borderBottom: '1px solid var(--border, #e6dfd4)',
        flexWrap: 'wrap',
        gap: 10,
    },
    toolbarLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
    },
    toolbarRight: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
    },
    toolBtn: {
        background: 'var(--card, #fff)',
        border: '1px solid var(--border, #e6dfd4)',
        borderRadius: 10,
        padding: '8px 16px',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--text, #333)',
        transition: 'all 0.2s',
        fontFamily: 'inherit',
    },
    toolBtnActive: {
        background: 'rgba(31, 182, 166, 0.1)',
        borderColor: '#1fb6a6',
        color: '#1fb6a6',
    },
    statsChip: {
        fontSize: 13,
        color: 'var(--muted, #888)',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
    },
    statsDivider: {
        opacity: 0.3,
    },
    saveBtn: {
        background: 'linear-gradient(135deg, #1fb6a6, #168a7d)',
        color: '#fff',
        border: 'none',
        borderRadius: 12,
        padding: '10px 28px',
        cursor: 'pointer',
        fontSize: 15,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        transition: 'all 0.3s ease',
        boxShadow: '0 6px 18px rgba(31, 182, 166, 0.3)',
        fontFamily: 'inherit',
    },
    searchBar: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 28px',
        borderBottom: '1px solid var(--border, #e6dfd4)',
        background: 'var(--card, #fdfbf9)',
        animation: 'slideDown 0.2s ease',
    },
    searchInputWrapper: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg, #f9f6f1)',
        border: '2px solid var(--border, #e6dfd4)',
        borderRadius: 12,
        padding: '0 14px',
        transition: 'border-color 0.2s',
    },
    searchIcon: {
        fontSize: 16,
        marginLeft: 8,
        opacity: 0.5,
    },
    searchInput: {
        flex: 1,
        border: 'none',
        outline: 'none',
        background: 'transparent',
        padding: '10px 8px',
        fontSize: 15,
        color: 'var(--text, #333)',
        fontFamily: 'inherit',
    },
    matchCount: {
        fontSize: 12,
        color: '#888',
        background: 'rgba(0,0,0,0.05)',
        padding: '3px 10px',
        borderRadius: 8,
        fontWeight: 600,
        whiteSpace: 'nowrap',
    },
    searchActions: {
        display: 'flex',
        gap: 4,
    },
    searchNavBtn: {
        width: 34,
        height: 34,
        borderRadius: 8,
        border: '1px solid var(--border, #ddd)',
        background: 'var(--card, #fff)',
        cursor: 'pointer',
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text, #333)',
        transition: 'all 0.15s',
    },
    searchCloseBtn: {
        width: 34,
        height: 34,
        borderRadius: 8,
        border: '1px solid var(--border, #ddd)',
        background: 'var(--card, #fff)',
        cursor: 'pointer',
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#e74c3c',
        transition: 'all 0.15s',
        fontWeight: 700,
    },
    editorWrapper: {
        flex: 1,
        position: 'relative',
        display: 'flex',
        minHeight: 'calc(100vh - 260px)',
        overflow: 'hidden',
    },
    lineNumbers: {
        width: 50,
        flexShrink: 0,
        background: 'var(--card, #fdfbf9)',
        borderLeft: '1px solid var(--border, #e6dfd4)',
        padding: '18px 0',
        overflow: 'hidden',
        userSelect: 'none',
    },
    lineNumber: {
        height: 24,
        lineHeight: '24px',
        fontSize: 12,
        color: 'var(--muted, #bbb)',
        textAlign: 'center',
        fontFamily: "'Courier New', monospace",
    },
    highlightOverlay: {
        position: 'absolute',
        top: 0,
        right: 50,
        left: 0,
        bottom: 0,
        padding: '18px 24px',
        fontSize: 16,
        lineHeight: '24px',
        fontFamily: "'Tajawal', sans-serif",
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        overflow: 'hidden',
        pointerEvents: 'none',
        color: 'transparent',
        direction: 'rtl',
    },
    textarea: {
        flex: 1,
        border: 'none',
        outline: 'none',
        resize: 'none',
        padding: '18px 24px',
        fontSize: 16,
        lineHeight: '24px',
        fontFamily: "'Tajawal', sans-serif",
        background: 'transparent',
        color: 'var(--text, #1d130d)',
        direction: 'rtl',
        caretColor: '#1fb6a6',
        width: '100%',
    },
    tipsBar: {
        display: 'flex',
        gap: 20,
        padding: '8px 28px',
        borderTop: '1px solid var(--border, #e6dfd4)',
        background: 'var(--card, #fdfbf9)',
        flexWrap: 'wrap',
    },
    tipItem: {
        fontSize: 12,
        color: 'var(--muted, #888)',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
    },
    kbd: {
        background: 'var(--bg, #f0f0f0)',
        border: '1px solid var(--border, #ddd)',
        borderRadius: 4,
        padding: '1px 6px',
        fontSize: 11,
        fontFamily: 'monospace',
        display: 'inline-block',
    },
};

export default AISettings;
