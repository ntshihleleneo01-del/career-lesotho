const express = require('express');
const Application = require('../models/Application');
const Course = require('../models/Course');
const User = require('../models/User');
const Institution = require('../models/Institution');

const router = express.Router();

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

// Middleware to check if user is institute admin
const requireInstituteAdmin = async (req, res, next) => {
  try {
    const userId = req.headers['user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== 'institute') {
      return res.status(403).json({ error: 'Institute admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Get student's applications
router.get('/my-applications', requireStudent, async (req, res) => {
  try {
    const applications = await Application.findByStudent(req.user.id);
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create application (Student only)
router.post('/', requireStudent, async (req, res) => {
  try {
    const { courseId, documents, notes } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    // Get course details
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if course is active
    if (course.status !== 'active') {
      return res.status(400).json({ error: 'Course is not available for applications' });
    }

    // Check qualification requirements
    const studentQualifications = req.user.studentData?.qualifications || [];
    if (!course.meetsRequirements(studentQualifications)) {
      return res.status(400).json({ error: 'You do not meet the qualification requirements for this course' });
    }

    // Check application limit (max 2 per institution)
    const canApply = await Application.canStudentApply(req.user.id, course.institutionId);
    if (!canApply) {
      return res.status(400).json({ error: 'You can only apply for a maximum of 2 courses per institution' });
    }

    // Check if already applied for this course
    const existingApplications = await Application.findByStudent(req.user.id);
    const alreadyApplied = existingApplications.some(app =>
      app.courseId === courseId && ['pending', 'approved', 'admitted'].includes(app.status)
    );

    if (alreadyApplied) {
      return res.status(400).json({ error: 'You have already applied for this course' });
    }

    const applicationData = {
      studentId: req.user.id,
      courseId,
      institutionId: course.institutionId,
      documents: documents || [],
      notes: notes || '',
      status: 'pending'
    };

    const application = await Application.create(applicationData);
    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update application (Student only - limited fields)
router.put('/:id', requireStudent, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.studentId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this application' });
    }

    // Only allow updates to documents and notes for pending applications
    if (application.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot update application that is not pending' });
    }

    const { documents, notes } = req.body;
    const updateData = {};

    if (documents !== undefined) updateData.documents = documents;
    if (notes !== undefined) updateData.notes = notes;

    const updatedApplication = await application.update(updateData);
    res.json(updatedApplication);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete application (Student only)
router.delete('/:id', requireStudent, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.studentId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this application' });
    }

    // Only allow deletion of pending applications
    if (application.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot delete application that is not pending' });
    }

    await application.delete();
    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve application (Institute admin only)
router.put('/:id/approve', requireInstituteAdmin, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Check if user is admin of the institution
    const institution = await Institution.findById(application.institutionId);
    if (!institution || institution.adminId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to approve applications for this institution' });
    }

    const updatedApplication = await application.update({
      status: 'approved',
      reviewDate: new Date()
    });
    res.json(updatedApplication);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject application (Institute admin only)
router.put('/:id/reject', requireInstituteAdmin, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Check if user is admin of the institution
    const institution = await Institution.findById(application.institutionId);
    if (!institution || institution.adminId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to reject applications for this institution' });
    }

    const updatedApplication = await application.update({
      status: 'rejected',
      reviewDate: new Date()
    });
    res.json(updatedApplication);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admit student (Institute admin only)
router.put('/:id/admit', requireInstituteAdmin, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Check if user is admin of the institution
    const institution = await Institution.findById(application.institutionId);
    if (!institution || institution.adminId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to admit students for this institution' });
    }

    // Check if student is already admitted to another course in this institution
    const studentApplications = await Application.findByStudent(application.studentId);
    const admittedInInstitution = studentApplications.some(app =>
      app.institutionId === application.institutionId &&
      app.status === 'admitted' &&
      app.id !== application.id
    );

    if (admittedInInstitution) {
      return res.status(400).json({ error: 'Student is already admitted to another course in this institution' });
    }

    const admittedApplication = await Application.admitStudent(req.params.id);
    res.json(admittedApplication);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
