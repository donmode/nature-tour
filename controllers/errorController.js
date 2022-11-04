const mongoose = require('mongoose');
const AppError = require('../utils/appError');

const handleDbCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 404);
};
const handleDbDuplicateError = (err) => {
  const message = `Duplicate property \`${
    Object.keys(err.keyValue)[0]
  }\` with value \`${
    Object.values(err.keyValue)[0]
  }\`. This value already exists}`;
  return new AppError(message, 400);
};

const handleDbValidatorError = (err) => {
  let messages = [];
  Object.values(err.errors).map((val) => messages.push(val.properties.message));
  messages = messages.join(', and ');

  return new AppError(messages, 400);
};

const sendErrorDevelopment = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    stack: err.stack,
    message: err.message,
  });
};

const invalidJWTError = () =>
  new AppError('Invalid token. Please log in again', 401);

const expiredJWTError = () =>
  new AppError('Token has expired. Please log in again', 401);

const sendErrorProduction = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
    // Programming or other unknown error: don't leak details to client
  } else {
    // 1.) Log the error
    console.log('Error: 💥', err);
    // 2.) Send generic message
    res.status(500).json({
      status: 'error',
      message: 'something went wrong',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  if (process.env.NODE_ENV === 'development') {
    sendErrorDevelopment(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { message: err.message, ...err };
    if (err instanceof mongoose.CastError) error = handleDbCastError(error);
    if (err.name === 'ValidationError') error = handleDbValidatorError(error);
    if (err.name === 'JsonWebTokenError') error = invalidJWTError();
    if (err.name === 'TokenExpiredError') error = expiredJWTError();

    if (err.code === 11000) error = handleDbDuplicateError(error);
    sendErrorProduction(error, res);
  }
};
