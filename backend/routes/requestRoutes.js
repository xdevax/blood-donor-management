// ============================================================
//  Blood Request Routes
//  Maps HTTP methods and URLs to controller functions.
//  This is the ROUTE layer of the MVC pattern.
//  It contains no business logic - it is only a switchboard.
// ============================================================

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');

// Import the five controller functions.
// These names must match the exports in requestController.js EXACTLY.
const {
  createRequest,
  getAllRequests,
  getRequestById,
  updateRequest,
  deleteRequest
} = require('../controllers/requestController');

// ------------------------------------------------------------
//  Routes for  /api/requests
//    POST -> create a new blood request
//    GET  -> list all requests (supports optional query filters:
//            bloodGroup, city, status, urgency)
// ------------------------------------------------------------
router
  .route('/')
  .post(createRequest)
  .get(getAllRequests);

// ------------------------------------------------------------
//  Routes for  /api/requests/:id
//    GET    -> fetch one request
//    PUT    -> update one request (admin and bloodbank_officer only)
//    DELETE -> remove one request (admin only)
// ------------------------------------------------------------
router
  .route('/:id')
  .get(getRequestById)
  .put(requireAuth('access'), requireRole('admin', 'bloodbank_officer'), updateRequest)
  .delete(requireAuth('access'), requireRole('admin'), deleteRequest);

// Export the router so server.js can mount it.
module.exports = router;
