const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String },               // bcrypt hash (after migration)
    password: { type: String, select: false },    // LEGACY plain text - only exists before migration (part a demo)
    role: {
      type: String,
      enum: ['admin', 'bloodbank_officer', 'volunteer'],
      default: 'volunteer'
    },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, select: false },
    mfaTempSecret: { type: String, select: false }
  },
  { timestamps: true, collection: 'users' }
);

module.exports = mongoose.model('User', userSchema);
