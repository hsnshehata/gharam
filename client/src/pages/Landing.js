import React, { useEffect, useMemo, useState, useRef } from 'react';
import axios from 'axios';
import { googleReviews } from '../data/googleReviews';
import { API_BASE } from '../utils/apiBase';
import AIChatPopup from '../components/AIChatPopup';

const WHATSAPP_LINK = 'https://wa.me/gharam';
const MAP_LINK = 'https://maps.app.goo.gl/cpF8J7rw6ScxZwiv5';
const MAP_EMBED_URL = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1098.7427180615887!2d30.649189727778985!3d31.12134932679913!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14f65b4cd1f4431f%3A0xe279af3e228b0fea!2z2LrYsdin2YUg2LPZhNi32KfZhiDYqNmK2YjYqtmKINiz2YbYqtixINmI2LPYqtmI2K_ZitmI!5e1!3m2!1sar!2seg!4v1767756045239!5m2!1sar!2seg';
const TIKTOK_LINK = 'https://www.tiktok.com/@gharamsoltan';
const INSTAGRAM_LINK = 'https://www.instagram.com/gharamsoltan';
const FACEBOOK_LINK = 'https://www.facebook.com/gharam.ml';
const THREADS_LINK = 'https://www.threads.net/@gharamsoltan';
const CANONICAL_URL = 'https://gharam.art/';
const LANDLINE = '0472570908';
const BUSINESS_NAME = 'غرام سلطان بيوتي سنتر وستوديو';
const BUSINESS_DESCRIPTION = 'ميكب ارتيست وتصوير احترافي وحجز باكدجات زفاف، صبغة وفرد شعر، ومساج ضد الجاذبية في كفر الشيخ. حجزي أونلاين وتابعي التوافر الفوري.';
const BUSINESS_EMAIL = 'info@gharam.art';
const BUSINESS_STREET = 'شارع الجيش، مدينة دسوق';
const BUSINESS_CITY = 'كفر الشيخ';
const BUSINESS_REGION = 'كفر الشيخ';
const BUSINESS_COUNTRY = 'EG';
const BUSINESS_GEO = { lat: 31.1213493, lng: 30.6491897 };
const OG_IMAGE = 'https://gharam.art/og-cover.jpg';
const OG_IMAGE_WIDTH = '1200';
const OG_IMAGE_HEIGHT = '630';
const TWITTER_SITE = '@gharamsoltan';
const PRICES_URL = 'https://gharam.art/prices';
const MASSAGE_CHAIR_URL = 'https://gharam.art/massage-chair'

const INSTAGRAM_SVG = (
	<path
		fillRule="evenodd"
		d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8z"
	/>
);

const WHATSAPP_SVG = (
	<path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
);

const socialLinks = [
	{ href: INSTAGRAM_LINK, label: 'Instagram', text: 'إنستجرام', color: '#e1306c', svg: INSTAGRAM_SVG },
	{
		href: FACEBOOK_LINK, label: 'Facebook', text: 'فيسبوك', color: '#1877f2', svg: (
			<path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
		)
	},
	{
		href: THREADS_LINK, label: 'Threads', text: 'ثريدز', color: '#000000', svg: (
			<path d="M331.5 235.7c2.2.9 4.2 1.9 6.3 2.8 29.2 14.1 50.6 35.2 61.8 61.4 15.7 36.5 17.2 95.8-30.3 143.2-36.2 36.2-80.3 52.5-142.6 53h-.3c-70.2-.5-124.1-24.1-160.4-70.2-32.3-41-48.9-98.1-49.5-169.6V256v-.2C17 184.3 33.6 127.2 65.9 86.2 102.2 40.1 156.2 16.5 226.4 16h.3c70.3.5 124.9 24 162.3 69.9 18.4 22.7 32 50 40.6 81.7l-40.4 10.8c-7.1-25.8-17.8-47.8-32.2-65.4-29.2-35.8-73-54.2-130.5-54.6-57 .5-100.1 18.8-128.2 54.4C72.1 146.1 58.5 194.3 58 256c.5 61.7 14.1 109.9 40.3 143.3 28 35.6 71.2 53.9 128.2 54.4 51.4-.4 85.4-12.6 113.7-40.9 32.3-32.2 31.7-71.8 21.4-95.9-6.1-14.2-17.1-26-31.9-34.9-3.7 26.9-11.8 48.3-24.7 64.8-17.1 21.8-41.4 33.6-72.7 35.3-23.6 1.3-46.3-4.4-63.9-16-20.8-13.8-33-34.8-34.3-59.3-2.5-48.3 35.7-83 95.2-86.4 21.1-1.2 40.9-.3 59.2 2.8-2.4-14.8-7.3-26.6-14.6-35.2-10-11.7-25.6-17.7-46.2-17.8H227c-16.6 0-39 4.6-53.3 26.3l-34.4-23.6c19.2-29.1 50.3-45.1 87.8-45.1h.8c62.6.4 99.9 39.5 103.7 107.7l-.2.2zm-156 68.8c1.3 25.1 28.4 36.8 54.6 35.3 25.6-1.4 54.6-11.4 59.5-73.2-13.2-2.9-27.8-4.4-43.4-4.4-4.8 0-9.6.1-14.4.4-42.9 2.4-57.2 23.2-56.2 41.8l-.1.1z" />
		)
	},
	{
		href: TIKTOK_LINK, label: 'TikTok', text: 'تيكتوك', color: '#010101', svg: (
			<path d="M448 209.91a210.06 210.06 0 0 1-122.77-39.25V349.38A162.55 162.55 0 1 1 185 188.31V278.2a74.62 74.62 0 1 0 52.23 71.18V0h88a121.18 121.18 0 0 0 1.86 22.17A122.18 122.18 0 0 0 381 102.39a121.43 121.43 0 0 0 67 20.14z" />
		)
	},
	{
		href: WHATSAPP_LINK, label: 'WhatsApp', text: 'واتساب', color: '#25d366', svg: (
			<path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
		)
	}
];

const socialLinksNoWhatsApp = socialLinks.filter((s) => s.label !== 'WhatsApp');
// palette is now defined within the component for internal use

const PhoneIcon = ({ size = 18 }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.11 4.1 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
	</svg>
);

const MapPinIcon = ({ size = 18 }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<path d="M12 2c-3.9 0-7 3-7 6.8 0 4.7 4 9.1 6.4 11.5.3.3.8.3 1.1 0C15 17.9 19 13.5 19 8.8 19 5 15.9 2 12 2z" />
		<circle cx="12" cy="9" r="2.5" />
	</svg>
);

const BotIcon = ({ size = 18 }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<rect x="4" y="7" width="16" height="10" rx="3" />
		<path d="M12 7V4" />
		<circle cx="9" cy="12" r="1" />
		<circle cx="15" cy="12" r="1" />
		<path d="M8 17h8" />
	</svg>
);

const AwardIcon = ({ size = 40, color = 'currentColor' }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<circle cx="12" cy="8" r="5" />
		<path d="M8.5 13.5 7 22l5-2 5 2-1.5-8.5" />
	</svg>
);

const ShieldCheckIcon = ({ size = 40, color = 'currentColor' }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<path d="M12 22s7-3 7-10V5l-7-3-7 3v7c0 7 7 10 7 10Z" />
		<path d="m9 12 2 2 4-4" />
	</svg>
);

const StarIcon = ({ size = 40, color = 'currentColor' }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
	</svg>
);

const WhatsAppIcon = ({ size = 18 }) => (
	<svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M16 2.7c-7.3 0-13.3 5.9-13.3 13.2 0 2.4.6 4.6 1.8 6.6L2 30l7.6-2.4c1.9 1 4 1.5 6.1 1.5 7.3 0 13.3-5.9 13.3-13.2S23.3 2.7 16 2.7z" fill="#25d366" />
		<path d="M24 20.8c-.3.9-1.7 1.6-2.4 1.7-.6.1-1.4.2-2.2-.1-.5-.2-1.1-.4-1.8-.8-3.1-1.8-5.1-4.7-5.2-4.9-.2-.3-1.2-1.6-1.2-3.1 0-1.5.8-2.2 1.1-2.6.3-.3.7-.4.9-.4h.6c.2 0 .5-.1.8.6.3.7 1 2.4 1.1 2.6.1.2.1.4 0 .6-.1.2-.2.4-.4.6-.2.2-.4.5-.6.7-.2.3-.4.5-.2.9.2.3 1 1.6 2.2 2.6 1.5 1.4 2.7 1.8 3.1 2 .3.1.6.1.8-.1.2-.2.9-1 .1-2.1-.8-1.1-1.7-1.5-2-.1-.3.4-.8.5-1.3.3-.6-.3-1.8-.9-2.6-1.6-.8-.7-1.4-1.7-1.6-2-.2-.3-.1-.6.1-.8.2-.2.6-.7.8-.9.3-.3.3-.5.5-.8.2-.3.1-.6 0-.8-.1-.2-.8-2-1.1-2.6-.3-.6-.5-.5-.7-.5H14c-.3 0-.7.1-1 .5-.3.4-1.2 1.1-1.2 2.6 0 1.5 1.2 2.9 1.3 3.1.1.2 2.2 3.5 5.5 5.4.4.2 2.9 1.2 4 .6.9-.5 1.5-1.3 1.7-1.5.2-.2.2-.4.1-.5-.1-.2-.5-.4-.6-.4z" fill="#fff" />
	</svg>
);

