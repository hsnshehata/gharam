import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { googleReviews } from '../data/googleReviews';
import { API_BASE } from '../utils/apiBase';

const WHATSAPP_LINK = 'https://wa.me/gharam';
const MAP_LINK = 'https://maps.app.goo.gl/cpF8J7rw6ScxZwiv5';
const MAP_EMBED_URL = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1098.7427180615887!2d30.649189727778985!3d31.12134932679913!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14f65b4cd1f4431f%3A0xe279af3e228b0fea!2z2LrYsdin2YUg2LPZhNi32KfZhiDYqNmK2YjYqtmKINiz2YbYqtixINmI2LPYqtmI2K_ZitmI!5e1!3m2!1sar!2seg!4v1767756045239!5m2!1sar!2seg';
const TIKTOK_LINK = 'https://www.tiktok.com/@gharamsoltan';
const INSTAGRAM_LINK = 'https://www.instagram.com/gharamsoltan';
const FACEBOOK_LINK = 'https://www.facebook.com/gharam.ml';
const THREADS_LINK = 'https://www.threads.net/@gharamsoltan';
const SUPPORT_LINK = 'https://zainbot.com/chat/ghazal';
const LANDLINE = '0472570908';
const CANONICAL_URL = 'https://gharamsoltan.com/';
const BUSINESS_NAME = 'غرام سلطان بيوتي سنتر وستوديو';
const BUSINESS_DESCRIPTION = 'ميكب ارتيست وتصوير احترافي وحجز باكدجات زفاف، صبغة وفرد شعر، ومساج ضد الجاذبية في كفر الشيخ. حجزي أونلاين وتابعي التوافر الفوري.';
const BUSINESS_EMAIL = 'info@gharamsoltan.com';
const BUSINESS_STREET = 'شارع الجيش، مدينة دسوق';
const BUSINESS_CITY = 'كفر الشيخ';
const BUSINESS_REGION = 'كفر الشيخ';
const BUSINESS_COUNTRY = 'EG';
const BUSINESS_GEO = { lat: 31.1213493, lng: 30.6491897 };
const OG_IMAGE = 'https://gharamsoltan.com/og-cover.jpg';
const OG_IMAGE_WIDTH = '1200';
const OG_IMAGE_HEIGHT = '630';
const TWITTER_SITE = '@gharamsoltan';
const PRICES_URL = 'https://gharamsoltan.com/prices';
const MASSAGE_CHAIR_URL = 'https://gharamsoltan.com/massage-chair';

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
	{ href: FACEBOOK_LINK, label: 'Facebook', text: 'فيسبوك', color: '#1877f2', svg: (
		<path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
	)},
	{ href: THREADS_LINK, label: 'Threads', text: 'ثريدز', color: '#000000', svg: (
		<path d="M331.5 235.7c2.2.9 4.2 1.9 6.3 2.8 29.2 14.1 50.6 35.2 61.8 61.4 15.7 36.5 17.2 95.8-30.3 143.2-36.2 36.2-80.3 52.5-142.6 53h-.3c-70.2-.5-124.1-24.1-160.4-70.2-32.3-41-48.9-98.1-49.5-169.6V256v-.2C17 184.3 33.6 127.2 65.9 86.2 102.2 40.1 156.2 16.5 226.4 16h.3c70.3.5 124.9 24 162.3 69.9 18.4 22.7 32 50 40.6 81.7l-40.4 10.8c-7.1-25.8-17.8-47.8-32.2-65.4-29.2-35.8-73-54.2-130.5-54.6-57 .5-100.1 18.8-128.2 54.4C72.1 146.1 58.5 194.3 58 256c.5 61.7 14.1 109.9 40.3 143.3 28 35.6 71.2 53.9 128.2 54.4 51.4-.4 85.4-12.6 113.7-40.9 32.3-32.2 31.7-71.8 21.4-95.9-6.1-14.2-17.1-26-31.9-34.9-3.7 26.9-11.8 48.3-24.7 64.8-17.1 21.8-41.4 33.6-72.7 35.3-23.6 1.3-46.3-4.4-63.9-16-20.8-13.8-33-34.8-34.3-59.3-2.5-48.3 35.7-83 95.2-86.4 21.1-1.2 40.9-.3 59.2 2.8-2.4-14.8-7.3-26.6-14.6-35.2-10-11.7-25.6-17.7-46.2-17.8H227c-16.6 0-39 4.6-53.3 26.3l-34.4-23.6c19.2-29.1 50.3-45.1 87.8-45.1h.8c62.6.4 99.9 39.5 103.7 107.7l-.2.2zm-156 68.8c1.3 25.1 28.4 36.8 54.6 35.3 25.6-1.4 54.6-11.4 59.5-73.2-13.2-2.9-27.8-4.4-43.4-4.4-4.8 0-9.6.1-14.4.4-42.9 2.4-57.2 23.2-56.2 41.8l-.1.1z" />
	)},
	{ href: TIKTOK_LINK, label: 'TikTok', text: 'تيكتوك', color: '#010101', svg: (
		<path d="M448 209.91a210.06 210.06 0 0 1-122.77-39.25V349.38A162.55 162.55 0 1 1 185 188.31V278.2a74.62 74.62 0 1 0 52.23 71.18V0h88a121.18 121.18 0 0 0 1.86 22.17A122.18 122.18 0 0 0 381 102.39a121.43 121.43 0 0 0 67 20.14z" />
	)},
	{ href: WHATSAPP_LINK, label: 'WhatsApp', text: 'واتساب', color: '#25d366', svg: (
		<path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
	)}
];

