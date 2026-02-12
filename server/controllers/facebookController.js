const axios = require('axios');
const FacebookPost = require('../models/FacebookPost');

// جلب البوستات من فيسبوك وحفظها في MongoDB
const syncFacebookPosts = async (req, res) => {
	try {
		const pageId = process.env.FACEBOOK_PAGE_ID;
		const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

		if (!pageId || !accessToken) {
			return res.status(400).json({
				success: false,
				message: 'Facebook credentials مش موجودة في .env'
			});
		}

		const params = {
			fields: 'id,message,story,created_time,permalink_url,full_picture,status_type,attachments{media_type,media,url},reactions.limit(0).summary(true),comments.limit(0).summary(true)',
			access_token: accessToken,
			limit: 20
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
		}

		return res.status(200).json({
			success: true,
			message: `تم حفظ ${savedCount} بوستات بنجاح`,
			count: savedCount
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

// Manual sync endpoint (للتحديث اليدوي)
const manualSyncPosts = async (req, res) => {
	return syncFacebookPosts(req, res);
};

module.exports = {
	syncFacebookPosts,
	getFacebookFeed,
	manualSyncPosts
};
