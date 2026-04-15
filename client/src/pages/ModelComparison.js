import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Spinner } from 'react-bootstrap';
import axios from 'axios';
import { API_BASE } from '../utils/apiBase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const PROVIDER_META = {
    google: { icon: '🔷', color: '#4285f4', label: 'Google Gemini' },
    openai: { icon: '🟢', color: '#10a37f', label: 'OpenAI' },
    openrouter: { icon: '🌌', color: '#8a2be2', label: 'OpenRouter' }
};

const TIER_BADGES = {
    fast: { label: 'سريع', bg: '#e3f2fd', color: '#1565c0' },
    lite: { label: 'خفيف', bg: '#f3e5f5', color: '#7b1fa2' },
    pro: { label: 'متقدم', bg: '#fff3e0', color: '#e65100' }
};

const PROMPT_TYPES = [
    { id: 'public', label: 'قواعد غزل (الجمهور)', icon: '💬' },
    { id: 'admin', label: 'قواعد مساعد الإدارة', icon: '🧠' }
];

const PRESET_QUESTIONS = [
    { label: 'سعر باكدج', text: 'عايزة أعرف أسعار الباكدجات عندكم' },
    { label: 'حجز يوم', text: 'عايزة أحجز يوم 25 الشهر الجاي' },
    { label: 'خدمات', text: 'إيه الخدمات المتاحة عندكم؟' },
    { label: 'عنوان', text: 'فين عنوان السنتر؟' },
    { label: 'مساج', text: 'كام سعر المساج عندكم وإيه التفاصيل؟' },
    { label: 'تقرير مالي', text: 'عايز ملخص مالي لشغل انهاردة' },
];

