import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { googleReviews } from '../data/googleReviews';

const WHATSAPP_LINK = 'https://wa.me/gharam';
const MAP_LINK = 'https://maps.app.goo.gl/cpF8J7rw6ScxZwiv5';
const TIKTOK_LINK = 'https://www.tiktok.com/@gharamsoltan';
const INSTAGRAM_LINK = 'https://www.instagram.com/gharamsoltan';
const FACEBOOK_LINK = 'https://www.facebook.com/gharam.ml';
const THREADS_LINK = 'https://www.threads.net/@gharamsoltan';
const SUPPORT_LINK = 'https://zainbot.com/chat/ghazal';
const LANDLINE = '0472570908';
const API_BASE = (process.env.REACT_APP_API_BASE || '').replace(/\/$/, '');

const themes = {
	light: {
		bg: '#f9f6f1',
		card: '#ffffff',
		text: '#1d130d',
		muted: '#5e5146',
		border: '#e6dfd4',
		gold: '#c49841',
		accent: '#a76bdb',
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
		accent: '#9b8bff',
		overlay: '#241915',
		shadow: 'rgba(0,0,0,0.28)'
	}
};

const availabilityCopy = {
	busy: { title: 'اليوم كامل', message: 'اليوم مشغول ولا يمكن حجزه حالياً.' },
	nearly: { title: 'يكاد يكتمل', message: 'اليوم على وشك الاكتمال، أسرعي في التواصل لتأكيد الميعاد.' },
	available: { title: 'متاح للحجز', message: 'اليوم متاح، احجزي دلوقتي قبل ما المواعيد تتملي.' }
};

const shuffle = (arr) => {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
};

const colorFromName = (name) => {
	const palette = ['#f5b342', '#5bc0de', '#4dd4ac', '#d56bff', '#ff7b7b', '#7ba7ff', '#ffc36b'];
	let sum = 0;
	for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i);
	return palette[sum % palette.length];
};

const PhoneIcon = ({ size = 18 }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.11 4.1 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
	</svg>
);

const WhatsAppIcon = ({ size = 18 }) => (
	<svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M16 2.7c-7.3 0-13.3 5.9-13.3 13.2 0 2.4.6 4.6 1.8 6.6L2 30l7.6-2.4c1.9 1 4 1.5 6.1 1.5 7.3 0 13.3-5.9 13.3-13.2S23.3 2.7 16 2.7z" fill="#25d366" />
		<path d="M24 20.8c-.3.9-1.7 1.6-2.4 1.7-.6.1-1.4.2-2.2-.1-.5-.2-1.1-.4-1.8-.8-3.1-1.8-5.1-4.7-5.2-4.9-.2-.3-1.2-1.6-1.2-3.1 0-1.5.8-2.2 1.1-2.6.3-.3.7-.4.9-.4h.6c.2 0 .5-.1.8.6.3.7 1 2.4 1.1 2.6.1.2.1.4 0 .6-.1.2-.2.4-.4.6-.2.2-.4.5-.6.7-.2.3-.4.5-.2.9.2.3 1 1.6 2.2 2.6 1.5 1.4 2.7 1.8 3.1 2 .3.1.6.1.8-.1.2-.2.9-1 .1-2.1-.8-1.1-1.7-1.5-2-.1-.3.4-.8.5-1.3.3-.6-.3-1.8-.9-2.6-1.6-.8-.7-1.4-1.7-1.6-2-.2-.3-.1-.6.1-.8.2-.2.6-.7.8-.9.3-.3.3-.5.5-.8.2-.3.1-.6 0-.8-.1-.2-.8-2-1.1-2.6-.3-.6-.5-.5-.7-.5H14c-.3 0-.7.1-1 .5-.3.4-1.2 1.1-1.2 2.6 0 1.5 1.2 2.9 1.3 3.1.1.2 2.2 3.5 5.5 5.4.4.2 2.9 1.2 4 .6.9-.5 1.5-1.3 1.7-1.5.2-.2.2-.4.1-.5-.1-.2-.5-.4-.6-.4z" fill="#fff" />
	</svg>
);

