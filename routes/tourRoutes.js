const express = require('express');
const {
  getAllTours,
  createTour,
  getTour,
  updateTour,
  deleteTour,
  aliasTopCheapTours,
  getTourStats,
  getMonthlyPlan,
} = require('../controllers/tourController');

const { authProtect, restrictTo } = require('../controllers/authController');

const router = express.Router();

// router.param('id', checkId);
router.route('/').get(authProtect, getAllTours).post(authProtect, createTour);
router.route('/top-5-cheap').get(aliasTopCheapTours, getAllTours);
router.route('/tour-stats').get(authProtect, getTourStats);
router.route('/monthly-plan/:year').get(getMonthlyPlan);
router
  .route('/:id')
  .get(authProtect, getTour)
  .patch(authProtect, updateTour)
  .delete(authProtect, restrictTo('admin', 'lead-guide'), deleteTour);

module.exports = router;
