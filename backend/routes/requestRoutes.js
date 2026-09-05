// ============================================================
//  Blood Request Routes
//  Maps HTTP methods and URLs to controller functions.
//  This is the ROUTE layer of the MVC pattern.
//  It contains no business logic - it is only a switchboard.
// ============================================================

const express = require('express');
const router = express.Router();

// Import the five controller functions.
// These names must match the exports in requestController.js EXACTLY.
// A single typo here (e.g. getAllRequest instead of getAllRequests)
// makes the imported value undefined, and Express crashes on startup
// with: "Route.get() requires a callback function but got a
// [object Undefined]"
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
//    PUT    -> update one request (usually the status field:
//              Open -> Fulfilled / Cancelled)
//    DELETE -> remove one request
// ------------------------------------------------------------
router
  .route('/:id')
  .get(getRequestById)
  .put(updateRequest)
  .delete(deleteRequest);

// Export the router so server.js can mount it.
module.exports = router;