const featuredPackages = [
	{
		label: 'باكدج الميك أب الأكثر طلبًا',
		title: 'باكدج زفاف سبيشيال بلس',
		price: '6,000 ج',
		points: ['تنضيف بشرة كامل + حمام مغربي وعطري', 'صنفرة للجسم + 3 رسومات حنة', 'تسريحة/لفة + رموش + عدسات + فيك نيلز', 'تأجير تاج/طرحة + بديكير ومنيكير + سشوار']
	},
	{
		label: 'باكدج التصوير الأكثر طلبًا',
		title: 'باكدج تصوير ألبوم 20×30',
		price: '2,000ج (استوديو) · 3,000ج (لوكيشن)',
		points: ['ألبوم 20×30 (10 مناظر)', 'فوتوبلوك 50×60', 'ألبوم ميني', '40 كارت مكرر']
	}
];

const faqItems = [
	{ question: 'ايه الخدمات المتاحة في غرام سلطان بيوتي سنتر؟', answer: 'نقدم ميك اب احترافي للعرايس والمناسبات، تصوير استوديو ولوكيشن، فرد شعر بالبروتين والكافيار، تنظيف بشرة سوفت وهارد، كرسي مساج ذكي، حمام مغربي، باديكير ومنيكير، وخدمات شعر ووش وحواجب.' },
	{ question: 'ازاي احجز باكدج ميك اب زفاف؟', answer: 'ابعتي على الواتساب 01092527126 أو موقع www.gharam.art لتأكيد التوافر، حددي التاريخ والباكدج، وادفعي عربون 500 جنيه على الأقل عبر فودافون كاش.' },
	{ question: 'ايه أسعار باكدجات الميك اب؟', answer: 'شوفي قائمة الأسعار الكاملة هنا: https://gharam.art/prices ثم قوليلي لو عايزة تفاصيل الباكدج اللي يناسبك.' },
	{ question: 'فين عنوان السنتر وازاي أوصل؟', answer: 'شارع الجيش أمام بوابة دمشق، دسوق كفر الشيخ. قدامنا مطعم بوابة دمشق، يمين مخبز كلاسيك، شمال سوبر ماركت الجوهري. خريطة: https://maps.app.goo.gl/cpF8J7rw6ScxZwiv5' },
	{ question: 'هل السنتر حريمي بس؟', answer: 'أيوة، مركز حريمي فقط، ستاف كله بنات خاصة للمحجبات، الرجالة بس لتصوير الكابلز.' },
	{ question: 'ايه أسعار كرسي المساج الذكي؟', answer: 'سبيد ريليف 10 دقائق 100 ج، ديب ريست 20 دقيقة 200 ج، ماكس ريلاكس 30 دقيقة 250 ج. تفاصيل: https://gharam.art/massage-chair/' },
	{ question: 'ازاي فرد الشعر وأسعاره؟', answer: 'فرد علاجي بس (بروتين، كافيار، أرجان، فيلر) يبدأ من 1500 ج حسب الطول والكثافة، بعد معاينة في السنتر.' },
	{ question: 'هل في ليزر أو بيكيني؟', answer: 'لا، مفيش ليزر ولا بيكيني ولا أندر آرم، بس تنظيف بشرة ووش وحواجب.' },
	{ question: 'ايه مواعيد السنتر؟', answer: 'كل يوم من 10 صباحاً لـ10 مساءً، ممكن تتغير في الأعياد.' },
	{ question: 'ازاي أشوف أسعار التصوير؟', answer: 'شوفي قائمة الأسعار هنا: https://gharam.art/prices.html، ألبومات تبدأ من 1600 ج في الاستوديو و2500 لوكيشن، ثم قوليلي لو عايزة عرض مخصص.' }
];

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

const renderStars = (rating) => {
	const value = Math.min(5, Math.max(1, Math.round(rating || 5)));
	return '★'.repeat(value).padEnd(5, '☆');
};

const mergeReviews = (primary, secondary, limit) => {
	const seen = new Set();
	const merged = [];
	const add = (item) => {
		const key = `${item.author || ''}-${item.text?.slice(0, 40) || ''}`;
		if (seen.has(key)) return;
		seen.add(key);
		merged.push(item);
	};
	(primary || []).forEach(add);
	(secondary || []).forEach(add);
	return merged.slice(0, limit);
};
const formatReviewDate = (rev) => {
	if (rev?.time || rev?.timeISO) {
		const date = rev.timeISO ? new Date(rev.timeISO) : new Date(rev.time * 1000);
		if (!Number.isNaN(date.getTime())) {
			return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
		}
	}
	return rev?.relativeTime || 'تقييم حديث';
};

