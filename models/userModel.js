const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const db = process.env.DATABASE_CONNECT.replace(
  '<DB_PASS>',
  process.env.DB_PASS
)
  .replace('<DB_USER>', process.env.DB_USER)
  .replace('<DB_HOST>', process.env.DB_HOST)
  .replace('<DB_NAME>', process.env.DB_NAME);

mongoose.connect(db, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // useCreateIndex: true,
  // useUnifiedTopology: true,
  // useFindAndModify: false,
});

const dbConnected = mongoose.connection;
dbConnected.on('error', console.error.bind(console, 'connection error: '));
// dbConnected.once('open', function () {
//   console.log('Connected successfully');
// });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: [true, 'A user must have a name'],
    maxlength: [150, "A user's name  must be at most 150 characters"],
    minlength: [5, "A user's name  must be at least 5 characters"],
  },
  email: {
    type: String,
    unique: true,
    required: [true, 'Please provide your email address'],
    maxlength: [100, "A user's email address  must be at most 100 characters"],
    minlength: [5, "A user's email address  must be at least 5 characters"],
    lowercase: true,
    validate: [validator.isEmail, 'Please enter a valid email address'],
  },
  photo: String,
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'A user must have a password'],
    minlength: [8, "A user's password  must be at least 8 characters"],
    select: false,
  },
  passwordChangedAt: Date,
  passwordConfirm: {
    type: String,
    required: [true, 'Kindly confirm your password'],
    validate: {
      // This only works on CREATE and SAVE
      validator: function (el) {
        return el === this.password;
      },
      message: 'Psswords are not thesame',
    },
    minlength: [8, "A user's password  must be at least 8 characters"],
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
});

userSchema.pre('save', async function (next) {
  // Only run if password was modified
  if (!this.isModified('password')) return next();
  // Hash password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  //  delete password confirm
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changeTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changeTimestamp; // Changed
  }
  return false; // Not Changed
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 30 * 60 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
