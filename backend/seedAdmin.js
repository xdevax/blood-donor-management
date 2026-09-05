require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { seedAdmin } = require('./controllers/adminController');

const run = async () => {
  try {
    await connectDB();
    await seedAdmin();
  } catch (error) {
    console.error('Seeding failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connection closed.');
    process.exit(0);
  }
};

run();