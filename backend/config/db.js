const mongoose = require('mongoose');

/**
 * Connects the application to MongoDB Atlas.
 * Called once, at server startup, before Express begins listening.
 */
const connectDB = async () => {
  try {
    // Fail fast and clearly if the .env variable was never loaded.
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined. Check your backend/.env file.');
    }

    // Mongoose 9: no options object needed.
    // useNewUrlParser and useUnifiedTopology were REMOVED and now throw.
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`   Database Name: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Stop the process. A running API with no database is useless and misleading.
    process.exit(1);
  }
};

module.exports = connectDB;