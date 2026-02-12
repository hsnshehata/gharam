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
			fields: 'id,message,story,created_time,permalink_url,full_picture,attachments{media_type,media,url},reactions.summary(true),comments.limit(3).summary(true){message,created_time,from{id,name,picture}}',
			access_token: accessToken,
			limit: 20
		};

		// جلب آخر 20 بوست من Facebook مع التفاصيل (feed)
		const url = `https://graph.facebook.com/v19.0/${pageId}/feed`;
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
			const mediaType = attachment?.media_type || 'photo';
			const mediaUrl = attachment?.media?.image?.src || post.full_picture || '';

			// تصفية البوستات بدون صور (بس صور وفيديوهات)
			if (!mediaUrl || (mediaType !== 'photo' && mediaType !== 'video')) continue;

			const comments = post.comments?.data?.map((c) => ({
				id: c.id,
				name: c.from?.name || 'Guest',
				message: c.message,
				createdTime: c.created_time,
				picture: c.from?.picture?.data?.url
			})) || [];

			const postData = {
				facebookId: post.id,
				message: post.message || post.story || '',
				story: post.story,
				picture: mediaUrl,
				fullPicture: mediaUrl,
				video: mediaType === 'video' ? { source: mediaUrl } : null,
				permalink: post.permalink_url,
				type: mediaType === 'video' ? 'video' : 'photo',
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
