const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentSchema = new Schema({
    addonId: { type: String, required: true },
    username: { type: String, required: true },
    comment: { type: String, required: true },
    date: { type: Date, default: Date.now },
    approved: { type: Boolean, default: true }
});

module.exports = mongoose.model('Comment', commentSchema);