function ModelComparison() {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedModels, setSelectedModels] = useState([]);
    const [promptType, setPromptType] = useState('public');
    const [userMessage, setUserMessage] = useState('');
    const [results, setResults] = useState({});
    const [comparing, setComparing] = useState(false);
    const [history, setHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('compare');
    const [savingConfig, setSavingConfig] = useState(false);
    const [configMessage, setConfigMessage] = useState('');
    const [dragItem, setDragItem] = useState(null);
    const [chainOrder, setChainOrder] = useState([]);
    const [disabledModels, setDisabledModels] = useState([]);
    const [adminFastChain, setAdminFastChain] = useState([]);
    const [adminProChain, setAdminProChain] = useState([]);
    const inputRef = useRef(null);
    const resultsRef = useRef(null);

    const authHeaders = { headers: { 'x-auth-token': localStorage.getItem('token') } };

    const fetchConfig = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/admin-ai/model-config`, authHeaders);
            if (res.data.success) {
                setConfig(res.data.data);
                setChainOrder(res.data.data.currentChain);
                setDisabledModels(res.data.data.disabledModels);
                setAdminFastChain(res.data.data.adminFastChain || []);
                setAdminProChain(res.data.data.adminProChain || []);
            }
        } catch (err) {
            console.error('Error fetching model config:', err);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { fetchConfig(); }, [fetchConfig]);

    const toggleModel = (modelId) => {
        setSelectedModels(prev =>
            prev.includes(modelId) ? prev.filter(m => m !== modelId) : [...prev, modelId]
        );
    };

    const selectAll = () => {
        if (!config) return;
        if (selectedModels.length === config.allModels.length) {
            setSelectedModels([]);
        } else {
            setSelectedModels(config.allModels.map(m => m.id));
        }
    };

    const runComparison = async () => {
        if (!userMessage.trim() || selectedModels.length === 0) return;
        setComparing(true);
        setResults({});

        // Set up initial loading states for all selected models
        const initialStates = {};
        selectedModels.forEach(m => { initialStates[m] = { loading: true }; });
        setResults(initialStates);

        // Fire all requests simultaneously
        const promises = selectedModels.map(async (modelId) => {
            try {
                const res = await axios.post(`${API_BASE}/api/admin-ai/test-model`, {
                    modelId,
                    message: userMessage,
                    promptType
                }, authHeaders);

                setResults(prev => ({
                    ...prev,
                    [modelId]: { ...res.data.data, loading: false }
                }));
            } catch (err) {
                setResults(prev => ({
                    ...prev,
                    [modelId]: { error: err.message, loading: false, latency: 0, model: modelId }
                }));
            }
        });

        await Promise.allSettled(promises);

        // Save to history
        setHistory(prev => [{
            id: Date.now(),
            message: userMessage,
            promptType,
            models: selectedModels,
            timestamp: new Date().toISOString()
        }, ...prev].slice(0, 20));

        setComparing(false);
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            runComparison();
        }
    };

    // ===== Generic chain helpers =====
    const moveItem = (setter) => (idx, dir) => {
        setter(prev => {
            const arr = [...prev];
            const target = idx + dir;
            if (target < 0 || target >= arr.length) return arr;
            [arr[idx], arr[target]] = [arr[target], arr[idx]];
            return arr;
        });
    };
    const addItem = (setter) => (modelId) => setter(prev => prev.includes(modelId) ? prev : [...prev, modelId]);
    const removeItem = (setter) => (modelId) => setter(prev => prev.filter(m => m !== modelId));

    const moveChainItem = moveItem(setChainOrder);
    const addToChain = addItem(setChainOrder);
    const removeFromChain = removeItem(setChainOrder);

    const toggleDisabled = (modelId) => {
        setDisabledModels(prev =>
            prev.includes(modelId) ? prev.filter(m => m !== modelId) : [...prev, modelId]
        );
    };

    const moveAdminFastItem = moveItem(setAdminFastChain);
    const addToAdminFast = addItem(setAdminFastChain);
    const removeFromAdminFast = removeItem(setAdminFastChain);

    const moveAdminProItem = moveItem(setAdminProChain);
    const addToAdminPro = addItem(setAdminProChain);
    const removeFromAdminPro = removeItem(setAdminProChain);

    const saveConfig = async () => {
        setSavingConfig(true);
        try {
            await axios.post(`${API_BASE}/api/admin-ai/model-config`, {
                chain: chainOrder,
                disabledModels,
                adminFastChain,
                adminProChain
            }, authHeaders);
            setConfigMessage('✅ تم حفظ الإعدادات بنجاح');
            setTimeout(() => setConfigMessage(''), 4000);
        } catch (err) {
            setConfigMessage('❌ خطأ في حفظ الإعدادات');
            setTimeout(() => setConfigMessage(''), 4000);
        } finally {
            setSavingConfig(false);
        }
    };

    const getModelMeta = (modelId) => {
        if (!config) return null;
        return config.allModels.find(m => m.id === modelId);
    };

    if (loading) {
        return (
            <div style={S.loadingFull}>
                <Spinner animation="border" style={{ color: '#028090' }} />
                <div style={{ marginTop: 16, color: '#666' }}>جارٍ تحميل إعدادات النماذج...</div>
            </div>
        );
    }

    return (
        <div style={S.page} dir="rtl" className="model-comparison-page">
            <style>{`
                @media (max-width: 768px) {
                    .model-comparison-page .results-grid { grid-template-columns: 1fr !important; }
                    .model-comparison-page .header-row { flex-direction: column; gap: 10px !important; }
                    .model-comparison-page .model-chips { flex-wrap: wrap; }
                    .model-comparison-page .chain-item { padding: 10px 12px !important; }
                }
                .model-comparison-page .chain-item:hover { background: rgba(2,128,144,0.06) !important; }
                .model-comparison-page .result-card { transition: all 0.3s ease; }
                .model-comparison-page .result-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,0.1) !important; }
                .model-comparison-page .model-chip:hover { transform: scale(1.03); }
                .model-comparison-page .preset-btn:hover { background: #028090 !important; color: #fff !important; border-color: #028090 !important; }
            `}</style>

            {/* Header */}
            <div style={S.header}>
                <div style={S.headerRow} className="header-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={S.headerIcon}>⚖️</div>
                        <div>
                            <h1 style={S.title}>مقارنة النماذج الذكية</h1>
                            <p style={S.subtitle}>اختبر وقارن ورتّب نماذج الذكاء الاصطناعي</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {config?.hasGeminiBackup && <span style={S.keyBadge}>🔑 مفتاح Gemini احتياطي</span>}
                        {config?.hasOpenAI && <span style={{ ...S.keyBadge, background: '#e8f5e9', color: '#2e7d32' }}>🟢 OpenAI متصل</span>}
                        {config?.hasOpenRouter && <span style={{ ...S.keyBadge, background: '#f3e5f5', color: '#8a2be2' }}>🌌 OpenRouter متصل</span>}
                    </div>
                </div>
            </div>

            {/* Tab Bar */}
            <div style={S.tabBar}>
                {[
                    { id: 'compare', label: 'مقارنة الردود', icon: '⚡' },
                    { id: 'config', label: 'ترتيب النماذج', icon: '🔧' }
                ].map(tab => (
                    <button key={tab.id} style={{ ...S.tab, ...(activeTab === tab.id ? S.tabActive : {}) }}
                        onClick={() => setActiveTab(tab.id)}>
                        <span>{tab.icon}</span> <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            <div style={S.content}>
                {activeTab === 'compare' && (
                    <CompareTab
                        config={config}
                        selectedModels={selectedModels}
                        setSelectedModels={setSelectedModels}
                        toggleModel={toggleModel}
                        selectAll={selectAll}
                        promptType={promptType}
                        setPromptType={setPromptType}
                        userMessage={userMessage}
                        setUserMessage={setUserMessage}
                        results={results}
                        comparing={comparing}
                        runComparison={runComparison}
                        handleKeyDown={handleKeyDown}
                        history={history}
                        inputRef={inputRef}
                        resultsRef={resultsRef}
                        getModelMeta={getModelMeta}
                    />
                )}

                {activeTab === 'config' && (
                    <ConfigTab
                        config={config}
                        chainOrder={chainOrder}
                        disabledModels={disabledModels}
                        toggleDisabled={toggleDisabled}
                        moveChainItem={moveChainItem}
                        addToChain={addToChain}
                        removeFromChain={removeFromChain}
                        adminFastChain={adminFastChain}
                        moveAdminFastItem={moveAdminFastItem}
                        addToAdminFast={addToAdminFast}
                        removeFromAdminFast={removeFromAdminFast}
                        adminProChain={adminProChain}
                        moveAdminProItem={moveAdminProItem}
                        addToAdminPro={addToAdminPro}
                        removeFromAdminPro={removeFromAdminPro}
                        saveConfig={saveConfig}
                        savingConfig={savingConfig}
                        configMessage={configMessage}
                        getModelMeta={getModelMeta}
                    />
                )}
            </div>
        </div>
    );
}

// ============================================================
//  Compare Tab
// ============================================================
function CompareTab({
    config, selectedModels, setSelectedModels, toggleModel, selectAll, promptType, setPromptType,
    userMessage, setUserMessage, results, comparing, runComparison, handleKeyDown,
    history, inputRef, resultsRef, getModelMeta
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Step 1: Select Models */}
            <div style={S.card}>
                <div style={S.cardHeader}>
                    <span style={S.stepBadge}>1</span>
                    <span style={S.cardTitle}>اختر النماذج للمقارنة</span>
                    <button style={S.selectAllBtn} onClick={selectAll}>
                        {selectedModels.length === config?.allModels?.length ? '❌ إلغاء الكل' : '✅ تحديد الكل'}
                    </button>
                </div>
                <div style={S.modelGrid} className="model-chips">
                    {config?.allModels?.map(model => {
                        const isSelected = selectedModels.includes(model.id);
                        const providerMeta = PROVIDER_META[model.provider];
                        const tierBadge = TIER_BADGES[model.tier];
                        return (
                            <button key={model.id} className="model-chip"
                                style={{ ...S.modelChip, ...(isSelected ? { ...S.modelChipActive, borderColor: providerMeta.color, background: `${providerMeta.color}10` } : {}) }}
                                onClick={() => toggleModel(model.id)}>
                                <div style={S.modelChipTop}>
                                    <span style={{ fontSize: 18 }}>{providerMeta.icon}</span>
                                    <span style={{ ...S.tierBadge, background: tierBadge.bg, color: tierBadge.color }}>{tierBadge.label}</span>
                                </div>
                                <div style={S.modelChipName}>{model.label}</div>
                                <div style={S.modelChipId}>{model.id}</div>
                                {isSelected && <div style={{ ...S.checkMark, color: providerMeta.color }}>✓</div>}
                            </button>
                        );
                    })}
                </div>
                {selectedModels.length > 0 && (
                    <div style={S.selectedCount}>
                        تم اختيار <strong>{selectedModels.length}</strong> {selectedModels.length === 1 ? 'نموذج' : 'نماذج'}
                    </div>
                )}
            </div>

            {/* Step 2: Prompt Type + Message */}
            <div style={S.card}>
                <div style={S.cardHeader}>
                    <span style={S.stepBadge}>2</span>
                    <span style={S.cardTitle}>اكتب السؤال</span>
                </div>

                {/* Prompt Type Selection */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    {PROMPT_TYPES.map(pt => (
                        <button key={pt.id} style={{ ...S.promptTypeBtn, ...(promptType === pt.id ? S.promptTypeBtnActive : {}) }}
                            onClick={() => setPromptType(pt.id)}>
                            <span>{pt.icon}</span> {pt.label}
                        </button>
                    ))}
                </div>

                {/* Preset Questions */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                    {PRESET_QUESTIONS.filter(q => {
                        if (promptType === 'admin') return ['تقرير مالي'].includes(q.label);
                        return !['تقرير مالي'].includes(q.label);
                    }).map((q, i) => (
                        <button key={i} className="preset-btn"
                            style={S.presetBtn} onClick={() => setUserMessage(q.text)}>
                            {q.label}
                        </button>
                    ))}
                </div>

                {/* Text Input */}
                <div style={S.inputWrapper}>
                    <textarea ref={inputRef} value={userMessage} onChange={e => setUserMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="اكتب رسالتك هنا للمقارنة بين النماذج..."
                        style={S.textarea} rows={3} />
                    <button style={{ ...S.sendBtn, opacity: comparing || !userMessage.trim() || selectedModels.length === 0 ? 0.5 : 1 }}
                        onClick={runComparison}
                        disabled={comparing || !userMessage.trim() || selectedModels.length === 0}>
                        {comparing ? <Spinner animation="border" size="sm" style={{ color: '#fff' }} /> : '🚀'}
                        <span>{comparing ? 'جارٍ المقارنة...' : 'ابدأ المقارنة'}</span>
                    </button>
                </div>
            </div>

            {/* Step 3: Results */}
            {Object.keys(results).length > 0 && (
                <div ref={resultsRef} style={S.card}>
                    <div style={S.cardHeader}>
                        <span style={S.stepBadge}>3</span>
                        <span style={S.cardTitle}>نتائج المقارنة</span>
                        <span style={S.resultSubtext}>
                            📝 السؤال: "{userMessage.slice(0, 60)}{userMessage.length > 60 ? '...' : ''}"
                        </span>
                    </div>
                    <div style={{
                        ...S.resultsGrid,
                        gridTemplateColumns: Object.keys(results).length === 1 ? '1fr'
                            : Object.keys(results).length === 2 ? '1fr 1fr' : 'repeat(auto-fit, minmax(360px, 1fr))'
                    }} className="results-grid">
                        {Object.entries(results).map(([modelId, data]) => {
                            const meta = getModelMeta(modelId);
                            const providerMeta = meta ? PROVIDER_META[meta.provider] : PROVIDER_META.google;
                            return (
                                <div key={modelId} style={S.resultCard} className="result-card">
                                    {/* Result Header */}
                                    <div style={{ ...S.resultHeader, borderBottomColor: providerMeta.color + '30' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 20 }}>{providerMeta.icon}</span>
                                            <div>
                                                <div style={S.resultModelName}>{meta?.label || modelId}</div>
                                                <div style={S.resultModelId}>{modelId}</div>
                                            </div>
                                        </div>
                                        {!data.loading && (
                                            <div style={S.metricsRow}>
                                                {data.error ? (
                                                    <span style={S.errorBadge}>❌ فشل</span>
                                                ) : (
                                                    <>
                                                        <span style={S.latencyBadge}>⏱ {(data.latency / 1000).toFixed(1)}ث</span>
                                                        {data.tokens && (
                                                            <span style={S.tokenBadge}>🔤 {data.tokens.total_tokens}</span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Result Body */}
                                    <div style={S.resultBody}>
                                        {data.loading ? (
                                            <div style={S.resultLoading}>
                                                <Spinner animation="border" size="sm" style={{ color: providerMeta.color }} />
                                                <span style={{ color: '#888', fontSize: 13 }}>جارٍ التفكير...</span>
                                            </div>
                                        ) : data.error ? (
                                            <div style={S.resultError}>
                                                <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
                                                <div style={{ fontWeight: 600, marginBottom: 4 }}>فشل النموذج</div>
                                                <div style={{ fontSize: 12, color: '#999', wordBreak: 'break-all' }}>{data.error}</div>
                                            </div>
                                        ) : (
                                            <div style={S.resultText}>
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {data.reply}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </div>

                                    {/* Tools Called */}
                                    {!data.loading && !data.error && data.toolsCalled?.length > 0 && (
                                        <div style={S.toolsCalledSection}>
                                            <div style={S.toolsCalledTitle}>🔧 الأدوات المستخدمة ({data.toolsCalled.length})</div>
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                {data.toolsCalled.map((tc, i) => (
                                                    <span key={i} style={S.toolCalledBadge} title={`Args: ${tc.args?.join(', ') || 'none'}`}>
                                                        ⚙️ {tc.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Attribution Footer */}
                                    {!data.loading && !data.error && (
                                        <div style={{ ...S.resultFooter, borderTopColor: providerMeta.color + '20' }}>
                                            <span style={{ ...S.attributionBadge, background: providerMeta.color + '15', color: providerMeta.color }}>
                                                {providerMeta.icon} الرد من: {meta?.label || modelId}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Speed Comparison Bar */}
                    {!comparing && Object.values(results).some(r => !r.loading && !r.error) && (
                        <SpeedComparisonBar results={results} getModelMeta={getModelMeta} />
                    )}
                </div>
            )}

            {/* History */}
            {history.length > 0 && (
                <div style={S.card}>
                    <div style={S.cardHeader}>
                        <span style={{ fontSize: 16 }}>📋</span>
                        <span style={S.cardTitle}>سجل المقارنات ({history.length})</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {history.map(h => (
                            <div key={h.id} style={S.historyItem}
                                onClick={() => { setUserMessage(h.message); setPromptType(h.promptType); setSelectedModels(h.models); }}>
                                <span style={S.historyText}>"{h.message.slice(0, 50)}..."</span>
                                <span style={S.historyMeta}>
                                    {h.models.length} نماذج · {new Date(h.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================
//  Speed Comparison Bar
// ============================================================
function SpeedComparisonBar({ results, getModelMeta }) {
    const items = Object.entries(results)
        .filter(([, d]) => !d.loading && !d.error && d.latency)
        .sort((a, b) => a[1].latency - b[1].latency);

    if (items.length < 2) return null;
    const maxLatency = Math.max(...items.map(([, d]) => d.latency));

    return (
        <div style={S.speedSection}>
            <div style={S.speedTitle}>📊 مقارنة السرعة</div>
            {items.map(([modelId, data], idx) => {
                const meta = getModelMeta(modelId);
                const prov = meta ? PROVIDER_META[meta.provider] : PROVIDER_META.google;
                const pct = (data.latency / maxLatency) * 100;
                return (
                    <div key={modelId} style={S.speedRow}>
                        <div style={S.speedLabel}>
                            {idx === 0 && <span style={{ color: '#f9a825' }}>🏆</span>}
                            {prov.icon} {meta?.label || modelId}
                        </div>
                        <div style={S.speedBarOuter}>
                            <div style={{ ...S.speedBarInner, width: `${pct}%`, background: idx === 0 ? '#4caf50' : prov.color }} />
                        </div>
                        <div style={S.speedValue}>{(data.latency / 1000).toFixed(1)}ث</div>
                    </div>
                );
            })}
        </div>
    );
}

// ============================================================
//  Reusable Chain Section Component
// ============================================================
function ChainSection({ title, icon, description, chain, moveItem, addItem, removeItem, config, getModelMeta, borderColor, disabledModels, toggleDisabled }) {
    const modelsNotInChain = config?.allModels?.filter(m => !chain.includes(m.id)) || [];

    return (
        <div style={S.card}>
            <div style={S.cardHeader}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span style={S.cardTitle}>{title}</span>
                {borderColor && <div style={{ width: 30, height: 4, borderRadius: 2, background: borderColor, marginRight: 8 }} />}
            </div>
            <p style={S.configDesc}>{description}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {chain.map((modelId, idx) => {
                    const meta = getModelMeta(modelId);
                    if (!meta) return null;
                    const prov = PROVIDER_META[meta.provider];
                    const tier = TIER_BADGES[meta.tier];
                    const isDisabled = disabledModels?.includes(modelId);
                    return (
                        <div key={modelId} className="chain-item"
                            style={{ ...S.chainItem, opacity: isDisabled ? 0.5 : 1, borderRightColor: prov.color }}>
                            <div style={S.chainPriority}>{idx + 1}</div>
                            <span style={{ fontSize: 18 }}>{prov.icon}</span>
                            <div style={{ flex: 1 }}>
                                <div style={S.chainModelName}>{meta.label}</div>
                                <div style={S.chainModelId}>{modelId}</div>
                            </div>
                            <span style={{ ...S.tierBadge, background: tier.bg, color: tier.color, fontSize: 11 }}>{tier.label}</span>
                            {toggleDisabled && (
                                <button style={{ ...S.chainToggle, background: isDisabled ? '#ffebee' : '#e8f5e9', color: isDisabled ? '#c62828' : '#2e7d32' }}
                                    onClick={() => toggleDisabled(modelId)} title={isDisabled ? 'تفعيل' : 'إيقاف مؤقت'}>
                                    {isDisabled ? '⏸️' : '✅'}
                                </button>
                            )}
                            <div style={S.chainArrows}>
                                <button style={S.arrowBtn} onClick={() => moveItem(idx, -1)} disabled={idx === 0}>▲</button>
                                <button style={S.arrowBtn} onClick={() => moveItem(idx, 1)} disabled={idx === chain.length - 1}>▼</button>
                            </div>
                            <button style={S.chainRemove} onClick={() => removeItem(modelId)} title="إزالة">✕</button>
                        </div>
                    );
                })}
            </div>

            {chain.length === 0 && (
                <div style={S.emptyChain}>
                    <span style={{ fontSize: 32 }}>📭</span>
                    <span>لا توجد نماذج — أضف من القائمة أدناه</span>
                </div>
            )}

            {modelsNotInChain.length > 0 && (
                <div style={{ marginTop: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {modelsNotInChain.map(model => {
                        const prov = PROVIDER_META[model.provider];
                        return (
                            <button key={model.id} style={S.addModelBtn} onClick={() => addItem(model.id)}>
                                {prov.icon} {model.label}
                                <span style={{ opacity: 0.5, marginRight: 4 }}>+</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ============================================================
//  Config Tab
// ============================================================
function ConfigTab({
    config, chainOrder, disabledModels, toggleDisabled, moveChainItem,
    addToChain, removeFromChain,
    adminFastChain, moveAdminFastItem, addToAdminFast, removeFromAdminFast,
    adminProChain, moveAdminProItem, addToAdminPro, removeFromAdminPro,
    saveConfig, savingConfig, configMessage, getModelMeta
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {configMessage && (
                <div style={{ ...S.toast, background: configMessage.includes('✅') ? '#d4edda' : '#f8d7da', color: configMessage.includes('✅') ? '#155724' : '#721c24' }}>
                    {configMessage}
                </div>
            )}

            {/* Public Bot Chain */}
            <ChainSection
                title="💬 ترتيب نماذج بوت الجمهور"
                icon="🔗"
                description="عند استقبال رسالة من العميل، يحاول النظام النماذج بالترتيب. إذا فشل نموذج أو تأخر (أكثر من 10 ثواني)، ينتقل للتالي."
                chain={chainOrder}
                moveItem={moveChainItem}
                addItem={addToChain}
                removeItem={removeFromChain}
                config={config}
                getModelMeta={getModelMeta}
                borderColor="#4285f4"
                disabledModels={disabledModels}
                toggleDisabled={toggleDisabled}
            />

            {/* Admin Fast Chain */}
            <ChainSection
                title="⚡ المساعد الإداري — الوضع السريع"
                icon="⚡"
                description="النماذج المستخدمة في الوضع السريع للمساعد الإداري (الاستفسارات البسيطة والسريعة). يستخدم في وضع أوتو."
                chain={adminFastChain}
                moveItem={moveAdminFastItem}
                addItem={addToAdminFast}
                removeItem={removeFromAdminFast}
                config={config}
                getModelMeta={getModelMeta}
                borderColor="#f9a825"
            />

            {/* Admin Pro Chain */}
            <ChainSection
                title="🧠 المساعد الإداري — الوضع المتقدم"
                icon="🧠"
                description="النماذج المستخدمة في الوضع المتقدم للمساعد الإداري (تقارير معقدة، تحليل عميق، بناء واجهات). يستخدم في وضع أوتو."
                chain={adminProChain}
                moveItem={moveAdminProItem}
                addItem={addToAdminPro}
                removeItem={removeFromAdminPro}
                config={config}
                getModelMeta={getModelMeta}
                borderColor="#e65100"
            />

            {/* Disabled Models Info */}
            {disabledModels.length > 0 && (
                <div style={{ ...S.card, borderRight: '4px solid #ff9800' }}>
                    <div style={S.cardHeader}>
                        <span style={{ fontSize: 18 }}>⏸️</span>
                        <span style={S.cardTitle}>نماذج متوقفة مؤقتاً ({disabledModels.length})</span>
                    </div>
                    <p style={S.configDesc}>هذه النماذج موجودة في سلسلة الجمهور لكن النظام يتخطاها تلقائياً.</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {disabledModels.map(m => (
                            <span key={m} style={S.disabledBadge}>{m}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Save Button */}
            <button style={{ ...S.saveConfigBtn, opacity: savingConfig ? 0.6 : 1 }} onClick={saveConfig} disabled={savingConfig}>
                {savingConfig ? <><Spinner animation="border" size="sm" style={{ marginLeft: 8 }} /> جارٍ الحفظ...</> : <>💾 حفظ جميع الإعدادات</>}
            </button>
        </div>
    );
}

// ============================================================
//  STYLES
// ============================================================
const S = {
    page: { minHeight: '100vh', fontFamily: "'Tajawal', sans-serif", background: 'var(--bg, #f8f9fa)' },
    loadingFull: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' },

    header: { padding: '20px 28px 16px', background: 'var(--card, #fff)', borderBottom: '1px solid var(--border, #e5e5e5)' },
    headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
    headerIcon: { fontSize: 32, width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #028090, #0f2736)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 18px rgba(2,128,144,0.25)' },
    title: { margin: 0, fontSize: 21, fontWeight: 800, color: 'var(--text, #1d1d1d)' },
    subtitle: { margin: '3px 0 0', fontSize: 13, color: 'var(--muted, #666)' },
    keyBadge: { fontSize: 12, padding: '5px 12px', borderRadius: 20, background: '#e3f2fd', color: '#1565c0', fontWeight: 600, whiteSpace: 'nowrap' },

    tabBar: { display: 'flex', gap: 2, padding: '0 28px', background: 'var(--card, #fff)', borderBottom: '1px solid var(--border, #e5e5e5)' },
    tab: { background: 'none', border: 'none', borderBottom: '3px solid transparent', padding: '13px 24px', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--muted, #888)', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', fontFamily: 'inherit' },
    tabActive: { color: '#028090', borderBottomColor: '#028090', background: 'rgba(2,128,144,0.04)' },

    content: { padding: '20px 28px 40px', maxWidth: 1200, margin: '0 auto', width: '100%' },

    card: { background: 'var(--card, #fff)', borderRadius: 14, border: '1px solid var(--border, #e5e5e5)', padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
    cardHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 },
    cardTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text, #333)', flex: 1 },
    stepBadge: { width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #028090, #0f2736)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 },

    modelGrid: { display: 'flex', gap: 10, flexWrap: 'wrap' },
    modelChip: { position: 'relative', background: 'var(--card, #fff)', border: '2px solid var(--border, #e5e5e5)', borderRadius: 14, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s', width: 170, textAlign: 'right', fontFamily: 'inherit' },
    modelChipActive: { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
    modelChipTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    modelChipName: { fontSize: 14, fontWeight: 700, color: 'var(--text, #333)', marginBottom: 2 },
    modelChipId: { fontSize: 11, color: '#999', fontFamily: 'monospace', wordBreak: 'break-all' },
    checkMark: { position: 'absolute', top: 8, left: 10, fontSize: 20, fontWeight: 900 },
    tierBadge: { fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700 },
    selectedCount: { marginTop: 12, fontSize: 13, color: '#028090', fontWeight: 600 },
    selectAllBtn: { background: 'none', border: '1px solid var(--border, #ddd)', borderRadius: 8, padding: '5px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#666', fontFamily: 'inherit' },

    promptTypeBtn: { background: 'var(--card, #fff)', border: '2px solid var(--border, #e5e5e5)', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#666', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', transition: 'all 0.2s' },
    promptTypeBtnActive: { background: 'rgba(2,128,144,0.08)', borderColor: '#028090', color: '#028090' },
    presetBtn: { background: 'var(--card, #fff)', border: '1px solid var(--border, #e5e5e5)', borderRadius: 20, padding: '5px 14px', cursor: 'pointer', fontSize: 12, color: '#666', fontFamily: 'inherit', transition: 'all 0.2s' },

    inputWrapper: { display: 'flex', gap: 10, alignItems: 'flex-end' },
    textarea: { flex: 1, border: '2px solid var(--border, #e5e5e5)', borderRadius: 12, padding: '12px 16px', fontSize: 15, fontFamily: "'Tajawal', sans-serif", resize: 'vertical', outline: 'none', direction: 'rtl', minHeight: 60, background: 'var(--bg, #f9f9f9)', transition: 'border-color 0.2s', color: 'var(--text, #333)' },
    sendBtn: { background: 'linear-gradient(135deg, #028090, #0f2736)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', cursor: 'pointer', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(2,128,144,0.3)', transition: 'all 0.2s' },

    resultsGrid: { display: 'grid', gap: 16 },
    resultCard: { background: 'var(--card, #fff)', border: '1px solid var(--border, #e5e5e5)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
    resultHeader: { padding: '14px 18px', borderBottom: '1px solid', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    resultModelName: { fontSize: 14, fontWeight: 700, color: 'var(--text, #333)' },
    resultModelId: { fontSize: 11, color: '#999', fontFamily: 'monospace' },
    metricsRow: { display: 'flex', gap: 6 },
    latencyBadge: { fontSize: 12, padding: '3px 10px', borderRadius: 8, background: '#e8f5e9', color: '#2e7d32', fontWeight: 600 },
    tokenBadge: { fontSize: 12, padding: '3px 10px', borderRadius: 8, background: '#e3f2fd', color: '#1565c0', fontWeight: 600 },
    errorBadge: { fontSize: 12, padding: '3px 10px', borderRadius: 8, background: '#ffebee', color: '#c62828', fontWeight: 600 },
    resultBody: { padding: '16px 18px', minHeight: 100 },
    resultLoading: { display: 'flex', alignItems: 'center', gap: 10, padding: 20, justifyContent: 'center' },
    resultError: { textAlign: 'center', padding: 20, color: '#c62828' },
    resultText: { fontSize: 14, lineHeight: 1.8, color: 'var(--text, #333)', direction: 'rtl', overflowWrap: 'break-word' },
    resultFooter: { padding: '10px 18px', borderTop: '1px solid', display: 'flex', justifyContent: 'center' },
    attributionBadge: { fontSize: 12, padding: '4px 14px', borderRadius: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 },
    resultSubtext: { fontSize: 12, color: '#999', fontStyle: 'italic', flex: '0 0 auto' },

    speedSection: { marginTop: 20, padding: '16px 0' },
    speedTitle: { fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 12 },
    speedRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
    speedLabel: { width: 200, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' },
    speedBarOuter: { flex: 1, height: 22, background: '#f0f0f0', borderRadius: 11, overflow: 'hidden' },
    speedBarInner: { height: '100%', borderRadius: 11, transition: 'width 0.6s ease', minWidth: 20 },
    speedValue: { width: 50, fontSize: 13, fontWeight: 700, color: '#333', textAlign: 'left' },

    historyItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'var(--bg, #f9f9f9)', cursor: 'pointer', transition: 'background 0.2s' },
    historyText: { fontSize: 13, color: '#555', fontStyle: 'italic' },
    historyMeta: { fontSize: 11, color: '#aaa', whiteSpace: 'nowrap' },

    // Config Tab
    configDesc: { fontSize: 13, color: '#777', lineHeight: 1.7, marginBottom: 16, marginTop: -4 },
    chainItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border, #e5e5e5)', borderRight: '4px solid', cursor: 'grab', transition: 'all 0.2s', background: 'var(--card, #fff)' },
    chainDragHandle: { fontSize: 18, color: '#ccc', cursor: 'grab', userSelect: 'none' },
    chainPriority: { width: 26, height: 26, borderRadius: '50%', background: '#028090', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 },
    chainModelName: { fontSize: 14, fontWeight: 700, color: 'var(--text, #333)' },
    chainModelId: { fontSize: 11, color: '#999', fontFamily: 'monospace' },
    chainToggle: { border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', fontWeight: 600 },
    chainArrows: { display: 'flex', flexDirection: 'column', gap: 2 },
    arrowBtn: { width: 24, height: 20, border: '1px solid #ddd', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', padding: 0 },
    chainRemove: { background: 'none', border: '1px solid #ffcdd2', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: '#c62828', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    emptyChain: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 30, color: '#999' },
    addModelBtn: { background: 'var(--card, #fff)', border: '1px dashed #028090', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#028090', fontFamily: 'inherit', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 },
    disabledBadge: { fontSize: 12, padding: '4px 12px', borderRadius: 8, background: '#ffebee', color: '#c62828', fontWeight: 500, fontFamily: 'monospace' },
    saveConfigBtn: { width: '100%', background: 'linear-gradient(135deg, #028090, #0f2736)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 0', cursor: 'pointer', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', boxShadow: '0 6px 18px rgba(2,128,144,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' },
    toast: { padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, textAlign: 'center' },

    toolsCalledSection: { padding: '10px 18px', borderTop: '1px dashed #e0e0e0', background: 'rgba(2,128,144,0.02)' },
    toolsCalledTitle: { fontSize: 12, fontWeight: 700, color: '#028090', marginBottom: 6 },
    toolCalledBadge: { fontSize: 11, padding: '3px 10px', borderRadius: 8, background: '#e0f2f1', color: '#00695c', fontWeight: 600, fontFamily: 'monospace', cursor: 'help' }
};

export default ModelComparison;
