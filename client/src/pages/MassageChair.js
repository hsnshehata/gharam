import React, { useEffect, useState } from 'react';

const MAP_LINK = 'https://maps.app.goo.gl/AHX3MDPhyLEuvWUN8';
const WHATSAPP_LINK = 'https://wa.me/gharam';
const LANDLINE = '0472570908';
const SUPPORT_LINK = 'https://zainbot.com/chat/ghazal';
const INSTAGRAM_LINK = 'https://www.instagram.com/gharamsoltan';
const TIKTOK_LINK = 'https://www.tiktok.com/@gharamsoltan';
const FACEBOOK_LINK = 'https://www.facebook.com/gharam.ml';
const THREADS_LINK = 'https://www.threads.net/@gharamsoltan';

const INSTAGRAM_SVG = (
	<path
		fillRule="evenodd"
		d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8z"
	/>
);

const socialLinks = [
	{ href: INSTAGRAM_LINK, label: 'Instagram', color: '#e1306c', svg: INSTAGRAM_SVG },
	{ href: FACEBOOK_LINK, label: 'Facebook', color: '#1877f2', svg: (
		<path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
	)},
	{ href: THREADS_LINK, label: 'Threads', color: '#000000', svg: (
		<path d="M331.5 235.7c2.2.9 4.2 1.9 6.3 2.8 29.2 14.1 50.6 35.2 61.8 61.4 15.7 36.5 17.2 95.8-30.3 143.2-36.2 36.2-80.3 52.5-142.6 53h-.3c-70.2-.5-124.1-24.1-160.4-70.2-32.3-41-48.9-98.1-49.5-169.6V256v-.2C17 184.3 33.6 127.2 65.9 86.2 102.2 40.1 156.2 16.5 226.4 16h.3c70.3.5 124.9 24 162.3 69.9 18.4 22.7 32 50 40.6 81.7l-40.4 10.8c-7.1-25.8-17.8-47.8-32.2-65.4-29.2-35.8-73-54.2-130.5-54.6-57 .5-100.1 18.8-128.2 54.4C72.1 146.1 58.5 194.3 58 256c.5 61.7 14.1 109.9 40.3 143.3 28 35.6 71.2 53.9 128.2 54.4 51.4-.4 85.4-12.6 113.7-40.9 32.3-32.2 31.7-71.8 21.4-95.9-6.1-14.2-17.1-26-31.9-34.9-3.7 26.9-11.8 48.3-24.7 64.8-17.1 21.8-41.4 33.6-72.7 35.3-23.6 1.3-46.3-4.4-63.9-16-20.8-13.8-33-34.8-34.3-59.3-2.5-48.3 35.7-83 95.2-86.4 21.1-1.2 40.9-.3 59.2 2.8-2.4-14.8-7.3-26.6-14.6-35.2-10-11.7-25.6-17.7-46.2-17.8H227c-16.6 0-39 4.6-53.3 26.3l-34.4-23.6c19.2-29.1 50.3-45.1 87.8-45.1h.8c62.6.4 99.9 39.5 103.7 107.7l-.2.2zm-156 68.8c1.3 25.1 28.4 36.8 54.6 35.3 25.6-1.4 54.6-11.4 59.5-73.2-13.2-2.9-27.8-4.4-43.4-4.4-4.8 0-9.6.1-14.4.4-42.9 2.4-57.2 23.2-56.2 41.8l-.1.1z" />
	)},
	{ href: TIKTOK_LINK, label: 'TikTok', color: '#010101', svg: (
		<path d="M448 209.91a210.06 210.06 0 0 1-122.77-39.25V349.38A162.55 162.55 0 1 1 185 188.31V278.2a74.62 74.62 0 1 0 52.23 71.18V0h88a121.18 121.18 0 0 0 1.86 22.17A122.18 122.18 0 0 0 381 102.39a121.43 121.43 0 0 0 67 20.14z" />
	)},
	{ href: WHATSAPP_LINK, label: 'WhatsApp', color: '#25d366', svg: (
		<path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
	)}
];

const themes = {
	light: {
		bg: '#f9f6f1',
		card: '#ffffff',
		text: '#1d130d',
		muted: '#5e5146',
		border: '#e6dfd4',
		gold: '#c49841',
		shadow: 'rgba(0,0,0,0.08)'
	},
	dark: {
		bg: '#0f0b0a',
		card: '#181210',
		text: '#f7f3ee',
		muted: '#cfc5b7',
		border: '#2b2320',
		gold: '#c6a15b',
		shadow: 'rgba(0,0,0,0.28)'
	}
};

