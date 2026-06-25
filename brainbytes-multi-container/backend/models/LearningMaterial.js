const mongoose = require('mongoose');

const learningMaterialSchema = new mongoose.Schema({
    subject: { type: String, required: true, trim: true, lowercase: true },
    topic: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('LearningMaterial', learningMaterialSchema);