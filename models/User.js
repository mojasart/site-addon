// models/User.js

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAuthorized: { type: Boolean, default: false }, // Novo campo indicando se o usuário é autorizado
  verificationToken: String,
  isVerified: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', UserSchema);
