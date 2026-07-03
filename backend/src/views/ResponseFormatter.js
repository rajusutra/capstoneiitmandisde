// Gives every API response the same shape: { success, message, data }
const ResponseFormatter = {
  success(res, data, message = 'OK', statusCode = 200) {
    return res.status(statusCode).json({ success: true, message, data });
  },

  error(res, message = 'Something went wrong', statusCode = 500) {
    return res.status(statusCode).json({ success: false, message, data: null });
  },
};

module.exports = ResponseFormatter;