const sections = [
	{
		title: 'أقفل الموبايل، خد نفس عميق، واستعد لأروع تجربة مساج هتحسها في حياتك! 😌✨',
		description: 'كرسي المساج الذكي ضد الجاذبية متاح دلوقتي في السنتر... حجزك جاهز؟ 😉🔥',
		image: 'https://www.irestonline.com.au/wp-content/uploads/2024/04/02-brown.jpg'
	},
	{
		title: 'ضد الجاذبية',
		image: 'https://www.irestonline.com.au/wp-content/uploads/2024/04/04-brown.jpg',
		list: [
			'يعمل بتقنية انعدام الجاذبية لتوزيع الضغط بالتساوي.',
			'يساعد على تحسين الدورة الدموية والاسترخاء العميق.',
			'يسمح للجسم بالوصول إلى حالة الراحة المثالية أثناء التدليك.'
		]
	},
	{
		title: 'يعمل بذكاء فائق لاستهداف العضلات',
		image: 'https://www.irestonline.com.au/wp-content/uploads/2024/04/06-brown.jpg',
		list: [
			'يستخدم مستشعرات متقدمة لتحليل استجابة العضلات.',
			'يوفر تدليكًا مخصصًا بناءً على استجابة الجسم.',
			'يساعد على تخفيف توتر العضلات بطريقة ذكية وفعالة.'
		]
	},
	{
		title: '3D مساج',
		image: 'https://www.irestonline.com.au/wp-content/uploads/2024/04/waist-heating3.gif',
		list: [
			'تكنولوجيا ثلاثية الأبعاد لتحفيز العضلات بطرق متعددة.',
			'وسادة تسخين الظهر.',
			'يحاكي تقنيات التدليك الاحترافية لتحفيز نقاط التوتر.',
			'يمنح تدليكًا أعمق ليصل إلى الطبقات العميقة من العضلات.'
		]
	},
	{
		title: 'فوائد المساج',
		image: 'https://www.irestonline.com.au/wp-content/uploads/2024/04/02-green.jpg',
		list: [
			'تحسين الدورة الدموية وتعزيز تدفق الدم إلى العضلات.',
			'تخفيف التوتر وتقليل الضغط العصبي بشكل فعال.',
			'المساعدة في تخفيف آلام الظهر والرقبة الناتجة عن الجلوس الطويل.',
			'تحسين جودة النوم والاسترخاء العميق للجسم والعقل.',
			'تحفيز عملية التعافي للعضلات بعد التمارين الرياضية.'
		]
	}
];

