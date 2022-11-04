class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = parseInt(statusCode, 10);
    this.status = `${statusCode}`.startsWith('4') ? 'Failed' : 'Error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
