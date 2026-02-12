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

		// جلب آخر 20 بوست من Facebook مع التفاصيل
		const url = `https://graph.facebook.com/v19.0/${pageId}/posts`;
		const params = {
			fields: 'id,message,story,picture,full_picture,type,created_time,permalink_url,likes.summary(true),comments.limit(3).summary(true){id,name,message,created_time,from{picture,name}}',
			access_token: accessToken,
			limit: 20,
			sort: 'reverse_chronological'
		};

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
			// تصفية البوستات بدون صور (بس صور وفيديوهات)
			if (!post.picture && post.type !== 'video') continue;

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
				picture: post.picture,
				fullPicture: post.full_picture,
				video: post.type === 'video' ? { source: post.picture } : null,
				permalink: post.permalink_url,
				type: post.type || 'photo',
				createdTime: post.created_time,
				likeCount: post.likes?.summary?.total_count || 0,
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
		console.error('خطأ في جلب بوستات Facebook:', error);
		return res.status(500).json({
			success: false,
			message: 'خطأ في جلب البوستات',
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

// Manual sync endpoint (للتحديث اليدوي)
const manualSyncPosts = async (req, res) => {
	return syncFacebookPosts(req, res);
};

module.exports = {
	syncFacebookPosts,
	getFacebookFeed,
	manualSyncPosts
};
