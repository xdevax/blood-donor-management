// ==========================================================
// Blood Donor Management System - Backend Server
// ----------------------------------------------------------
// Entry point of the application.
// Creates the Express server, applies middleware, and
// defines two basic routes used to verify the server runs.
//
// NOTE: Database connection is added in a later stage.
// ==========================================================

// ---------- 1. LOAD ENVIRONMENT VARIABLES ----------
// Must run FIRST so process.env is populated before use.
require('dotenv').config();

// ---------- 2. IMPORT PACKAGES ----------
const express = require('express');
const cors = require('cors');

// ---------- 3. CREATE THE EXPRESS APPLICATION ----------
const app = express();

// ---------- 4. MIDDLEWARE ----------
// cors(): allows the frontend (hosted on a different domain)
// to send requests to this backend.
app.use(cors());

// express.json(): reads incoming JSON request bodies and
// makes them available as req.body.
app.use(express.json());

// ---------- 5. ROUTES ----------

// Welcome route - confirms the API is reachable.
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the Blood Donor Management System API',
    version: '1.0.0'
  });
});

// Health check route - used to verify the server is alive.
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// ---------- 6. START THE SERVER ----------
// Use the port provided by the hosting environment,
// or fall back to 5000 when running locally.
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('==============================================');
  console.log('  Blood Donor Management System - Backend');
  console.log(`  Server running on: http://localhost:${PORT}`);
  console.log('  Press CTRL + C to stop the server');
  console.log('==============================================');
});