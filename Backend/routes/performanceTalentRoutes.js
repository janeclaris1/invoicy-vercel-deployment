const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const {
  getPerformanceReviews,
  createPerformanceReview,
  updatePerformanceReview,
  deletePerformanceReview,
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
} = require('../controller/performanceTalentController');

const router = express.Router();

router.use(protect);

router
  .route('/reviews')
  .get(getPerformanceReviews)
  .post(createPerformanceReview);

router
  .route('/reviews/:id')
  .put(updatePerformanceReview)
  .delete(deletePerformanceReview);

router
  .route('/goals')
  .get(getGoals)
  .post(createGoal);

router
  .route('/goals/:id')
  .put(updateGoal)
  .delete(deleteGoal);

module.exports = router;
