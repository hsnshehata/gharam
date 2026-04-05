import React, { useEffect, useState } from 'react';
import AIChatPopup from '../components/AIChatPopup';

const WHATSAPP_LINK = 'https://wa.me/gharam';
const MAP_LINK = 'https://maps.app.goo.gl/cpF8J7rw6ScxZwiv5';
const SUPPORT_LINK = 'https://zainbot.com/chat/ghazal';
const LANDLINE = '0472570908';
const INSTAGRAM_LINK = 'https://www.instagram.com/gharamsoltan';
const TIKTOK_LINK = 'https://www.tiktok.com/@gharamsoltan';
const FACEBOOK_LINK = 'https://www.facebook.com/gharam.ml';
const THREADS_LINK = 'https://www.threads.net/@gharamsoltan';
const BUSINESS_NAME = 'غرام سلطان بيوتي سنتر وستوديو';
const CANONICAL_URL = 'https://gharam.art/prices';
const PAGE_TITLE = 'قائمة أسعار خدمات وباكدجات غرام سلطان';
const PAGE_DESCRIPTION = 'أسعار باكدجات الميك أب والتصوير والخدمات الفردية في غرام سلطان بيوتي سنتر بكفر الشيخ.';
const OG_IMAGE = 'https://gharamsoltan.com/og-cover.jpg';
const OG_IMAGE_WIDTH = '1200';
const OG_IMAGE_HEIGHT = '630';
const TWITTER_SITE = '@gharamsoltan';

