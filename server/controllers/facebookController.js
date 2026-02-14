const axios = require('axios');
const FacebookPost = require('../models/FacebookPost');
const MediaGallery = require('../models/MediaGallery');

// استخراج كل الصور والفيديوهات من البوست والحفظ في MediaGallery
const extractAndSaveMediaItems = async (post) => {
	const mediaItems = [];
	const postId = post.id;
	const postMessage = post.message || post.story || '';
	const seen = new Set();

	const normalizeMediaUrl = (url) => {
		if (!url) return '';
		const base = url.split('?')[0].replace(/\/(s|p)\d+x\d+\//g, '/');
		const parts = base.split('/');
		return parts[parts.length - 1] || base;
	};

	const addMedia = (item) => {
		if (!item?.mediaUrl) return;
		const mediaKey = `${item.type || 'image'}:${normalizeMediaUrl(item.mediaUrl)}`;
		if (seen.has(mediaKey)) return;
		seen.add(mediaKey);
		mediaItems.push({ ...item, mediaKey });
	};

	const normalizeAttachment = (attachment) => {
		if (!attachment) return;
		const mediaImage = attachment.media?.image?.src;
		const mediaSource = attachment.media?.source;
		const mediaType = attachment.media_type;

		if (mediaType === 'video') {
			addMedia({
				facebookPostId: postId,
				mediaUrl: mediaSource || attachment.url || '',
				thumbnailUrl: mediaImage || post.full_picture || '',
				permalink: post.permalink_url || attachment.url || '',
				type: 'video',
				title: postMessage.substring(0, 100),
				description: postMessage,
				createdTime: post.created_time,
				source: 'facebook'
			});
			return;
		}

		if (mediaImage) {
			addMedia({
				facebookPostId: postId,
				mediaUrl: mediaImage,
				thumbnailUrl: mediaImage,
				permalink: post.permalink_url || '',
				type: 'image',
				title: postMessage.substring(0, 100),
				description: postMessage,
				createdTime: post.created_time,
				source: 'facebook'
			});
		}
	};

	const flattenAttachments = (attachments, list = []) => {
		if (!attachments?.data) return list;
		for (const attachment of attachments.data) {
			if (attachment.subattachments?.data?.length) {
				flattenAttachments(attachment.subattachments, list);
			} else {
				list.push(attachment);
			}
		}
		return list;
	};

	// استخراج الصور والفيديوهات من attachments (بما فيها subattachments)
	const allAttachments = flattenAttachments(post.attachments);
	for (const attachment of allAttachments) {
		normalizeAttachment(attachment);
	}

	// إذا لم نجد صور في attachments، حاول استخدام full_picture
	if (mediaItems.length === 0 && post.full_picture) {
		addMedia({
			facebookPostId: postId,
			mediaUrl: post.full_picture,
			thumbnailUrl: post.full_picture,
			permalink: post.permalink_url || '',
			type: post.status_type?.includes('video') ? 'video' : 'image',
			title: postMessage.substring(0, 100),
			description: postMessage,
			createdTime: post.created_time,
			source: 'facebook'
		});
	}

	// حفظ كل media في gallery (بدون حذف القديم)
	let savedMediaCount = 0;
	for (const mediaItem of mediaItems) {
		try {
			const existingMedia = await MediaGallery.findOne({
				$or: [
					{ mediaKey: mediaItem.mediaKey },
					{ mediaUrl: mediaItem.mediaUrl }
				]
			});
			if (!existingMedia) {
				// الـ unique index سيرفع مشاكل التكرار تلقائياً
				await MediaGallery.create(mediaItem);
				savedMediaCount++;
			} else if ((!existingMedia.thumbnailUrl && mediaItem.thumbnailUrl) || (!existingMedia.permalink && mediaItem.permalink)) {
				await MediaGallery.updateOne(
					{ _id: existingMedia._id },
					{ $set: { thumbnailUrl: mediaItem.thumbnailUrl, permalink: mediaItem.permalink } }
				);
			}
		} catch (error) {
			if (!error.message.includes('duplicate')) {
				console.error('خطأ في حفظ الـ media:', error.message);
			}
		}
	}

	return savedMediaCount;
};

const getSyncLimit = (req) => {
	const rawLimit = req?.body?.limit ?? req?.query?.limit;
	const parsed = Number.parseInt(rawLimit, 10);
	if (Number.isFinite(parsed)) {
		return Math.min(Math.max(parsed, 1), 100);
	}
	return 20;
};

// جلب البوستات من فيسبوك وحفظها في MongoDB
const syncFacebookPosts = async (req, res) => {
	try {
		const pageId = process.env.FACEBOOK_PAGE_ID;
		const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
		const limit = getSyncLimit(req);

		if (!pageId || !accessToken) {
			return res.status(400).json({
				success: false,
				message: 'Facebook credentials مش موجودة في .env'
			});
		}

		const params = {
			fields: 'id,message,story,created_time,permalink_url,full_picture,status_type,attachments{media_type,media{image,source},url,subattachments.limit(50){media_type,media{image,source},url}},reactions.limit(0).summary(true),comments.limit(0).summary(true)',
			access_token: accessToken,
			limit
		};

		// جلب آخر 20 بوست من Facebook مع التفاصيل (feed)
		const url = `https://graph.facebook.com/v24.0/${pageId}/feed`;
		const response = await axios.get(url, { params });
		const facebookPosts = response.data.data || [];

		if (facebookPosts.length === 0) {
			return res.status(200).json({
				success: true,
				message: 'بدون بوستات جديدة',
				count: 0
			});
		}

		// معالجة وحفظ البوستات
		let savedCount = 0;
		let savedMediaCount = 0;
		for (const post of facebookPosts) {
			const attachment = post.attachments?.data?.[0];
			const mediaType = attachment?.media_type;
			const attachmentImage = attachment?.media?.image?.src || '';

			// استخراج الصورة والفيديو
			const mediaUrl = attachmentImage || post.full_picture || '';
			if (!mediaUrl) continue;

			// تحديد نوع البوست - status_type يمكن أن يكون video أو photo أو shared_story إلخ
			const isVideo = (post.status_type && post.status_type.includes('video')) || mediaType === 'video';

			const comments = [];

		const postData = {
			facebookId: post.id,
			message: post.message || post.story || '',
			story: post.story,
			picture: mediaUrl,
			fullPicture: mediaUrl,
			video: isVideo ? { source: mediaUrl, permalink: post.permalink_url } : null,
			permalink: post.permalink_url,
			type: isVideo ? 'video' : 'photo',
			createdTime: post.created_time,
			likeCount: post.reactions?.summary?.total_count || 0,
			comments: comments,
			commentCount: post.comments?.summary?.total_count || 0,
			updatedAt: new Date()
		};

			// حفظ أو تحديث البوست
			await FacebookPost.findOneAndUpdate(
				{ facebookId: post.id },
				postData,
				{ upsert: true, new: true }
			);
			savedCount++;

			// استخراج وحفظ جميع الصور والفيديوهات من البوست في MediaGallery
			const mediaItemCount = await extractAndSaveMediaItems(post);
			savedMediaCount += mediaItemCount;
		}

		return res.status(200).json({
			success: true,
			message: `تم حفظ ${savedCount} بوستات و ${savedMediaCount} صور/فيديوهات بنجاح`,
			count: savedCount,
			mediaCount: savedMediaCount
		});
	} catch (error) {
		const fbError = error.response?.data?.error;
		const fbMessage = fbError?.message || error.message;
		const fbCode = fbError?.code;
		const fbType = fbError?.type;
		console.error('خطأ في جلب بوستات Facebook:', fbMessage);
		return res.status(500).json({
			success: false,
			message: 'خطأ في جلب البوستات',
			error: fbMessage,
			facebookError: fbError ? { code: fbCode, type: fbType } : undefined
		});
	}
};

const getAdminMediaGallery = async (req, res) => {
	try {
		const { type, limit = 200, skip = 0 } = req.query;
		const filter = {};

		if (type && ['image', 'video'].includes(type)) {
			filter.type = type;
		}

		const media = await MediaGallery.find(filter)
			.sort({ createdTime: -1, addedAt: -1 })
			.limit(parseInt(limit, 10))
			.skip(parseInt(skip, 10))
			.lean();

		const total = await MediaGallery.countDocuments(filter);

		return res.status(200).json({
			success: true,
			data: media,
			count: media.length,
			total
		});
	} catch (error) {
		console.error('خطأ في جلب معرض الميديا للادمن:', error);
		return res.status(500).json({
			success: false,
			message: 'خطأ في جلب معرض الميديا',
			error: error.message
		});
	}
};

const updateMediaVisibility = async (req, res) => {
	try {
		const { id } = req.params;
		const { isActive } = req.body;
		if (typeof isActive !== 'boolean') {
			return res.status(400).json({
				success: false,
				message: 'القيمة غير صحيحة'
			});
		}

		const media = await MediaGallery.findByIdAndUpdate(
			id,
			{ $set: { isActive } },
			{ new: true }
		);

		if (!media) {
			return res.status(404).json({
				success: false,
				message: 'العنصر غير موجود'
			});
		}

		return res.status(200).json({
			success: true,
			data: media
		});
	} catch (error) {
		console.error('خطأ في تحديث حالة العرض:', error);
		return res.status(500).json({
			success: false,
			message: 'خطأ في تحديث الحالة',
			error: error.message
		});
	}
};

// إرجاع آخر 20 بوست للـ Frontend
const getFacebookFeed = async (req, res) => {
	try {
		const posts = await FacebookPost.find()
			.sort({ createdTime: -1 })
			.limit(20)
			.lean();

		if (posts.length === 0) {
			return res.status(200).json({
				success: true,
				data: [],
				message: 'بدون بوستات حالياً'
			});
		}

		return res.status(200).json({
			success: true,
			data: posts,
			count: posts.length
		});
	} catch (error) {
		console.error('خطأ في جلب البوستات:', error);
		return res.status(500).json({
			success: false,
			message: 'خطأ في جلب البوستات',
			error: error.message
		});
	}
};

// جلب جميع الصور والفيديوهات من معرض الميديا
const getMediaGallery = async (req, res) => {
	try {
		const { type, limit = 100, skip = 0 } = req.query;
		const filter = { isActive: true };

		if (type && ['image', 'video'].includes(type)) {
			filter.type = type;
		}

		const media = await MediaGallery.find(filter)
			.sort({ createdTime: -1, addedAt: -1 })
			.limit(parseInt(limit))
			.skip(parseInt(skip))
			.lean();

		const total = await MediaGallery.countDocuments(filter);

		if (media.length === 0) {
			return res.status(200).json({
				success: true,
				data: [],
				count: 0,
				total: 0,
				message: 'بدون صور أو فيديوهات حالياً'
			});
		}

		return res.status(200).json({
			success: true,
			data: media,
			count: media.length,
			total: total
		});
	} catch (error) {
		console.error('خطأ في جلب معرض الميديا:', error);
		return res.status(500).json({
			success: false,
			message: 'خطأ في جلب معرض الميديا',
			error: error.message
		});
	}
};

// جلب اجمالي عدد الصور والفيديوهات
const getMediaGalleryStats = async (req, res) => {
	try {
		const totalMedia = await MediaGallery.countDocuments({ isActive: true });
		const totalImages = await MediaGallery.countDocuments({ isActive: true, type: 'image' });
		const totalVideos = await MediaGallery.countDocuments({ isActive: true, type: 'video' });

		return res.status(200).json({
			success: true,
			data: {
				totalMedia,
				totalImages,
				totalVideos
			}
		});
	} catch (error) {
		console.error('خطأ في جلب إحصائيات الميديا:', error);
		return res.status(500).json({
			success: false,
			message: 'خطأ في جلب الإحصائيات',
			error: error.message
		});
	}
};

// Manual sync endpoint (للتحديث اليدوي)
const manualSyncPosts = async (req, res) => {
	return syncFacebookPosts(req, res);
};

module.exports = {
	syncFacebookPosts,
	getFacebookFeed,
	getMediaGallery,
	getMediaGalleryStats,
	manualSyncPosts,
	getAdminMediaGallery,
	updateMediaVisibility
};
