require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  await connectDB();
  const staff = [
    { username: 'admin1',   password: 'Admin@123',   role: 'admin' },
    { username: 'officer1', password: 'Officer@123', role: 'bloodbank_officer' },
    { username: 'volunteer1', password: 'Volunteer@123', role: 'volunteer' }
  ];
  await User.deleteMany({ username: { $in: staff.map(s => s.username) } });
  // Insert raw documents so the plain-text password is really stored (insecure on purpose)
  await User.collection.insertMany(staff.map(s => ({ ...s, mfaEnabled: false, createdAt: new Date() })));
  console.log('BEFORE: inserted staff with PLAIN TEXT passwords:');
  console.log(await User.collection.find({}, { projection: { username: 1, password: 1, role: 1 } }).toArray());
  await mongoose.connection.close();
})();
