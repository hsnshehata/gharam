import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/apiBase';

const SUPPORT_LINK = 'https://zainbot.com/chat/ghazal';
const LANDLINE = '0472570908';
const INSTAGRAM_LINK = 'https://www.instagram.com/gharamsoltan';
const TIKTOK_LINK = 'https://www.tiktok.com/@gharamsoltan';
const FACEBOOK_LINK = 'https://www.facebook.com/gharam.ml';
const THREADS_LINK = 'https://www.threads.net/@gharamsoltan';
const BUSINESS_NAME = 'غرام سلطان بيوتي سنتر وستوديو';
const CANONICAL_URL = 'https://gharamsoltan.com/gallery';
const PAGE_TITLE = 'معرض الصور والفيديوهات';
const PAGE_DESCRIPTION = 'معرض صور وفيديوهات الخدمات والعملات في غرام سلطان بيوتي سنتر.';
const OG_IMAGE = 'https://gharamsoltan.com/og-cover.jpg';
const OG_IMAGE_WIDTH = '1200';
const OG_IMAGE_HEIGHT = '630';
const TWITTER_SITE = '@gharamsoltan';

const socialLinks = [
	{ href: INSTAGRAM_LINK, label: 'Instagram', color: '#e1306c', svg: (
		<path fillRule="evenodd" d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8z" />
	)},
	{ href: FACEBOOK_LINK, label: 'Facebook', color: '#1877f2', svg: (
		<path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
	)},
	{ href: THREADS_LINK, label: 'Threads', color: '#000000', svg: (
		<path d="M331.5 235.7c2.2.9 4.2 1.9 6.3 2.8 29.2 14.1 50.6 35.2 61.8 61.4 15.7 36.5 17.2 95.8-30.3 143.2-36.2 36.2-80.3 52.5-142.6 53h-.3c-70.2-.5-124.1-24.1-160.4-70.2-32.3-41-48.9-98.1-49.5-169.6V256v-.2C17 184.3 33.6 127.2 65.9 86.2 102.2 40.1 156.2 16.5 226.4 16h.3c70.3.5 124.9 24 162.3 69.9 18.4 22.7 32 50 40.6 81.7l-40.4 10.8c-7.1-25.8-17.8-47.8-32.2-65.4-29.2-35.8-73-54.2-130.5-54.6-57 .5-100.1 18.8-128.2 54.4C72.1 146.1 58.5 194.3 58 256c.5 61.7 14.1 109.9 40.3 143.3 28 35.6 71.2 53.9 128.2 54.4 51.4-.4 85.4-12.6 113.7-40.9 32.3-32.2 31.7-71.8 21.4-95.9-6.1-14.2-17.1-26-31.9-34.9-3.7 26.9-11.8 48.3-24.7 64.8-17.1 21.8-41.4 33.6-72.7 35.3-23.6 1.3-46.3-4.4-63.9-16-20.8-13.8-33-34.8-34.3-59.3-2.5-48.3 35.7-83 95.2-86.4 21.1-1.2 40.9-.3 59.2 2.8-2.4-14.8-7.3-26.6-14.6-35.2-10-11.7-25.6-17.7-46.2-17.8H227c-16.6 0-39 4.6-53.3 26.3l-34.4-23.6c19.2-29.1 50.3-45.1 87.8-45.1h.8c62.6.4 99.9 39.5 103.7 107.7l-.2.2zm-156 68.8c1.3 25.1 28.4 36.8 54.6 35.3 25.6-1.4 54.6-11.4 59.5-73.2-13.2-2.9-27.8-4.4-43.4-4.4-4.8 0-9.6.1-14.4.4-42.9 2.4-57.2 23.2-56.2 41.8l-.1.1z" />
	)},
	{ href: TIKTOK_LINK, label: 'TikTok', color: '#010101', svg: (
		<path d="M448 209.91a210.06 210.06 0 0 1-122.77-39.25V349.38A162.55 162.55 0 1 1 185 188.31V278.2a74.62 74.62 0 1 0 52.23 71.18V0h88a121.18 121.18 0 0 0 1.86 22.17A122.18 122.18 0 0 0 381 102.39a121.43 121.43 0 0 0 67 20.14z" />
	)},
];

