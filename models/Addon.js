const mongoose = require('mongoose');

const addonSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    simpleDescription: { type: String, required: true },
    category: { type: String, required: true },
    image: { type: String, required: true },
    file: { type: String, required: true },
    downloads: { type: Number, default: 0 },
    releaseDate: { type: Date, default: Date.now },
    lastUpdate: { type: Date, default: Date.now },
    author: { type: String, required: true },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    views: { type: Number, default: 0 } // Campo para contagem de visualizações
}, {
    timestamps: true // Isso cria os campos createdAt e updatedAt automaticamente
  });
module.exports = mongoose.model('Addon', addonSchema);
