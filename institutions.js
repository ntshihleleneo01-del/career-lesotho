const express = require('express');
const Institution = require('../models/Institution');
const User = require('../models/User');
const Course = require('../models/Course');
const Application = require('../models/Application');

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.headers['user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
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

// Get all institutions (Admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const institutions = await Institution.findAll();
    res.json(institutions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get institution by ID
router.get('/:id', async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' });
    }
    res.json(institution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create institution (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description, location, website, contactEmail, contactPhone, adminId } = req.body;

    if (!name || !location || !contactEmail || !adminId) {
      return res.status(400).json({ error: 'Name, location, contact email, and admin ID are required' });
    }

    // Check if admin user exists and is institute role
    const adminUser = await User.findById(adminId);
    if (!adminUser || adminUser.role !== 'institute') {
      return res.status(400).json({ error: 'Invalid admin user' });
    }

    const institutionData = {
      name,
      description,
      location,
      website,
      contactEmail,
      contactPhone,
      adminId,
      status: 'approved' // Auto-approve when created by admin
    };

    const institution = await Institution.create(institutionData);

    // Update user with institution ID
    await adminUser.update({
      instituteData: { ...adminUser.instituteData, institutionId: institution.id }
    });

    res.status(201).json(institution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update institution
router.put('/:id', requireInstituteAdmin, async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    // Check if user is admin of this institution
    if (institution.adminId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this institution' });
    }

    const updateData = req.body;
    delete updateData.id; // Prevent ID updates
    delete updateData.adminId; // Prevent admin ID updates
    delete updateData.createdAt; // Prevent timestamp updates

    const updatedInstitution = await institution.update(updateData);
    res.json(updatedInstitution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete institution (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    await institution.delete();
    res.json({ message: 'Institution deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve institution (Admin only)
router.put('/:id/approve', requireAdmin, async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    const updatedInstitution = await institution.update({ status: 'approved' });
    res.json(updatedInstitution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Suspend institution (Admin only)
router.put('/:id/suspend', requireAdmin, async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    const updatedInstitution = await institution.update({ status: 'suspended' });
    res.json(updatedInstitution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get institution courses
router.get('/:id/courses', async (req, res) => {
  try {
    const courses = await Course.findByInstitution(req.params.id);
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get institution applications (Institute admin only)
router.get('/:id/applications', requireInstituteAdmin, async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    if (institution.adminId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view applications for this institution' });
    }

    const applications = await Application.findByInstitution(req.params.id);
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
