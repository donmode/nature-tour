const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

// const verifyToken = promisify(jwt.verify)(token, process.env.JWT_SECRET);

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });
  const token = signToken(newUser._id);
  res.status(201).json({
    status: 'success',
    token,
    data: {
      user: newUser,
    },
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //   1.) Check if email nd password exists
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }
  // 2.) Check if user exists and password is correct
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  // 3.)If everything is ok, send token to client
  const token = signToken(user._id);
  res.status(200).json({
    status: 'sucess',
    token,
    data: {
      user: { id: user._id, name: user.name, email: user.email },
    },
  });
});

exports.authProtect = catchAsync(async (req, res, next) => {
  //   1.) Getting token and check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return next(
      new AppError('You are not logged in, please login to get access', 401)
    );
  }
  //  2.) Verification of token
  const verified = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //    3.) Check if user still exists
  const user = await User.findById(verified.id);
  if (!user) {
    return next(
      new AppError('The user belonging to this token does not exist', 401)
    );
  }

  //  4.) Check if user has changed password after the tiken was issued
  if (user.changedPasswordAfter(verified.iat)) {
    return next(
      new AppError('Recently changed password!, Please log in again.', 401)
    );
  }
  req.user = user;
  // Grant access to protected routes
  next();
});

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    // roles is an array[]
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1.) Get userbased on Posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with this email address', 404));
  }
  // 2.)Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3.) Sent it to user's email address
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;
  const message = `Forgot your password? Submit a Ptach request with your new password and passwordCornfirm to: ${resetURL}.\nIf you didn't initiate this process, kindly ingnore the mail. Thanks`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (Valid for 30 minutes): ',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Reset token sent to your email address',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending the email. Please, try again later.',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1.) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // 2.) If token has not expired, and there is user, set the newpasword
  if (!user) {
    console.log('got here');
    return next(new AppError('Token is invalid or has expired', 404));
  }
  // 3.) Update passwordChangedAt property for the user
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Log the user in, send JWT
  const token = signToken(user._id);
  res.status(200).json({
    status: 'sucess',
    token,
    data: {
      user: { id: user._id, name: user.name, email: user.email },
    },
  });
});