const socialLinksNoWhatsApp = socialLinks.filter((s) => s.label !== 'WhatsApp');
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
		price: '5,500 ج',
		points: ['تنضيف بشرة كامل + حمام مغربي وعطري', 'صنفرة للجسم + 3 رسومات حنة', 'تسريحة/لفة + رموش + عدسات + فيك نيلز', 'تأجير تاج/طرحة + بديكير ومنيكير + سشوار']
	},
	{
		label: 'باكدج التصوير الأكثر طلبًا',
		title: 'باكدج تصوير ألبوم 20×30',
		price: '1,600ج (استوديو) · 2,700ج (لوكيشن)',
		points: ['ألبوم 20×30 (10 مناظر)', 'فوتوبلوك 50×60', 'ألبوم ميني', '40 كارت مكرر']
	}
];

const faqItems = [
    { question: 'ايه الخدمات المتاحة في غرام سلطان بيوتي سنتر؟', answer: 'نقدم ميك اب احترافي للعرايس والمناسبات، تصوير استوديو ولوكيشن، فرد شعر بالبروتين والكافيار، تنظيف بشرة سوفت وهارد، كرسي مساج ذكي، حمام مغربي، باديكير ومنيكير، وخدمات شعر ووش وحواجب.' },
    { question: 'ازاي احجز باكدج ميك اب زفاف؟', answer: 'ابعتي على الواتساب 01092527126 أو موقع www.gharamsoltan.com لتأكيد التوافر، حددي التاريخ والباكدج، وادفعي عربون 500 جنيه على الأقل عبر فودافون كاش.' },
    { question: 'ايه أسعار باكدجات الميك اب؟', answer: 'شوفي قائمة الأسعار الكاملة هنا: https://ghazl.onrender.com/prices.html ثم قوليلي لو عايزة تفاصيل الباكدج اللي يناسبك.' },
    { question: 'فين عنوان السنتر وازاي أوصل؟', answer: 'شارع الجيش أمام بوابة دمشق، دسوق كفر الشيخ. قدامنا مطعم بوابة دمشق، يمين مخبز كلاسيك، شمال سوبر ماركت الجوهري. خريطة: https://maps.app.goo.gl/cpF8J7rw6ScxZwiv5' },
    { question: 'هل السنتر حريمي بس؟', answer: 'أيوة، مركز حريمي فقط، ستاف كله بنات خاصة للمحجبات، الرجالة بس لتصوير الكابلز.' },
    { question: 'ايه أسعار كرسي المساج الذكي؟', answer: 'سبيد ريليف 10 دقائق 100 ج، ديب ريست 20 دقيقة 200 ج، ماكس ريلاكس 30 دقيقة 250 ج. تفاصيل: https://gharam.onrender.com/massage-chair/' },
    { question: 'ازاي فرد الشعر وأسعاره؟', answer: 'فرد علاجي بس (بروتين، كافيار، أرجان، فيلر) يبدأ من 1500 ج حسب الطول والكثافة، بعد معاينة في السنتر.' },
    { question: 'هل في ليزر أو بيكيني؟', answer: 'لا، مفيش ليزر ولا بيكيني ولا أندر آرم، بس تنظيف بشرة ووش وحواجب.' },
    { question: 'ايه مواعيد السنتر؟', answer: 'كل يوم من 10 صباحاً لـ10 مساءً، ممكن تتغير في الأعياد.' },
    { question: 'ازاي أشوف أسعار التصوير؟', answer: 'شوفي قائمة الأسعار هنا: https://ghazl.onrender.com/prices.html، ألبومات تبدأ من 1600 ج في الاستوديو و2500 لوكيشن، ثم قوليلي لو عايزة عرض مخصص.'}
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
	const [packageType, setPackageType] = useState('makeup');
	const [date, setDate] = useState('');
	const [availability, setAvailability] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [showChat, setShowChat] = useState(false);
	const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
	const [theme, setTheme] = useState(() => {
		if (typeof window === 'undefined') return 'light';
		return localStorage.getItem('theme') || 'light';
	});
	const [spinSpeed, setSpinSpeed] = useState(1);
	const [currentFaqIdx, setCurrentFaqIdx] = useState(0);
	const [expandedFaqAnswer, setExpandedFaqAnswer] = useState(false);
	const [autoRotatePaused, setAutoRotatePaused] = useState(false);
	const [facebookFeed, setFacebookFeed] = useState([]);
	const [currentFbItemIdx, setCurrentFbItemIdx] = useState(0);
	const [fbAutoRotatePaused, setFbAutoRotatePaused] = useState(false);
	const [fbExpandedComments, setFbExpandedComments] = useState(false);
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

	const palette = themes[theme];
	const availabilityBadge = availability ? availabilityCopy[availability.status] : null;
	const spinADuration = Math.max(25, 35 / spinSpeed);
	const spinBDuration = Math.max(25, 35 / spinSpeed);
	const formattedRating = typeof reviewsData.rating === 'number' ? reviewsData.rating.toFixed(1) : '5.0';
	const formattedTotalReviews = reviewsData.totalReviews ? reviewsData.totalReviews.toLocaleString('en-US') : '1100+';
	const isGoogleReviews = reviewsData.source === 'google';
	const activeFbPost = facebookFeed[currentFbItemIdx] || facebookFeed[0];

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
					dayOfWeek: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
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
					url: 'https://gharamsoltan.com/logo.png'
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

	useEffect(() => {
		localStorage.setItem('theme', theme);
	}, [theme]);

	// FAQ auto-rotate: show one question at a time, change every 4 seconds
	useEffect(() => {
		if (autoRotatePaused) return;
		
		const interval = setInterval(() => {
			setCurrentFaqIdx((prev) => (prev + 1) % faqItems.length);
			setExpandedFaqAnswer(false);
		}, 4000);
		
		return () => clearInterval(interval);
	}, [autoRotatePaused]);

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

	useEffect(() => {
		let frame;
		const handleScroll = () => {
			if (frame) cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				const factor = 1 + Math.min(window.scrollY / 1400, 0.4);
				setSpinSpeed((prev) => (Math.abs(prev - factor) > 0.02 ? factor : prev));
			});
		};
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => {
			if (frame) cancelAnimationFrame(frame);
			window.removeEventListener('scroll', handleScroll);
		};
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

	// Facebook Feed: جلب البوستات والـ auto-rotate
	useEffect(() => {
		let isMounted = true;
		
		const fetchFacebookFeed = async () => {
			try {
				const res = await axios.get(`${API_BASE}/api/public/facebook/feed`);
				if (isMounted && res.data?.data) {
					setFacebookFeed(res.data.data);
				}
			} catch (err) {
				console.error('خطأ في جلب Facebook feed:', err);
			}
		};

		fetchFacebookFeed();
		return () => {
			isMounted = false;
		};
	}, []);

	// Facebook auto-rotate: show one post at a time, change every 5 seconds
	useEffect(() => {
		if (fbAutoRotatePaused || facebookFeed.length === 0) return;
		
		const interval = setInterval(() => {
			setCurrentFbItemIdx((prev) => (prev + 1) % facebookFeed.length);
			setFbExpandedComments(false);
		}, 5000);
		
		return () => clearInterval(interval);
	}, [fbAutoRotatePaused, facebookFeed.length]);

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
			--social-base: ${theme === 'dark' ? '#f7f3ee' : palette.muted};
		}
		body { margin: 0; background: var(--bg); color: var(--text); font-family: 'Tajawal', 'Arial', sans-serif; }
		.landing-page { background: var(--bg); min-height: 100vh; position: relative; overflow: hidden; }
		.floating-icons { position: fixed; inset: 0; pointer-events: auto; z-index: 0; }
		.floating-icons span { position: absolute; font-size: 40px; opacity: 0.22; animation: float 6s ease-in-out infinite, drift 14s linear infinite; transition: transform 0.28s ease, opacity 0.18s ease; cursor: default; }
		.floating-icons span:hover { opacity: 0.4; transform: scale(1.18) rotate(6deg); }
		.floating-icons span:nth-child(1) { top: 10%; left: 14%; animation-duration: 6.5s, 16s; }
		.floating-icons span:nth-child(2) { top: 26%; right: 14%; animation-duration: 6s, 15s; }
		.floating-icons span:nth-child(3) { top: 50%; left: 6%; animation-duration: 6.2s, 17s; }
		.floating-icons span:nth-child(4) { top: 64%; right: 10%; animation-duration: 6.8s, 16.5s; }
		.floating-icons span:nth-child(5) { top: 80%; left: 44%; animation-duration: 6.1s, 15.5s; }
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
		@keyframes twinkle {
			0%, 100% { transform: scale(0.6); opacity: 0.2; }
			50% { transform: scale(1.4); opacity: 0.8; }
		}
		@keyframes float {
			0% { transform: translateY(0); }
			50% { transform: translateY(-12px); }
			100% { transform: translateY(0); }
		}
		@keyframes drift {
			0% { transform: translateX(0) rotate(0deg); }
			50% { transform: translateX(6px) rotate(4deg); }
			100% { transform: translateX(0) rotate(0deg); }
		}
		.container { width: min(1200px, 92%); margin: 0 auto; position: relative; z-index: 1; }
		.topbar { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 18px 0; }
		.brand { display: flex; align-items: center; justify-content: center; text-align: center; gap: 12px; font-weight: 800; }
		.brand img { width: 64px; height: 64px; object-fit: contain; }
		.pill { display: inline-flex; gap: 8px; align-items: center; padding: 10px 14px; background: rgba(0,0,0,0.03); border: 1px solid var(--border); border-radius: 999px; color: var(--muted); font-size: 14px; }
		.hero { position: relative; display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 32px; align-items: center; padding: 24px 0 12px; }
		.hero > * { position: relative; z-index: 1; }
		.hero img { position: relative; z-index: 1; width: 100%; border-radius: 16px; object-fit: cover; box-shadow: none; border: none; background: transparent; mix-blend-mode: normal; filter: none; }
		.hero-visual { position: relative; display: flex; align-items: center; justify-content: center; padding: 12px; }
		.floating-squares { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; filter: drop-shadow(0 12px 24px var(--shadow)); z-index: 0; }
		.square { position: absolute; display: grid; place-items: center; border-radius: 18px; pointer-events: none; }
		.square .ring { position: absolute; inset: 0; border-radius: 18px; mix-blend-mode: screen; opacity: 0.65; backdrop-filter: blur(6px); }
		.square.gold { width: 86%; height: 86%; animation: swap-large 12s ease-in-out infinite; }
		.square.gold .ring { border: 1px solid var(--gold); background: linear-gradient(135deg, rgba(196,152,65,0.25), rgba(196,152,65,0.08)); box-shadow: 0 18px 36px rgba(196,152,65,0.18); animation: spin-cw ${spinADuration}s linear infinite; }
		.square.turquoise { width: 66%; height: 66%; animation: swap-small 12s ease-in-out infinite; }
		.square.turquoise .ring { border: 1px solid var(--accent); background: linear-gradient(135deg, rgba(31,182,166,0.22), rgba(31,182,166,0.06)); box-shadow: 0 18px 36px rgba(31,182,166,0.16); animation: spin-ccw ${spinBDuration}s linear infinite; }
		@keyframes spin-cw { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
		@keyframes spin-ccw { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
		@keyframes swap-large { 0%,100% { transform: scale(1); } 50% { transform: scale(0.74); } }
		@keyframes swap-small { 0%,100% { transform: scale(1); } 50% { transform: scale(1.3); } }
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
		.contact-title { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; color: var(--text); }
		.contact-desc { color: var(--muted); font-size: 14px; }
		.quick-links { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin: 8px 0 24px; }
		.quick-link { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: rgba(0,0,0,0.02); color: var(--text); text-decoration: none; transition: transform 0.15s ease, box-shadow 0.15s ease; }
		.quick-link:hover { transform: translateY(-2px); box-shadow: 0 10px 20px var(--shadow); }
		.quick-link span.icon { font-size: 18px; }
		.quick-link svg { width: 26px; height: 26px; fill: currentColor; }
		.map-embed-card { margin: 22px 0; }
		.map-frame { position: relative; width: 100%; padding-top: 56%; border-radius: 14px; overflow: hidden; box-shadow: 0 14px 28px var(--shadow); border: 1px solid var(--border); background: var(--card); }
		.map-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
		.trust-section { padding: 40px 0; margin: 28px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
		.trust-heading { text-align: center; color: var(--muted); font-weight: 700; margin-bottom: 16px; letter-spacing: 0.5px; }
		.trust-logos { display: flex; flex-wrap: wrap; justify-content: center; gap: 18px 32px; align-items: center; }
		.trust-item { display: inline-flex; align-items: center; gap: 12px; font-weight: 900; font-size: 22px; filter: grayscale(1); opacity: 0.4; transition: filter 0.7s ease, opacity 0.7s ease, transform 0.25s ease; }
		.trust-item:hover { filter: grayscale(0); opacity: 1; transform: translateY(-2px); }
		.trust-item svg { flex-shrink: 0; }
		.reviews { margin: 30px 0 40px; }
		.reviews-header { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
		.stars { color: #f4c150; font-size: 18px; letter-spacing: 1px; }
		.review-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-top: 16px; }
		.review-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; min-height: 170px; box-shadow: 0 14px 28px var(--shadow); }
		.review-card.google { border-color: rgba(31,182,166,0.35); box-shadow: 0 16px 30px rgba(31,182,166,0.18); }
		.review-meta { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
		.package-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin: 20px 0; }
		.package-card { position: relative; background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; box-shadow: 0 14px 28px var(--shadow); display: grid; gap: 10px; }
		.package-label { display: inline-flex; align-items: center; gap: 6px; padding: 8px 10px; border-radius: 999px; border: 1px solid rgba(198,161,91,0.4); background: rgba(198,161,91,0.12); color: var(--text); font-weight: 700; width: fit-content; }
		.package-price { color: var(--gold); font-weight: 800; }
		.package-points { margin: 0; padding-inline-start: 18px; color: var(--muted); line-height: 1.6; }
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
		.fb-carousel { position: relative; width: 100%; }
		.fb-carousel-item { opacity: 0; visibility: hidden; transition: opacity 0.5s ease, visibility 0.5s ease; position: absolute; width: 100%; }
		.fb-carousel-item.active { opacity: 1; visibility: visible; position: relative; }
		.fb-section { animation: fadeIn 0.6s ease both; }
		.fb-post-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 0; overflow: hidden; box-shadow: 0 12px 28px var(--shadow); }
		.fb-post-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border); }
		.fb-post-header img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
		.fb-post-meta { display: flex; flex-direction: column; gap: 2px; flex: 1; }
		.fb-post-meta h4 { margin: 0; font-size: 14px; font-weight: 700; color: var(--text); }
		.fb-post-meta small { color: var(--muted); font-size: 12px; }
		.fb-post-image { width: 100%; max-height: 400px; object-fit: cover; background: var(--overlay); }
		.fb-post-video { width: 100%; max-height: 400px; background: var(--overlay); display: flex; align-items: center; justify-content: center; position: relative; }
		.fb-video-play { width: 60px; height: 60px; background: rgba(255,255,255,0.9); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; cursor: pointer; transition: transform 0.2s ease; }
		.fb-video-play:hover { transform: scale(1.1); }
		.fb-post-message { padding: 16px; color: var(--text); font-size: 14px; line-height: 1.6; }
		.fb-post-stats { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); font-size: 13px; color: var(--muted); }
		.fb-stat-item { display: flex; align-items: center; gap: 6px; }
		.fb-comments-section { padding: 12px 16px; }
		.fb-comment { display: flex; gap: 10px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
		.fb-comment:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
		.fb-comment-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--overlay); flex-shrink: 0; }
		.fb-comment-body { flex: 1; }
		.fb-comment-author { font-weight: 700; font-size: 13px; color: var(--text); }
		.fb-comment-text { color: var(--text); font-size: 13px; line-height: 1.5; margin: 4px 0 0; }
		.fb-view-all-comments { width: 100%; padding: 10px; text-align: center; color: var(--accent); cursor: pointer; font-weight: 700; font-size: 13px; background: var(--overlay); border: 1px solid var(--border); border-radius: 8px; transition: all 0.2s ease; margin-top: 8px; }
		.fb-view-all-comments:hover { background: var(--card); border-color: var(--accent); }
		.fb-post-actions { display: flex; gap: 8px; padding: 12px 16px; }
		.fb-action-btn { flex: 1; padding: 10px; background: var(--overlay); border: 1px solid var(--border); border-radius: 8px; color: var(--text); cursor: pointer; font-weight: 700; font-size: 13px; transition: all 0.2s ease; }
		.fb-action-btn:hover { background: linear-gradient(135deg, rgba(196,152,65,0.1), rgba(31,182,166,0.08)); border-color: var(--gold); }
		.fb-nav-dots { display: flex; justify-content: center; gap: 8px; margin-top: 14px; }
		.fb-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border); cursor: pointer; transition: all 0.3s ease; }
		.fb-dot.active { background: var(--gold); width: 24px; border-radius: 999px; box-shadow: 0 4px 12px rgba(196,152,65,0.3); }
		.fb-dot:hover { background: var(--gold); }
		.google-chip { display: inline-flex; align-items: center; gap: 6px; background: rgba(66,133,244,0.12); color: #1a73e8; padding: 4px 10px; border-radius: 999px; font-weight: 700; border: 1px solid rgba(66,133,244,0.2); font-size: 12px; }
		.fallback-chip { display: inline-flex; align-items: center; gap: 6px; background: rgba(198,161,91,0.14); color: var(--text); padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(198,161,91,0.3); font-size: 12px; }
		.footer { margin: 28px 0 56px; text-align: center; color: var(--muted); font-size: 14px; }
		.social-row { display: flex; justify-content: center; align-items: center; gap: 14px; margin-top: 12px; }
		.social-link { width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center; color: var(--social-base); border-radius: 10px; transition: color 0.2s ease, transform 0.2s ease; }
		.social-link svg { width: 28px; height: 28px; fill: currentColor; }
		.social-link:hover { transform: translateY(-2px); color: var(--hover, var(--gold)); }
		.sticky-bar { position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; padding: 8px 10px; background: ${theme === 'light' ? 'rgba(255,255,255,0.96)' : 'rgba(24,18,16,0.92)'}; border: 1px solid var(--border); border-radius: 14px; box-shadow: 0 20px 40px var(--shadow); z-index: 100; width: fit-content; max-width: calc(100% - 24px); }
		.sticky-bar .btn { padding: 10px 12px; }
		.support-floating { position: fixed; bottom: 20px; right: 20px; z-index: 120; }
		.chat-frame { position: fixed; bottom: 20px; right: 20px; width: 360px; max-width: 90vw; height: 520px; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.35); z-index: 121; }
		.close-btn { position: absolute; top: 10px; left: 10px; background: #dc3545; color: #fff; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; z-index: 2; }
		.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 130; padding: 16px; }
		.modal-card { position: relative; }
		@media (max-width: 768px) {
			hero { grid-template-columns: 1fr; padding-top: 12px; }
			.sticky-bar { justify-content: center; background: ${theme === 'light' ? 'rgba(255,255,255,0.98)' : 'rgba(24,18,16,0.95)'}; }
			.topbar { flex-direction: column; align-items: flex-start; }
		}
	`;

	const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

	return (
		<div className="landing-page" dir="rtl">
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
				<div className="topbar">
					<div className="brand">
						<img src="/logo.png" alt="شعار غرام سلطان" loading="lazy" />
						<div>
							<div style={{ fontSize: 18 }}>غرام سلطان</div>
							<div className="pill">بيوتي سنتر وستوديو </div>
						</div>
					</div>
				</div>

				<section className="hero reveal">
					<div className="hero-visual">
						<div className="floating-squares" aria-hidden>
							<div className="square gold"><div className="ring"></div></div>
							<div className="square turquoise"><div className="ring"></div></div>
						</div>
						<img src="/Gharam.png" alt="غرام سلطان تحمل شهادة البورد الأمريكي" loading="lazy" />
					</div>
					<div>
						<h1>إطلالة ساحرة مع خبيرة الميكب غرام سلطان</h1>
						<p>
							احصلي على أحدث صيحات الميكب والتصوير الاحترافي بلمسة تجمع الخبرة والابتكار.
							راحة فاخرة بضغطة زر مع كرسي المساج الذكي ضد الجاذبية.
						</p>
						<div className="pill">جودة عالمية • اهتمام بالتفاصيل • راحة فاخرة</div>
						<div className="cta-row center">
							<button className="btn btn-prices" onClick={() => window.location.href = '/prices'} aria-label="أسعار الخدمات">
								<span role="img" aria-label="قائمة">💸</span>
								<span style={{ marginInlineStart: 8, fontSize: 16 }}>أسعار الخدمات</span>
							</button>
						</div>
					</div>
				</section>


				<section className="availability reveal">
					<div className="card">
						<span className="badge">تأكيد التوافر</span>
						<h2 style={{ margin: '8px 0 12px' }}>تأكدي إن اليوم متاح للحجز</h2>
						<form onSubmit={(e) => { e.preventDefault(); handleCheckAvailability(); }}>
							<div>
								<label>نوع الباكدج</label>
								<select value={packageType} onChange={(e) => setPackageType(e.target.value)}>
									<option value="makeup">ميك أب </option>
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

				<section className="reveal">
					<div className="package-grid">
						{featuredPackages.map((pkg) => (
							<div key={pkg.title} className="package-card">
								<span className="package-label">{pkg.label}</span>
								<h3 style={{ margin: '4px 0 4px' }}>{pkg.title}</h3>
								<div className="package-price">{pkg.price}</div>
								<ul className="package-points">
									{pkg.points.map((pt) => <li key={pt}>{pt}</li>)}
								</ul>
								<div className="package-actions">
									<button className="btn btn-primary" onClick={() => handlePackageWhatsApp(pkg.title)}>احجز الآن</button>
									<button className="btn btn-outline" onClick={() => (window.location.href = '/prices')}>شوفي باقي الباكدجات وأسعار الخدمات</button>
								</div>
							</div>
						))}
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
							<span className="contact-title">
								<svg viewBox="0 0 448 512" role="img" aria-hidden="true" focusable="false" style={{ width: 18, height: 18, color: '#0f0b0a' }}>{WHATSAPP_SVG}</svg>
								واتساب
							</span>
							<span className="contact-desc">رد سريع وتأكيد تفاصيل الميعاد.</span>
							<button className="btn" style={{ background: '#25d366', color: '#0f0b0a', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => window.open(WHATSAPP_LINK, '_blank')}>
								<svg viewBox="0 0 448 512" role="img" aria-hidden="true" focusable="false" style={{ width: 18, height: 18, color: '#0f0b0a' }}>{WHATSAPP_SVG}</svg>
								<span>مراسلة واتساب</span>
							</button>
						</div>
						<div className="contact-card" style={{ borderColor: '#c6a15b55' }}>
							<span className="contact-title"><PhoneIcon size={18} />اتصال أرضي</span>
							<span className="contact-desc">للاستفسارات السريعة: {LANDLINE}</span>
							<button className="btn" style={{ background: '#c6a15b', color: '#0f0b0a', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => window.location.href = `tel:${LANDLINE}`}>
								<PhoneIcon size={18} />
								<span>اتصلي الآن</span>
							</button>
						</div>
						<div className="contact-card" style={{ borderColor: '#4ea1ff55' }}>
							<span className="contact-title"><MapPinIcon size={18} />الموقع</span>
							<span className="contact-desc">شارع الجيش، مدينة دسوق . </span>
							<button className="btn" style={{ background: '#4ea1ff', color: '#0f0b0a', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => window.location.href = MAP_LINK}>
								<MapPinIcon size={18} />
								<span>افتحي الخريطة</span>
							</button>
						</div>
						<div className="contact-card" style={{ borderColor: '#1aa19355' }}>
							<span className="contact-title"><BotIcon size={18} />دعم فوري</span>
							<span className="contact-desc">ردود فورية بالذكاء الاصطتناعي للأسئلة الشائعة.</span>
							<button className="btn" style={{ background: '#1aa193', color: '#0f0b0a', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => setShowChat(true)}>
								<BotIcon size={18} />
								<span>افتحي البوت</span>
							</button>
						</div>
					</div>
					<p style={{ color: 'var(--muted)', margin: '0 0 10px', fontWeight: 600 }}>تابعي غرام سلطان على السوشيال عشان تشوفي أحدث لوكات العرايس، الكواليس، والعروض الخاصة.</p>
					<div className="quick-links">
						{socialLinksNoWhatsApp.map((s) => (
							<a className="quick-link" key={s.href} href={s.href} target="_blank" rel="noreferrer">
								<svg viewBox="0 0 448 512" role="img" aria-hidden="true" focusable="false" style={{ width: 26, height: 26, color: 'inherit' }}>{s.svg}</svg>
								<span>{s.text || s.label}</span>
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
							<button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => window.open('https://g.page/r/CeoPiyI-r3niEAE/review', '_blank')} aria-label="اكتبي تقييمك">
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
								<div className={`review-card ${isGoogleReviews ? 'google' : ''}`} key={`${rev.author}-${idx}`}>
									<div className="review-head">
										{rev.photoUrl ? (
											<img className="avatar-img" src={rev.photoUrl} alt={`صورة ${rev.author || 'العميل'}`} loading="lazy" />
										) : (
											<div className="avatar" style={{ background: bg }}>{letter}</div>
										)}
										<div>
											<h5>
												{rev.authorUrl ? (
													<a href={rev.authorUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
														{rev.author || 'عميلة من جوجل'}
													</a>
												) : (
													rev.author || 'عميلة من جوجل'
												)}
											</h5>
											<small>{formatReviewDate(rev)}</small>
										</div>
									</div>
									<div className="review-meta">
										<div className="stars" style={{ fontSize: 15 }}>{renderStars(rev.rating)}</div>
										<span className={isGoogleReviews ? 'google-chip' : 'fallback-chip'}>
											{isGoogleReviews ? 'Google' : 'عينة محفوظة'}
										</span>
									</div>
									<p>{rev.text}</p>
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

				{facebookFeed.length > 0 && (
					<section className="card fb-section" id="facebook-feed">
						<h2 style={{ marginTop: 0, marginBottom: 6 }}>آخر منشوراتنا</h2>
						<p style={{ color: 'var(--muted)', margin: '0 0 16px' }}>تابعي آخر أخبار وعروضنا المميزة على الفيسبوك. كل 5 ثواني بوست جديد يظهر، اضغطي عشان تشوفي التعليقات بالكامل!</p>
						<div className="fb-carousel">
							{activeFbPost ? (
								<div className="fb-post-card">
									{/* Header */}
									<div className="fb-post-header">
										<img 
											src="https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=411581755600976&height=50&width=50" 
											alt="غرام سلطان"
											loading="lazy"
											referrerPolicy="no-referrer"
										/>
										<div className="fb-post-meta">
											<h4>غرام سلطان بيوتي سنتر</h4>
											<small>{new Date(activeFbPost.createdTime).toLocaleDateString('ar-EG')}</small>
										</div>
									</div>

									{/* Image/Video */}
									{activeFbPost.fullPicture && (
										<img src={activeFbPost.fullPicture} alt="البوست" className="fb-post-image" loading="lazy" referrerPolicy="no-referrer" />
									)}

									{/* Message */}
									{(activeFbPost.message || activeFbPost.story) && (
										<div className="fb-post-message">
											{(activeFbPost.message || activeFbPost.story).length > 200
												? `${(activeFbPost.message || activeFbPost.story).substring(0, 200)}...`
												: (activeFbPost.message || activeFbPost.story)}
										</div>
									)}

									{/* Stats */}
									<div className="fb-post-stats">
										<div className="fb-stat-item">❤️ {Number(activeFbPost.likeCount || 0).toLocaleString()}</div>
										<div className="fb-stat-item">💬 {Number(activeFbPost.commentCount || 0).toLocaleString()}</div>
										<a 
											href={activeFbPost.permalink} 
											target="_blank" 
											rel="noreferrer"
											style={{ color: 'var(--accent)', textDecoration: 'none', cursor: 'pointer' }}
										>
											♗ افتحي على Facebook
										</a>
									</div>

									{/* Comments */}
									{activeFbPost.comments && activeFbPost.comments.length > 0 && (
										<div className="fb-comments-section">
											{!fbExpandedComments && (
												<button
													className="fb-view-all-comments"
													onClick={() => {
														setFbExpandedComments(true);
														setFbAutoRotatePaused(true);
													}}
												>
													شوفي التعليقات ({activeFbPost.commentCount})
												</button>
											)}
											{fbExpandedComments && (
												<div>
													{activeFbPost.comments.map((comment, cidx) => (
														<div key={cidx} className="fb-comment">
															<div className="fb-comment-avatar" style={{ backgroundImage: comment.picture ? `url(${comment.picture})` : 'none' }} />
															<div className="fb-comment-body">
																<div className="fb-comment-author">{comment.name}</div>
																<div className="fb-comment-text">{comment.message}</div>
															</div>
														</div>
													))}
													<button
														className="fb-view-all-comments"
														onClick={() => {
															setFbExpandedComments(false);
															setFbAutoRotatePaused(false);
														}}
													>
														← أغلقي التعليقات
													</button>
												</div>
											)}
										</div>
									)}

									{/* Actions */}
									<div className="fb-post-actions">
										<button 
											className="fb-action-btn"
											onClick={() => window.open(FACEBOOK_LINK, '_blank')}
										>
											👍 Follow على Facebook
										</button>
										<button 
											className="fb-action-btn"
											onClick={() => window.open(activeFbPost.permalink, '_blank')}
										>
											↗️ اتفرجي كاملاً
										</button>
									</div>
								</div>
							) : (
								<div style={{ color: 'var(--muted)', textAlign: 'center', padding: '16px 8px' }}>جار تحميل البوستات...</div>
							)}
						</div>
						{facebookFeed.length > 1 && (
							<div className="fb-nav-dots">
								{facebookFeed.map((_, idx) => (
									<div
										key={idx}
										className={`fb-dot ${idx === currentFbItemIdx ? 'active' : ''}`}
										onClick={() => {
											setCurrentFbItemIdx(idx);
											setFbExpandedComments(false);
											setFbAutoRotatePaused(false);
										}}
										title={`بوست ${idx + 1}`}
									/>
								))}
							</div>
						)}
					</section>
				)}

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

				<section className="footer reveal" style={{ paddingBottom: 90 }}>
					<div>تابعينا على السوشيال</div>
					<div style={{ color: 'var(--muted)', marginTop: 6, fontSize: 14 }}>تابعي غرام سلطان على السوشيال عشان تشوفي أحدث لوكات العرايس، الكواليس، والعروض الخاصة.</div>
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

export default Landing;
