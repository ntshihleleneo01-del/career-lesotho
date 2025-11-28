const express = require('express');
const Course = require('../models/Course');
const Institution = require('../models/Institution');
const User = require('../models/User');

const router = express.Router();

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

// Get all courses (public)
router.get('/', async (req, res) => {
  try {
    const { institutionId, facultyId } = req.query;
    let courses = [];

    if (institutionId) {
      courses = await Course.findByInstitution(institutionId);
    } else if (facultyId) {
      courses = await Course.findByFaculty(facultyId);
    } else {
      // Get all courses (this might be inefficient for large datasets)
      const coursesSnapshot = await require('../firebase-admin').db.collection('courses').get();
      courses = coursesSnapshot.docs.map(doc => new Course({ id: doc.id, ...doc.data() }));
    }

    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get course by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create course (Institute admin only)
router.post('/', requireInstituteAdmin, async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      facultyId,
      institutionId,
      duration,
      qualificationLevel,
      minimumRequirements,
      fees,
      capacity
    } = req.body;

    if (!name || !code || !facultyId || !institutionId || !duration || !qualificationLevel) {
      return res.status(400).json({ error: 'Name, code, faculty ID, institution ID, duration, and qualification level are required' });
    }

    // Check if institution exists and user is admin
    const institution = await Institution.findById(institutionId);
    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    if (institution.adminId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to create courses for this institution' });
    }

    const courseData = {
      name,
      code,
      description,
      facultyId,
      institutionId,
      duration,
      qualificationLevel,
      minimumRequirements: minimumRequirements || {},
      fees: fees || {},
      capacity: capacity || 0,
      status: 'active'
    };

    const course = await Course.create(courseData);
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update course (Institute admin only)
router.put('/:id', requireInstituteAdmin, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if user is admin of the institution that owns this course
    const institution = await Institution.findById(course.institutionId);
    if (!institution || institution.adminId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this course' });
    }

    const updateData = req.body;
    delete updateData.id; // Prevent ID updates
    delete updateData.institutionId; // Prevent institution ID updates
    delete updateData.createdAt; // Prevent timestamp updates

    const updatedCourse = await course.update(updateData);
    res.json(updatedCourse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete course (Institute admin only)
router.delete('/:id', requireInstituteAdmin, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if user is admin of the institution that owns this course
    const institution = await Institution.findById(course.institutionId);
    if (!institution || institution.adminId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this course' });
    }

    await course.delete();
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if student qualifies for course
router.post('/:id/check-qualification', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const { studentQualifications } = req.body;
    if (!studentQualifications) {
      return res.status(400).json({ error: 'Student qualifications are required' });
    }

    const qualifies = course.meetsRequirements(studentQualifications);
    res.json({ qualifies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get course applications (Institute admin only)
router.get('/:id/applications', requireInstituteAdmin, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if user is admin of the institution that owns this course
    const institution = await Institution.findById(course.institutionId);
    if (!institution || institution.adminId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view applications for this course' });
    }

    const applications = await course.getApplications();
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
