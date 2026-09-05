const Donor = require('../models/Donor');
const BloodRequest = require('../models/BloodRequest');

// GET /api/stats
const getStats = async (req, res, next) => {
  try {
    // countDocuments() asks MongoDB to count matching documents on the server
    // and return only a number - far cheaper than fetching all records.
    const [
      totalDonors,
      availableDonors,
      totalRequests,
      openRequests,
      fulfilledRequests,
      cancelledRequests
    ] = await Promise.all([
      Donor.countDocuments({}),
      Donor.countDocuments({ isAvailable: true }),
      BloodRequest.countDocuments({}),
      BloodRequest.countDocuments({ status: 'Open' }),
      BloodRequest.countDocuments({ status: 'Fulfilled' }),
      BloodRequest.countDocuments({ status: 'Cancelled' })
    ]);

    // Aggregation pipeline: documents flow through stages, one after another.
    // $group buckets every donor by bloodGroup and counts each bucket.
    // $sort orders the buckets by count, highest first.
    // $project renames _id to bloodGroup for a cleaner API response.
    const donorsByBloodGroup = await Donor.aggregate([
      {
        $group: {
          _id: '$bloodGroup',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1, _id: 1 }
      },
      {
        $project: {
          _id: 0,
          bloodGroup: '$_id',
          count: 1
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalDonors,
        availableDonors,
        totalRequests,
        openRequests,
        fulfilledRequests,
        cancelledRequests,
        donorsByBloodGroup
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats };