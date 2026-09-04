// ============================================================
//  Donor Model
//  Defines the structure (schema) of a donor document
//  stored in the "donors" collection in MongoDB Atlas.
//  This is the MODEL layer of the MVC pattern.
// ============================================================

const mongoose = require('mongoose');

// A schema is a blueprint. It describes every field a donor
// document may contain, the data type of each field, and the
// validation rules that must pass before Mongoose allows the
// document to be saved to the database.
const donorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Donor name is required'],
      trim: true,
      minlength: [3, 'Name must be at least 3 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },

    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [18, 'Donor must be at least 18 years old'],
      max: [65, 'Donor cannot be older than 65 years']
    },

    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: {
        values: ['Male', 'Female', 'Other'],
        message: '{VALUE} is not a valid gender. Allowed values: Male, Female, Other'
      }
    },

    bloodGroup: {
      type: String,
      required: [true, 'Blood group is required'],
      enum: {
        values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        message: '{VALUE} is not a valid blood group. Allowed values: A+, A-, B+, B-, AB+, AB-, O+, O-'
      }
    },

    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [/^[0-9]{10}$/, 'Phone number must be exactly 10 digits']
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },

    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },

    state: {
      type: String,
      trim: true
    },

    // Informational only. This project does NOT calculate medical
    // eligibility to donate; it only stores what the donor reports.
    lastDonationDate: {
      type: Date
    },

    // Self-declared availability flag set by the donor.
    isAvailable: {
      type: Boolean,
      default: true
    }
  },
  {
    // Automatically adds and maintains createdAt and updatedAt fields.
    timestamps: true
  }
);

// mongoose.model() compiles the schema into a Model, which is the
// object we use in the controller to create, read, update and delete
// documents. Exporting it makes it available to other files.
module.exports = mongoose.model('Donor', donorSchema);