const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');

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

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a name'],
      unique: [true],
      maxlength: [50, 'A tour name must be at most 50 characters'],
      minlength: [5, 'A tour name must be at least 5 characters'],
      validate: {
        validator: (val) => validator.isAlpha(val, ['en-US'], { ignore: ' ' }),
        message: 'A tour name must be alphabetic',
      },
    },
    duration: {
      type: String,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'The ratings Average must be at least 1'],
      max: [5, 'The ratings Average must be at most 5'],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: [
        function (value) {
          // this points to the document only during creation .create()
          return value < this.price;
        },
        'Discount price should be lesser than the actual price',
      ],
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    secretTour: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    slug: String,
    createdAt: {
      type: Date,
      default: Date.now,
      select: false,
    },
    startDates: [Date],
  },
  {
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

tourSchema.virtual('durationInWeek').get(function () {
  return this.duration / 7;
});

// // DOCUMENT MIDDLEWARE
// Runs before .save() and .create() methods; we can have many of it
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// // runs after .save() and .create() methods
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   //   do anything with the doc
//   next();
// });

// QUERY MIDDLEWARE
//
// before query
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

// after query
// tourSchema.post(/^find/, function (doc, next) {
//   console.log(this.start);
//   console.log(Date.now());
//   console.log(`Query took: ${Date.now() - this.start}`);
//   next();
// });

// AGGREGATION MIDDLEWARE
//
// before aggregation
tourSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  //   console.log(this.pipeline());
  next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