const socialLinks = [
	{
		href: INSTAGRAM_LINK, label: 'Instagram', color: '#e1306c', svg: (
			<path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z" />
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
	{
		href: WHATSAPP_LINK, label: 'WhatsApp', color: '#25d366', svg: (
			<path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
		)
	}
];

const WhatsAppIcon = ({ size = 18 }) => (
	<svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M16 2.7c-7.3 0-13.3 5.9-13.3 13.2 0 2.4.6 4.6 1.8 6.6L2 30l7.6-2.4c1.9 1 4 1.5 6.1 1.5 7.3 0 13.3-5.9 13.3-13.2S23.3 2.7 16 2.7z" fill="#25d366" />
		<path d="M24 20.8c-.3.9-1.7 1.6-2.4 1.7-.6.1-1.4.2-2.2-.1-.5-.2-1.1-.4-1.8-.8-3.1-1.8-5.1-4.7-5.2-4.9-.2-.3-1.2-1.6-1.2-3.1 0-1.5.8-2.2 1.1-2.6.3-.3.7-.4.9-.4h.6c.2 0 .5-.1.8.6.3.7 1 2.4 1.1 2.6.1.2.1.4 0 .6-.1.2-.2.4-.4.6-.2.2-.4.5-.6.7-.2.3-.4.5-.2.9.2.3 1 1.6 2.2 2.6 1.5 1.4 2.7 1.8 3.1 2 .3.1.6.1.8-.1.2-.2.9-1 .1-2.1-.8-1.1-1.7-1.5-2-.1-.3.4-.8.5-1.3.3-.6-.3-1.8-.9-2.6-1.6-.8-.7-1.4-1.7-1.6-2-.2-.3-.1-.6.1-.8.2-.2.6-.7.8-.9.3-.3.3-.5.5-.8.2-.3.1-.6 0-.8-.1-.2-.8-2-1.1-2.6-.3-.6-.5-.5-.7-.5H14c-.3 0-.7.1-1 .5-.3.4-1.2 1.1-1.2 2.6 0 1.5 1.2 2.9 1.3 3.1.1.2 2.2 3.5 5.5 5.4.4.2 2.9 1.2 4 .6.9-.5 1.5-1.3 1.7-1.5.2-.2.2-.4.1-.5-.1-.2-.5-.4-.6-.4z" fill="#fff" />
	</svg>
);

const makeupPackages = [
	{
		title: 'باكدج زفاف سبيشيال',
		price: '5,000 ج',
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
		price: '6,000 ج',
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
		price: '3,500 ج',
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
		price: '4,000 ج',
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
		price: '2,000ج (استوديو) · 3,000ج (لوكيشن)',
		items: [
			'ألبوم 20×30 (10 مناظر خلفيات سيشن)',
			'فوتوبلوك 50×60',
			'ألبوم ميني',
			'40 كارت مكرر'
		]
	},
	{
		title: 'باكدج تصوير ألبوم 30×40',
		price: '2,700ج (استوديو) · 3,700ج (لوكيشن)',
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
	{ name: 'تنظيف بشرة هارد بروفيشنال', price: '300 جنيه' },
	{ name: 'سشوار', price: '150 - 200  جنيه' },
	{ name: 'بيبي ليس (مكواة شعر)', price: '150 - 200 جنيه' },
	{ name: 'تاتو حواجب', price: '30 جنيه' },
	{ name: 'حواجب وشنب', price: '35 جنيه' },
	{ name: 'باديكير قدم', price: '300 جنيه' },
	{ name: 'باديكير يد', price: '150 جنيه' },
	{ name: '1 رسمة حنة', price: '35 جنيه' },
	{ name: 'تركيب أظافر عادية', price: '100 جنيه' },
	{ name: 'تركيب أظافر ستراس', price: '150 جنيه' },
	{ name: 'تركيب أظافر مرسومة', price: '200 جنيه' },
	{ name: 'إكستنشن طبيعي ( ايجار )', price: '500 جنيه' },
	{ name: 'إكستنشن صناعي ( شراء )', price: '350 جنيه' },
	{ name: 'صبغة شعر بدون أمونيا', price: 'تبدأ من 500 جنيه' },
	{ name: 'خصل شعر', price: 'تبدأ من 500 جنيه' },
	{ name: 'مجموعات العناية بالشعر', price: ' 750 جنيه' },
	{ name: 'حواجب فقط', price: '25 جنيه' },
	{ name: 'قص شعر', price: 'يبدأ من 50 جنيه' },
	{ name: 'غسيل شعر', price: '30 جنيه' },
	{ name: 'بوكيه ورد', price: '350 - 1200 جنيه' },
	{ name: '3 رسومات حنة', price: '100 جنيه' },
	{ name: 'تنظيف وش (شمع)', price: '70 جنيه' },
	{ name: 'تنظيف شنب فقط', price: '10 جنيه' },
	{ name: 'تشقير حواجب', price: '30 جنيه' },
	{ name: 'سشوار وليس للأطفال', price: '200 جنيه' },
	{ name: 'سشوار وليس', price: '300 جنيه' },
	{ name: 'تسريحات الأطفال', price: '350 جنيه' },
	{ name: 'قص أطراف', price: '30 جنيه' },
	{ name: 'ماسك', price: '40 جنيه' },
	{ name: 'جلسة لتقصيف الشعر', price: '300 جنيه' },
	{ name: 'جلسة لتساقط الشعر', price: '300 جنيه' },
	{ name: 'جلسة ديتوكس لقشرة الشعر', price: '300 جنيه' },
	{ name: 'شمع أنف داخلي فقط', price: '20 جنيه' },
	{ name: 'شمع أنف خارجي', price: '20 جنيه' },
	{ name: 'التوينكل (ستراس الأسنان)', price: '150 - 200 جنيه' },
	{ name: 'اللاشز هير باي هير (رموش شعرة بشعرة)', price: '200 جنيه' },
	{ name: 'الحمامات (عطري + صنفرة + مغربي)', price: '700 جنيه' },
	{ name: 'الفيلر المعالج', price: 'يبدأ من 1500 جنيه' },
	{ name: 'كرسي المساج الذكي', price: '100 - 200 - 250 جنيه حسب الجلسة' }
];

function PriceList() {
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
	const [showAIChat, setShowAIChat] = useState(false);
	const [fabOpen, setFabOpen] = useState(false);

	const handlePackageWhatsApp = (title) => {
		const message = encodeURIComponent(`أريد حجز باكدج ${title}`);
		window.open(`${WHATSAPP_LINK}?text=${message}`, '_blank');
	};

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
		setMeta('og:image:alt', `${BUSINESS_NAME} | قائمة الأسعار`, 'property');
		setMeta('twitter:card', 'summary_large_image');
		setMeta('twitter:site', TWITTER_SITE);
		setMeta('twitter:title', `${PAGE_TITLE} | ${BUSINESS_NAME}`);
		setMeta('twitter:description', PAGE_DESCRIPTION);
		setMeta('twitter:image', OG_IMAGE);
		setMeta('twitter:image:alt', `${BUSINESS_NAME} | قائمة الأسعار`);

		let canonical = document.querySelector('link[rel="canonical"]');
		if (!canonical) {
			canonical = document.createElement('link');
			canonical.setAttribute('rel', 'canonical');
			document.head.appendChild(canonical);
		}
		canonical.setAttribute('href', CANONICAL_URL);

		const makeOffer = (name, price, items, serviceType) => ({
			'@type': 'Offer',
			priceCurrency: 'EGP',
			price,
			availability: 'https://schema.org/InStock',
			itemOffered: {
				'@type': 'Service',
				name,
				description: Array.isArray(items) ? items.join(' - ') : undefined,
				serviceType
			}
		});

		const packageOffers = [
			...makeupPackages.map((pkg) => makeOffer(pkg.title, pkg.price, pkg.items, 'MakeupPackage')),
			...photoPackages.map((pkg) => makeOffer(pkg.title, pkg.price, pkg.items, 'PhotoPackage'))
		];

		const serviceOffers = services.map((svc) => makeOffer(svc.name, svc.price, null, 'BeautyService'));
		const offers = [...packageOffers, ...serviceOffers];

		const itemList = {
			'@context': 'https://schema.org',
			'@type': 'ItemList',
			name: 'قائمة أسعار غرام سلطان',
			itemListElement: offers.map((offer, index) => ({
				'@type': 'ListItem',
				position: index + 1,
				item: offer
			}))
		};

		const breadcrumb = {
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{
					'@type': 'ListItem',
					position: 1,
					name: 'الرئيسية',
					item: 'https://gharamsoltan.com/'
				},
				{
					'@type': 'ListItem',
					position: 2,
					name: 'الأسعار',
					item: CANONICAL_URL
				}
			]
		};

		const pageSchema = {
			'@context': 'https://schema.org',
			'@type': 'WebPage',
			name: PAGE_TITLE,
			description: PAGE_DESCRIPTION,
			url: CANONICAL_URL
		};

		let jsonLd = document.getElementById('seo-json-ld-prices');
		if (!jsonLd) {
			jsonLd = document.createElement('script');
			jsonLd.type = 'application/ld+json';
			jsonLd.id = 'seo-json-ld-prices';
			document.head.appendChild(jsonLd);
		}
		jsonLd.textContent = JSON.stringify([pageSchema, breadcrumb, itemList]);
	}, []);

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


	// Removed theme toggle logic

	const scrollToSection = (id) => {
		const el = document.getElementById(id);
		if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
	};

	const css = `
		:root {
			--bg: ${palette.bg};
			--card: ${palette.card};
			--text: ${palette.text};
			--muted: ${palette.muted};
			--border: ${palette.border};
			--gold: ${palette.gold};
			--shadow: ${palette.shadow};
			--glass: rgba(15,36,25,0.45);
			--glass-border: rgba(201,160,78,0.12);
			--glassBlur: blur(18px);
		}
		.price-page { position: relative; color: var(--text); min-height: 100vh; font-family: 'Tajawal', 'Arial', sans-serif; overflow: hidden; padding-bottom: 80px; }
		.hero-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100vh; object-fit: cover; z-index: -2; filter: brightness(0.7) contrast(1.1); pointer-events: none; }
		.hero-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100vh; z-index: -1; background: linear-gradient(to top, rgba(8,15,11,1) 0%, rgba(8,15,11,0.85) 40%, rgba(8,15,11,0.4) 100%); pointer-events: none; }
		.hero-particles { position: fixed; top: 0; left: 0; width: 100%; height: 100vh; z-index: -1; pointer-events: none; background-image: radial-gradient(circle at center, rgba(201,160,78,0.1) 0%, transparent 8%); background-size: 60px 60px; animation: particleFloat 20s linear infinite; opacity: 0.5; }
		@keyframes particleFloat { 0% { background-position: 0 0; } 100% { background-position: -60px -60px; } }
		
		.container { width: min(1180px, 92%); margin: 0 auto; position: relative; z-index: 1; }
		
		.topbar { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 24px 0 40px; }
		.brand { display: flex; align-items: center; justify-content: center; text-align: center; gap: 12px; font-weight: 800; }
		.brand img { width: 64px; height: 64px; object-fit: contain; }
		.pill { display: inline-flex; gap: 8px; align-items: center; padding: 10px 14px; background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 999px; color: var(--muted); font-size: 14px; backdrop-filter: blur(8px); }
		
		h1 { margin: 0 0 8px; font-size: clamp(28px, 4vw, 40px); text-align: center; color: var(--gold); }
		.lead { color: var(--text); text-align: center; font-size: 16px; margin-bottom: 24px; }
		
		.chips { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-bottom: 40px; }
		.chip { padding: 12px 20px; border-radius: 999px; border: 1px solid rgba(201,160,78,0.2); background: rgba(20,40,28,0.6); backdrop-filter: blur(8px); cursor: pointer; font-weight: 700; transition: all 0.3s ease; color: var(--text); display: inline-flex; align-items: center; gap: 8px; font-size: 15px; }
		.chip:hover { transform: translateY(-3px); border-color: var(--gold); box-shadow: 0 10px 20px rgba(201,160,78,0.15); background: rgba(20,40,28,0.8); }
		
		.section { margin: 40px 0; }
		.section-header { margin-bottom: 24px; text-align: center; }
		.section-header h2 { font-size: 26px; color: #fff; margin: 0 0 12px; position: relative; display: inline-block; }
		.section-header h2::after { content: ''; position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 60px; height: 3px; background: var(--gold); border-radius: 2px; }
		
		.package-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin: 30px 0; }
		.package-card { position: relative; background: var(--card); border: 1px solid var(--glass-border); border-radius: 28px; padding: 32px; box-shadow: 0 14px 35px var(--shadow); display: flex; flex-direction: column; gap: 16px; transition: all 0.5s ease; backdrop-filter: var(--glassBlur); overflow: hidden; }
		.package-card::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: linear-gradient(90deg, transparent, var(--gold), transparent); opacity: 0; transition: opacity 0.3s; }
		.package-card:hover { transform: translateY(-10px); border-color: rgba(201,160,78,0.5); box-shadow: 0 30px 60px var(--shadow); }
		.package-card:hover::before { opacity: 1; }
		.package-label { display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; border-radius: 999px; background: rgba(201,160,78,0.1); border: 1px solid rgba(201,160,78,0.3); color: var(--gold); font-weight: 700; font-size: 13px; width: fit-content; }
		.package-price { color: #fff; font-weight: 800; font-size: 1.5em; margin: 10px 0; display: flex; align-items: baseline; gap: 4px; }
		.package-price span { font-size: 0.6em; color: var(--gold); }
		.package-points { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
		.package-points li { position: relative; padding-inline-start: 22px; color: rgba(245,240,232,0.8); font-size: 15px; }
		.package-points li::before { content: '✦'; position: absolute; right: 0; color: var(--gold); font-size: 12px; }
		.package-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: auto; padding-top: 10px; }
		
		.btn { padding: 12px 24px; border: none; border-radius: 14px; font-weight: 800; font-size: 15px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; justify-content: center; gap: 8px; }
		.btn-primary { background: var(--gold); color: #080f0b; box-shadow: 0 10px 20px rgba(201,160,78,0.3); }
		.btn-primary:hover { transform: translateY(-3px); box-shadow: 0 14px 28px rgba(201,160,78,0.4); background: #d4ae5c; }
		
		.services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 24px; }
		.service-item { background: rgba(20,40,28,0.4); border: 1px solid var(--border); border-radius: 16px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; backdrop-filter: blur(8px); transition: transform 0.3s ease, border-color 0.3s ease; }
		.service-item:hover { transform: translateY(-4px); border-color: var(--gold); }
		.service-item span:first-child { color: var(--text); font-weight: 600; font-size: 15px; }
		.service-item span:last-child { color: var(--gold); font-weight: 800; font-size: 16px; }

		.footer { margin-top: 80px; text-align: center; padding: 60px 20px 100px; background: linear-gradient(135deg, #1a3a2a, #0f2419); border-radius: 40px 40px 0 0; border-top: 2px solid #c9a04e; color: rgba(245,240,232,0.85); font-size: 14px; }
		.footer .social-link { color: rgba(245,240,232,0.6); }
		.footer .social-link:hover { color: #c9a04e; }
		.social-row { display: flex; justify-content: center; align-items: center; gap: 14px; margin-top: 12px; }
		.social-link { width: 50px; height: 50px; display: inline-flex; align-items: center; justify-content: center; color: var(--muted); border-radius: 15px; transition: color 0.2s ease, transform 0.2s ease; background: rgba(255,255,255,0.05); border: 1px solid rgba(201,160,78,0.1); }
		.social-link svg { width: 28px; height: 28px; fill: currentColor; }
		.social-link:hover { transform: translateY(-4px); border-color: rgba(201,160,78,0.4); }
		
		.reveal { opacity: 0; transform: translateY(30px); transition: opacity 0.7s ease, transform 0.7s ease; }
		.reveal.visible { opacity: 1; transform: translateY(0); }

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
		@keyframes pulse-ai {
			0% { box-shadow: 0 0 0 0 rgba(201,160,78,0.4); }
			70% { box-shadow: 0 0 0 15px rgba(201,160,78,0); }
			100% { box-shadow: 0 0 0 0 rgba(201,160,78,0); }
		}

	`;

	return (
		<div className="price-page" dir="rtl">
			<style>{css}</style>
			
			<img className="hero-bg" src="/banner-b.png" alt="غرام سلطان تجهز عروسة" aria-hidden="true" />
			<div className="hero-overlay" aria-hidden="true" />
			<div className="hero-particles" aria-hidden="true" />

			<div className="container">
				<div className="topbar reveal">
					<div className="brand">
						<img src="/logo.png" alt="شعار غرام سلطان" loading="lazy" />
						<div>
							<div style={{ fontSize: 18, color: '#fff' }}>غرام سلطان</div>
							<div className="pill">بيوتي سنتر وستوديو</div>
						</div>
					</div>
				</div>
				
				<div className="reveal">
					<h1>قائمة الأسعار</h1>
					<div className="lead">دليلك لكل باكدجات الميك أب والتصوير والخدمات الفردية.</div>
					
					<div className="chips">
						<button className="chip" onClick={() => scrollToSection('makeup-section')}>
							باكدجات الميك أب
						</button>
						<button className="chip" onClick={() => scrollToSection('photo-section')}>
							باكدجات التصوير
						</button>
						<button className="chip" onClick={() => scrollToSection('services-section')}>
							الخدمات الفردية
						</button>
					</div>
				</div>

				<div className="section reveal" id="makeup-section">
					<div className="section-header">
						<h2>باكدجات الميك أب</h2>
					</div>
					<div className="package-grid">
						{makeupPackages.map((pkg) => (
							<div className="package-card reveal" key={pkg.title}>
								<span className="package-label">مفضل</span>
								<h3 style={{ margin: '4px 0 4px', fontSize: 20 }}>{pkg.title}</h3>
								<div className="package-price">
									{pkg.price}
								</div>
								<ul className="package-points">
									{pkg.items.map((item) => (
										<li key={item}>{item}</li>
									))}
								</ul>
								<div className="package-actions">
									<button className="btn btn-primary" onClick={() => handlePackageWhatsApp(pkg.title)} style={{ width: '100%' }}>
										تأكيد حجز سريع
									</button>
								</div>
							</div>
						))}
					</div>
				</div>

				<div className="section reveal" id="photo-section">
					<div className="section-header">
						<h2>باكدجات التصوير</h2>
					</div>
					<div className="package-grid">
						{photoPackages.map((pkg) => (
							<div className="package-card reveal" key={pkg.title}>
								<span className="package-label">يشمل ألبوم</span>
								<h3 style={{ margin: '4px 0 4px', fontSize: 20 }}>{pkg.title}</h3>
								<div className="package-price">
									{pkg.price}
								</div>
								<ul className="package-points">
									{pkg.items.map((item) => (
										<li key={item}>{item}</li>
									))}
								</ul>
								<div className="package-actions">
									<button className="btn btn-primary" onClick={() => handlePackageWhatsApp(pkg.title)} style={{ width: '100%' }}>
										اسألي عن التوافر
									</button>
								</div>
							</div>
						))}
					</div>
				</div>

				<div className="section reveal" id="services-section">
					<div className="section-header">
						<h2>أسعار الخدمات الفردية</h2>
					</div>
					<div className="services-grid">
						{services.map((s) => (
							<div className="service-item reveal" key={s.name}>
								<span>{s.name}</span>
								<span>{s.price}</span>
							</div>
						))}
					</div>
				</div>

				<section className="footer reveal">
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
						style={{ background: '#25d366', color: '#fff' }}
						onClick={() => { window.open(WHATSAPP_LINK, '_blank'); setFabOpen(false); }}
						aria-label="واتساب"
					>
						<span className="fab-tooltip">واتساب</span>
						<WhatsAppIcon size={22} />
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

export default PriceList;
