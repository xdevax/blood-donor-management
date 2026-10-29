require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  await connectDB();
  const users = await User.find({ password: { $exists: true } }).select('+password');
  for (const u of users) {
    const salt = await bcrypt.genSalt(12);                 // unique random salt per user
    u.passwordHash = await bcrypt.hash(u.password, salt);
    u.password = undefined;                                // remove plain text field
    await User.updateOne({ _id: u._id }, { $set: { passwordHash: u.passwordHash }, $unset: { password: '' } });
    console.log(`hashed ${u.username}: ${u.passwordHash}`);
  }
  console.log('AFTER:', await User.collection.find({}, { projection: { username: 1, passwordHash: 1, password: 1, role: 1 } }).toArray());
  await mongoose.connection.close();
})();
