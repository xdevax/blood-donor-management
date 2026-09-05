// ============================================================
//  BloodRequest Controller
//  Contains the business logic for every blood request endpoint.
//  This is the CONTROLLER layer of the MVC pattern.
//  Each function receives the request (req), talks to the
//  BloodRequest model, and sends back a JSON response (res).
//
//  Mirrors controllers/donorController.js, with two deliberate
//  differences:
//    1. NO 409 branch, because no field in this collection is
//       unique, so a duplicate-key error (code 11000) can never
//       be thrown here.
//    2. Supports a "status" filter, because a request has a
//       lifecycle: Open -> Fulfilled / Cancelled.
// ============================================================

// The path and the CASING must match the real filename exactly:
// models/BloodRequest.js  (capital B, capital R).
// Windows ignores case, but Render runs Linux, which does not.
const BloodRequest = require('../models/BloodRequest');

// ------------------------------------------------------------
//  @desc    Create a new blood request
//  @route   POST /api/requests
//  @access  Public
// ------------------------------------------------------------
const createRequest = async (req, res) => {
  try {
    // req.body holds the JSON sent by the client.
    // BloodRequest.create() validates it against the schema,
    // applies defaults (urgency: 'Medium', status: 'Open'),
    // then saves the document to MongoDB Atlas.
    const bloodRequest = await BloodRequest.create(req.body);

    return res.status(201).json({
      success: true,
      message: 'Blood request created successfully',
      data: bloodRequest
    });
  } catch (error) {
    // Schema rule broken (missing field, bad enum, units out of
    // range, phone not 10 digits, notes too long)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
        data: null
      });
    }

    // Catches an unparseable neededBy value, e.g. "15/03/2026".
    // Mongoose cannot cast that to a Date, so it is bad client
    // input (400), not a server fault (500).
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: `Invalid value for field '${error.path}'. Please check the data format`,
        data: null
      });
    }

    // NOTE: there is deliberately no "error.code === 11000" branch
    // here. That error only occurs on a unique index, and this
    // collection has none. See the comment on contactPhone in
    // models/BloodRequest.js.

    console.error('createRequest error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating blood request',
      data: null
    });
  }
};

// ------------------------------------------------------------
//  @desc    Get all blood requests, newest first, with filters
//  @route   GET /api/requests
//           ?bloodGroup=B%2B  &city=Jaipur
//           &status=Open      &urgency=High
//  @access  Public
// ------------------------------------------------------------
const getAllRequests = async (req, res) => {
  try {
    // Build the filter object from whichever query params were sent.
    // Start empty: an empty filter {} means "match every document".
    // Because each key is added independently, the filters are
    // freely combinable - MongoDB ANDs them together.
    const filter = {};

    if (req.query.bloodGroup) {
      filter.bloodGroup = req.query.bloodGroup;
    }

    if (req.query.city) {
      // Case-insensitive exact match:
      // ^ = start, $ = end, 'i' = ignore case
      // So "jaipur", "Jaipur" and "JAIPUR" all match.
      filter.city = new RegExp(`^${req.query.city}$`, 'i');
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.urgency) {
      filter.urgency = req.query.urgency;
    }

    // .sort({ createdAt: -1 }) = descending = newest request first,
    // which is what a hospital dashboard needs to show.
    const bloodRequests = await BloodRequest.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Blood requests retrieved successfully',
      count: bloodRequests.length,
      data: bloodRequests
    });
  } catch (error) {
    console.error('getAllRequests error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while retrieving blood requests',
      data: null
    });
  }
};

// ------------------------------------------------------------
//  @desc    Get a single blood request by ID
//  @route   GET /api/requests/:id
//  @access  Public
// ------------------------------------------------------------
const getRequestById = async (req, res) => {
  try {
    const bloodRequest = await BloodRequest.findById(req.params.id);

    // Valid ObjectId format, but no such document in the database
    if (!bloodRequest) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Blood request retrieved successfully',
      data: bloodRequest
    });
  } catch (error) {
    // The id in the URL was not a valid MongoDB ObjectId,
    // e.g. /api/requests/123
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid blood request ID format',
        data: null
      });
    }

    console.error('getRequestById error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while retrieving blood request',
      data: null
    });
  }
};

// ------------------------------------------------------------
//  @desc    Update a blood request by ID
//           Most commonly used to change status:
//           Open -> Fulfilled, or Open -> Cancelled
//  @route   PUT /api/requests/:id
//  @access  Public
// ------------------------------------------------------------
const updateRequest = async (req, res) => {
  try {
    const bloodRequest = await BloodRequest.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        // Mongoose 9: 'new: true' is DEPRECATED.
        // returnDocument: 'after' is the modern equivalent and
        // means "send me the document AFTER the update", so the
        // client can see the new status straight away.
        returnDocument: 'after',
        // By default Mongoose does NOT validate on update, so an
        // invalid status like 'Done' would be written silently.
        // This re-applies the schema rules to the update.
        runValidators: true
      }
    );

    if (!bloodRequest) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Blood request updated successfully',
      data: bloodRequest
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
        data: null
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid blood request ID format',
        data: null
      });
    }

    console.error('updateRequest error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating blood request',
      data: null
    });
  }
};

// ------------------------------------------------------------
//  @desc    Delete a blood request by ID
//  @route   DELETE /api/requests/:id
//  @access  Public
// ------------------------------------------------------------
const deleteRequest = async (req, res) => {
  try {
    const bloodRequest = await BloodRequest.findByIdAndDelete(req.params.id);

    if (!bloodRequest) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found',
        data: null
      });
    }

    // The deleted document is returned so the client has a record
    // of exactly what was removed.
    return res.status(200).json({
      success: true,
      message: 'Blood request deleted successfully',
      data: bloodRequest
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid blood request ID format',
        data: null
      });
    }

    console.error('deleteRequest error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting blood request',
      data: null
    });
  }
};

// Export all five functions so the route file can use them.
// The names here must match EXACTLY what requestRoutes.js imports.
// A typo here is the #1 cause of:
//   "Route.get() requires a callback function but got a [object Undefined]"
module.exports = {
  createRequest,
  getAllRequests,
  getRequestById,
  updateRequest,
  deleteRequest
};