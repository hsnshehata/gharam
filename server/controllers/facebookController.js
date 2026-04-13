const axios = require('axios');
const FacebookPost = require('../models/FacebookPost');
const MediaGallery = require('../models/MediaGallery');
const SystemSetting = require('../models/SystemSetting');
const WebhookEvent = require('../models/WebhookEvent');
const { processAiChat } = require('../services/aiService');
const sessionCache = require('../services/sessionCache');// استخراج كل الصور والفيديوهات من البوست والحفظ في MediaGallery
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
			const existingMedia = await MediaGallery.findOne({ mediaKey: mediaItem.mediaKey });
			if (!existingMedia) {
				// الـ unique index سيرفع مشاكل التكرار تلقائياً
				await MediaGallery.create(mediaItem);
				savedMediaCount++;
			} else {
				// تحديث الروابط دايماً لأن روابط فيسبوك المؤقتة بتنتهي صلاحيتها
				await MediaGallery.updateOne(
					{ _id: existingMedia._id },
					{ $set: {
						mediaUrl: mediaItem.mediaUrl,
						thumbnailUrl: mediaItem.thumbnailUrl || existingMedia.thumbnailUrl,
						permalink: mediaItem.permalink || existingMedia.permalink,
						updatedAt: new Date()
					} }
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

const deleteMediaGalleryItem = async (req, res) => {
	try {
		const { id } = req.params;
		const media = await MediaGallery.findByIdAndDelete(id);
		
		if (!media) {
			return res.status(404).json({
				success: false,
				message: 'العنصر غير موجود'
			});
		}

		return res.status(200).json({
			success: true,
			message: 'تم الحذف النهائي بنجاح'
		});
	} catch (error) {
		console.error('خطأ في الحذف النهائي للميديا:', error);
		return res.status(500).json({
			success: false,
			message: 'خطأ في الحذف',
			error: error.message
		});
	}
};

// إرجاع آخر 20 بوست للـ Frontend (فقط الظاهرة)
const getFacebookFeed = async (req, res) => {
	try {
		const posts = await FacebookPost.find({ isActive: { $ne: false } })
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

// ============= تحديثات الإدارة للبوستات =================

const getAdminFacebookPosts = async (req, res) => {
	try {
		const { limit = 200, skip = 0 } = req.query;
		const posts = await FacebookPost.find()
			.sort({ createdTime: -1 })
			.limit(parseInt(limit, 10))
			.skip(parseInt(skip, 10))
			.lean();

		const total = await FacebookPost.countDocuments();

		return res.status(200).json({
			success: true,
			data: posts,
			count: posts.length,
			total
		});
	} catch (error) {
		console.error('خطأ في جلب بوستات الادمن:', error);
		return res.status(500).json({
			success: false,
			message: 'خطأ في جلب البوستات',
			error: error.message
		});
	}
};

const updateFacebookPostVisibility = async (req, res) => {
	try {
		const { id } = req.params;
		const { isActive } = req.body;
		if (typeof isActive !== 'boolean') {
			return res.status(400).json({ success: false, message: 'القيمة غير صحيحة' });
		}

		const post = await FacebookPost.findByIdAndUpdate(
			id,
			{ $set: { isActive } },
			{ new: true }
		);

		if (!post) {
			return res.status(404).json({ success: false, message: 'البوست غير موجود' });
		}

		return res.status(200).json({ success: true, data: post });
	} catch (error) {
		console.error('خطأ في تحديث حالة البوست:', error);
		return res.status(500).json({ success: false, message: 'خطأ في تحديث الحالة', error: error.message });
	}
};

const deleteFacebookPost = async (req, res) => {
	try {
		const { id } = req.params;
		const post = await FacebookPost.findByIdAndDelete(id);
		
		if (!post) {
			return res.status(404).json({ success: false, message: 'البوست غير موجود' });
		}

		return res.status(200).json({ success: true, message: 'تم حذف البوست بنجاح' });
	} catch (error) {
		console.error('خطأ في حذف البوست:', error);
		return res.status(500).json({ success: false, message: 'خطأ في الحذف', error: error.message });
	}
};

// ====== Facebook Messenger Webhook ======
const verifyWebhook = (req, res) => {
    const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
};

// تمت إزالة processedWebhookEvents المعتمد على الذاكرة لتعارضها مع إعادات التشغيل
const handleWebhook = async (req, res) => {
    try {
        const body = req.body;
        if (body.object === 'page') {
            // Acknowledge receipt immediately to prevent Facebook from retrying and causing duplicate AI replies
            res.status(200).send('EVENT_RECEIVED');

            // Check if bot is enabled
            const botEnabledSetting = await SystemSetting.findOne({ key: 'ai_bot_enabled' });
            const botEnabled = botEnabledSetting ? botEnabledSetting.value : true;
            for (const entry of body.entry) {
                // Handling messaging events (Messages, Edits, Attachments)
                if (entry.messaging) {
                    for (const webhook_event of entry.messaging) {
                        // Robust deduplication check using MongoDB
                        const eventId = webhook_event.message?.mid || webhook_event.message_edit?.mid || null;
                        if (eventId) {
                            try {
                                await WebhookEvent.create({ eventId });
                            } catch (duplicateErr) {
                                // If it throws a duplicate key error, we already processed it!
                                if (duplicateErr.code === 11000) {
                                    console.log(`[FB Webhook] Deduplicated duplicate message event: ${eventId}`);
                                    continue;
                                }
                            }
                        }

                        // Ignore echo messages (messages sent by the page itself)
                        if (webhook_event.message && webhook_event.message.is_echo) {
                            continue;
                        }

                        const sender_psid = webhook_event.sender.id;
                        let messageText = null;
                        let fileBuffer = null;
                        let fileMimeType = null;

                        if (webhook_event.message && webhook_event.message.text) {
                            messageText = webhook_event.message.text;
                        } else if (webhook_event.message_edit && webhook_event.message_edit.text) {
                            messageText = webhook_event.message_edit.text;
                            console.log(`Received EDITED message from FB ${sender_psid}: ${messageText}`);
                        } else if (webhook_event.message && webhook_event.message.attachments) {
                            const attachment = webhook_event.message.attachments.find(a => a.type === 'audio' || a.type === 'image');
                            if (attachment && attachment.payload && attachment.payload.url) {
                                const attachTypeAr = attachment.type === 'audio' ? 'رسالة صوتية' : 'صورة';
                                messageText = `[${attachTypeAr}]`;
                                console.log(`Received ${attachment.type.toUpperCase()} message from FB ${sender_psid}`);
                                try {
                                    const resData = await axios.get(attachment.payload.url, { responseType: 'arraybuffer' });
                                    fileBuffer = Buffer.from(resData.data);
                                    
                                    // Force audio mime type if FB CDN mistakenly sends video/mp4 for voice notes
                                    if (attachment.type === 'audio') {
                                        fileMimeType = 'audio/mp4';
                                    } else {
                                        fileMimeType = resData.headers['content-type'] || 'image/jpeg';
                                    }
                                } catch (downloadErr) {
                                    console.error(`Failed to download FB ${attachment.type}:`, downloadErr.message);
                                }
                            }
                        }

                        if (messageText || fileBuffer) {
                            const msgText = messageText || "[مرفق]";
                            // Persist user message to MongoDB
                            await sessionCache.persistMessage(`messenger_${sender_psid}`, 'messenger', 'user', msgText, {
                                senderId: sender_psid,
                                senderName: `Messenger ${sender_psid.slice(-4)}`
                            });

                            if (!botEnabled) {
                                console.log(`[FB Webhook] Bot disabled, skipping AI reply for messenger ${sender_psid}`);
                                continue;
                            }

                            // Process AI Chat for Messaging
                            sessionCache.addUserMessage(sender_psid, msgText);
                            const history = sessionCache.getUserHistory(sender_psid);
                            try {
                                const aiReply = await processAiChat(history, fileBuffer, fileMimeType, true);
                                sessionCache.addAssistantMessage(sender_psid, aiReply);

                                // Persist bot reply to MongoDB
                                await sessionCache.persistMessage(`messenger_${sender_psid}`, 'messenger', 'model', aiReply);

                                const MESSENGER_TOKEN = process.env.FACEBOOK_MESSENGER_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
                                await axios.post(`https://graph.facebook.com/v24.0/me/messages?access_token=${MESSENGER_TOKEN}`, {
                                    recipient: { id: sender_psid },
                                    message: { text: aiReply }
                                });
                            } catch (aiError) {
                                if (aiError.response?.data?.error?.code === 551) {
                                    console.log(`[FB Webhook] Info: Could not reply because user ${sender_psid} is unavailable (blocked page or expired window). Error 551.`);
                                } else {
                                    console.error('Error generating AI reply for FB Webhook (Message):', aiError.response?.data || aiError.message);
                                }
                            }
                        }
                    }
                }

                // Handling Feed events (Comments)
                if (entry.changes) {
                    for (const change of entry.changes) {
                        if (change.field === 'feed') {
                            const value = change.value;
                            // Check if it's a new or edited comment by a user (not the page itself)
                            if (value.item === 'comment' && (value.verb === 'add' || value.verb === 'edit')) {
                                // Skip if the comment is made by the page itself to avoid infinite loops
                                const pageId = process.env.FACEBOOK_PAGE_ID;
                                if (value.from && value.from.id === pageId) continue;

                                const commentText = value.message;
                                const commentId = value.comment_id;
                                const senderId = value.from ? value.from.id : 'unknown_user';

                                if (commentText) {
                                    console.log(`Received Comment from ${senderId}: ${commentText}`);
                                    const senderName = value.from?.name || `User ${senderId.slice(-4)}`;

                                    // Persist comment to MongoDB
                                    await sessionCache.persistMessage(`comment_${commentId}`, 'comment', 'user', commentText, {
                                        senderId,
                                        senderName
                                    });

                                    if (!botEnabled) {
                                        console.log(`[FB Webhook] Bot disabled, skipping AI reply for comment ${commentId}`);
                                        continue;
                                    }
                                    
                                    // Treat comment as a single message context for now
                                    sessionCache.addUserMessage(senderId, commentText);
                                    const history = sessionCache.getUserHistory(senderId);

                                    try {
                                        const aiReply = await processAiChat(history, null, null, true);
                                        sessionCache.addAssistantMessage(senderId, aiReply);

                                        // Persist bot reply to MongoDB
                                        await sessionCache.persistMessage(`comment_${commentId}`, 'comment', 'model', aiReply);

                                        const MESSENGER_TOKEN = process.env.FACEBOOK_MESSENGER_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
                                        // Reply to the comment
                                        const fbRes = await axios.post(`https://graph.facebook.com/v24.0/${commentId}/comments?access_token=${MESSENGER_TOKEN}`, {
                                            message: aiReply
                                        });
                                        console.log(`Successfully replied to comment ${commentId}. Reply ID:`, fbRes.data.id);
                                    } catch (err) {
                                        if (err.response?.data?.error?.code === 551) {
                                            console.log(`[FB Webhook] Info: Could not reply to comment because user ${senderId} is unavailable. Error 551.`);
                                        } else {
                                            console.error('Error replying to FB Webhook (Comment):', err.response?.data || err.message);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else {
            res.sendStatus(404);
        }
    } catch (err) {
        console.error('FB Webhook Error:', err);
        res.sendStatus(500);
    }
};

const forceSubscribePage = async (req, res) => {
    try {
        const pageId = process.env.FACEBOOK_PAGE_ID;
        const pageToken = process.env.FACEBOOK_ACCESS_TOKEN; 
        const messengerToken = process.env.FACEBOOK_MESSENGER_TOKEN;

        const results = {};

        // محاولة الاشتراك باستخدام المفتاح القديم (يمتلك غالباً صلاحيات عامة للصفحة)
        try {
            const resp1 = await axios.post(`https://graph.facebook.com/v24.0/${pageId}/subscribed_apps`, null, {
                params: {
                    subscribed_fields: 'feed,messages,message_edits',
                    access_token: pageToken
                }
            });
            results.oldToken = resp1.data;
        } catch(e) {
            results.oldTokenError = e.response?.data || e.message;
        }

        // محاولة الاشتراك باستخدام مفتاح الماسنجر
        if (messengerToken && messengerToken !== pageToken) {
            try {
                const resp2 = await axios.post(`https://graph.facebook.com/v24.0/${pageId}/subscribed_apps`, null, {
                    params: {
                        subscribed_fields: 'feed,messages,message_edits',
                        access_token: messengerToken
                    }
                });
                results.messengerToken = resp2.data;
            } catch(e) {
                results.messengerTokenError = e.response?.data || e.message;
            }
        }

        res.json({
            success: true,
            message: "تم محاولة ربط الصفحة بالـ Webhook برمجياً",
            results
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
	syncFacebookPosts,
	getFacebookFeed,
	getMediaGallery,
	getMediaGalleryStats,
	manualSyncPosts,
	getAdminMediaGallery,
	updateMediaVisibility,
	deleteMediaGalleryItem,
	getAdminFacebookPosts,
	updateFacebookPostVisibility,
	deleteFacebookPost,
    verifyWebhook,
    handleWebhook,
    forceSubscribePage
};
