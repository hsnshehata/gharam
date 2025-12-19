import React, { useState } from 'react';

const WHATSAPP_LINK = 'https://wa.me/gharam';
const SUPPORT_LINK = 'https://zainbot.com/chat/ghazal';
const LANDLINE = '0472570908';

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

const makeupPackages = [
	{
		title: 'باكدج زفاف سبيشيال',
		price: '4,500 ج',
		items: [
			'ميك أب زفاف',
			'لف طرحة أو تسريحة',
			'وش وحواجب',
			'تنضيف بشرة كامل',
			'تركيب رموش',
			'تركيب عدسات',
			'فيك نيلز',
			'تأجير طرحة وتاج'
		]
	},
	{
		title: 'باكدج زفاف سبيشيال بلس',
		price: '5,500 ج',
		items: [
			'ميك أب زفاف',
			'تسريحة شعر أو لف طرحة',
			'وش وحواجب',
			'تنضيف بشرة كامل',
			'تركيب رموش',
			'تركيب عدسات',
			'فيك نيلز',
			'حمام مغربي',
			'حمام عطري',
			'صنفرة للجسم',
			'3 رسومات حنة',
			'تأجير تاج وطرحة',
			'تأجير خاتم - حلق - عقد',
			'بديكير ومنيكير',
			'سشوار'
		]
	},
	{
		title: 'باكدج حنة أورجينال',
		price: '3,000 ج',
		items: [
			'ميك أب',
			'لف طرحة أو تسريحة',
			'تركيب رموش',
			'تركيب عدسات',
			'فيك نيلز',
			'تأجير هيربيز أو تاج'
		]
	},
	{
		title: 'باكدج خطوبة/شبكة',
		price: '3,500 ج',
		items: [
			'ميك أب خطوبة',
			'لف طرحة أو تسريحة',
			'وش وحواجب',
			'تنضيف بشرة كامل',
			'تركيب رموش',
			'تركيب عدسات',
			'فيك نيلز',
			'تأجير هيربيز أوتاج',
			'سشوار'
		]
	}
];

const photoPackages = [
	{
		title: 'باكدج تصوير ألبوم 20×30',
		price: '1,600ج (استوديو) · 2,700ج (لوكيشن)',
		items: [
			'ألبوم 20×30 (10 مناظر خلفيات سيشن)',
			'فوتوبلوك 50×60',
			'ألبوم ميني',
			'40 كارت مكرر'
		]
	},
	{
		title: 'باكدج تصوير ألبوم 30×40',
		price: '2,200ج (استوديو) · 3,200ج (لوكيشن)',
		items: [
			'ألبوم 30×40 (12 منظر خلفيات سيشن)',
			'فوتوبلوك 50×60',
			'ألبوم ميني',
			'40 كارت مكرر'
		]
	}
];

const services = [
	{ name: 'وش وحواجب', price: '50 جنيه' },
	{ name: 'ديرما بلانينج', price: '70 جنيه' },
	{ name: 'شيفينج', price: '70 جنيه' },
	{ name: 'تنظيف بشرة سوفت', price: '200 جنيه' },
	{ name: 'تنظيف بشرة هارد بروفيشنال', price: '300 جنيه' },
	{ name: 'سشوار', price: '150 جنيه' },
	{ name: 'بيبي ليس (مكواة شعر)', price: '150 جنيه' },
	{ name: 'تاتو حواجب', price: '30 جنيه' },
	{ name: 'حواجب وشنب', price: '35 جنيه' },
	{ name: 'باديكير قدم', price: '200 جنيه' },
	{ name: 'باديكير يد', price: '100 جنيه' },
	{ name: '1 رسمة حنة', price: '35 جنيه' },
	{ name: 'تركيب أظافر عادية', price: '100 جنيه' },
	{ name: 'تركيب أظافر ستراس', price: '150 جنيه' },
	{ name: 'تركيب أظافر مرسومة', price: '200 جنيه' },
	{ name: 'إكستنشن', price: '250 جنيه' },
	{ name: 'صبغة لون شعر', price: '500-1000 جنيه' },
	{ name: 'خصل شعر', price: '500-1000 جنيه' },
	{ name: 'مجموعات العناية بالشعر', price: '450 - 600 - 650 جنيه' },
	{ name: 'حواجب فقط', price: '25 جنيه' },
	{ name: 'قص شعر', price: 'يبدأ من 50 جنيه' },
	{ name: 'غسيل شعر', price: '20 جنيه' },
	{ name: 'بوكيه ورد', price: '350 - 700 جنيه' },
	{ name: '3 رسومات حنة', price: '100 جنيه' },
	{ name: 'تنظيف وش (شمع)', price: '70 جنيه' },
	{ name: 'تنظيف شنب فقط', price: '10 جنيه' },
	{ name: 'تشقير حواجب', price: '30 جنيه' },
	{ name: 'سشوار وليس للأطفال', price: '200 جنيه' },
	{ name: 'صبغة شعر بدون أمونيا', price: 'تبدأ من 500 جنيه' },
	{ name: 'تسريحات الأطفال', price: '350 جنيه' },
	{ name: 'قص أطراف', price: '20 جنيه' },
	{ name: 'ماسك', price: '30 جنيه' },
	{ name: 'جلسة لتقصيف الشعر', price: '200 جنيه' },
	{ name: 'جلسة لتساقط الشعر', price: '200 جنيه' },
	{ name: 'جلسة ديتوكس لقشرة الشعر', price: '200 جنيه' },
	{ name: 'شمع أنف فقط', price: '10 جنيه' },
	{ name: 'شمع أنف خارجي', price: '20 جنيه' },
	{ name: 'التوينكل (ستراس الأسنان)', price: '150 - 200 جنيه' },
	{ name: 'اللاشز هير باي هير (رموش شعرة بشعرة)', price: '150 - 200 جنيه' },
	{ name: 'الحمامات (عطري + صنفرة + مغربي)', price: '700 جنيه' },
	{ name: 'تركيب الشعر بالسنتر', price: '70 جنيه لكل جرام شعر' },
	{ name: 'الفيلر المعالج', price: 'يبدأ من 1500 جنيه' },
	{ name: 'كرسي المساج الذكي', price: '100 - 200 - 250 جنيه حسب الجلسة' }
];

