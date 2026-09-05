// Catch-all for URLs that matched no route. Express 5: NO path argument.
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

// Error middleware MUST have 4 arguments, or Express treats it as normal middleware.
const errorHandler = (err, req, res, next) => {
  console.error('ERROR:', err.message);

  let statusCode = 500;
  let message = 'Server error';

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for field '${err.path}': ${err.value}`;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.code === 11000) {
    statusCode = 409;
    message = `Duplicate value for field: ${Object.keys(err.keyValue).join(', ')}`;
  } else if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.message) {
    message = err.message;
  }

  res.status(statusCode).json({ success: false, message });
};

module.exports = { notFound, errorHandler };