function Landing() {
	const [packageType, setPackageType] = useState('makeup');
	const [date, setDate] = useState('');
	const [availability, setAvailability] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [showChat, setShowChat] = useState(false);
	const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
	const [theme, setTheme] = useState('light');

	const palette = themes[theme];
	const selectedReviews = useMemo(() => shuffle(googleReviews).slice(0, 12), []);
	const availabilityBadge = availability ? availabilityCopy[availability.status] : null;

	useEffect(() => {
		const observer = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) entry.target.classList.add('visible');
			});
		}, { threshold: 0.2 });

		document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
		return () => observer.disconnect();
	}, []);

	const handleCheckAvailability = async () => {
		setError('');
		setAvailability(null);
		setShowAvailabilityModal(false);
		if (!date) {
			setError('اختاري التاريخ الأول.');
			return;
		}
		setLoading(true);
		try {
			const res = await axios.get(`${API_BASE}/api/public/availability`, { params: { date, packageType } });
			setAvailability(res.data);
			setShowAvailabilityModal(true);
		} catch (err) {
			setError('حصل خطأ في الاستعلام، جربي تاني.');
		} finally {
			setLoading(false);
		}
	};

	const css = `
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
		body { margin: 0; background: var(--bg); color: var(--text); font-family: 'Tajawal', 'Arial', sans-serif; }
		.landing-page { background: radial-gradient(circle at 15% 20%, rgba(198,161,91,0.12), transparent 26%), radial-gradient(circle at 85% 15%, rgba(167,107,219,0.10), transparent 24%), var(--bg); min-height: 100vh; }
		.container { width: min(1200px, 92%); margin: 0 auto; }
		.topbar { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 18px 0; }
		.brand { display: flex; align-items: center; justify-content: center; text-align: center; gap: 12px; font-weight: 800; }
		.brand img { width: 64px; height: 64px; object-fit: contain; }
		.pill { display: inline-flex; gap: 8px; align-items: center; padding: 10px 14px; background: rgba(0,0,0,0.03); border: 1px solid var(--border); border-radius: 999px; color: var(--muted); font-size: 14px; }
		.hero { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 32px; align-items: center; padding: 24px 0 12px; }
		.hero img { width: 100%; border-radius: 16px; object-fit: cover; box-shadow: 0 30px 60px var(--shadow); border: 1px solid var(--border); background: var(--card); }
		h1 { margin: 8px 0 16px; font-size: clamp(28px, 4vw, 42px); line-height: 1.2; }
		h2 { margin: 0 0 12px; }
		p { color: var(--muted); line-height: 1.75; margin: 0; }
		.cta-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
		.cta-row.center { justify-content: center; }
		.btn { border: none; cursor: pointer; padding: 12px 18px; border-radius: 12px; font-weight: 700; transition: transform 0.15s ease, box-shadow 0.15s ease; color: #0f0b0a; }
		.btn:hover { transform: translateY(-2px); box-shadow: 0 12px 28px var(--shadow); }
		.btn-primary { background: linear-gradient(135deg, var(--gold), #e6c27b); color: #0f0b0a; }
		.btn-outline { background: transparent; color: var(--text); border: 1px solid var(--border); }
		.btn-ghost { background: rgba(0,0,0,0.03); color: var(--text); border: 1px solid var(--border); }
		.btn-prices { background: linear-gradient(135deg, var(--gold), #e6c27b); color: #0f0b0a; padding: 14px 24px; font-size: 16px; min-width: 220px; text-align: center; box-shadow: 0 14px 30px var(--shadow); border: 1px solid var(--border); }
		.grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin: 26px 0; }
		.landing-page .card { background: var(--card) !important; color: var(--text) !important; border: 1px solid var(--border) !important; box-shadow: 0 15px 30px var(--shadow) !important; padding: 18px; border-radius: 14px; }
		.card h3 { margin: 0 0 6px; font-size: 19px; color: var(--text); }
		.card p { margin: 0; }
		.badge { display: inline-block; background: rgba(198,161,91,0.18); color: var(--text); padding: 6px 12px; border-radius: 999px; font-size: 13px; border: 1px solid rgba(198,161,91,0.4); }
		.highlight { margin: 32px 0; }
		.massage-banner { position: relative; overflow: hidden; border-radius: 16px; min-height: 340px; color: #fff; display: flex; align-items: flex-end; justify-content: flex-start; padding: 26px 30px; background: url('https://www.irestonline.com.au/wp-content/uploads/2024/04/02-brown.jpg') center/cover no-repeat; box-shadow: 0 20px 40px var(--shadow); border: 1px solid var(--border); }
		.massage-banner::after { content: ''; position: absolute; inset: 0; background: linear-gradient(130deg, rgba(0,0,0,0.35) 18%, rgba(0,0,0,0.18) 52%, rgba(0,0,0,0.05)); }
		.massage-banner .content { position: relative; z-index: 1; max-width: 520px; display: grid; gap: 10px; text-align: right; margin-right: auto; background: rgba(0,0,0,0.34); backdrop-filter: blur(4px); padding: 16px 18px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.18); box-shadow: 0 12px 28px rgba(0,0,0,0.3); }
		.massage-banner h2 { margin: 0; color: #fff; }
		.massage-banner p { color: #f0eae4; margin: 0; }
		.badge-new { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.14); color: #fff; padding: 8px 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.3); font-weight: 700; }
		.massage-banner .cta-row .btn-outline { border-color: rgba(255,255,255,0.4); color: #fff; background: rgba(255,255,255,0.08); }
		.massage-banner .cta-row .btn-outline:hover { background: rgba(255,255,255,0.14); }
		.why-card { margin: 10px 0 32px; }
		.availability { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; align-items: start; margin: 32px 0; }
		.availability form { display: grid; gap: 12px; }
		label { color: var(--muted); font-size: 14px; }
		.landing-page input, .landing-page select { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--card); color: var(--text); }
		.availability-result { padding: 18px; border-radius: 14px; border: 1px solid var(--border); background: var(--card); min-width: min(460px, 92vw); box-shadow: 0 24px 48px var(--shadow); color: var(--text); }
		.availability-result h4 { margin: 0 0 6px; color: var(--text); }
		.contact-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin: 20px 0; }
		.contact-card { display: flex; flex-direction: column; gap: 8px; padding: 16px; border-radius: 14px; border: 1px solid var(--border); background: rgba(0,0,0,0.02); box-shadow: 0 10px 22px var(--shadow); }
		.contact-title { font-weight: 700; color: var(--text); }
		.contact-desc { color: var(--muted); font-size: 14px; }
		.quick-links { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin: 8px 0 24px; }
		.quick-link { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: rgba(0,0,0,0.02); color: var(--text); text-decoration: none; transition: transform 0.15s ease, box-shadow 0.15s ease; }
		.quick-link:hover { transform: translateY(-2px); box-shadow: 0 10px 20px var(--shadow); }
		.quick-link span.icon { font-size: 18px; }
		.reviews { margin: 30px 0 40px; }
		.reviews-header { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
		.stars { color: #f4c150; font-size: 18px; letter-spacing: 1px; }
		.review-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-top: 16px; }
		.review-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; min-height: 170px; box-shadow: 0 14px 28px var(--shadow); }
		.reveal { opacity: 0; transform: translateY(30px); transition: opacity 0.7s ease, transform 0.7s ease; }
		.reveal.visible { opacity: 1; transform: translateY(0); }
		.review-head { display: flex; align-items: center; gap: 10px; }
		.avatar { width: 40px; height: 40px; border-radius: 50%; color: #fff; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; }
		.review-card h5 { margin: 0; font-size: 15px; color: var(--text); }
		.review-card small { color: var(--muted); }
		.review-card p { margin: 8px 0 0; color: var(--muted); line-height: 1.5; }
		.footer { margin: 28px 0 56px; text-align: center; color: var(--muted); font-size: 14px; }
		.sticky-bar { position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; padding: 8px 10px; background: ${theme === 'light' ? 'rgba(255,255,255,0.96)' : 'rgba(24,18,16,0.92)'}; border: 1px solid var(--border); border-radius: 14px; box-shadow: 0 20px 40px var(--shadow); z-index: 100; width: auto; max-width: calc(100% - 24px); }
		.sticky-bar .btn { padding: 10px 12px; }
		.support-floating { position: fixed; bottom: 20px; right: 20px; z-index: 120; }
		.chat-frame { position: fixed; bottom: 20px; right: 20px; width: 360px; max-width: 90vw; height: 520px; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.35); z-index: 121; }
		.close-btn { position: absolute; top: 10px; left: 10px; background: #dc3545; color: #fff; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; }
		.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 130; padding: 16px; }
		.modal-card { position: relative; }
		@media (max-width: 768px) {
			hero { grid-template-columns: 1fr; padding-top: 12px; }
			.sticky-bar { width: calc(100% - 24px); justify-content: space-between; background: ${theme === 'light' ? 'rgba(255,255,255,0.98)' : 'rgba(24,18,16,0.95)'}; }
			.topbar { flex-direction: column; align-items: flex-start; }
		}
	`;

	const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

	return (
		<div className="landing-page" dir="rtl">
			<style>{css}</style>
			<div className="container">
				<div className="topbar">
					<div className="brand">
						<img src="/logo.png" alt="شعار غرام سلطان" />
						<div>
							<div style={{ fontSize: 18 }}>غرام سلطان</div>
							<div className="pill">بيوتي سنتر وستوديو </div>
						</div>
					</div>
				</div>

				<section className="hero reveal">
					<div>
						<img src="/gharam.jpg" alt="غرام سلطان تحمل شهادة البورد الأمريكي" />
					</div>
					<div>
						<h1>إطلالة ساحرة مع خبيرة الميكب غرام سلطان</h1>
						<p>
							احصلي على أحدث صيحات الميكب والتصوير الاحترافي بلمسة تجمع الخبرة والابتكار.
							راحة فاخرة بضغطة زر مع كرسي المساج الذكي ضد الجاذبية.
						</p>
						<div className="pill">جودة منتجات عالمية • اهتمام بالتفاصيل • راحة فاخرة</div>
						<div className="cta-row center">
							<button className="btn btn-prices" onClick={() => window.location.href = '/prices'} aria-label="أسعار الخدمات">
								<span role="img" aria-label="قائمة">💸</span>
								<span style={{ marginInlineStart: 8, fontSize: 16 }}>أسعار الخدمات</span>
							</button>
						</div>
					</div>
				</section>

				<section className="grid-3 reveal">
					<div className="card">
						<h3>الخبرة</h3>
						<p>منذ 2017 خبرة واسعة وشهادات معتمدة. نواجه كل التحديات ونحل مشاكل كل عميلة باحتراف.</p>
					</div>
					<div className="card">
						<h3>الوقت</h3>
						<p>التزام بالمواعيد، سرعة وكفاءة، استجابة سريعة وجدولة مرنة تناسبك.</p>
					</div>
					<div className="card">
						<h3>الجودة</h3>
						<p>منتجات عالمية، احترافية عالية، متابعة أحدث التقنيات وتجربة عملاء مريحة من البداية للنهاية.</p>
					</div>
				</section>

					<section className="availability reveal">
						<div className="card">
							<span className="badge">تأكيد التوافر</span>
							<h2 style={{ margin: '8px 0 12px' }}>تأكدي إن اليوم فاضي للباكدج</h2>
							<form onSubmit={(e) => { e.preventDefault(); handleCheckAvailability(); }}>
								<div>
									<label>نوع الباكدج</label>
									<select value={packageType} onChange={(e) => setPackageType(e.target.value)}>
										<option value="makeup">ميك أب / حنة / حجز صالون</option>
										<option value="photo">تصوير</option>
									</select>
								</div>
								<div>
									<label>تاريخ الحجز</label>
									<input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
								</div>
								<p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>اختاري نوع الباكدج والتاريخ واعرفي التوافر فورًا.</p>
								{error && <div style={{ color: '#d9534f', fontSize: 14 }}>{error}</div>}
								<button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'بيتحقق...' : 'افحص التوافر'}</button>
							</form>
						</div>
					</section>

				<section className="highlight reveal">
					<div className="massage-banner">
						<div className="content">
							<span className="badge-new">✨ متوفر الآن</span>
							<h2>كرسي المساج الذكي ضد الجاذبية</h2>
							<p>راحة فاخرة تحسسك إنك طايرة. جربي جلسة الاسترخاء مع تقنيات انعدام الوزن. إحساس مختلف بعد يوم طويل، مع ضغط وتدفئة تخلّي جسمك يشكرك.</p>
							<div className="cta-row">
								<button className="btn btn-primary" onClick={() => window.open(WHATSAPP_LINK, '_blank')} aria-label="احجزي جلسة واتساب">
									<WhatsAppIcon size={18} />
									<span style={{ marginInlineStart: 6 }}>احجزي جلسة</span>
								</button>
								<button className="btn btn-outline" onClick={() => window.location.href = '/massage-chair'} aria-label="تفاصيل الكرسي">💺 تفاصيل الكرسي</button>
							</div>
						</div>
					</div>
				</section>

				<section className="card why-card reveal">
					<h3 style={{ marginTop: 0 }}>ليه تختارينا؟</h3>
					<div style={{ color: 'var(--text)', lineHeight: 1.7, display: 'grid', gap: 8 }}>
						<div>خبرة واحترافية: سنوات من الخبرة في مجال التجميل تضمن لكِ نتائج مبهرة.</div>
						<div>منتجات عالية الجودة: نستخدم أفضل المنتجات العالمية لضمان سلامة بشرتكِ وجمالها.</div>
						<div>اهتمام بالتفاصيل: نحرص على تقديم تجربة مريحة وممتعة، مع التركيز على أدق التفاصيل لتحقيق إطلالة مثالية.</div>
						<div>سنتر غرام سلطان حاصل على البورد الأمريكي وهي شهادة معتمدة دوليًا.</div>
					</div>
				</section>

				<section className="card reveal">
					<h2 style={{ marginTop: 0, marginBottom: 6 }}>تواصل فوري وكل القنوات</h2>
					<p style={{ color: 'var(--muted)', margin: '0 0 14px' }}>اختاري الطريقة المناسبة ليكي؛ مكالمة، واتساب، خريطة أو سوشيال في ضغطة.</p>
					<div className="contact-grid" style={{ marginBottom: 12 }}>
						<div className="contact-card" style={{ borderColor: '#25d36655' }}>
							<span className="contact-title">واتساب</span>
							<span className="contact-desc">رد سريع وتأكيد تفاصيل الميعاد.</span>
							<button className="btn" style={{ background: '#25d366', color: '#0f0b0a', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => window.open(WHATSAPP_LINK, '_blank')}>
								<WhatsAppIcon size={18} />
								<span>مراسلة واتساب</span>
							</button>
						</div>
						<div className="contact-card" style={{ borderColor: '#c6a15b55' }}>
							<span className="contact-title">اتصال أرضي</span>
							<span className="contact-desc">للاستفسارات السريعة: {LANDLINE}</span>
							<button className="btn" style={{ background: '#c6a15b', color: '#0f0b0a', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => window.location.href = `tel:${LANDLINE}`}>
								<PhoneIcon size={18} />
								<span>اتصلي الآن</span>
							</button>
						</div>
						<div className="contact-card" style={{ borderColor: '#4ea1ff55' }}>
							<span className="contact-title">الموقع</span>
							<span className="contact-desc">شارع الجيش، مدينة دسوق . </span>
							<button className="btn" style={{ background: '#4ea1ff', color: '#0f0b0a', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => window.location.href = MAP_LINK}>
								<span role="img" aria-label="خريطة">📍</span>
								<span>افتحي الخريطة</span>
							</button>
						</div>
						<div className="contact-card" style={{ borderColor: '#9b8bff55' }}>
							<span className="contact-title">دعم فوري</span>
							<span className="contact-desc">زري البوت لأسئلة سريعة.</span>
							<button className="btn" style={{ background: '#9b8bff', color: '#0f0b0a', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => setShowChat(true)}>
								<span role="img" aria-label="دعم">💬</span>
								<span>افتحي البوت</span>
							</button>
						</div>
					</div>
					<div className="quick-links">
						<a className="quick-link" href={INSTAGRAM_LINK} target="_blank" rel="noreferrer">
							<span className="icon">📷</span>
							<span>إنستجرام</span>
						</a>
						<a className="quick-link" href={TIKTOK_LINK} target="_blank" rel="noreferrer">
							<span className="icon">🎵</span>
							<span>تيكتوك</span>
						</a>
						<a className="quick-link" href={FACEBOOK_LINK} target="_blank" rel="noreferrer">
							<span className="icon">📘</span>
							<span>فيسبوك</span>
						</a>
						<a className="quick-link" href={THREADS_LINK} target="_blank" rel="noreferrer">
							<span className="icon">🧵</span>
							<span>ثريدز</span>
						</a>
					</div>
				</section>

				<section className="reviews reveal">
					<div className="reviews-header">
						<div>
							<div className="badge" style={{ background: 'rgba(244,193,80,0.15)' }}>تقييمات جوجل</div>
							<h2 style={{ margin: '6px 0' }}>5.0 · أكثر من 1100 مراجعة</h2>
							<div className="stars">★★★★★</div>
							<div style={{ color: 'var(--muted)', fontSize: 14 }}>غرام سلطان بيوتي سنتر وستوديو · شارع الجيش، دسوق</div>
						</div>
						<div className="cta-row">
							<button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => window.open('https://g.page/r/CeoPiyI-r3niEAE/review', '_blank')} aria-label="اكتبي تقييمك">
								<span>✍️</span>
								<span>اكتبي تقييمك</span>
							</button>
						</div>
					</div>
					<div className="review-grid">
						{selectedReviews.map((rev, idx) => {
							const letter = rev.author?.trim()?.charAt(0)?.toUpperCase() || 'ج';
							const bg = colorFromName(rev.author || 'ج');
							return (
								<div className="review-card" key={`${rev.author}-${idx}`}>
									<div className="review-head">
										<div className="avatar" style={{ background: bg }}>{letter}</div>
										<div>
											<h5>{rev.author}</h5>
											<small>{rev.relativeTime}</small>
										</div>
									</div>
									<div className="stars" style={{ fontSize: 15, marginTop: 6 }}>★★★★★</div>
									<p>{rev.text}</p>
								</div>
							);
						})}
					</div>
					<div className="cta-row" style={{ marginTop: 12 }}>
						<button className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => window.open('https://g.page/r/CeoPiyI-r3niEAE', '_blank')} aria-label="عرض كل التقييمات">
							<span>★</span>
							<span>عرض كل التقييمات</span>
						</button>
					</div>
				</section>

				<section className="footer reveal" style={{ paddingBottom: 90 }}>
					<div>تابعينا: <a href={INSTAGRAM_LINK} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>إنستجرام</a> · <a href={TIKTOK_LINK} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>تيكتوك</a> · <a href={FACEBOOK_LINK} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>فيسبوك</a> · <a href={THREADS_LINK} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>ثريدز</a></div>
					<div style={{ marginTop: 6, fontSize: 13 }}>
						© غرام سلطان بيوتي سنتر · اسم يعني الثقة
					</div>
				</section>
			</div>

			{showAvailabilityModal && availabilityBadge && (
				<div className="modal-backdrop" onClick={() => setShowAvailabilityModal(false)}>
					<div className="availability-result modal-card" onClick={(e) => e.stopPropagation()}>
						<button className="close-btn" onClick={() => setShowAvailabilityModal(false)} aria-label="إغلاق">✕</button>
						<h4>{availabilityBadge.title}</h4>
						<p>{availabilityBadge.message}</p>
						<p style={{ color: 'var(--muted)' }}>نوع الطلب: {availability?.type === 'photo' ? 'تصوير' : 'ميك أب/حنة'}</p>
						<div className="cta-row" style={{ marginTop: 10 }}>
							<button className="btn btn-primary" onClick={() => window.open(WHATSAPP_LINK, '_blank')}>تواصلي واتساب</button>
							<button className="btn btn-outline" onClick={() => window.location.href = `tel:${LANDLINE}`}>اتصال أرضي</button>
						</div>
					</div>
				</div>
			)}

			<div className="sticky-bar">
				<button
					className="btn"
					style={{ background: 'transparent', border: 'none', padding: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
					onClick={() => window.open(WHATSAPP_LINK, '_blank')}
					aria-label="واتساب"
				>
					<WhatsAppIcon size={32} />
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
				<div className="chat-frame" style={{ position: 'fixed', bottom: 20, right: 20, width: 360, maxWidth: '90vw', height: 520, maxHeight: '80vh', background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.35)', zIndex: 121 }}>
					<button className="close-btn" onClick={() => setShowChat(false)}>✕</button>
					<iframe title="support" src={SUPPORT_LINK} style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} scrolling="no" />
				</div>
			)}
		</div>
	);
}

export default Landing;
