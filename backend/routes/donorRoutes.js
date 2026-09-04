// ============================================================
//  Donor Routes
//  Maps HTTP methods and URLs to controller functions.
//  This is the ROUTE layer of the MVC pattern.
//  It contains no business logic - it is only a switchboard.
// ============================================================

const express = require('express');
const router = express.Router();

// Import the five controller functions.
// These names must match the exports in donorController.js EXACTLY.
const {
  createDonor,
  getAllDonors,
  getDonorById,
  updateDonor,
  deleteDonor
} = require('../controllers/donorController');

// ------------------------------------------------------------
//  Routes for  /api/donors
//    POST -> create a new donor
//    GET  -> list all donors (supports optional query filters)
// ------------------------------------------------------------
router
  .route('/')
  .post(createDonor)
  .get(getAllDonors);

// ------------------------------------------------------------
//  Routes for  /api/donors/:id
//    GET    -> fetch one donor
//    PUT    -> update one donor
//    DELETE -> remove one donor
// ------------------------------------------------------------
router
  .route('/:id')
  .get(getDonorById)
  .put(updateDonor)
  .delete(deleteDonor);

// Export the router so server.js can mount it.
module.exports = router;