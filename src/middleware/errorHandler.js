const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const error = err.code || 'SERVER_ERROR';

  res.status(statusCode).json({
    success: false,
    error,
    message
  });
};

const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: 'Route not found'
  });
};

module.exports = {
  errorHandler,
  notFound
};
