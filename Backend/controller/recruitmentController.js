const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');

const getTeamMemberIds = async (currentUserId) => {
  const currentUser = await User.findById(currentUserId);
  if (!currentUser) return [currentUserId];
  if (!currentUser.createdBy) return [currentUserId];
  const teamMembers = await User.find({
    $or: [
      { createdBy: currentUser.createdBy },
      { _id: currentUser.createdBy },
    ],
  }).select('_id');
  return teamMembers.map((m) => m._id);
};

// -------- Jobs --------
const getJobs = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const filter = { user: { $in: teamMemberIds } };
    if (req.query.status) filter.status = req.query.status;
    const jobs = await Job.find(filter).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createJob = async (req, res) => {
  try {
    const job = await Job.create({
      user: req.user._id,
      title: req.body.title,
      department: req.body.department || '',
      location: req.body.location || '',
      employmentType: req.body.employmentType || 'Full-time',
      description: req.body.description || '',
      requirements: req.body.requirements || '',
      status: req.body.status || 'Draft',
      postedAt: req.body.status === 'Open' ? (req.body.postedAt || new Date()) : null,
    });
    res.status(201).json(job);
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateJob = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (!teamMemberIds.some((id) => id.toString() === job.user.toString())) {
      return res.status(403).json({ message: 'Not authorized to update this job' });
    }
    const fields = ['title', 'department', 'location', 'employmentType', 'description', 'requirements', 'status'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) job[f] = req.body[f];
    });
    if (req.body.status === 'Open' && !job.postedAt) job.postedAt = new Date();
    if (req.body.status === 'Closed' || req.body.status === 'Draft') job.postedAt = job.postedAt; // keep as is
    await job.save();
    res.json(job);
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteJob = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (!teamMemberIds.some((id) => id.toString() === job.user.toString())) {
      return res.status(403).json({ message: 'Not authorized to delete this job' });
    }
    await Application.deleteMany({ job: job._id });
    await Job.findByIdAndDelete(req.params.id);
    res.json({ message: 'Job deleted' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// -------- Applications --------
const getApplications = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const jobIds = await Job.find({ user: { $in: teamMemberIds } }).select('_id').then((j) => j.map((x) => x._id));
    const filter = { job: { $in: jobIds } };
    if (req.query.jobId) filter.job = req.query.jobId;
    if (req.query.status) filter.status = req.query.status;
    const applications = await Application.find(filter)
      .populate('job', 'title department employmentType status')
      .sort({ appliedAt: -1 });
    res.json(applications);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createApplication = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const job = await Job.findById(req.body.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (!teamMemberIds.some((id) => id.toString() === job.user.toString())) {
      return res.status(403).json({ message: 'Not authorized to add applications for this job' });
    }
    const application = await Application.create({
      user: req.user._id,
      job: req.body.jobId,
      candidateName: req.body.candidateName,
      candidateEmail: req.body.candidateEmail,
      candidatePhone: req.body.candidatePhone || '',
      resumeUrl: req.body.resumeUrl || '',
      resumeNotes: req.body.resumeNotes || '',
      source: req.body.source || '',
      status: req.body.status || 'Applied',
      notes: req.body.notes || '',
      appliedAt: req.body.appliedAt ? new Date(req.body.appliedAt) : new Date(),
    });
    const populated = await Application.findById(application._id).populate('job', 'title department employmentType status');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateApplication = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const application = await Application.findById(req.params.id).populate('job');
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (!application.job || !teamMemberIds.some((id) => id.toString() === application.job.user.toString())) {
      return res.status(403).json({ message: 'Not authorized to update this application' });
    }
    const fields = ['candidateName', 'candidateEmail', 'candidatePhone', 'resumeUrl', 'resumeNotes', 'source', 'status', 'notes'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) application[f] = req.body[f];
    });
    if (req.body.appliedAt !== undefined) application.appliedAt = new Date(req.body.appliedAt);
    await application.save();
    const populated = await Application.findById(application._id).populate('job', 'title department employmentType status');
    res.json(populated);
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteApplication = async (req, res) => {
  try {
    const teamMemberIds = await getTeamMemberIds(req.user._id);
    const application = await Application.findById(req.params.id).populate('job');
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (!application.job || !teamMemberIds.some((id) => id.toString() === application.job.user.toString())) {
      return res.status(403).json({ message: 'Not authorized to delete this application' });
    }
    await Application.findByIdAndDelete(req.params.id);
    res.json({ message: 'Application deleted' });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getJobs,
  createJob,
  updateJob,
  deleteJob,
  getApplications,
  createApplication,
  updateApplication,
  deleteApplication,
};
