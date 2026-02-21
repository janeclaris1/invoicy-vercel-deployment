const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const {
  getJobs,
  createJob,
  updateJob,
  deleteJob,
  getApplications,
  createApplication,
  updateApplication,
  deleteApplication,
} = require('../controller/recruitmentController');

const router = express.Router();

router.use(protect);

router
  .route('/jobs')
  .get(getJobs)
  .post(createJob);

router
  .route('/jobs/:id')
  .put(updateJob)
  .delete(deleteJob);

router
  .route('/applications')
  .get(getApplications)
  .post(createApplication);

router
  .route('/applications/:id')
  .put(updateApplication)
  .delete(deleteApplication);

module.exports = router;