const themes = {
	light: {
		bg: '#f9f6f1',
		card: '#ffffff',
		text: '#1d130d',
		muted: '#5e5146',
		border: '#e6dfd4',
		gold: '#c49841',
		accent: '#1fb6a6',
		overlay: '#f1e7d8',
		shadow: 'rgba(0,0,0,0.08)'
	},
	dark: {
		bg: '#0f0b0a',
		card: '#181210',
		text: '#f7f3ee',
		muted: '#cfc5b7',
		border: '#2b2320',
		gold: '#c6a15b',
		accent: '#1aa193',
		overlay: '#241915',
		shadow: 'rgba(0,0,0,0.28)'
	}
};

const isFacebookUrl = (url) => Boolean(url && url.includes('facebook.com'));

const getFacebookEmbedUrl = (url) => {
	if (!url) return '';
	const encoded = encodeURIComponent(url);
	return `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false&width=640`;
};

const getVideoEmbedUrl = (item) => {
	if (!item) return '';
	if (item.permalink) return getFacebookEmbedUrl(item.permalink);
	if (isFacebookUrl(item.mediaUrl)) return getFacebookEmbedUrl(item.mediaUrl);
	return '';
};

function Gallery() {
	const [theme, setTheme] = useState(() => {
		if (typeof window === 'undefined') return 'light';
		return localStorage.getItem('theme') || 'light';
	});
	const palette = themes[theme];
	const [media, setMedia] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [stats, setStats] = useState(null);
	const [filterType, setFilterType] = useState('all');
	const [selectedMedia, setSelectedMedia] = useState(null);
	const [showChat, setShowChat] = useState(false);

	useEffect(() => {
		localStorage.setItem('theme', theme);
	}, [theme]);

	useEffect(() => {
		const setMeta = (name, content, attr = 'name') => {
			if (!content) return;
			let el = document.head.querySelector(`meta[${attr}="${name}"]`);
			if (!el) {
				el = document.createElement('meta');
				el.setAttribute(attr, name);
				document.head.appendChild(el);
			}
			el.setAttribute('content', content);
		};

		document.title = `${PAGE_TITLE} | ${BUSINESS_NAME}`;
		setMeta('description', PAGE_DESCRIPTION);
		setMeta('og:title', `${PAGE_TITLE} | ${BUSINESS_NAME}`, 'property');
		setMeta('og:description', PAGE_DESCRIPTION, 'property');
		setMeta('og:type', 'website', 'property');
		setMeta('og:url', CANONICAL_URL, 'property');
		setMeta('og:image', OG_IMAGE, 'property');
		setMeta('og:image:width', OG_IMAGE_WIDTH, 'property');
		setMeta('og:image:height', OG_IMAGE_HEIGHT, 'property');
		setMeta('twitter:card', 'summary_large_image');
		setMeta('twitter:site', TWITTER_SITE);
		setMeta('twitter:title', `${PAGE_TITLE} | ${BUSINESS_NAME}`);
		setMeta('twitter:description', PAGE_DESCRIPTION);
		setMeta('twitter:image', OG_IMAGE);

		const link = document.createElement('link');
		link.rel = 'canonical';
		link.href = CANONICAL_URL;
		if (!document.head.querySelector('link[rel="canonical"]')) {
			document.head.appendChild(link);
		}
	}, []);

	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			setError('');
			try {
				const [mediaRes, statsRes] = await Promise.all([
					axios.get(`${API_BASE}/api/public/facebook/gallery`, {
						params: { limit: 200 }
					}),
					axios.get(`${API_BASE}/api/public/facebook/gallery/stats`)
				]);

				if (mediaRes.data.success) {
					setMedia(mediaRes.data.data || []);
				}
				if (statsRes.data.success) {
					setStats(statsRes.data.data);
				}
			} catch (err) {
				console.error('خطأ في تحميل المعرض:', err);
				setError('حصل خطأ في تحميل الصور والفيديوهات');
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
	const handleMediaClick = (item) => {
		if (item.type === 'video') {
			const targetUrl = item.permalink || (item.facebookPostId ? `https://www.facebook.com/${item.facebookPostId}` : item.mediaUrl);
			if (targetUrl) window.open(targetUrl, '_blank');
			return;
		}
		setSelectedMedia(item);
	};

	const filteredMedia = filterType === 'all' 
		? media 
		: media.filter(m => m.type === filterType);

	const css = `
		@import url('https://fonts.googleapis.com/css2?family=Marcellus&family=Cairo:wght@400;600;700&display=swap');
		:root {
			--bg: ${palette.bg};
			--card: ${palette.card};
			--text: ${palette.text};
			--muted: ${palette.muted};
			--border: ${palette.border};
			--gold: ${palette.gold};
			--accent: ${palette.accent};
			--overlay: ${palette.overlay};
			--shadow: ${palette.shadow};
		}
		* { margin: 0; padding: 0; box-sizing: border-box; }
		html, body { background: var(--bg); color: var(--text); }
		body { font-family: 'Cairo', 'Marcellus', serif; }
		.gallery-page {
			background: radial-gradient(circle at 20% 20%, rgba(196,152,65,0.12), transparent 40%),
				linear-gradient(120deg, rgba(31,182,166,0.08), transparent 55%),
				var(--bg);
			min-height: 100vh;
			padding: 20px;
			position: relative;
			overflow: hidden;
		}
		.gallery-glow { position: absolute; inset: 0; pointer-events: none; }
		.gallery-glow span {
			position: absolute;
			width: 240px;
			height: 240px;
			border-radius: 999px;
			background: radial-gradient(circle, rgba(198,161,91,0.25), transparent 65%);
			filter: blur(10px);
			opacity: 0.7;
			animation: drift 12s ease-in-out infinite;
		}
		.gallery-glow span:nth-child(1) { top: 5%; left: 8%; animation-delay: 0s; }
		.gallery-glow span:nth-child(2) { top: 40%; right: 12%; animation-delay: 2s; }
		.gallery-glow span:nth-child(3) { bottom: 8%; left: 30%; animation-delay: 4s; }
		@keyframes drift {
			0%, 100% { transform: translateY(0) translateX(0) scale(1); }
			50% { transform: translateY(-14px) translateX(12px) scale(1.05); }
		}
		.container { max-width: 1200px; margin: 0 auto; }
		.topbar { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-bottom: 1px solid var(--border); margin-bottom: 30px; }
		.topbar h1 { font-size: 28px; font-weight: 700; color: var(--text); }
		.topbar button { background: var(--card); border: 2px solid var(--border); padding: 10px 16px; border-radius: 10px; cursor: pointer; color: var(--text); font-weight: 600; transition: all 0.2s ease; }
		.topbar button:hover { border-color: var(--gold); background: var(--overlay); }
		.stats-bar { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 30px; }
		.stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; text-align: center; }
		.stat-card .count { font-size: 28px; font-weight: 700; color: var(--gold); }
		.stat-card .label { font-size: 13px; color: var(--muted); margin-top: 4px; }
		.filter-bar { display: flex; gap: 12px; margin-bottom: 30px; flex-wrap: wrap; }
		.filter-btn { padding: 10px 18px; border: 2px solid var(--border); background: var(--card); border-radius: 10px; cursor: pointer; color: var(--text); font-weight: 600; transition: all 0.2s ease; }
		.filter-btn.active { background: var(--gold); border-color: var(--gold); color: white; }
		.filter-btn:hover { border-color: var(--gold); }
		.gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 18px; margin-bottom: 30px; }
		@media (min-width: 768px) {
			.gallery-grid { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
		}
		@media (min-width: 1024px) {
			.gallery-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
		}
		.media-item {
			position: relative;
			border-radius: 16px;
			overflow: hidden;
			cursor: pointer;
			box-shadow: 0 18px 36px var(--shadow);
			transition: transform 0.45s ease, box-shadow 0.45s ease;
			background: var(--overlay);
			aspect-ratio: 3 / 4;
			animation: floatIn 0.7s ease both;
			animation-delay: calc(var(--i) * 0.04s);
		}
		.media-item:hover { transform: translateY(-6px) scale(1.01); box-shadow: 0 26px 48px var(--shadow); }
		.media-item img, .media-item video { width: 100%; height: 100%; object-fit: cover; }
		.media-item.video { display: block; }
		.video-play-btn { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60px; height: 60px; background: rgba(255, 255, 255, 0.9); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
		@keyframes floatIn {
			from { opacity: 0; transform: translateY(14px) scale(0.98); }
			to { opacity: 1; transform: translateY(0) scale(1); }
		}
		.empty-state { text-align: center; padding: 60px 20px; color: var(--muted); }
		.empty-state h2 { color: var(--text); margin-bottom: 12px; }
		.loading { text-align: center; padding: 40px; color: var(--muted); }
		.error { background: rgba(220, 53, 69, 0.1); border: 1px solid rgba(220, 53, 69, 0.3); border-radius: 10px; padding: 16px; color: #dc3545; margin: 20px 0; }
		.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
		.modal-content { background: var(--card); border-radius: 12px; max-width: 90vw; max-height: 90vh; position: relative; }
		.modal-image, .modal-video { max-width: 100%; max-height: 80vh; object-fit: contain; }
		.modal-close { position: absolute; top: 10px; right: 10px; width: 40px; height: 40px; background: rgba(0,0,0,0.5); border: none; border-radius: 50%; color: white; font-size: 24px; cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center; }
		.modal-close:hover { background: rgba(0,0,0,0.7); }
		.footer { text-align: center; padding: 40px 20px; border-top: 1px solid var(--border); color: var(--muted); }
		.social-row { display: flex; justify-content: center; align-items: center; gap: 14px; margin-top: 12px; }
		.social-link { width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center; color: var(--muted); border-radius: 10px; transition: color 0.2s ease, transform 0.2s ease; }
		.social-link svg { width: 28px; height: 28px; fill: currentColor; }
		.social-link:hover { transform: translateY(-2px); color: var(--hover, var(--gold)); }
		.sticky-bar { position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; padding: 8px 10px; background: ${theme === 'light' ? 'rgba(255,255,255,0.96)' : 'rgba(24,18,16,0.92)'}; border: 1px solid var(--border); border-radius: 14px; box-shadow: 0 20px 40px var(--shadow); z-index: 100; width: fit-content; max-width: calc(100% - 24px); }
		.sticky-bar .btn { padding: 10px 12px; border: none; background: transparent; cursor: pointer; }
		.chat-frame { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(420px, 92vw); height: min(520px, 90vh); background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.35); z-index: 121; opacity: ${showChat ? 1 : 0}; visibility: ${showChat ? 'visible' : 'hidden'}; pointer-events: ${showChat ? 'auto' : 'none'}; transition: opacity 0.2s ease; }
		.close-btn { position: absolute; top: 10px; left: 10px; background: #dc3545; color: #fff; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; z-index: 2; }
		@media (max-width: 768px) {
			.topbar { flex-direction: column; gap: 16px; }
			.gallery-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
		}
	`;

	return (
		<div className="gallery-page" dir="rtl">
			<style>{css}</style>
			<div className="gallery-glow" aria-hidden>
				<span></span>
				<span></span>
				<span></span>
			</div>
			<div className="container">
				<div className="topbar">
					<div>
						<h1>معرض الصور والفيديوهات</h1>
						<p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>تصفحي أحدث الصور والفيديوهات من خدماتنا</p>
					</div>
					<button onClick={toggleTheme}>
						{theme === 'light' ? '🌙' : '☀️'}
					</button>
				</div>

				{stats && (
					<div className="stats-bar">
						<div className="stat-card">
							<div className="count">{stats.totalMedia}</div>
							<div className="label">إجمالي الصور والفيديوهات</div>
						</div>
						<div className="stat-card">
							<div className="count">{stats.totalImages}</div>
							<div className="label">صور</div>
						</div>
						<div className="stat-card">
							<div className="count">{stats.totalVideos}</div>
							<div className="label">فيديوهات</div>
						</div>
					</div>
				)}

				<div className="filter-bar">
					<button 
						className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
						onClick={() => setFilterType('all')}
					>
						الكل
					</button>
					<button 
						className={`filter-btn ${filterType === 'image' ? 'active' : ''}`}
						onClick={() => setFilterType('image')}
					>
						الصور فقط
					</button>
					<button 
						className={`filter-btn ${filterType === 'video' ? 'active' : ''}`}
						onClick={() => setFilterType('video')}
					>
						الفيديوهات فقط
					</button>
				</div>

				{error && <div className="error">⚠️ {error}</div>}

				{loading ? (
					<div className="loading">جاري تحميل المعرض...</div>
				) : filteredMedia.length === 0 ? (
					<div className="empty-state">
						<h2>معرض فارغ</h2>
						<p>لا توجد صور أو فيديوهات حالياً</p>
					</div>
				) : (
					<div className="gallery-grid">
						{filteredMedia.map((item, idx) => (
							<div
								key={item._id}
								className={`media-item ${item.type === 'video' ? 'video' : ''}`}
								style={{ '--i': idx }}
								onClick={() => handleMediaClick(item)}
							>
								{item.type === 'video' ? (
									<>
										<img 
											src={item.thumbnailUrl || item.mediaUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23ccc" width="100" height="100"/%3E%3C/svg%3E'}
											alt="فيديو"
											onError={(e) => e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23ccc" width="100" height="100"/%3E%3C/svg%3E'}
										/>
										<div className="video-play-btn">▶</div>
									</>
								) : (
									<img 
										src={item.mediaUrl}
										alt={item.title || 'صورة من غرام سلطان'}
										loading="lazy"
									/>
								)}
							</div>
						))}
					</div>
				)}

				{selectedMedia && (
					<div className="modal-overlay" onClick={() => setSelectedMedia(null)}>
						<div className="modal-content" onClick={(e) => e.stopPropagation()}>
							<button className="modal-close" onClick={() => setSelectedMedia(null)}>✕</button>
							{selectedMedia.type === 'video' ? (
								getVideoEmbedUrl(selectedMedia) ? (
									<iframe
										title="facebook-video"
										src={getVideoEmbedUrl(selectedMedia)}
										width="640"
										height="360"
										style={{ border: 'none', borderRadius: 12, width: 'min(90vw, 800px)', height: 'min(70vh, 450px)' }}
										allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
										allowFullScreen
									/>
								) : (
									<video 
										className="modal-video"
										controls
										playsInline
										preload="metadata"
										src={selectedMedia.mediaUrl}
									/>
								)
							) : (
								<img 
									className="modal-image"
									src={selectedMedia.mediaUrl}
									alt={selectedMedia.title || 'صورة'}
								/>
							)}
						</div>
					</div>
				)}

				<div className="footer">
					<p>تابعينا على وسائل التواصل الاجتماعي</p>
					<div className="social-row">
						{socialLinks.map((link) => (
							<a
								key={link.href}
								className="social-link"
								href={link.href}
								target="_blank"
								rel="noreferrer"
								style={{ '--hover': link.color }}
								aria-label={link.label}
							>
								<svg viewBox="0 0 448 512" role="img" aria-hidden="true" focusable="false" style={{ width: 28, height: 28 }}>
									{link.svg}
								</svg>
							</a>
						))}
					</div>
					<p style={{ marginTop: 20, fontSize: 13 }}>© 2024 {BUSINESS_NAME}. جميع الحقوق محفوظة.</p>
				</div>
			</div>

			<div className="sticky-bar">
				<button
					className="btn"
					onClick={() => window.location.href = '/landing'}
					aria-label="العودة للرئيسية"
				>
					<span style={{ fontSize: 22 }}>🏠</span>
				</button>
				<button
					className="btn"
					onClick={() => window.location.href = `tel:${LANDLINE}`}
					aria-label="اتصال أرضي"
				>
					<span style={{ fontSize: 22 }}>📞</span>
				</button>
				<button
					className="btn"
					onClick={() => setShowChat(true)}
					aria-label="دعم البوت"
				>
					<img src="https://i.ibb.co/7JJScM0Q/zain-ai.png" alt="دعم العملاء" style={{ width: 34, height: 34 }} />
				</button>
				<button
					className="btn"
					onClick={toggleTheme}
					aria-label="تبديل الثيم"
				>
					{theme === 'light' ? '🌙' : '☀️'}
				</button>
			</div>

			<div className="chat-frame">
				<button className="close-btn" onClick={() => setShowChat(false)}>✕</button>
				<iframe
					title="support"
					src={SUPPORT_LINK}
					style={{ position: 'absolute', top: '-25px', left: 0, right: 0, bottom: 0, width: '100%', height: 'calc(100% + 25px)', border: 'none', display: 'block' }}
					scrolling="no"
				/>
			</div>
		</div>
	);
}

export default Gallery;
