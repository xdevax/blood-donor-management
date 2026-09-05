// ============================================================
//  BloodRequest Model
//  Defines the structure (schema) of a blood request document
//  stored in the "bloodrequests" collection in MongoDB Atlas.
//  This is the MODEL layer of the MVC pattern.
//
//  Compare with models/Donor.js:
//    - A Donor is a PERSON who may give blood.
//    - A BloodRequest is an EVENT: a hospital needs blood now.
//  Key deliberate differences from the Donor model:
//    1. NO field is unique here (see contactPhone below).
//    2. It carries a "status" lifecycle: Open -> Fulfilled / Cancelled.
// ============================================================

const mongoose = require('mongoose');

// A schema is a blueprint. It describes every field a blood request
// document may contain, the data type of each field, and the
// validation rules that must pass before Mongoose allows the
// document to be saved to the database.
const bloodRequestSchema = new mongoose.Schema(
  {
    patientName: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
      minlength: [3, 'Patient name must be at least 3 characters long'],
      maxlength: [50, 'Patient name cannot exceed 50 characters']
    },

    bloodGroup: {
      type: String,
      required: [true, 'Blood group is required'],
      enum: {
        values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        message: '{VALUE} is not a valid blood group. Allowed values: A+, A-, B+, B-, AB+, AB-, O+, O-'
      }
    },

    // How many units of blood are needed.
    // min/max stop obviously wrong data (0 units, or 500 units).
    unitsRequired: {
      type: Number,
      required: [true, 'Units required is mandatory'],
      min: [1, 'At least 1 unit must be requested'],
      max: [10, 'Cannot request more than 10 units in a single request']
    },

    hospitalName: {
      type: String,
      required: [true, 'Hospital name is required'],
      trim: true
    },

    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },

    contactPerson: {
      type: String,
      required: [true, 'Contact person is required'],
      trim: true
    },

    // NOTE: deliberately NOT unique.
    // In models/Donor.js the phone field IS unique, because a phone
    // number identifies one human donor and must not be registered
    // twice. Here the number only identifies a point of contact:
    // the same hospital reception may legitimately post many
    // different requests. Making it unique would reject genuine
    // records with a duplicate-key error. This is why this module
    // has no 409 status code anywhere.
    contactPhone: {
      type: String,
      required: [true, 'Contact phone number is required'],
      trim: true,
      match: [/^[0-9]{10}$/, 'Contact phone must be exactly 10 digits']
    },

    // Optional. If the client does not send it, Mongoose applies
    // the default value 'Medium' before saving.
    urgency: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High'],
        message: '{VALUE} is not a valid urgency. Allowed values: Low, Medium, High'
      },
      default: 'Medium'
    },

    // The lifecycle field. Every request is born 'Open'.
    // Moving it to 'Fulfilled' or 'Cancelled' is the meaningful
    // UPDATE operation demonstrated by PUT /api/requests/:id.
    status: {
      type: String,
      enum: {
        values: ['Open', 'Fulfilled', 'Cancelled'],
        message: '{VALUE} is not a valid status. Allowed values: Open, Fulfilled, Cancelled'
      },
      default: 'Open'
    },

    // Optional deadline. Send it as a plain "YYYY-MM-DD" string,
    // e.g. "2026-03-15". Mongoose casts that safely to a Date.
    // Formats like "15/03/2026" cannot be parsed and cause a CastError.
    neededBy: {
      type: Date
    },

    // Free-text extra information. Record-keeping only.
    notes: {
      type: String,
      trim: true,
      maxlength: [300, 'Notes cannot exceed 300 characters']
    }
  },
  {
    // Automatically adds and maintains createdAt and updatedAt fields.
    // updatedAt is useful evidence here: it changes when the status
    // is updated, proving the record really was modified.
    timestamps: true
  }
);

// mongoose.model() compiles the schema into a Model, which is the
// object we use in the controller to create, read, update and delete
// documents. Exporting it makes it available to other files.
module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