function PriceList() {
	const [theme, setTheme] = useState('light');
	const [showChat, setShowChat] = useState(false);
	const palette = themes[theme];

	const handlePackageWhatsApp = (title) => {
		const message = encodeURIComponent(`أريد حجز باكدج ${title}`);
		window.open(`${WHATSAPP_LINK}?text=${message}`, '_blank');
	};

	const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

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
		.price-page { background: var(--bg); color: var(--text); min-height: 100vh; font-family: 'Tajawal', 'Arial', sans-serif; }
		.container { width: min(1100px, 92%); margin: 0 auto; padding: 28px 0 72px; }
		h1 { margin: 0 0 12px; font-size: clamp(26px, 4vw, 38px); }
		.lead { color: var(--muted); line-height: 1.6; margin-bottom: 18px; }
		.section { margin: 24px 0; }
		.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
		.card { background: var(--card) !important; color: var(--text) !important; border: 1px solid var(--border) !important; border-radius: 14px; padding: 16px; box-shadow: 0 12px 26px var(--shadow); }
		.card h3 { margin: 0 0 8px; font-size: 18px; color: var(--text); }
		.price { font-weight: 800; color: var(--gold); margin-bottom: 10px; }
		ul { padding-left: 18px; margin: 0; color: var(--muted); line-height: 1.6; }
		.btn { margin-top: 12px; padding: 10px 14px; border: none; border-radius: 10px; background: linear-gradient(135deg, var(--gold), #e6c27b); color: #0f0b0a; font-weight: 700; cursor: pointer; }
		.services { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; margin-top: 12px; }
		.service { background: var(--card) !important; color: var(--text) !important; border: 1px solid var(--border) !important; border-radius: 12px; padding: 12px; display: flex; justify-content: space-between; box-shadow: 0 8px 18px var(--shadow); }
		.breadcrumb { margin-bottom: 16px; color: var(--muted); }
		.sticky-bar { position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; padding: 10px 14px; background: ${theme === 'light' ? 'rgba(255,255,255,0.96)' : 'rgba(24,18,16,0.92)'}; border: 1px solid var(--border); border-radius: 16px; box-shadow: 0 20px 40px var(--shadow); z-index: 100; }
		.sticky-bar .btn { padding: 12px 14px; }
		.btn-ghost { background: rgba(0,0,0,0.03); color: var(--text); border: 1px solid var(--border); }
	`; 

	return (
		<div className="price-page" dir="rtl">
			<style>{css}</style>
			<div className="container">
				<div className="breadcrumb">غرام سلطان • قائمة الأسعار</div>
				<h1>قائمة الأسعار</h1>
				<div className="lead">باكدجات الميك أب، باكدجات التصوير، وأسعار الخدمات الفردية في مكان واحد.</div>

				<div className="section">
					<h2>باكدجات الميك أب</h2>
					<div className="cards">
						{makeupPackages.map((pkg) => (
							<div className="card" key={pkg.title}>
								<h3>{pkg.title}</h3>
								<div className="price">{pkg.price}</div>
								<ul>
									{pkg.items.map((item) => (
										<li key={item}>{item}</li>
									))}
								</ul>
								<button className="btn" onClick={() => handlePackageWhatsApp(pkg.title)}>احجز الآن</button>
							</div>
						))}
					</div>
				</div>

				<div className="section">
					<h2>باكدجات التصوير</h2>
					<div className="cards">
						{photoPackages.map((pkg) => (
							<div className="card" key={pkg.title}>
								<h3>{pkg.title}</h3>
								<div className="price">{pkg.price}</div>
								<ul>
									{pkg.items.map((item) => (
										<li key={item}>{item}</li>
									))}
								</ul>
								<button className="btn" onClick={() => handlePackageWhatsApp(pkg.title)}>احجز الآن</button>
							</div>
						))}
					</div>
				</div>

				<div className="section">
					<h2>أسعار الخدمات الفردية</h2>
					<div className="services">
						{services.map((s) => (
							<div className="service" key={s.name}>
								<span>{s.name}</span>
								<span style={{ color: 'var(--gold)', fontWeight: 700 }}>{s.price}</span>
							</div>
						))}
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
			{showChat && (
				<div className="chat-frame" style={{ position: 'fixed', bottom: 20, right: 20, width: 360, maxWidth: '90vw', height: 520, background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.35)', zIndex: 121 }}>
					<button className="close-btn" style={{ position: 'absolute', top: 10, left: 10, background: '#dc3545', color: '#fff', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer' }} onClick={() => setShowChat(false)}>✕</button>
					<iframe title="support" src={SUPPORT_LINK} style={{ width: '100%', height: '100%', border: 'none' }} scrolling="no" />
				</div>
			)}
		</div>
	);
}

export default PriceList;