function MassageChair() {
	const [theme, setTheme] = useState(() => {
		if (typeof window === 'undefined') return 'light';
		return localStorage.getItem('theme') || 'light';
	});
	const [showChat, setShowChat] = useState(false);
	const palette = themes[theme];
	const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

	useEffect(() => {
		localStorage.setItem('theme', theme);
	}, [theme]);

	useEffect(() => {
		const link = document.createElement('link');
		link.rel = 'preconnect';
		link.href = new URL(SUPPORT_LINK).origin;
		link.crossOrigin = 'anonymous';
		document.head.appendChild(link);
		return () => {
			if (link.parentNode) link.parentNode.removeChild(link);
		};
	}, []);

	useEffect(() => {
		const observer = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) entry.target.classList.add('visible');
			});
		}, { threshold: 0.2 });

		document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
		return () => observer.disconnect();
	}, []);


	const css = `
		:root {
			--bg: ${palette.bg};
			--card: ${palette.card};
			--text: ${palette.text};
			--muted: ${palette.muted};
			--border: ${palette.border};
			--gold: ${palette.gold};
			--shadow: ${palette.shadow};
		}
		.page { background: var(--bg); min-height: 100vh; color: var(--text); font-family: 'Tajawal', 'Arial', sans-serif; position: relative; overflow: hidden; }
		.container { width: min(1200px, 92%); margin: 0 auto; padding: 28px 0 72px; position: relative; z-index: 1; }
		.floating-icons { position: fixed; inset: 0; pointer-events: auto; z-index: 0; }
		.floating-icons span { position: absolute; font-size: 40px; opacity: 0.22; animation: float 6s ease-in-out infinite, drift 14s linear infinite; transition: transform 0.28s ease, opacity 0.18s ease; cursor: default; }
		.floating-icons span:hover { opacity: 0.4; transform: scale(1.18) rotate(6deg); }
		.floating-icons span:nth-child(1) { top: 10%; left: 14%; animation-duration: 6.5s, 16s; }
		.floating-icons span:nth-child(2) { top: 26%; right: 14%; animation-duration: 6s, 15s; }
		.floating-icons span:nth-child(3) { top: 50%; left: 6%; animation-duration: 6.2s, 17s; }
		.floating-icons span:nth-child(4) { top: 64%; right: 10%; animation-duration: 6.8s, 16.5s; }
		.floating-icons span:nth-child(5) { top: 80%; left: 44%; animation-duration: 6.1s, 15.5s; }
		.sparkles { position: fixed; inset: 0; pointer-events: none; z-index: 0; mix-blend-mode: screen; }
		.sparkles span { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 60%); opacity: 0.5; animation: twinkle 2.6s ease-in-out infinite; }
		.sparkles span:nth-child(1) { top: 14%; left: 32%; animation-delay: 0.2s; }
		.sparkles span:nth-child(2) { top: 38%; right: 24%; animation-delay: 0.6s; }
		.sparkles span:nth-child(3) { top: 58%; left: 22%; animation-delay: 1.1s; }
		.sparkles span:nth-child(4) { top: 72%; right: 30%; animation-delay: 0.4s; }
		.sparkles span:nth-child(5) { top: 18%; right: 48%; animation-delay: 1s; }
		.sparkles span:nth-child(6) { top: 66%; left: 52%; animation-delay: 1.4s; }
		.sparkles span:nth-child(7) { top: 30%; left: 12%; animation-delay: 0.8s; }
		.sparkles span:nth-child(8) { top: 82%; right: 12%; animation-delay: 1.6s; }
		@keyframes twinkle { 0%, 100% { transform: scale(0.6); opacity: 0.2; } 50% { transform: scale(1.4); opacity: 0.8; } }
		@keyframes float { 0% { transform: translateY(0); } 50% { transform: translateY(-18px); } 100% { transform: translateY(0); } }
		@keyframes drift { 0% { transform: translateX(0) rotate(0deg); } 50% { transform: translateX(12px) rotate(6deg); } 100% { transform: translateX(0) rotate(0deg); } }
		h1 { margin: 0 0 12px; font-size: clamp(26px, 4vw, 38px); }
		.section { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; margin: 14px 0; box-shadow: 0 12px 26px var(--shadow); }
		.section h2 { margin: 0 0 10px; font-size: 20px; color: var(--text); }
		.section p { color: var(--muted); margin: 0 0 12px; line-height: 1.6; }
		.section ul { margin: 0; padding-left: 18px; color: var(--muted); line-height: 1.6; }
		.section img { width: 100%; border-radius: 12px; margin: 10px 0; object-fit: cover; }
		.btn { border: none; cursor: pointer; padding: 12px 18px; border-radius: 12px; font-weight: 700; transition: transform 0.15s ease, box-shadow 0.15s ease; color: #0f0b0a; }
		.btn:hover { transform: translateY(-2px); box-shadow: 0 12px 28px var(--shadow); }
		.contact { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; margin-top: 20px; box-shadow: 0 10px 20px var(--shadow); }
		.contact a { color: var(--gold); text-decoration: none; }
		.contact div { margin: 6px 0; }
		.link-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
		.link { padding: 10px 14px; background: linear-gradient(135deg, var(--gold), #e6c27b); color: #0f0b0a; border-radius: 10px; font-weight: 700; border: none; cursor: pointer; }
		.sticky-bar { position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; padding: 10px 14px; background: ${theme === 'light' ? 'rgba(255,255,255,0.96)' : 'rgba(24,18,16,0.92)'}; border: 1px solid var(--border); border-radius: 16px; box-shadow: 0 20px 40px var(--shadow); z-index: 100; }
		.sticky-bar .btn { padding: 12px 14px; }
		.btn-ghost { background: rgba(0,0,0,0.03); color: var(--text); border: 1px solid var(--border); }
		.topbar { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 18px 0; }
		.brand { display: flex; align-items: center; justify-content: center; text-align: center; gap: 12px; font-weight: 800; }
		.brand img { width: 64px; height: 64px; object-fit: contain; }
		.pill { display: inline-flex; gap: 8px; align-items: center; padding: 10px 14px; background: rgba(0,0,0,0.03); border: 1px solid var(--border); border-radius: 999px; color: var(--muted); font-size: 14px; }
		.footer { margin: 28px 0 56px; text-align: center; color: var(--muted); font-size: 14px; }
		.social-row { display: flex; justify-content: center; align-items: center; gap: 14px; margin-top: 12px; }
		.social-link { width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center; color: var(--muted); border-radius: 10px; transition: color 0.2s ease, transform 0.2s ease; }
		.social-link svg { width: 28px; height: 28px; fill: currentColor; }
		.social-link:hover { transform: translateY(-2px); color: var(--hover, var(--gold)); }
		.reveal { opacity: 0; transform: translateY(30px); transition: opacity 0.7s ease, transform 0.7s ease; }
		.reveal.visible { opacity: 1; transform: translateY(0); }
	`; 

	return (
		<div className="page" dir="rtl">
			<style>{css}</style>
			<div className="floating-icons" aria-hidden>
				<span>💄</span>
				<span>💅</span>
				<span>✨</span>
				<span>👑</span>
				<span>🌸</span>
			</div>
			<div className="sparkles" aria-hidden>
				<span></span><span></span><span></span><span></span>
				<span></span><span></span><span></span><span></span>
			</div>
			<div className="container">
				<div className="topbar reveal">
					<div className="brand">
						<img src="/logo.png" alt="شعار غرام سلطان" loading="lazy" />
						<div>
							<div style={{ fontSize: 18 }}>غرام سلطان</div>
							<div className="pill">بيوتي سنتر وستوديو </div>
						</div>
					</div>
				</div>
				<h1>كرسي المساج الذكي</h1>
				{sections.map((sec) => (
					<div className="section reveal" key={sec.title}>
						<h2>{sec.title}</h2>
						{sec.description && <p>{sec.description}</p>}
						{sec.image && <img src={sec.image} alt={sec.title} loading="lazy" />}
						{sec.list && (
							<ul>
								{sec.list.map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
						)}
					</div>
				))}

				<div className="contact reveal">
					<h3 style={{ marginTop: 0 }}>معلومات التواصل السريعة</h3>
					<div>📍 <a href={MAP_LINK} target="_blank" rel="noreferrer">دسوق - شارع الجيش</a></div>
					<div>📞 <a href={`tel:${LANDLINE}`}>رقم أرضي: {LANDLINE}</a></div>
					<div>💬 <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer">واتساب : wa.me/gharam</a></div>
					<div className="link-row">
						<button className="link" onClick={() => window.open(WHATSAPP_LINK, '_blank')}>احجز جلسة</button>
						<button className="link" onClick={() => window.location.href = `tel:${LANDLINE}`}>اتصل مباشرة</button>
					</div>

					<section className="footer reveal" style={{ paddingBottom: 90, marginTop: 24 }}>
						<div>تابعينا على السوشيال</div>
						<div className="social-row">
							{socialLinks.map((s) => (
								<a key={s.href} className="social-link" href={s.href} target="_blank" rel="noreferrer" style={{ '--hover': s.color }} aria-label={s.label}>
									<svg viewBox="0 0 448 512" role="img" aria-hidden="true" focusable="false">{s.svg}</svg>
								</a>
							))}
						</div>
						<div style={{ marginTop: 6, fontSize: 13 }}>
							© غرام سلطان بيوتي سنتر · اسم يعني الثقة
						</div>
					</section>
				</div>
			</div>

			<div className="sticky-bar">
				<button
					className="btn"
					style={{ background: 'transparent', border: 'none', padding: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: palette.text }}
					onClick={() => window.location.href = '/landing'}
					aria-label="العودة للرئيسية"
				>
					<span style={{ fontSize: 22 }}>🏠</span>
				</button>
				<button
					className="btn"
					style={{ background: 'transparent', border: 'none', padding: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: palette.text }}
					onClick={() => window.location.href = `tel:${LANDLINE}`}
					aria-label="اتصال أرضي"
				>
					<span style={{ fontSize: 22 }}>📞</span>
				</button>
				<button
					className="btn"
					style={{ background: 'transparent', border: 'none', padding: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
					onClick={() => setShowChat(true)}
					aria-label="دعم البوت"
				>
					<img src="https://i.ibb.co/7JJScM0Q/zain-ai.png" alt="دعم العملاء" style={{ width: 34, height: 34 }} />
				</button>
				<button
					className="btn btn-ghost"
					style={{ background: 'transparent', border: 'none', padding: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: palette.text }}
					onClick={toggleTheme}
					aria-label="تبديل الثيم"
				>
					{theme === 'light' ? '🌙' : '☀️'}
				</button>
			</div>
			<div
				className="chat-frame"
				style={{
					position: 'fixed',
					top: '50%',
					left: '50%',
					bottom: 'auto',
					right: 'auto',
					transform: 'translate(-50%, -50%)',
					width: 'min(420px, 92vw)',
					height: 'min(520px, 90vh)',
					background: '#fff',
					borderRadius: 14,
					overflow: 'hidden',
					boxShadow: '0 25px 50px rgba(0,0,0,0.35)',
					zIndex: 121,
					opacity: showChat ? 1 : 0,
					visibility: showChat ? 'visible' : 'hidden',
					pointerEvents: showChat ? 'auto' : 'none',
					transition: 'opacity 0.2s ease'
				}}
			>
				<button className="close-btn" style={{ position: 'absolute', top: 10, left: 10, background: '#dc3545', color: '#fff', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', zIndex: 2 }} onClick={() => setShowChat(false)}>✕</button>
				<iframe title="support" src={SUPPORT_LINK} style={{ position: 'absolute', top: '-25px', left: 0, right: 0, bottom: 0, width: '100%', height: 'calc(100% + 25px)', border: 'none', display: 'block' }} scrolling="no" />
			</div>
		</div>
	);
}

export default MassageChair;
