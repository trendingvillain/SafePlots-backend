const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const errorResponse = (res, error, message, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    error,
    message
  });
};

module.exports = {
  successResponse,
  errorResponse
};
