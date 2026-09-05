const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

// Creates the default admin from .env values, but ONLY if no admin exists yet.
// Safe to run more than once - it will simply skip.
const seedAdmin = async () => {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.log('❌ Seed skipped: ADMIN_USERNAME or ADMIN_PASSWORD missing from .env');
    return;
  }

  const existing = await Admin.findOne({ username: username.toLowerCase() });

  if (existing) {
    console.log(`ℹ️  Admin "${existing.username}" already exists. Nothing to seed.`);
    return;
  }

  // Hash the plaintext password ONCE. 10 = salt rounds (work factor).
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const admin = await Admin.create({ username, passwordHash });

  console.log(`✅ Admin created: ${admin.username}`);
  console.log(`   Stored hash: ${admin.passwordHash}`);
};

// POST /api/admin/login
const loginAdmin = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const admin = await Admin.findOne({ username: username.toLowerCase().trim() });

    // Same generic message whether the user is missing or the password is wrong.
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // NEVER return passwordHash.
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { username: admin.username }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { seedAdmin, loginAdmin };