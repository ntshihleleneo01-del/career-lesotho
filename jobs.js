const express = require('express');
const JobPosting = require('../models/JobPosting');
const User = require('../models/User');

const router = express.Router();

// Middleware to check if user is company
const requireCompany = async (req, res, next) => {
  try {
    const userId = req.headers['user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== 'company') {
      return res.status(403).json({ error: 'Company access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Middleware to check if user is student
const requireStudent = async (req, res, next) => {
  try {
    const userId = req.headers['user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== 'student') {
      return res.status(403).json({ error: 'Student access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Get all active job postings (public)
router.get('/', async (req, res) => {
  try {
    const jobs = await JobPosting.findActive();
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get job posting by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const job = await JobPosting.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job posting not found' });
    }
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get company's job postings
router.get('/company/my-jobs', requireCompany, async (req, res) => {
  try {
    const jobs = await JobPosting.findByCompany(req.user.id);
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create job posting (Company only)
router.post('/', requireCompany, async (req, res) => {
  try {
    const {
      title,
      description,
      requirements,
      location,
      salary,
      employmentType,
      deadline
    } = req.body;

    if (!title || !description || !location || !employmentType || !deadline) {
      return res.status(400).json({ error: 'Title, description, location, employment type, and deadline are required' });
    }

    const jobData = {
      companyId: req.user.id,
      title,
      description,
      requirements: requirements || {},
      location,
      salary: salary || {},
      employmentType,
      deadline: new Date(deadline),
      status: 'active'
    };

    const job = await JobPosting.create(jobData);
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update job posting (Company only)
router.put('/:id', requireCompany, async (req, res) => {
  try {
    const job = await JobPosting.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job posting not found' });
    }

    if (job.companyId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this job posting' });
    }

    const updateData = req.body;
    delete updateData.id; // Prevent ID updates
    delete updateData.companyId; // Prevent company ID updates
    delete updateData.createdAt; // Prevent timestamp updates

    const updatedJob = await job.update(updateData);
    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete job posting (Company only)
router.delete('/:id', requireCompany, async (req, res) => {
  try {
    const job = await JobPosting.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job posting not found' });
    }

    if (job.companyId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this job posting' });
    }

    await job.delete();
    res.json({ message: 'Job posting deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get matching applicants for job (Company only)
router.get('/:id/applicants', requireCompany, async (req, res) => {
  try {
    const job = await JobPosting.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job posting not found' });
    }

    if (job.companyId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view applicants for this job' });
    }

    const applicants = await job.findMatchingApplicants();
    res.json(applicants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get jobs matching student's profile (Student only)
router.get('/student/matches', requireStudent, async (req, res) => {
  try {
    // Get all active jobs
    const jobs = await JobPosting.findActive();
    const matches = [];

    for (const job of jobs) {
      const applicants = await job.findMatchingApplicants();
      const studentMatch = applicants.find(applicant => applicant.id === req.user.id);

      if (studentMatch) {
        matches.push({
          job: job,
          matchScore: studentMatch.matchScore
        });
      }
    }

    // Sort by match score
    matches.sort((a, b) => b.matchScore - a.matchScore);
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
