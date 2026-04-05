import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/apiBase';
import AIChatPopup from '../components/AIChatPopup';
const LANDLINE = '0472570908';
const MAP_LINK = 'https://maps.app.goo.gl/cpF8J7rw6ScxZwiv5';
const WHATSAPP_LINK = 'https://wa.me/gharam';

const WhatsAppIcon = ({ size = 18 }) => (
	<svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M16 2.7c-7.3 0-13.3 5.9-13.3 13.2 0 2.4.6 4.6 1.8 6.6L2 30l7.6-2.4c1.9 1 4 1.5 6.1 1.5 7.3 0 13.3-5.9 13.3-13.2S23.3 2.7 16 2.7z" fill="#25d366" />
		<path d="M24 20.8c-.3.9-1.7 1.6-2.4 1.7-.6.1-1.4.2-2.2-.1-.5-.2-1.1-.4-1.8-.8-3.1-1.8-5.1-4.7-5.2-4.9-.2-.3-1.2-1.6-1.2-3.1 0-1.5.8-2.2 1.1-2.6.3-.3.7-.4.9-.4h.6c.2 0 .5-.1.8.6.3.7 1 2.4 1.1 2.6.1.2.1.4 0 .6-.1.2-.2.4-.4.6-.2.2-.4.5-.6.7-.2.3-.4.5-.2.9.2.3 1 1.6 2.2 2.6 1.5 1.4 2.7 1.8 3.1 2 .3.1.6.1.8-.1.2-.2.9-1 .1-2.1-.8-1.1-1.7-1.5-2-.1-.3.4-.8.5-1.3.3-.6-.3-1.8-.9-2.6-1.6-.8-.7-1.4-1.7-1.6-2-.2-.3-.1-.6.1-.8.2-.2.6-.7.8-.9.3-.3.3-.5.5-.8.2-.3.1-.6 0-.8-.1-.2-.8-2-1.1-2.6-.3-.6-.5-.5-.7-.5H14c-.3 0-.7.1-1 .5-.3.4-1.2 1.1-1.2 2.6 0 1.5 1.2 2.9 1.3 3.1.1.2 2.2 3.5 5.5 5.4.4.2 2.9 1.2 4 .6.9-.5 1.5-1.3 1.7-1.5.2-.2.2-.4.1-.5-.1-.2-.5-.4-.6-.4z" fill="#fff" />
	</svg>
);

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
	{
		href: INSTAGRAM_LINK, label: 'Instagram', color: '#e1306c', svg: (
			<path fillRule="evenodd" d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8z" />
		)
	},
	{
		href: FACEBOOK_LINK, label: 'Facebook', color: '#1877f2', svg: (
			<path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
		)
	},
	{
		href: THREADS_LINK, label: 'Threads', color: '#000000', svg: (
			<path d="M331.5 235.7c2.2.9 4.2 1.9 6.3 2.8 29.2 14.1 50.6 35.2 61.8 61.4 15.7 36.5 17.2 95.8-30.3 143.2-36.2 36.2-80.3 52.5-142.6 53h-.3c-70.2-.5-124.1-24.1-160.4-70.2-32.3-41-48.9-98.1-49.5-169.6V256v-.2C17 184.3 33.6 127.2 65.9 86.2 102.2 40.1 156.2 16.5 226.4 16h.3c70.3.5 124.9 24 162.3 69.9 18.4 22.7 32 50 40.6 81.7l-40.4 10.8c-7.1-25.8-17.8-47.8-32.2-65.4-29.2-35.8-73-54.2-130.5-54.6-57 .5-100.1 18.8-128.2 54.4C72.1 146.1 58.5 194.3 58 256c.5 61.7 14.1 109.9 40.3 143.3 28 35.6 71.2 53.9 128.2 54.4 51.4-.4 85.4-12.6 113.7-40.9 32.3-32.2 31.7-71.8 21.4-95.9-6.1-14.2-17.1-26-31.9-34.9-3.7 26.9-11.8 48.3-24.7 64.8-17.1 21.8-41.4 33.6-72.7 35.3-23.6 1.3-46.3-4.4-63.9-16-20.8-13.8-33-34.8-34.3-59.3-2.5-48.3 35.7-83 95.2-86.4 21.1-1.2 40.9-.3 59.2 2.8-2.4-14.8-7.3-26.6-14.6-35.2-10-11.7-25.6-17.7-46.2-17.8H227c-16.6 0-39 4.6-53.3 26.3l-34.4-23.6c19.2-29.1 50.3-45.1 87.8-45.1h.8c62.6.4 99.9 39.5 103.7 107.7l-.2.2zm-156 68.8c1.3 25.1 28.4 36.8 54.6 35.3 25.6-1.4 54.6-11.4 59.5-73.2-13.2-2.9-27.8-4.4-43.4-4.4-4.8 0-9.6.1-14.4.4-42.9 2.4-57.2 23.2-56.2 41.8l-.1.1z" />
		)
	},
	{
		href: TIKTOK_LINK, label: 'TikTok', color: '#010101', svg: (
			<path d="M448 209.91a210.06 210.06 0 0 1-122.77-39.25V349.38A162.55 162.55 0 1 1 185 188.31V278.2a74.62 74.62 0 1 0 52.23 71.18V0h88a121.18 121.18 0 0 0 1.86 22.17A122.18 122.18 0 0 0 381 102.39a121.43 121.43 0 0 0 67 20.14z" />
		)
	},
];

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
	const palette = {
		bg: '#080f0b',
		card: 'rgba(15,36,25,0.65)',
		cardSolid: '#0d2118',
		text: '#f5f0e8',
		muted: '#b0a08a',
		border: 'rgba(201,160,78,0.12)',
		gold: '#c9a04e',
		goldLight: '#e6c27b',
		accent: '#1a3a2a',
		overlay: 'rgba(13,31,21,0.8)',
		shadow: 'rgba(0,0,0,0.45)',
		glassBlur: 'blur(18px)',
		gradientCard: 'linear-gradient(145deg, rgba(15,36,25,0.7), rgba(10,26,18,0.5))',
		gradientGold: 'linear-gradient(135deg, #c9a04e, #e6c27b)',
		gradientGreen: 'linear-gradient(135deg, #1a3a2a, #2a5a3a)'
	};
	const [media, setMedia] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [filterType, setFilterType] = useState('all');
	const [selectedMedia, setSelectedMedia] = useState(null);
	const [showAIChat, setShowAIChat] = useState(false);
	const [fabOpen, setFabOpen] = useState(false);

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', 'dark');
		return () => {
			document.documentElement.setAttribute('data-theme', 'light');
		};
	}, []);

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
				const mediaRes = await axios.get(`${API_BASE}/api/public/facebook/gallery`, {
					params: { limit: 200 }
				});

				if (mediaRes.data.success) {
					setMedia(mediaRes.data.data || []);
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

	// Removed toggleTheme
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
		.gallery-page {
			position: relative;
			color: var(--text);
			font-family: 'Cairo', 'Marcellus', serif;
			min-height: 100vh;
			padding: 24px 20px 80px 20px;
			overflow: hidden;
		}
		.hero-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100vh; object-fit: cover; z-index: -2; filter: brightness(0.7) contrast(1.1); pointer-events: none; }
		.hero-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100vh; z-index: -1; background: linear-gradient(to top, rgba(8,15,11,1) 0%, rgba(8,15,11,0.85) 40%, rgba(8,15,11,0.4) 100%); pointer-events: none; }
		.hero-particles { position: fixed; top: 0; left: 0; width: 100%; height: 100vh; z-index: -1; pointer-events: none; background-image: radial-gradient(circle at center, rgba(201,160,78,0.1) 0%, transparent 8%); background-size: 60px 60px; animation: particleFloat 20s linear infinite; opacity: 0.5; }
		@keyframes particleFloat { 0% { background-position: 0 0; } 100% { background-position: -60px -60px; } }
		
		.container { max-width: 1200px; margin: 0 auto; position: relative; z-index: 1; }
		
		.footer { margin-top: 80px; text-align: center; padding: 60px 20px 100px; background: linear-gradient(135deg, #1a3a2a, #0f2419); border-radius: 40px 40px 0 0; border-top: 2px solid #c9a04e; color: rgba(245,240,232,0.85); font-size: 14px; position: relative; z-index: 1; }
		.footer .social-link { width: 50px; height: 50px; display: inline-flex; align-items: center; justify-content: center; color: var(--muted); border-radius: 15px; transition: color 0.2s ease, transform 0.2s ease; background: rgba(255,255,255,0.05); border: 1px solid rgba(201,160,78,0.1); }
		.footer .social-link:hover { color: #c9a04e; transform: translateY(-4px); border-color: rgba(201,160,78,0.4); }
		.social-row { display: flex; justify-content: center; align-items: center; gap: 14px; margin-top: 12px; }
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
		.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 0; backdrop-filter: blur(8px); animation: fadeIn 0.3s ease; }
		.modal-content { background: var(--card); border-radius: 16px; width: 100%; max-width: 100vw; height: 100vh; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; animation: floatIn 0.3s ease; }
		@media (min-width: 768px) {
			.modal-overlay { padding: 40px; }
			.modal-content { max-width: 1200px; height: auto; max-height: 90vh; box-shadow: 0 25px 50px rgba(0,0,0,0.5); border: 1px solid var(--border); }
		}
		.modal-media-container { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 40px; }
		@media (max-width: 768px) { .modal-media-container { padding: 10px; } }
		.modal-image, .modal-video { max-width: 100%; max-height: 100%; object-fit: contain; }
		
		.modal-close { position: absolute; top: 16px; right: 16px; width: 44px; height: 44px; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 50%; color: white; font-size: 24px; cursor: pointer; z-index: 50; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
		.modal-close:hover { background: rgba(220,53,69,0.9); transform: scale(1.05); }

		.modal-info-bar { position: absolute; bottom: 0; left: 0; right: 0; width: 100%; padding: 40px 20px 115px 20px; z-index: 20; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 12px; pointer-events: none; text-align: center; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%); }
		.modal-info-bar > * { pointer-events: auto; }
		
		.modal-caption { color: #fff; max-width: 90%; text-shadow: 0 2px 8px rgba(0,0,0,0.8); }
		.modal-caption h4 { margin: 0 0 6px; font-size: 16px; color: var(--gold); }
		.modal-caption p { margin: 0; font-size: 14px; opacity: 1; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
		
		.modal-fb-btn { background: #1877f2; color: #fff; border: none; padding: 10px 24px; border-radius: 20px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 15px rgba(24,119,242,0.4); text-decoration: none; font-size: 14px; }
		.modal-fb-btn:hover { background: #166fe5; transform: translateY(-3px); box-shadow: 0 6px 20px rgba(24,119,242,0.5); }
		
		.modal-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 50px; height: 50px; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; cursor: pointer; font-size: 20px; z-index: 10; transition: all 0.2s ease; }
		.modal-nav:hover { background: var(--gold); border-color: var(--gold); color: #080f0b; transform: translateY(-50%) scale(1.1); }
		.modal-nav.prev { right: 20px; }
		.modal-nav.next { left: 20px; }
		.footer { text-align: center; padding: 40px 20px; border-top: 1px solid var(--border); color: var(--muted); }
		.social-row { display: flex; justify-content: center; align-items: center; gap: 14px; margin-top: 12px; }
		.social-link { width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center; color: var(--muted); border-radius: 10px; transition: color 0.2s ease, transform 0.2s ease; }
		.social-link svg { width: 28px; height: 28px; fill: currentColor; }
		.social-link:hover { transform: translateY(-2px); color: var(--hover, var(--gold)); }
		.fab-container { position: fixed; bottom: 24px; right: 24px; z-index: 100; display: flex; flex-direction: column-reverse; align-items: center; gap: 12px; }
		.fab-trigger { width: 56px; height: 56px; border-radius: 50%; border: none; background: linear-gradient(135deg, #1a3a2a, #2a5a3a); color: #c9a04e; font-size: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 28px rgba(26,58,42,0.5); transition: transform 0.3s ease, box-shadow 0.3s ease; }
		.fab-trigger:hover { transform: scale(1.08); box-shadow: 0 12px 36px rgba(26,58,42,0.6); }
		.fab-trigger.open { transform: rotate(45deg); background: linear-gradient(135deg, #2a5a3a, #1a3a2a); }
		.fab-actions { display: flex; flex-direction: column; gap: 10px; align-items: center; opacity: 0; transform: translateY(20px) scale(0.8); pointer-events: none; transition: opacity 0.3s ease, transform 0.3s ease; }
		.fab-actions.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
		.fab-action { position: relative; width: 48px; height: 48px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 20px; transition: transform 0.2s ease, box-shadow 0.2s ease; box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
		.fab-action:hover { transform: scale(1.12); box-shadow: 0 8px 24px rgba(0,0,0,0.25); }
		.fab-tooltip { position: absolute; right: 60px; white-space: nowrap; background: rgba(24,18,16,0.95); color: var(--text); padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 700; box-shadow: 0 4px 12px var(--shadow); pointer-events: none; border: 1px solid var(--glass-border); backdrop-filter: blur(8px); }
		.fab-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.15); z-index: 99; backdrop-filter: blur(2px); }
		.ai-floating-btn { position: fixed; bottom: 24px; left: 24px; z-index: 100; background: linear-gradient(135deg, #1a3a2a, #2a5a3a); border: none; border-radius: 999px; padding: 4px; cursor: pointer; box-shadow: 0 10px 25px rgba(26,58,42,0.5); animation: pulse-ai 2s infinite; transition: transform 0.3s ease; }
		.ai-floating-btn:hover { transform: scale(1.05) translateY(-5px); }
		.ai-btn-content { display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.15); padding: 8px 18px 8px 12px; border-radius: 999px; color: #c9a04e; font-weight: bold; font-size: 15px; }
		.ai-floating-btn img { width: 28px; height: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); }
		@keyframes pulse-ai { 0% { box-shadow: 0 0 0 0 rgba(201,160,78,0.4); } 70% { box-shadow: 0 0 0 15px rgba(201,160,78,0); } 100% { box-shadow: 0 0 0 0 rgba(201,160,78,0); } }
		@media (max-width: 768px) {
			.topbar { flex-direction: column; gap: 16px; }
			.gallery-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
		}
	`;

	return (
		<div className="gallery-page" dir="rtl">
			<style>{css}</style>

			<img className="hero-bg" src="/banner-b.png" alt="خلفية المعرض" aria-hidden="true" />
			<div className="hero-overlay" aria-hidden="true" />
			<div className="hero-particles" aria-hidden="true" />

			<div className="container">
				<div className="topbar">
					<div>
						<h1>معرض الصور والفيديوهات</h1>
						<p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>تصفحي أحدث الصور والفيديوهات من خدماتنا</p>
					</div>
				</div>



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

				{selectedMedia && (() => {
					const currentIndex = filteredMedia.findIndex(m => m._id === selectedMedia._id);
					const hasPrev = currentIndex > 0;
					const hasNext = currentIndex !== -1 && currentIndex < filteredMedia.length - 1;
					const postUrl = selectedMedia.permalink || (selectedMedia.facebookPostId ? `https://www.facebook.com/${selectedMedia.facebookPostId}` : selectedMedia.mediaUrl);

					const handlePrev = (e) => {
						e.stopPropagation();
						if (hasPrev) setSelectedMedia(filteredMedia[currentIndex - 1]);
					};
					const handleNext = (e) => {
						e.stopPropagation();
						if (hasNext) setSelectedMedia(filteredMedia[currentIndex + 1]);
					};

					return (
						<div className="modal-overlay" onClick={() => setSelectedMedia(null)}>
							<div className="modal-content" onClick={(e) => e.stopPropagation()}>
								<button className="modal-close" onClick={() => setSelectedMedia(null)} aria-label="إغلاق">✕</button>
								
								{hasPrev && (
									<button className="modal-nav prev" onClick={handlePrev} aria-label="السابق">
										<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
									</button>
								)}
								{hasNext && (
									<button className="modal-nav next" onClick={handleNext} aria-label="التالي">
										<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
									</button>
								)}

								<div className="modal-media-container">
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

								<div className="modal-info-bar">
									<div className="modal-caption">
										<h4>{selectedMedia.title || 'من أعمالنا'}</h4>
										{(selectedMedia.description || selectedMedia.caption || selectedMedia.message) && (
											<p>{selectedMedia.description || selectedMedia.caption || selectedMedia.message}</p>
										)}
									</div>
									{postUrl && (
										<a href={postUrl} target="_blank" rel="noreferrer" className="modal-fb-btn" onClick={(e) => e.stopPropagation()}>
											<svg viewBox="0 0 448 512" style={{ width: 18, height: 18, fill: 'currentColor' }}><path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" /></svg>
											<span>عرض البوست</span>
										</a>
									)}
								</div>
							</div>
						</div>
					);
				})()}

				<section className="footer">
					<img src="/logo.png" alt="غرام سلطان" style={{ width: '120px', marginBottom: '24px', opacity: 0.9, filter: 'drop-shadow(0 4px 15px rgba(201,160,78,0.2))' }} />
					<div style={{ color: '#c9a04e', fontSize: '20px', fontWeight: 800, letterSpacing: '1px', marginBottom: '8px' }}>غرام سلطان بيوتي سنتر</div>
					<p style={{ color: 'rgba(245,240,232,0.6)', marginTop: 10, fontSize: '15px', maxWidth: '600px', marginInline: 'auto' }}>
						خبيرة التجميل الأولى في كفر الشيخ - نعتني بأدق تفاصيل إطلالتكِ لنجعلكِ ملكة في ليلة العمر.
					</p>
					<div className="social-row" style={{ margin: '30px 0' }}>
						{socialLinks.map((s) => (
							<a key={s.href} className="social-link" href={s.href} target="_blank" rel="noreferrer" style={{ '--hover': s.color }} aria-label={s.label}>
								<svg viewBox="0 0 448 512" style={{ width: '28px', height: '28px' }}>{s.svg}</svg>
							</a>
						))}
					</div>
					<div style={{ color: 'rgba(201,160,78,0.4)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px' }}>
						© {new Date().getFullYear()} Gharam Sultan Beauty Center · Premium Experience
					</div>
				</section>
			</div>

			{/* FAB Overlay */}
			{fabOpen && <div className="fab-overlay" onClick={() => setFabOpen(false)} />}

			{/* Floating Action Button */}
			<div className="fab-container">
				<button
					className={`fab-trigger ${fabOpen ? 'open' : ''}`}
					onClick={() => setFabOpen(!fabOpen)}
					aria-label="القائمة السريعة"
				>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
				</button>
				<div className={`fab-actions ${fabOpen ? 'open' : ''}`}>
					<button
						className="fab-action"
						style={{ background: '#25d366', color: '#fff', boxShadow: '0 4px 15px rgba(37,211,102,0.4)' }}
						onClick={() => { window.open(WHATSAPP_LINK, '_blank'); setFabOpen(false); }}
						aria-label="واتساب"
					>
						<span className="fab-tooltip">واتساب</span>
						<svg width="22" height="22" viewBox="0 0 448 512" fill="currentColor"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" /></svg>
					</button>
					<button
						className="fab-action"
						style={{ background: 'linear-gradient(135deg, #c9a04e, #e6c27b)', color: '#0f2419' }}
						onClick={() => { window.location.href = `tel:${LANDLINE}`; setFabOpen(false); }}
						aria-label="اتصال أرضي"
					>
						<span className="fab-tooltip">اتصال أرضي</span>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
					</button>
					<button
						className="fab-action"
						style={{ background: 'linear-gradient(135deg, #1a3a2a, #2a5a3a)', color: '#fff' }}
						onClick={() => { window.open(MAP_LINK, '_blank'); setFabOpen(false); }}
						aria-label="الموقع"
					>
						<span className="fab-tooltip">موقعنا</span>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
					</button>
					<button
						className="fab-action"
						style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', color: '#c9a04e' }}
						onClick={() => { window.location.href = '/prices'; setFabOpen(false); }}
						aria-label="الأسعار"
					>
						<span className="fab-tooltip">قائمة الأسعار</span>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
					</button>
					<button
						className="fab-action"
						style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', color: '#c9a04e' }}
						onClick={() => { window.location.href = '/massage-chair'; setFabOpen(false); }}
						aria-label="كرسي المساج"
					>
						<span className="fab-tooltip">كرسي المساج</span>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
					</button>
					<button
						className="fab-action"
						style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', color: '#c9a04e' }}
						onClick={() => { window.location.href = '/'; setFabOpen(false); }}
						aria-label="الرئيسية"
					>
						<span className="fab-tooltip">الرئيسية</span>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
					</button>
				</div>
			</div>

			{/* الذكاء الاصطناعي Floating Button */}
			{!showAIChat && (
				<button
					className="ai-floating-btn"
					onClick={() => setShowAIChat(true)}
					aria-label="الذكاء الاصطناعي"
				>
					<div className="ai-btn-content">
						<img src="https://i.ibb.co/7JJScM0Q/zain-ai.png" alt="AI" />
						<span>مساعدة ذكية</span>
					</div>
				</button>
			)}

			{showAIChat && <AIChatPopup onClose={() => setShowAIChat(false)} />}
		</div>
	);
}

export default Gallery;
