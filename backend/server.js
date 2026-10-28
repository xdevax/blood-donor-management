// 1. Load environment variables FIRST
require('dotenv').config();

// 2. Third-party packages
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const os = require('os');

// 3. Local modules
const connectDB = require('./config/db');
const donorRoutes = require('./routes/donorRoutes');
const requestRoutes = require('./routes/requestRoutes');
const adminRoutes = require('./routes/adminRoutes');
const statsRoutes = require('./routes/statsRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Identity of this instance (backend1/2/3 in Docker, hostname otherwise)
const INSTANCE = process.env.INSTANCE_ID || os.hostname();

// 4. Connect to MongoDB Atlas
connectDB();

// 5. Initialise Express
const app = express();

// 6. Global middleware
app.use(cors());
app.use(express.json());

// Tag every response with the instance that served it (header only, body unchanged)
app.use((req, res, next) => {
  res.setHeader('X-Instance', INSTANCE);
  next();
});

// 7. Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the Blood Donor Management System API',
    version: '1.0.0',
    instance: INSTANCE
  });
});

// Load-balancing proof endpoint
app.get('/api/whoami', (req, res) => {
  res.json({ instance: INSTANCE, pid: process.pid, time: new Date().toISOString() });
});

// 8. Health check
app.get('/api/health', (req, res) => {
  const dbStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  const state = mongoose.connection.readyState;
  res.json({
    success: true,
    message: 'Server is running',
    instance: INSTANCE,
    database: {
      status: dbStates[state] || 'unknown',
      readyState: state,
      name: mongoose.connection.name || null,
      host: mongoose.connection.host || null
    },
    timestamp: new Date().toISOString()
  });
});

// 9. API routes
app.use('/api/donors', donorRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stats', statsRoutes);

// 10. Error handling
app.use(notFound);
app.use(errorHandler);

// 11. Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 ${INSTANCE} running on port ${PORT}`);
});

// 12. Graceful shutdown (docker stop sends SIGTERM)
function shutdown(signal) {
  console.log(`${INSTANCE} received ${signal}, shutting down gracefully`);
  server.close(() => {
    mongoose.connection.close().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
