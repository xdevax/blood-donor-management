// 1. Load environment variables FIRST, before anything reads process.env
require('dotenv').config();

// 2. Third-party packages
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// 3. Local modules
const connectDB = require('./config/db');
const donorRoutes = require('./routes/donorRoutes');
const requestRoutes = require('./routes/requestRoutes');
const adminRoutes = require('./routes/adminRoutes');
const statsRoutes = require('./routes/statsRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');   // <-- NEW

// 4. Connect to MongoDB Atlas
connectDB();

// 5. Initialise Express
const app = express();

// 6. Global middleware
app.use(cors());              // allow the Netlify frontend to call this API
app.use(express.json());      // parse incoming JSON request bodies

// 7. Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the Blood Donor Management System API',
    version: '1.0.0'
  });
});

// 8. Health check route - now also reports database status
app.get('/api/health', (req, res) => {
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const state = mongoose.connection.readyState;

  res.json({
    success: true,
    message: 'Server is running',
    database: {
      status: dbStates[state] || 'unknown',
      readyState: state,
      name: mongoose.connection.name || null,
      host: mongoose.connection.host || null
    },
    timestamp: new Date().toISOString()
  });
});

// 9. API routes (mounted)
//    Every donor endpoint lives under the /api/donors prefix.
app.use('/api/donors', donorRoutes);

//    Every blood request endpoint lives under the /api/requests prefix.
app.use('/api/requests', requestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stats', statsRoutes);

// 10. Error handling middleware - MUST come after all routes      <-- NEW BLOCK
//     notFound catches any URL that matched no route above.
//     errorHandler is the 4-argument safety net for everything else.
app.use(notFound);
app.use(errorHandler);

// 11. Start the server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   Local: http://localhost:${PORT}`);
});