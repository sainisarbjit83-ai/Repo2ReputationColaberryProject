const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
}, { timestamps: true });

userSchema.statics.hashPassword = async function (plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

userSchema.statics.verifyPassword = async function (plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = mongoose.model('User', userSchema);
