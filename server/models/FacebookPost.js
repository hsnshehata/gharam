const mongoose = require('mongoose');

const FacebookPostSchema = new mongoose.Schema(
	{
		facebookId: {
			type: String,
			unique: true,
			required: true
		},
		message: String,
		story: String,
		picture: String,
		fullPicture: String,
		video: {
			source: String,
			length: Number
		},
		permalink: String,
		type: {
			type: String,
			enum: ['photo', 'video', 'status', 'link'],
			default: 'photo'
		},
		createdTime: Date,
		likeCount: {
			type: Number,
			default: 0
		},
		comments: [
			{
				id: String,
				name: String,
				message: String,
				createdTime: Date,
				picture: String
			}
		],
		commentCount: {
			type: Number,
			default: 0
		},
		shareCount: {
			type: Number,
			default: 0
		},
		updatedAt: {
			type: Date,
			default: Date.now
		}
	},
	{ timestamps: true }
);

module.exports = mongoose.model('FacebookPost', FacebookPostSchema);
