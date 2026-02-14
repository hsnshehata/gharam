const mongoose = require('mongoose');

const MediaGallerySchema = new mongoose.Schema(
	{
		facebookPostId: {
			type: String,
			required: true,
			index: true
		},
		mediaUrl: {
			type: String,
			required: true,
			unique: true,
			index: true
		},
		mediaKey: {
			type: String,
			index: true
		},
		type: {
			type: String,
			enum: ['image', 'video'],
			default: 'image',
			index: true
		},
		thumbnailUrl: String,
		permalink: String,
		title: String,
		description: String,
		createdTime: {
			type: Date,
			index: true
		},
		source: {
			type: String,
			enum: ['facebook'],
			default: 'facebook'
		},
		isActive: {
			type: Boolean,
			default: true,
			index: true
		},
		addedAt: {
			type: Date,
			default: Date.now,
			index: true
		},
		updatedAt: {
			type: Date,
			default: Date.now
		}
	},
	{ timestamps: true }
);

module.exports = mongoose.model('MediaGallery', MediaGallerySchema);