function Landing() {
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

	const [packageType, setPackageType] = useState('makeup');
	const [date, setDate] = useState('');
	const [availability, setAvailability] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [showAIChat, setShowAIChat] = useState(false);
	const [fabOpen, setFabOpen] = useState(false);
	const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
	// Dark mode only - no theme toggle needed

	const [currentFaqIdx, setCurrentFaqIdx] = useState(0);
	const [expandedFaqAnswer, setExpandedFaqAnswer] = useState(false);
	const [autoRotatePaused, setAutoRotatePaused] = useState(false);
	const [facebookFeed, setFacebookFeed] = useState([]);
	const [currentFbItemIdx, setCurrentFbItemIdx] = useState(0);
	const [fbAutoRotatePaused, setFbAutoRotatePaused] = useState(false);
	const [fbTouchStart, setFbTouchStart] = useState(null);
	const DESIRED_REVIEW_COUNT = 12;
	const fallbackReviews = useMemo(() => shuffle(googleReviews).slice(0, DESIRED_REVIEW_COUNT), []);
	const [reviewsData, setReviewsData] = useState({
		rating: 5,
		totalReviews: 1100,
		reviews: fallbackReviews,
		source: 'fallback'
	});
	const [reviewsLoading, setReviewsLoading] = useState(false);
	const [reviewsError, setReviewsError] = useState('');
	const afrakoushSpaceRef = useRef(null);

	// palette is now a constant defined at module level
	const availabilityBadge = availability ? availabilityCopy[availability.status] : null;

	const formattedRating = typeof reviewsData.rating === 'number' ? reviewsData.rating.toFixed(1) : '5.0';
	const formattedTotalReviews = reviewsData.totalReviews ? reviewsData.totalReviews.toLocaleString('en-US') : '1100+';
	const isGoogleReviews = reviewsData.source === 'google';
	const fbVisiblePosts = useMemo(() => {
		if (!facebookFeed.length) return [];
		const count = Math.min(3, facebookFeed.length);
		return Array.from({ length: count }, (_, idx) => {
			const postIndex = (currentFbItemIdx + idx) % facebookFeed.length;
			return facebookFeed[postIndex];
		});
	}, [facebookFeed, currentFbItemIdx]);

	// SEO: عنوان، وصف، كانونيكال، OG/Twitter، و JSON-LD LocalBusiness
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

		document.title = `${BUSINESS_NAME} | حجز باكدجات ميكب وتصوير وصبغة شعر`;
		setMeta('description', BUSINESS_DESCRIPTION);
		setMeta('og:title', `${BUSINESS_NAME} | ميكب وتصوير في كفر الشيخ`, 'property');
		setMeta('og:description', BUSINESS_DESCRIPTION, 'property');
		setMeta('og:type', 'website', 'property');
		setMeta('og:url', CANONICAL_URL, 'property');
		setMeta('og:image', OG_IMAGE, 'property');
		setMeta('og:image:width', OG_IMAGE_WIDTH, 'property');
		setMeta('og:image:height', OG_IMAGE_HEIGHT, 'property');
		setMeta('og:image:alt', `${BUSINESS_NAME} | ميكب وتصوير`, 'property');
		setMeta('twitter:card', 'summary_large_image');
		setMeta('twitter:site', TWITTER_SITE);
		setMeta('twitter:title', `${BUSINESS_NAME} | ميكب وتصوير`);
		setMeta('twitter:description', BUSINESS_DESCRIPTION);
		setMeta('twitter:image', OG_IMAGE);
		setMeta('twitter:image:alt', `${BUSINESS_NAME} | ميكب وتصوير`);

		let canonical = document.querySelector('link[rel="canonical"]');
		if (!canonical) {
			canonical = document.createElement('link');
			canonical.setAttribute('rel', 'canonical');
			document.head.appendChild(canonical);
		}
		canonical.setAttribute('href', CANONICAL_URL);

		const safeReviews = Array.isArray(reviewsData.reviews) ? reviewsData.reviews : [];
		const reviewItems = safeReviews.slice(0, 8).map((rev, idx) => ({
			'@type': 'Review',
			author: { '@type': 'Person', name: rev.author || `عميلة ${idx + 1}` },
			reviewRating: {
				'@type': 'Rating',
				ratingValue: Math.min(5, Math.max(1, Math.round(rev.rating || reviewsData.rating || 5)))
			},
			reviewBody: rev.text || 'تجربة ممتازة.',
			datePublished: rev.timeISO || (rev.time ? new Date(rev.time * 1000).toISOString() : undefined)
		}));

		const offers = [
			{
				'@type': 'Offer',
				priceCurrency: 'EGP',
				price: 5500,
				url: PRICES_URL,
				availability: 'https://schema.org/InStock',
				itemOffered: {
					'@type': 'Service',
					name: 'باكدج زفاف سبيشيال بلس',
					description: 'ميكب زفاف شامل مع حمام مغربي وعطري وبديكير ومنيكير.',
					serviceType: 'MakeupPackage'
				}
			},
			{
				'@type': 'Offer',
				priceSpecification: {
					'@type': 'PriceSpecification',
					minPrice: 1600,
					maxPrice: 2700,
					priceCurrency: 'EGP'
				},
				url: PRICES_URL,
				availability: 'https://schema.org/InStock',
				itemOffered: {
					'@type': 'Service',
					name: 'باكدج تصوير ألبوم 20×30',
					description: 'تصوير استوديو أو لوكيشن مع ألبوم وفوتوبلوك.',
					serviceType: 'PhotoPackage'
				}
			},
			{
				'@type': 'Offer',
				priceCurrency: 'EGP',
				price: 3000,
				url: PRICES_URL,
				availability: 'https://schema.org/InStock',
				itemOffered: {
					'@type': 'Service',
					name: 'باكدج حنة أورجينال',
					description: 'ميكب + تسريحة/لفة + رموش + عدسات + فيك نيلز.',
					serviceType: 'HennaPackage'
				}
			}
		];

		const localBusiness = {
			'@context': 'https://schema.org',
			'@type': 'BeautySalon',
			name: BUSINESS_NAME,
			description: BUSINESS_DESCRIPTION,
			image: OG_IMAGE,
			email: BUSINESS_EMAIL,
			telephone: `+20${LANDLINE}`,
			address: {
				'@type': 'PostalAddress',
				streetAddress: BUSINESS_STREET,
				addressLocality: BUSINESS_CITY,
				addressRegion: BUSINESS_REGION,
				addressCountry: BUSINESS_COUNTRY
			},
			geo: {
				'@type': 'GeoCoordinates',
				latitude: BUSINESS_GEO.lat,
				longitude: BUSINESS_GEO.lng
			},
			url: CANONICAL_URL,
			priceRange: '$$',
			sameAs: [INSTAGRAM_LINK, FACEBOOK_LINK, TIKTOK_LINK, THREADS_LINK, MAP_LINK, WHATSAPP_LINK],
			makesOffer: offers,
			aggregateRating: {
				'@type': 'AggregateRating',
				ratingValue: typeof reviewsData.rating === 'number' ? reviewsData.rating : 5,
				reviewCount: Number.isFinite(reviewsData.totalReviews) ? reviewsData.totalReviews : 1100
			},
			review: reviewItems,
			openingHoursSpecification: [
				{
					'@type': 'OpeningHoursSpecification',
					dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
					opens: '10:00',
					closes: '23:00'
				}
			]
		};

		const breadcrumb = {
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{
					'@type': 'ListItem',
					position: 1,
					name: 'الرئيسية',
					item: CANONICAL_URL
				},
				{
					'@type': 'ListItem',
					position: 2,
					name: 'الأسعار',
					item: PRICES_URL
				},
				{
					'@type': 'ListItem',
					position: 3,
					name: 'كرسي المساج',
					item: MASSAGE_CHAIR_URL
				}
			]
		};

		const article = {
			'@context': 'https://schema.org',
			'@type': 'Article',
			headline: `${BUSINESS_NAME} | باكدجات ميكب وتصوير`,
			description: BUSINESS_DESCRIPTION,
			image: OG_IMAGE,
			mainEntityOfPage: CANONICAL_URL,
			author: {
				'@type': 'Organization',
				name: BUSINESS_NAME
			},
			publisher: {
				'@type': 'Organization',
				name: BUSINESS_NAME,
				logo: {
					'@type': 'ImageObject',
					url: 'https://gharam.art/logo.png'
				}
			}
		};

		const faqSchema = {
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: faqItems.map((item) => ({
				'@type': 'Question',
				name: item.question,
				acceptedAnswer: {
					'@type': 'Answer',
					text: item.answer
				}
			}))
		};
		let jsonLd = document.getElementById('seo-json-ld');
		if (!jsonLd) {
			jsonLd = document.createElement('script');
			jsonLd.type = 'application/ld+json';
			jsonLd.id = 'seo-json-ld';
			document.head.appendChild(jsonLd);
		}
		jsonLd.textContent = JSON.stringify([localBusiness, breadcrumb, article, faqSchema]);
	}, [reviewsData]);

	// Theme Isolation: Landing in Dark, Rest in Light
	useEffect(() => {
		document.documentElement.setAttribute('data-theme', 'dark');
		return () => {
			document.documentElement.setAttribute('data-theme', 'light');
		};
	}, []);

	// FAQ auto-rotate: show one question at a time, change every 4 seconds
	useEffect(() => {
		if (autoRotatePaused) return;

		const interval = setInterval(() => {
			setCurrentFaqIdx((prev) => (prev + 1) % faqItems.length);
			setExpandedFaqAnswer(false);
		}, 4000);

		return () => clearInterval(interval);
	}, [autoRotatePaused]);

	// Facebook feed: fetch and auto-rotate carousel every 10 seconds with swipe support
	useEffect(() => {
		const fetchFacebookFeed = async () => {
			try {
				const response = await axios.get(`${API_BASE}/api/public/facebook/feed`);
				if (response.data.success && Array.isArray(response.data.data)) {
					setFacebookFeed(response.data.data);
				}
			} catch (err) {
				console.error('Error fetching Facebook feed:', err);
			}
		};

		fetchFacebookFeed();
	}, []);

	// Facebook auto-rotate: change every 10 seconds
	useEffect(() => {
		if (fbAutoRotatePaused || facebookFeed.length === 0) return;

		const interval = setInterval(() => {
			setCurrentFbItemIdx((prev) => (prev + 1) % facebookFeed.length);
		}, 10000);

		return () => clearInterval(interval);
	}, [fbAutoRotatePaused, facebookFeed.length]);

	// Facebook swipe support
	const handleFbTouchStart = (e) => {
		setFbAutoRotatePaused(true);
		setFbTouchStart(e.touches[0].clientX);
	};

	const handleFbTouchEnd = (e) => {
		if (!fbTouchStart) return;
		const diff = fbTouchStart - e.changedTouches[0].clientX;
		if (Math.abs(diff) > 50) { // swipe threshold
			if (diff > 0) {
				// swipe left - next post
				setCurrentFbItemIdx((prev) => (prev + 1) % facebookFeed.length);
			} else {
				// swipe right - prev post
				setCurrentFbItemIdx((prev) => (prev - 1 + facebookFeed.length) % facebookFeed.length);
			}
		}
		setFbTouchStart(null);
		setFbAutoRotatePaused(false);
	};

	// SUPPORT_LINK iframe connect removed

	// Keep chat iframe mounted once so it stays دافئ وجاهز للعرض

	const handlePackageWhatsApp = (title) => {
		const message = encodeURIComponent(`أريد حجز باكدج ${title}`);
		window.open(`${WHATSAPP_LINK}?text=${message}`, '_blank');
	};

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

	useEffect(() => {
		let isMounted = true;
		const fetchReviews = async () => {
			setReviewsLoading(true);
			setReviewsError('');
			try {
				const res = await axios.get(`${API_BASE}/api/public/google-reviews`);
				if (!isMounted) return;
				const payload = res.data || {};
				const remoteReviews = Array.isArray(payload.reviews) ? payload.reviews : [];
				const mergedReviews = mergeReviews(remoteReviews, fallbackReviews, DESIRED_REVIEW_COUNT);
				const source = payload.source || (remoteReviews.length ? 'google' : 'fallback');
				const totalReviews = payload.totalReviews || mergedReviews.length || fallbackReviews.length;
				setReviewsData({
					rating: typeof payload.rating === 'number' ? payload.rating : 5,
					totalReviews,
					reviews: mergedReviews,
					source
				});
			} catch (err) {
				if (isMounted) {
					setReviewsError('تعذر جلب آخر تقييمات جوجل الآن. بنعرض عينة محفوظة مؤقتاً.');
					setReviewsData((prev) => ({ ...prev, reviews: prev.reviews?.length ? prev.reviews : fallbackReviews, source: 'fallback' }));
				}
			} finally {
				if (isMounted) setReviewsLoading(false);
			}
		};

		fetchReviews();
		return () => {
			isMounted = false;
		};
	}, [fallbackReviews]);

	useEffect(() => {
		const fetchDynamicSpace = async () => {
			try {
				const res = await axios.get(`${API_BASE}/api/afrakoush/landing-dynamic-space`);
				if (res.data && afrakoushSpaceRef.current) {
					// 1. Inject HTML
					afrakoushSpaceRef.current.innerHTML = res.data.html || '';

					// 2. Execute script
					if (res.data.script && res.data.script.trim() !== '') {
						try {
							const executeTool = new Function('apiClient', 'container', `
								try {
									${res.data.script}
								} catch(e) {
									console.error("Afrakoush dynamic script error:", e);
								}
							`);
							executeTool(axios.create(), afrakoushSpaceRef.current);
						} catch (e) {
							console.error("Failed to parse Afrakoush script:", e);
						}
					}
				}
			} catch (err) {
				// Silently ignore if not found or no tool exists yet
				console.log("No dynamic space content found or error fetching it.");
			}
		};
		fetchDynamicSpace();
	}, []);


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
			--social-base: #f7f3ee;
			--glass: rgba(15,36,25,0.55);
			--glass-border: rgba(201,160,78,0.15);
		}
		.landing-page { margin: 0; background: #080f0b; color: #f5f0e8; font-family: 'Tajawal', 'Arial', sans-serif; min-height: 100vh; position: relative; overflow: hidden; }
		.landing-page::before { content: ''; position: fixed; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(ellipse at 20% 50%, rgba(26,58,42,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(201,160,78,0.06) 0%, transparent 40%), radial-gradient(ellipse at 50% 80%, rgba(26,58,42,0.1) 0%, transparent 50%); pointer-events: none; z-index: 0; animation: ambientShift 20s ease-in-out infinite alternate; }
		@keyframes ambientShift { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(-3%, 2%) scale(1.05); } }

		@keyframes float {
			0% { transform: translateY(0); }
			50% { transform: translateY(-18px); }
			100% { transform: translateY(0); }
		}
		@keyframes drift {
			0% { transform: translateX(0) rotate(0deg); }
			50% { transform: translateX(12px) rotate(6deg); }
			100% { transform: translateX(0) rotate(0deg); }
		}

		.container { width: min(1200px, 92%); margin: 0 auto; position: relative; z-index: 1; padding-top: 40px; display: flex; flex-direction: column; gap: 32px; }
		.container > section, .container > .card { position: relative; }
		.container h2 { color: #f5f0e8; font-size: clamp(20px, 3vw, 26px); }
		.container h2::after { content: ''; display: block; width: 50px; height: 2px; background: linear-gradient(90deg, #c9a04e, transparent); margin-top: 8px; border-radius: 2px; }
		.brand img { width: 64px; height: 64px; object-fit: contain; }
		.pill { display: inline-flex; gap: 8px; align-items: center; padding: 10px 14px; background: rgba(0,0,0,0.03); border: 1px solid var(--border); border-radius: 999px; color: var(--muted); font-size: 14px; }
		.hero { position: relative; width: 100%; height: 100vh; min-height: 600px; display: flex; align-items: center; justify-content: flex-end; overflow: hidden; margin: 0 -4%; width: 108%; border-radius: 0 0 32px 32px; }
		.hero-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; z-index: 0; }
		.hero-overlay { position: absolute; inset: 0; z-index: 1; background: linear-gradient(to left, rgba(26,58,42,0.0) 35%, rgba(26,58,42,0.55) 60%, rgba(26,58,42,0.92) 100%); }
		.hero-logo { width: 180px; height: 180px; object-fit: contain; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3)); align-self: center; }
		.hero-content { position: relative; z-index: 2; max-width: 680px; padding: 48px 8%; display: flex; flex-direction: column; gap: 20px; text-align: center; align-items: center; }
		.hero-tag { display: inline-flex; align-items: center; gap: 8px; padding: 8px 18px; border-radius: 999px; background: rgba(201,160,78,0.15); border: 1px solid rgba(201,160,78,0.35); color: #c9a04e; font-weight: 700; font-size: 14px; width: fit-content; backdrop-filter: blur(4px); }
		.hero-particles { position: absolute; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; }
		.hero-particle { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: radial-gradient(circle, rgba(201,160,78,0.8) 0%, rgba(201,160,78,0) 70%); animation: particleFloat 8s ease-in-out infinite; }
		@keyframes particleFloat { 0%,100% { transform: translateY(0) scale(0.5); opacity: 0.3; } 50% { transform: translateY(-60px) scale(1.2); opacity: 0.8; } }
		@keyframes heroFadeIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
		.hero-content > * { animation: heroFadeIn 0.8s ease both; }
		.hero-content > *:nth-child(1) { animation-delay: 0.2s; }
		.hero-content > *:nth-child(2) { animation-delay: 0.4s; }
		.hero-content > *:nth-child(3) { animation-delay: 0.6s; }
		.hero-content > *:nth-child(4) { animation-delay: 0.8s; }
		.hero-content > *:nth-child(5) { animation-delay: 1s; }
		h1 { margin: 8px 0 16px; font-size: clamp(28px, 4vw, 42px); line-height: 1.2; }
		h2 { margin: 0 0 12px; }
		p { color: var(--muted); line-height: 1.75; margin: 0; }
		.cta-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
		.cta-row.center { justify-content: center; }
		.btn { border: none; cursor: pointer; padding: 12px 24px; border-radius: 14px; font-weight: 700; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
		.btn:hover { transform: translateY(-3px); box-shadow: 0 15px 30px rgba(0,0,0,0.4); }
		.btn-primary { background: linear-gradient(135deg, #c9a04e, #e6c27b); color: #080f0b !important; border: 1px solid rgba(255,255,255,0.2); }
		.btn-primary:hover { background: linear-gradient(135deg, #e6c27b, #c9a04e); box-shadow: 0 10px 25px rgba(201,160,78,0.3); }
		.btn-outline { background: rgba(201,160,78,0.05); color: #c9a04e !important; border: 1px solid rgba(201,160,78,0.3); backdrop-filter: blur(8px); }
		.btn-outline:hover { background: rgba(201,160,78,0.12); border-color: #c9a04e; }
		.btn-artistic { background: rgba(255,255,255,0.03); color: #f5f0e8 !important; border: 1px solid rgba(201,160,78,0.4); position: relative; overflow: hidden; z-index: 1; }
		.btn-artistic::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(201,160,78,0.1), transparent); transform: translateX(-100%); transition: transform 0.6s; z-index: -1; }
		.btn-artistic:hover::after { transform: translateX(100%); }
		.btn-artistic:hover { border-color: #c9a04e; background: rgba(201,160,78,0.08); }
		.btn-green { background: linear-gradient(135deg, #1a3a2a, #2a5a3a); color: #fff !important; border: 1px solid rgba(201,160,78,0.2); }
		.btn-green:hover { box-shadow: 0 10px 25px rgba(26,58,42,0.4); }
		.grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin: 26px 0; }
		.landing-page .card { background: var(--glass) !important; color: var(--text) !important; border: 1px solid var(--glass-border) !important; box-shadow: 0 15px 40px var(--shadow), inset 0 1px 0 rgba(201,160,78,0.08) !important; padding: 28px; border-radius: 22px; transition: all 0.4s ease; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
		.landing-page .card:hover { box-shadow: 0 24px 50px var(--shadow), inset 0 1px 0 rgba(201,160,78,0.15) !important; border-color: rgba(201,160,78,0.3) !important; transform: translateY(-2px); }
		.card h3 { margin: 0 0 6px; font-size: 19px; color: var(--gold); }
		.card p { margin: 0; }
		.badge { display: inline-block; background: rgba(201,160,78,0.12); color: var(--gold); padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 700; border: 1px solid rgba(201,160,78,0.3); backdrop-filter: blur(8px); }
		.highlight { margin: 32px 0; }
		.massage-banner { position: relative; overflow: hidden; border-radius: 32px; min-height: 400px; color: #fff; display: flex; align-items: center; justify-content: flex-end; padding: 40px; background: url('https://www.irestonline.com.au/wp-content/uploads/2024/04/02-brown.jpg') center/cover no-repeat; box-shadow: 0 30px 60px var(--shadow); border: 1px solid rgba(201,160,78,0.2); margin: 40px 0; }
		.massage-banner::after { content: ''; position: absolute; inset: 0; background: linear-gradient(110deg, rgba(10,26,18,0.85) 30%, rgba(10,26,18,0.4) 60%, transparent 100%); }
		.massage-banner .content { position: relative; z-index: 2; max-width: 480px; text-align: right; margin-left: 0; }
		.massage-banner h2 { font-size: clamp(24px, 4vw, 32px); line-height: 1.2; margin-bottom: 16px; }
		.massage-glass-card { background: rgba(26,58,42,0.6); backdrop-filter: blur(12px); padding: 28px; border-radius: 24px; border: 1px solid rgba(201,160,78,0.2); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
		.why-card { margin: 10px 0 32px; }
		.availability { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; align-items: start; margin: 32px 0; }
		.availability form { display: grid; gap: 12px; }
		label { color: var(--muted); font-size: 14px; }
		.landing-page input, .landing-page select { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--card); color: var(--text); }
		.availability-result { padding: 18px; border-radius: 14px; border: 1px solid var(--border); background: var(--card); min-width: min(460px, 92vw); box-shadow: 0 24px 48px var(--shadow); color: var(--text); }
		.availability-result h4 { margin: 0 0 6px; color: var(--text); }
		.contact-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin: 20px 0; }
		.contact-card { display: flex; flex-direction: column; gap: 8px; padding: 20px; border-radius: 18px; border: 1px solid var(--glass-border); background: var(--glass); box-shadow: 0 10px 30px var(--shadow), inset 0 1px 0 rgba(201,160,78,0.06); transition: all 0.4s ease; backdrop-filter: blur(16px); }
		.contact-card:hover { border-color: rgba(201,160,78,0.35); transform: translateY(-4px); box-shadow: 0 20px 40px var(--shadow), inset 0 1px 0 rgba(201,160,78,0.12); }
		.contact-title { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; color: var(--gold); }
		.contact-desc { color: var(--muted); font-size: 14px; }
		.quick-links { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin: 8px 0 24px; }
		.quick-link { display: flex; align-items: center; gap: 10px; padding: 14px; border-radius: 14px; border: 1px solid var(--glass-border); background: var(--glass); color: var(--text); text-decoration: none; transition: all 0.35s ease; backdrop-filter: blur(12px); }
		.quick-link:hover { transform: translateY(-3px); box-shadow: 0 14px 28px var(--shadow); border-color: rgba(201,160,78,0.4); background: rgba(201,160,78,0.08); }
		.quick-link span.icon { font-size: 18px; }
		.quick-link svg { width: 26px; height: 26px; fill: currentColor; }
		.map-embed-card { margin: 22px 0; }
		.map-frame { position: relative; width: 100%; padding-top: 56%; border-radius: 14px; overflow: hidden; box-shadow: 0 14px 28px var(--shadow); border: 1px solid var(--border); background: var(--card); }
		.map-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
		.trust-section { padding: 48px 0; margin: 28px 0; border-radius: 18px; background: linear-gradient(135deg, #1a3a2a, #0f2419); border: 1px solid rgba(201,160,78,0.2); }
		.trust-heading { text-align: center; color: #c9a04e; font-weight: 700; margin-bottom: 16px; letter-spacing: 0.5px; font-size: 18px; }
		.trust-logos { display: flex; flex-wrap: wrap; justify-content: center; gap: 18px 32px; align-items: center; }
		.trust-item { display: inline-flex; align-items: center; gap: 12px; font-weight: 900; font-size: 22px; color: rgba(245,240,232,0.85); filter: none; opacity: 0.8; transition: opacity 0.4s ease, transform 0.25s ease; }
		.trust-item:hover { opacity: 1; transform: translateY(-2px); }
		.trust-item svg { flex-shrink: 0; }
		.reviews { margin: 30px 0 40px; }
		.reviews-header { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
		.stars { color: #c9a04e; font-size: 18px; letter-spacing: 1px; }
		.review-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-top: 16px; }
		.review-card { background: var(--glass); border: 1px solid var(--glass-border); border-radius: 18px; padding: 20px; min-height: 170px; box-shadow: 0 14px 30px var(--shadow), inset 0 1px 0 rgba(201,160,78,0.06); transition: all 0.4s ease; backdrop-filter: blur(14px); }
		.review-card:hover { border-color: rgba(201,160,78,0.35); transform: translateY(-4px); box-shadow: 0 20px 40px var(--shadow); }
		.review-card.google { border-color: rgba(201,160,78,0.3); box-shadow: 0 16px 30px rgba(201,160,78,0.06); }
		.review-meta { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
		.package-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin: 30px 0; }
		.package-card { position: relative; background: var(--glass); border: 1px solid var(--glass-border); border-radius: 28px; padding: 32px; box-shadow: 0 14px 35px var(--shadow); display: flex; flex-direction: column; gap: 16px; transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); backdrop-filter: blur(20px); overflow: hidden; }
		.package-card::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: linear-gradient(90deg, transparent, var(--gold), transparent); opacity: 0; transition: opacity 0.3s; }
		.package-card:hover { transform: translateY(-10px); border-color: rgba(201,160,78,0.5); box-shadow: 0 30px 60px var(--shadow); }
		.package-card:hover::before { opacity: 1; }
		.package-label { display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; border-radius: 999px; background: rgba(201,160,78,0.1); border: 1px solid rgba(201,160,78,0.3); color: var(--gold); font-weight: 700; font-size: 13px; width: fit-content; }
		.package-price { color: #fff; font-weight: 800; font-size: 1.5em; margin: 10px 0; display: flex; align-items: baseline; gap: 4px; }
		.package-price span { font-size: 0.6em; color: var(--gold); }
		.package-points { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
		.package-points li { position: relative; padding-inline-start: 22px; color: rgba(245,240,232,0.8); font-size: 15px; }
		.package-points li::before { content: '✦'; position: absolute; right: 0; color: var(--gold); font-size: 12px; }
		.package-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
		.reveal { opacity: 0; transform: translateY(30px); transition: opacity 0.7s ease, transform 0.7s ease; }
		.reveal.visible { opacity: 1; transform: translateY(0); }
		.review-head { display: flex; align-items: center; gap: 10px; }
		.avatar { width: 40px; height: 40px; border-radius: 50%; color: #fff; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; }
		.avatar-img { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border); }
		.review-card h5 { margin: 0; font-size: 15px; color: var(--text); }
		.review-card small { color: var(--muted); }
		.review-card p { margin: 8px 0 0; color: var(--muted); line-height: 1.5; }
		.faq-list { display: grid; gap: 10px; margin-top: 10px; }
		.faq-item { border-top: 1px solid var(--border); padding-top: 10px; }
		.faq-item:first-child { border-top: none; padding-top: 0; }
		.faq-carousel { 
			position: relative;
			width: 100%;
			min-height: auto;
			max-width: 100%;
		}
		.faq-carousel-track {
			display: flex;
			flex-direction: column;
			gap: 12px;
		}
		.faq-carousel-item {
			opacity: 0;
			visibility: hidden;
			transition: opacity 0.5s ease, visibility 0.5s ease;
			position: absolute;
			width: 100%;
		}
		.faq-carousel-item.active {
			opacity: 1;
			visibility: visible;
			position: relative;
		}
		.faq-question-btn { 
			display: flex; 
			align-items: center; 
			justify-content: space-between; 
			width: 100%;
			background: var(--card);
			border: 2px solid var(--border);
			border-radius: 12px;
			padding: 16px;
			cursor: pointer;
			transition: all 0.25s ease;
			text-align: right;
			color: var(--text);
			font-weight: 600;
			font-size: 15px;
			gap: 12px;
		}
		.faq-question-btn:hover { 
			background: var(--overlay);
			border-color: var(--gold);
			box-shadow: 0 8px 18px var(--shadow);
			transform: translateY(-2px);
		}
		.faq-question-btn.expanded {
			background: linear-gradient(135deg, rgba(196,152,65,0.12), rgba(31,182,166,0.08));
			border-color: var(--gold);
			box-shadow: 0 12px 24px var(--shadow);
		}
		.faq-question-btn .icon { 
			flex-shrink: 0; 
			font-size: 18px;
			transition: transform 0.3s ease;
		}
		.faq-question-btn.expanded .icon {
			transform: rotate(180deg);
		}
		.faq-answer { 
			max-height: 0;
			overflow: hidden;
			transition: max-height 0.4s ease;
			background: var(--overlay);
			border: 1px solid var(--border);
			border-radius: 0 0 12px 12px;
			margin-top: 0;
		}
		.faq-answer.show { 
			max-height: 600px;
			padding: 16px;
			margin-top: 0px;
			border-top: 2px solid var(--gold);
		}
		.faq-answer p { 
			margin: 0;
			color: var(--text);
			line-height: 1.7;
			font-size: 14px;
		}
		.faq-close-btn {
			background: transparent;
			border: 1px solid var(--border);
			border-radius: 8px;
			padding: 8px 14px;
			cursor: pointer;
			color: var(--muted);
			font-size: 13px;
			margin-top: 12px;
			transition: all 0.2s ease;
			font-weight: 600;
		}
		.faq-close-btn:hover {
			background: var(--card);
			color: var(--text);
			border-color: var(--gold);
		}
		.faq-nav-dots {
			display: flex;
			justify-content: center;
			gap: 8px;
			margin-top: 14px;
		}
		.faq-dot {
			width: 8px;
			height: 8px;
			border-radius: 50%;
			background: var(--border);
			cursor: pointer;
			transition: all 0.3s ease;
		}
		.faq-dot.active {
			background: var(--gold);
			width: 24px;
			border-radius: 999px;
			box-shadow: 0 4px 12px rgba(196,152,65,0.3);
		}
		.faq-dot:hover {
			background: var(--gold);
		}
		@keyframes slideUp {
			from { opacity: 0; transform: translateY(12px); }
			to { opacity: 1; transform: translateY(0); }
		}
		@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
		.fb-carousel { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; width: 100%; }
		.fb-carousel-item { opacity: 0; visibility: hidden; transition: opacity 0.5s ease, visibility 0.5s ease; position: absolute; width: 100%; }
		.fb-carousel-item.active { opacity: 1; visibility: visible; position: relative; }
		.fb-section { animation: fadeIn 0.6s ease both; }
		.fb-carousel { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; width: 100%; }
		.fb-post-card { position: relative; border-radius: 18px; overflow: hidden; aspect-ratio: 4/5; background: var(--card); border: 1px solid var(--glass-border); box-shadow: 0 14px 35px var(--shadow); transition: all 0.4s ease; }
		.fb-post-card:hover { transform: translateY(-5px) scale(1.02); box-shadow: 0 24px 50px var(--shadow); border-color: rgba(201,160,78,0.4); }
		.fb-post-card:hover .fb-post-overlay { opacity: 1; }
		.fb-post-image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s ease; }
		.fb-post-card:hover .fb-post-image { transform: scale(1.08); }
		.fb-post-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,26,18,0.95) 0%, rgba(10,26,18,0.3) 50%, transparent 100%); display: flex; flex-direction: column; justify-content: flex-end; padding: 20px; opacity: 0; transition: opacity 0.4s ease; z-index: 2; }
		.fb-play-icon { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 56px; height: 56px; background: rgba(201,160,78,0.9); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; color: #0f2419; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
		.fb-post-bottom { display: flex; flex-direction: column; gap: 8px; }
		.fb-post-caption { color: rgba(245,240,232,0.9); font-size: 13px; line-height: 1.5; margin: 0; }
		.fb-post-engagement { display: flex; gap: 14px; font-size: 13px; color: rgba(201,160,78,0.9); font-weight: 700; }
		.fb-nav-dots { display: flex; justify-content: center; gap: 12px; margin-top: 24px; }
		.fb-dot { width: 30px; height: 3px; background: rgba(201,160,78,0.15); border-radius: 4px; cursor: pointer; transition: all 0.4s ease; position: relative; overflow: hidden; }
		.fb-dot::after { content: ''; position: absolute; left: 0; top: 0; height: 100%; width: 0; background: #c9a04e; transition: width 0.4s ease; }
		.fb-dot.active { width: 50px; background: rgba(201,160,78,0.3); }
		.fb-dot.active::after { width: 100%; box-shadow: 0 0 10px #c9a04e; }
		@media (max-width: 768px) { .fb-carousel { grid-template-columns: repeat(2, 1fr); gap: 10px; } .fb-post-overlay { opacity: 1; } }
		@media (max-width: 480px) { .fb-carousel { grid-template-columns: 1fr; gap: 12px; } }
		.google-chip { display: inline-flex; align-items: center; gap: 6px; background: rgba(201,160,78,0.12); color: var(--gold); padding: 4px 10px; border-radius: 999px; font-weight: 700; border: 1px solid rgba(201,160,78,0.25); font-size: 12px; }
		.fallback-chip { display: inline-flex; align-items: center; gap: 6px; background: rgba(201,160,78,0.08); color: var(--muted); padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(201,160,78,0.2); font-size: 12px; }
		.footer { margin: 28px 0 0; text-align: center; padding: 40px 0 90px; background: linear-gradient(135deg, #1a3a2a, #0f2419); border-radius: 18px 18px 0 0; border-top: 1px solid rgba(201,160,78,0.2); color: rgba(245,240,232,0.85); font-size: 14px; }
		.footer .social-link { color: rgba(245,240,232,0.6); }
		.footer .social-link:hover { color: #c9a04e; }
		.social-row { display: flex; justify-content: center; align-items: center; gap: 14px; margin-top: 12px; }
		.social-link { width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center; color: var(--social-base); border-radius: 10px; transition: color 0.2s ease, transform 0.2s ease; }
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
		.support-floating { position: fixed; bottom: 20px; right: 20px; z-index: 120; }
		.chat-frame { position: fixed; bottom: 20px; right: 20px; width: 360px; max-width: 90vw; height: 520px; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.35); z-index: 121; }
		.close-btn { position: absolute; top: 10px; left: 10px; background: #dc3545; color: #fff; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; z-index: 2; }
		.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 130; padding: 16px; }
		.modal-card { position: relative; }
		@media (max-width: 768px) {
			.hero { height: 100vh; min-height: 580px; align-items: flex-end; justify-content: center; }
			.hero-bg { object-position: 70% center; }
			.hero-overlay { background: linear-gradient(to top, rgba(26,58,42,0.95) 0%, rgba(26,58,42,0.7) 40%, rgba(26,58,42,0.1) 70%, transparent 100%) !important; }
			.hero-logo { position: absolute; top: 30px; width: 90px; height: 90px; }
			.hero-content { max-width: 100%; padding: 0 20px 40px; text-align: center; align-items: center; gap: 14px; position: static; }
			.hero-content h1 { font-size: clamp(24px, 7vw, 34px); margin-top: auto; }
			.hero-content p { font-size: 0.9rem; }
			.hero-tag { font-size: 12px; padding: 6px 14px; }
			.cta-row { justify-content: center; flex-wrap: nowrap; width: 100%; gap: 8px; }
			.cta-row .btn { padding: 12px 10px; font-size: 13px; flex: 1; }
			.sticky-bar { justify-content: center; background: rgba(24,18,16,0.95); }
			.topbar { flex-direction: column; align-items: flex-start; }
			.fb-carousel { grid-template-columns: 1fr; }
			.fb-post-card:nth-child(n+2) { display: none; }
			.fb-post-image { height: 320px; }
		}
	`;

	// Theme toggle removed - dark mode only

	return (
		<div className="landing-page" dir="rtl">
			<style>{css}</style>
			<section className="hero reveal">
				<img
					className="hero-bg"
					src="/banner-b.png"
					alt="غرام سلطان تجهز عروسة في صالون بيوتي سنتر"
					loading="eager"
				/>
				{/* Gradient overlay */}
				<div className="hero-overlay" />
				{/* Floating gold particles */}
				<div className="hero-particles" aria-hidden>
					{Array.from({ length: 12 }).map((_, i) => (
						<span
							key={i}
							className="hero-particle"
							style={{
								top: `${10 + Math.random() * 80}%`,
								left: `${Math.random() * 60}%`,
								animationDelay: `${i * 0.7}s`,
								animationDuration: `${6 + Math.random() * 6}s`,
								width: `${3 + Math.random() * 4}px`,
								height: `${3 + Math.random() * 4}px`,
							}}
						/>
					))}
				</div>
				{/* Hero content */}
				<div className="hero-content">
					<img className="hero-logo" src="/logo.png" alt="شعار غرام سلطان" />
					<div className="hero-tag">
						<span>✨</span>
						<span>خبيرة التجميل الأولى في كفر الشيخ</span>
					</div>
					<h1 style={{ color: '#fff', margin: '0', textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
						إطلالة ساحرة مع<br />
						<span style={{ color: '#c9a04e' }}>غرام سلطان</span>
					</h1>
					<p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.05rem', maxWidth: '420px' }}>
						أحدث صيحات الميكب والتصوير الاحترافي بلمسة تجمع الخبرة والابتكار.
						ليلة العمر تستاهل الأفضل.
					</p>
					<div className="cta-row" style={{ gap: '12px' }}>
						<button
							className="btn"
							onClick={() => window.location.href = '/prices'}
							style={{
								background: 'linear-gradient(135deg, #1a3a2a, #2a5a3a)',
								color: '#fff',
								padding: '14px 28px',
								fontSize: '15px',
								fontWeight: 800,
								borderRadius: '14px',
								border: '1px solid rgba(201,160,78,0.3)',
								boxShadow: '0 8px 24px rgba(26,58,42,0.4)'
							}}
						>
							💸 أسعار الخدمات
						</button>
						<button
							className="btn btn-primary"
							onClick={() => window.open(WHATSAPP_LINK, '_blank')}
							style={{
								padding: '14px 28px',
								fontSize: '15px',
								fontWeight: 700,
							}}
						>
							<WhatsAppIcon size={18} /> احجزي الآن
						</button>
					</div>
				</div>
			</section>


			<div className="container">
				{/* المساحة الخاصة بعفركوش، بيبني ويعدل فيها مباشرة */}
				<div id="afrakoush-dynamic-space" ref={afrakoushSpaceRef}></div>

				{facebookFeed.length > 0 && (
					<section className="fb-section reveal" id="facebook-feed">
						<h2 style={{ marginTop: 0, marginBottom: 6 }}>آخر أعمالنا</h2>
						<p style={{ color: 'var(--muted)', margin: '0 0 20px' }}>أحدث لوكات العرايس والجلسات من صفحتنا على فيسبوك</p>
						<div className="fb-carousel">
							{fbVisiblePosts.map((post, idx) => (
								<div
									key={post.facebookId || `${post.permalink}-${idx}`}
									className="fb-post-card"
									onClick={() => window.open(post.permalink, '_blank')}
									onTouchStart={handleFbTouchStart}
									onTouchEnd={handleFbTouchEnd}
									style={{ cursor: 'pointer' }}
								>
									{post.fullPicture && (
										<img
											src={post.fullPicture}
											alt="عمل من أعمالنا"
											className="fb-post-image"
											loading="lazy"
											referrerPolicy="no-referrer"
										/>
									)}
									<div className="fb-post-overlay">
										{post.type === 'video' && (
											<div className="fb-play-icon">▶</div>
										)}
										<div className="fb-post-bottom">
											{(post.message || post.story) && (
												<p className="fb-post-caption">
													{(post.message || post.story).length > 80
														? `${(post.message || post.story).substring(0, 80)}...`
														: (post.message || post.story)}
												</p>
											)}
											<div className="fb-post-engagement">
												<span>❤️ {Number(post.likeCount || 0).toLocaleString()}</span>
												<span>💬 {Number(post.commentCount || 0).toLocaleString()}</span>
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
						{facebookFeed.length > 1 && (
							<div className="fb-nav-dots">
								{facebookFeed.map((_, idx) => (
									<div
										key={idx}
										className={`fb-dot ${idx === currentFbItemIdx ? 'active' : ''}`}
										onClick={() => {
											setCurrentFbItemIdx(idx);
											setFbAutoRotatePaused(false);
										}}
										title={`بوست ${idx + 1}`}
									/>
								))}
							</div>
						)}
						<div className="cta-row" style={{ marginTop: '24px', justifyContent: 'center', gap: '16px' }}>
							<button className="btn btn-artistic" onClick={() => window.location.href = '/gallery'} style={{ padding: '14px 32px' }}>
								🎨 <span>معرض الأعمال الفني</span>
							</button>
							<button className="btn btn-outline" onClick={() => window.open(FACEBOOK_LINK, '_blank')} style={{ padding: '14px 28px' }}>
								تابعينا على فيسبوك
							</button>
						</div>
					</section>
				)}

				<section className="availability reveal">
					<div className="card" style={{ padding: '32px' }}>
						<span className="badge">التحقق من المواعيد</span>
						<h2 style={{ margin: '12px 0 16px' }}>تأكدي إن اليوم متاح للحجز</h2>
						<form onSubmit={(e) => { e.preventDefault(); handleCheckAvailability(); }} style={{ display: 'grid', gap: '20px' }}>
							<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
								<div>
									<label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>نوع الباكدج</label>
									<select value={packageType} onChange={(e) => setPackageType(e.target.value)} style={{ padding: '14px', borderRadius: '14px', background: 'rgba(26,58,42,0.4)', border: '1px solid var(--glass-border)', color: '#fff', width: '100%' }}>
										<option value="makeup">💄 ميك أب</option>
										<option value="photo">📸 تصوير</option>
									</select>
								</div>
								<div>
									<label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>تاريخ الحجز</label>
									<input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: '14px', borderRadius: '14px', background: 'rgba(26,58,42,0.4)', border: '1px solid var(--glass-border)', color: '#fff', width: '100%' }} />
								</div>
							</div>
							{error && <div style={{ color: '#ff6b6b', fontSize: '14px', textAlign: 'center' }}>{error}</div>}
							<button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '16px', fontSize: '16px', marginTop: '8px', width: '100%', color: '#080f0b' }}>
								{loading ? 'بيتحقق...' : 'افحصي التوافر فوراً ✦'}
							</button>
						</form>
					</div>
				</section>

				<section className="reveal">
					<div className="package-grid">
						{featuredPackages.map((pkg) => (
							<div key={pkg.title} className="package-card">
								<span className="package-label">{pkg.label}</span>
								<h3 style={{ margin: '4px 0 4px' }}>{pkg.title}</h3>
								<div className="package-price">
									{pkg.price} <span>ج.م</span>
								</div>
								<ul className="package-points">
									{pkg.points.map((pt, i) => <li key={i}>{pt}</li>)}
								</ul>
								<div className="package-actions" style={{ marginTop: 'auto', paddingTop: '10px' }}>
									<button className="btn btn-primary" onClick={() => handlePackageWhatsApp(pkg.title)} style={{ width: '100%', color: '#080f0b' }}>احجزي الآن</button>
									<button className="btn btn-outline" onClick={() => (window.location.href = '/prices')} style={{ width: '100%', fontSize: '13px' }}>شوفي باقي الباكدجات</button>
								</div>
							</div>
						))}
					</div>
				</section>


				<section className="highlight reveal">
					<div className="massage-banner">
						<div className="content">
							<div className="massage-glass-card">
								<span className="badge-new">✨ متوفر الآن</span>
								<h2 style={{ margin: '8px 0 12px' }}>كرسي المساج الذكي ضد الجاذبية</h2>
								<p>راحة فاخرة تحسسك إنك طايرة. جربي جلسة الاسترخاء مع تقنيات انعدام الوزن. إحساس مختلف بعد يوم طويل، مع ضغط وتدفئة تخلّي جسمك يشكرك.</p>
								<div className="cta-row" style={{ marginTop: '20px' }}>
									<button className="btn btn-primary" onClick={() => window.open(WHATSAPP_LINK, '_blank')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#080f0b' }}>
										<WhatsAppIcon size={18} />
										<span>احجزي جلسة</span>
									</button>
									<button className="btn btn-outline" onClick={() => window.location.href = '/massage-chair'}>💺 تفاصيل الكرسي</button>
								</div>
							</div>
						</div>
					</div>
				</section>

				<section className="card why-card reveal">
					<h3 style={{ marginTop: 0 }}>ليه تختارينا؟</h3>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginTop: '12px' }}>
						<div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
							<span style={{ fontSize: '24px', flexShrink: 0 }}>🏆</span>
							<div>
								<div style={{ color: '#c9a04e', fontWeight: 700, marginBottom: '4px' }}>خبرة واحترافية</div>
								<div style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6 }}>سنوات من الخبرة في مجال التجميل تضمن لكِ نتائج مبهرة.</div>
							</div>
						</div>
						<div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
							<span style={{ fontSize: '24px', flexShrink: 0 }}>💎</span>
							<div>
								<div style={{ color: '#c9a04e', fontWeight: 700, marginBottom: '4px' }}>منتجات عالية الجودة</div>
								<div style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6 }}>نستخدم أفضل المنتجات العالمية لضمان سلامة بشرتكِ وجمالها.</div>
							</div>
						</div>
						<div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
							<span style={{ fontSize: '24px', flexShrink: 0 }}>✨</span>
							<div>
								<div style={{ color: '#c9a04e', fontWeight: 700, marginBottom: '4px' }}>اهتمام بالتفاصيل</div>
								<div style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6 }}>نحرص على تقديم تجربة مريحة، مع التركيز على أدق التفاصيل لإطلالة مثالية.</div>
							</div>
						</div>
						<div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
							<span style={{ fontSize: '24px', flexShrink: 0 }}>🎓</span>
							<div>
								<div style={{ color: '#c9a04e', fontWeight: 700, marginBottom: '4px' }}>البورد الأمريكي</div>
								<div style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6 }}>سنتر غرام سلطان حاصل على البورد الأمريكي — شهادة معتمدة دوليًا.</div>
							</div>
						</div>
					</div>
				</section>

				<section className="card reveal">
					<h2 style={{ marginTop: 0, marginBottom: 6 }}>تواصل فوري وكل القنوات</h2>
					<p style={{ color: 'var(--muted)', margin: '0 0 14px' }}>اختاري الطريقة المناسبة ليكي؛ مكالمة، واتساب، خريطة أو سوشيال في ضغطة.</p>
					<div className="contact-grid" style={{ marginBottom: 20 }}>
						<div className="contact-card">
							<span className="contact-title">
								<svg viewBox="0 0 448 512" style={{ width: 18, height: 18, fill: 'var(--gold)' }}>{WHATSAPP_SVG}</svg>
								واتساب
							</span>
							<span className="contact-desc">رد سريع وتأكيد تفاصيل الميعاد.</span>
							<button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 'auto' }} onClick={() => window.open(WHATSAPP_LINK, '_blank')}>
								<svg viewBox="0 0 448 512" style={{ width: 18, height: 18, fill: 'currentColor' }}>{WHATSAPP_SVG}</svg>
								<span>مراسلة واتساب</span>
							</button>
						</div>
						<div className="contact-card">
							<span className="contact-title"><PhoneIcon size={18} />اتصال أرضي</span>
							<span className="contact-desc">للاستفسارات السريعة: {LANDLINE}</span>
							<button className="btn btn-gold-premium" style={{ background: 'linear-gradient(135deg, #c9a04e, #e6c27b)', color: '#080f0b', display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 'auto' }} onClick={() => window.location.href = `tel:${LANDLINE}`}>
								<PhoneIcon size={18} />
								<span>اتصلي الآن</span>
							</button>
						</div>
						<div className="contact-card">
							<span className="contact-title"><MapPinIcon size={18} />الموقع</span>
							<span className="contact-desc">شارع الجيش، مدينة دسوق.</span>
							<button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 'auto', color: '#080f0b' }} onClick={() => window.location.href = MAP_LINK}>
								<MapPinIcon size={18} />
								<span>افتحي الخريطة</span>
							</button>
						</div>
						<div className="contact-card">
							<span className="contact-title"><BotIcon size={18} />مساعد ذكي</span>
							<span className="contact-desc">ردود فورية لأي سؤال يخطر في بالك.</span>
							<button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 'auto' }} onClick={() => setShowAIChat(true)}>
								<BotIcon size={18} />
								<span>اسألي الذكاء الاصطناعي</span>
							</button>
						</div>
					</div>
					<p style={{ color: 'var(--muted)', margin: '20px 0 10px', fontWeight: 600, textAlign: 'center' }}>تابعي غرام سلطان على السوشيال عشان تشوفي أحدث الكواليس</p>
					<div className="quick-links">
						{socialLinksNoWhatsApp.map((s) => (
							<a className="quick-link" key={s.href} href={s.href} target="_blank" rel="noreferrer">
								<svg viewBox="0 0 448 512" style={{ width: 22, height: 22, fill: 'currentColor', color: s.color || 'var(--gold)' }}>{s.svg}</svg>
								<span style={{ fontWeight: 600 }}>{s.text || s.label}</span>
							</a>
						))}
					</div>
				</section>

				<section className="reviews reveal">
					<div className="reviews-header">
						<div>
							<div className="badge" style={{ background: isGoogleReviews ? 'rgba(66,133,244,0.12)' : 'rgba(244,193,80,0.15)', borderColor: isGoogleReviews ? 'rgba(66,133,244,0.25)' : undefined }}>
								{isGoogleReviews ? 'ريفيوهات مباشرة من جوجل' : 'عينة محفوظة تظهر لو اتصال جوجل اتعطل'}
							</div>
							<h2 style={{ margin: '6px 0' }}>{formattedRating} · {formattedTotalReviews} مراجعة</h2>
							<div className="stars" aria-label="متوسط التقييم">{renderStars(reviewsData.rating)}</div>
							<div style={{ color: 'var(--muted)', fontSize: 14 }}>
								{reviewsLoading ? 'بنجيب آخر تقييمات جوجل...' : isGoogleReviews ? 'القائمة دي جاية من جوجل مباشرة.' : 'جوجل مش متاح دلوقتي فبنعرّض العينة المخزنة مؤقتاً.'}
								{reviewsError && <div style={{ color: '#d9534f', marginTop: 4 }}>{reviewsError}</div>}
							</div>
						</div>
						<div className="cta-row">
							<button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#080f0b' }} onClick={() => window.open('https://g.page/r/CeoPiyI-r3niEAE/review', '_blank')} aria-label="اكتبي تقييمك">
								<span>✍️</span>
								<span>اكتبي تقييمك</span>
							</button>
						</div>
					</div>
					<div className="review-grid">
						{reviewsData.reviews.map((rev, idx) => {
							const letter = rev.author?.trim()?.charAt(0)?.toUpperCase() || 'ج';
							const bg = colorFromName(rev.author || 'ج');
							return (
								<div className="review-card" key={`${rev.author}-${idx}`} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
									<div className="review-head">
										{rev.photoUrl ? (
											<img className="avatar-img" src={rev.photoUrl} alt={rev.author} loading="lazy" style={{ border: '2px solid var(--gold)' }} />
										) : (
											<div className="avatar" style={{ background: bg, border: '2px solid rgba(255,255,255,0.1)' }}>{letter}</div>
										)}
										<div>
											<h5 style={{ color: '#fff', fontSize: '16px' }}>{rev.author || 'عميلة من جوجل'}</h5>
											<small style={{ color: 'var(--gold)', fontSize: '12px' }}>{formatReviewDate(rev)}</small>
										</div>
									</div>
									<div className="stars" style={{ fontSize: '14px' }}>{renderStars(rev.rating)}</div>
									<p style={{ color: 'rgba(245,240,232,0.85)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{rev.text}</p>
								</div>
							);
						})}
					</div>
					<div className="cta-row" style={{ marginTop: 12 }}>
						<button
							className="btn btn-outline"
							style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
							onClick={() => window.open('https://www.google.com/search?hl=ar-EG&gl=eg&q=%D8%BA%D8%B1%D8%A7%D9%85+%D8%B3%D9%84%D8%B7%D8%A7%D9%86+%D8%A8%D9%8A%D9%88%D8%AA%D9%8A+%D8%B3%D9%86%D8%AA%D8%B1+%D9%88%D8%B3%D8%AA%D9%88%D8%AF%D9%8A%D9%88%D8%8C+%D8%B4%D8%A7%D8%B1%D8%B9+%D8%A7%D9%84%D8%AC%D9%8A%D8%B4%D8%8C+%D9%85%D8%AF%D9%8A%D9%86%D8%A9+%D8%AF%D8%B3%D9%88%D9%82%D8%8C+%D8%AF%D8%B3%D9%88%D9%82%D8%8C+%D9%83%D9%81%D8%B1+%D8%A7%D9%84%D8%B4%D9%8A%D8%AE%D8%8C%D8%8C+%D9%85%D8%B1%D9%83%D8%B2+%D8%AF%D8%B3%D9%88%D9%82%D8%8C+%D9%85%D8%AD%D8%A7%D9%81%D8%B8%D8%A9+%D9%83%D9%81%D8%B1+%D8%A7%D9%84%D8%B4%D9%8A%D8%AE&ludocid=16319267406156074986&lsig=AB86z5VCcixidYfBfDrLEBDseQnu&hl=ar&gl=EG#lrd=0x14f65b4cd1f4431f:0xe279af3e228b0fea,1', '_blank')}
							aria-label="عرض كل التقييمات"
						>
							<span>★</span>
							<span>عرض كل التقييمات</span>
						</button>
					</div>
				</section>

				<section className="card reveal" id="faq">
					<h2 style={{ marginTop: 0, marginBottom: 6 }}>أسئلة شائعة</h2>
					<p style={{ color: 'var(--muted)', margin: '0 0 16px' }}>اضغطي على أي سؤال عشان تشوفي الإجابة !</p>
					<div className="faq-carousel">
						<div className="faq-carousel-track">
							{faqItems.map((item, idx) => (
								<div
									key={idx}
									className={`faq-carousel-item ${idx === currentFaqIdx ? 'active' : ''}`}
								>
									<button
										className={`faq-question-btn ${expandedFaqAnswer ? 'expanded' : ''}`}
										onClick={() => {
											setExpandedFaqAnswer(!expandedFaqAnswer);
											setAutoRotatePaused(!expandedFaqAnswer);
										}}
									>
										<div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
											<span className="icon">
												{expandedFaqAnswer ? '✖️' : '✨'}
											</span>
											<span style={{ flex: 1 }}>{item.question}</span>
										</div>
									</button>
									<div className={`faq-answer ${expandedFaqAnswer ? 'show' : ''}`}>
										<p>{item.answer}</p>
										{expandedFaqAnswer && (
											<button
												className="faq-close-btn"
												onClick={() => {
													setExpandedFaqAnswer(false);
													setAutoRotatePaused(false);
												}}
											>
												← الدوران التاني
											</button>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
					<div className="faq-nav-dots">
						{faqItems.map((_, idx) => (
							<div
								key={idx}
								className={`faq-dot ${idx === currentFaqIdx ? 'active' : ''}`}
								onClick={() => {
									setCurrentFaqIdx(idx);
									setExpandedFaqAnswer(false);
									setAutoRotatePaused(false);
								}}
								title={`سؤال ${idx + 1}`}
							/>
						))}
					</div>
				</section>


				<section className="trust-section reveal">
					<div className="trust-heading">ثقة واعتمادات نعتز بيها</div>
					<div className="trust-logos">
						<div className="trust-item">
							<AwardIcon color="#f59e0b" />
							<span>AMERICAN BOARD</span>
						</div>
						<div className="trust-item">
							<ShieldCheckIcon color="#16a34a" />
							<span>PRO PRODUCTS</span>
						</div>
						<div className="trust-item">
							<StarIcon color="#f59e0b" />
							<span>1100+ REVIEWS</span>
						</div>
					</div>
				</section>

				<section className="card map-embed-card reveal">
					<h2 style={{ marginTop: 0, marginBottom: 8 }}>موقعنا على الخريطة</h2>
					<p style={{ color: 'var(--muted)', margin: '0 0 12px' }}>شوفي اللوكيشن مباشرة أو افتحيه في خرائط جوجل.</p>
					<div className="map-frame">
						<iframe
							title="Gharam Sultan Location"
							src={MAP_EMBED_URL}
							allowFullScreen
							loading="lazy"
							referrerPolicy="no-referrer-when-downgrade"
							allow="geolocation; microphone; camera"
							style={{ border: 'none' }}
						/>
					</div>
					<div className="cta-row" style={{ marginTop: 12 }}>
						<button className="btn btn-outline" onClick={() => window.location.href = MAP_LINK} aria-label="افتحي الخريطة">
							<span>🗺️</span>
							<span style={{ marginInlineStart: 6 }}>افتحي في جوجل ماب</span>
						</button>
					</div>
				</section>

				<section className="footer reveal" style={{ background: 'linear-gradient(to bottom, #0f2419, #08140e)', borderTop: '2px solid #c9a04e', borderRadius: '40px 40px 0 0', marginTop: '60px', padding: '60px 20px' }}>
					<img src="/logo.png" alt="غرام سلطان" style={{ width: '120px', marginBottom: '24px', opacity: 0.9, filter: 'drop-shadow(0 4px 15px rgba(201,160,78,0.2))' }} />
					<div style={{ color: '#c9a04e', fontSize: '20px', fontWeight: 800, letterSpacing: '1px', marginBottom: '8px' }}>غرام سلطان بيوتي سنتر</div>
					<p style={{ color: 'rgba(245,240,232,0.6)', marginTop: 10, fontSize: '15px', maxWidth: '600px', marginInline: 'auto' }}>
						خبيرة التجميل الأولى في كفر الشيخ - نعتني بأدق تفاصيل إطلالتكِ لنجعلكِ ملكة في ليلة العمر.
					</p>
					<div className="social-row" style={{ margin: '30px 0' }}>
						{socialLinks.map((s) => (
							<a key={s.href} className="social-link" href={s.href} target="_blank" rel="noreferrer" style={{ '--hover': s.color, background: 'rgba(255,255,255,0.05)', width: '50px', height: '50px', borderRadius: '15px', border: '1px solid rgba(201,160,78,0.1)' }} aria-label={s.label}>
								<svg viewBox="0 0 448 512" style={{ width: '28px', height: '28px' }}>{s.svg}</svg>
							</a>
						))}
					</div>
					<div style={{ color: 'rgba(201,160,78,0.4)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px' }}>
						© {new Date().getFullYear()} Gharam Sultan Beauty Center · Premium Experience
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
						onClick={() => { window.location.href = '/gallery'; setFabOpen(false); }}
						aria-label="المعرض"
					>
						<span className="fab-tooltip">معرض الصور</span>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
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
				</div>
			</div>

			{/* الذكاء الاصطناعي Floating Button */}
			{!showAIChat && (
				<>
					<button
						className="ai-floating-btn"
						onClick={() => setShowAIChat(true)}
						aria-label="الذكاء الاصطناعي"
					>
						<div className="ai-btn-glow"></div>
						<div className="ai-btn-content">
							<img src="https://i.ibb.co/7JJScM0Q/zain-ai.png" alt="AI" />
							<span>مساعدة ذكية</span>
						</div>
					</button>
					<style>{`
						.ai-floating-btn {
							position: fixed;
							bottom: 24px;
							left: 24px;
							z-index: 100;
							background: linear-gradient(135deg, #1a3a2a, #2a5a3a);
							border: none;
							border-radius: 999px;
							padding: 4px;
							cursor: pointer;
							box-shadow: 0 10px 25px rgba(26,58,42,0.5);
							animation: pulse-ai 2s infinite;
							transition: transform 0.3s ease;
						}
						.ai-floating-btn:hover {
							transform: scale(1.05) translateY(-5px);
						}
						.ai-btn-content {
							display: flex;
							align-items: center;
							gap: 10px;
							background: rgba(0,0,0,0.15);
							padding: 8px 18px 8px 12px;
							border-radius: 999px;
							color: #c9a04e;
							font-weight: bold;
							font-size: 15px;
						}
						.ai-floating-btn img {
							width: 28px;
							height: 28px;
							filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
						}
						@keyframes pulse-ai {
							0% { box-shadow: 0 0 0 0 rgba(201,160,78,0.4); }
							70% { box-shadow: 0 0 0 15px rgba(201,160,78,0); }
							100% { box-shadow: 0 0 0 0 rgba(201,160,78,0); }
						}
					`}</style>
				</>
			)}

			{showAIChat && <AIChatPopup onClose={() => setShowAIChat(false)} />}
		</div>
	);
}

export default Landing;
