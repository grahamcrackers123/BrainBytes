const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    preferredSubjects: [{ type: String, trim: true }]
}, { timestamps: true });

module.exports = mongoose.model('UserProfile', userProfileSchema);