const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const {
  getOnboardingTasks,
  createOnboardingTask,
  updateOnboardingTask,
  deleteOnboardingTask,
  getOffboardingTasks,
  createOffboardingTask,
  updateOffboardingTask,
  deleteOffboardingTask,
} = require('../controller/onboardingOffboardingController');

const router = express.Router();

router.use(protect);

router.route('/onboarding')
  .get(getOnboardingTasks)
  .post(createOnboardingTask);

router.route('/onboarding/:id')
  .put(updateOnboardingTask)
  .delete(deleteOnboardingTask);

router.route('/offboarding')
  .get(getOffboardingTasks)
  .post(createOffboardingTask);

router.route('/offboarding/:id')
  .put(updateOffboardingTask)
  .delete(deleteOffboardingTask);

module.exports = router;
