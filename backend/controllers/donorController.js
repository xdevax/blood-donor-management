// ============================================================
//  Donor Controller
//  Contains the business logic for every donor endpoint.
//  This is the CONTROLLER layer of the MVC pattern.
//  Each function receives the request (req), talks to the
//  Donor model, and sends back a JSON response (res).
// ============================================================

const Donor = require('../models/Donor');

// ------------------------------------------------------------
//  @desc    Create a new donor
//  @route   POST /api/donors
//  @access  Public
// ------------------------------------------------------------
const createDonor = async (req, res) => {
  try {
    // req.body holds the JSON sent by the client.
    // Donor.create() validates it against the schema, then saves.
    const donor = await Donor.create(req.body);

    return res.status(201).json({
      success: true,
      message: 'Donor registered successfully',
      data: donor
    });
  } catch (error) {
    // Schema rule broken (missing field, bad enum, bad phone format)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
        data: null
      });
    }

    // MongoDB unique index violation -> phone already registered
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A donor with this phone number is already registered',
        data: null
      });
    }

    console.error('createDonor error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while registering donor',
      data: null
    });
  }
};

// ------------------------------------------------------------
//  @desc    Get all donors, newest first, with optional filters
//  @route   GET /api/donors
//           ?bloodGroup=O%2B  &city=Jaipur  &isAvailable=true
//  @access  Public
// ------------------------------------------------------------
const getAllDonors = async (req, res) => {
  try {
    // Build the filter object from whichever query params were sent.
    // Start empty: an empty filter {} means "match every document".
    const filter = {};

    if (req.query.bloodGroup) {
      filter.bloodGroup = req.query.bloodGroup;
    }

    if (req.query.city) {
      // Case-insensitive exact match:
      // ^ = start, $ = end, 'i' = ignore case
      filter.city = new RegExp(`^${req.query.city}$`, 'i');
    }

    if (req.query.isAvailable) {
      // Query values always arrive as strings, so compare to 'true'
      // to convert "true"/"false" into a real boolean.
      filter.isAvailable = req.query.isAvailable === 'true';
    }

    const donors = await Donor.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Donors retrieved successfully',
      count: donors.length,
      data: donors
    });
  } catch (error) {
    console.error('getAllDonors error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while retrieving donors',
      data: null
    });
  }
};

// ------------------------------------------------------------
//  @desc    Get a single donor by ID
//  @route   GET /api/donors/:id
//  @access  Public
// ------------------------------------------------------------
const getDonorById = async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id);

    // Valid ID format, but no such document in the database
    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor not found',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Donor retrieved successfully',
      data: donor
    });
  } catch (error) {
    // The id in the URL was not a valid MongoDB ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid donor ID format',
        data: null
      });
    }

    console.error('getDonorById error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while retrieving donor',
      data: null
    });
  }
};

// ------------------------------------------------------------
//  @desc    Update a donor by ID
//  @route   PUT /api/donors/:id
//  @access  Public
// ------------------------------------------------------------
const updateDonor = async (req, res) => {
  try {
    const donor = await Donor.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after', // return the UPDATED document, not the old one
      runValidators: true      // re-check the schema rules on this update
    });

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor not found',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Donor updated successfully',
      data: donor
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
        message: 'Invalid donor ID format',
        data: null
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A donor with this phone number is already registered',
        data: null
      });
    }

    console.error('updateDonor error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating donor',
      data: null
    });
  }
};

// ------------------------------------------------------------
//  @desc    Delete a donor by ID
//  @route   DELETE /api/donors/:id
//  @access  Public
// ------------------------------------------------------------
const deleteDonor = async (req, res) => {
  try {
    const donor = await Donor.findByIdAndDelete(req.params.id);

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor not found',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Donor deleted successfully',
      data: donor
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid donor ID format',
        data: null
      });
    }

    console.error('deleteDonor error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting donor',
      data: null
    });
  }
};

// Export all five functions so the route file can use them.
// The names here must match EXACTLY what donorRoutes.js imports.
module.exports = {
  createDonor,
  getAllDonors,
  getDonorById,
  updateDonor,
  deleteDonor
};