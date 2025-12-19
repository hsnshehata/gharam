import React, { useEffect, useState } from 'react';

const MAP_LINK = 'https://maps.app.goo.gl/AHX3MDPhyLEuvWUN8';
const WHATSAPP_LINK = 'https://wa.me/gharam';
const LANDLINE = '0472570908';
const SUPPORT_LINK = 'https://zainbot.com/chat/ghazal';

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
		.page { background: var(--bg); min-height: 100vh; color: var(--text); font-family: 'Tajawal', 'Arial', sans-serif; }
		.container { width: min(1100px, 94%); margin: 0 auto; padding: 28px 0 72px; }
		h1 { margin: 0 0 12px; font-size: clamp(26px, 4vw, 38px); }
		.lead { color: var(--muted); line-height: 1.6; margin-bottom: 20px; }
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
	`; 

	return (
		<div className="page" dir="rtl">
			<style>{css}</style>
			<div className="container">
				<h1>كرسي المساج الذكي</h1>
				<div className="lead">كل التفاصيل والمزايا في مكان واحد من غير زحمة تصميمات.</div>
				{sections.map((sec) => (
					<div className="section" key={sec.title}>
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

				<div className="contact">
					<h3 style={{ marginTop: 0 }}>معلومات التواصل السريعة</h3>
					<div>📍 <a href={MAP_LINK} target="_blank" rel="noreferrer">دسوق - شارع الجيش</a></div>
					<div>📞 <a href={`tel:${LANDLINE}`}>رقم أرضي: {LANDLINE}</a></div>
					<div>💬 <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer">واتساب : wa.me/gharam</a></div>
					<div className="link-row">
						<button className="link" onClick={() => window.open(WHATSAPP_LINK, '_blank')}>احجز جلسة</button>
						<button className="link" onClick={() => window.location.href = `tel:${LANDLINE}`}>اتصل مباشرة</button>
					</div>
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
