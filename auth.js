const express = require('express');
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, signOut } = require('firebase/auth');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCmmz1rqEFZ4-H8ysLQe2JkdXvtZS9aTwU",
  authDomain: "career-lesotho.firebaseapp.com",
  projectId: "career-lesotho",
  storageBucket: "career-lesotho.firebasestorage.app",
  messagingSenderId: "930311954012",
  appId: "1:930311954012:web:019c8312d4ba9f25ebd099",
  measurementId: "G-DGZSXYKC9K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const User = require('../models/User');
const Institution = require('../models/Institution');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, phone, institutionName, location } = req.body;

    // Validate required fields
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }

    if (role === 'institute' && (!institutionName || !location)) {
      return res.status(400).json({ error: 'Institution name and location are required for institute role' });
    }

    if (role !== 'institute' && (!firstName || !lastName)) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    // Validate role
    const validRoles = ['admin', 'institute', 'student', 'company'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Skip email verification in development mode to avoid rate limits
    if (process.env.NODE_ENV !== 'development') {
      await sendEmailVerification(firebaseUser);
    }

    // Create user in Firestore
    const userData = {
      email,
      firstName: role === 'institute' ? institutionName : firstName,
      lastName: role === 'institute' ? location : lastName,
      role,
      phone: phone || '',
      isVerified: false,
      profileComplete: false
    };

    // Add role-specific data
    if (role === 'student') {
      userData.studentData = {
        qualifications: [],
        experience: [],
        skills: [],
        certificates: [],
        transcripts: []
      };
    } else if (role === 'institute') {
      userData.instituteData = {
        institutionId: null,
        department: ''
      };
    } else if (role === 'company') {
      userData.companyData = {
        companyName: '',
        industry: '',
        companySize: '',
        website: ''
      };
    }

    const user = await User.create(userData);

    // If role is institute, create institution
    if (role === 'institute') {
      const institutionData = {
        name: firstName,
        location: lastName,
        contactEmail: email,
        contactPhone: phone,
        adminId: user.id,
        status: 'pending'
      };
      const institution = await Institution.create(institutionData);

      // Update user with institution ID
      await user.update({
        instituteData: { ...user.instituteData, institutionId: institution.id }
      });
    }

    res.status(201).json({
      message: 'User registered successfully. Please check your email for verification.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);

    // Handle Firebase Auth errors
    if (error.code === 'auth/email-already-in-use') {
      return res.status(400).json({ error: 'Email already in use' });
    } else if (error.code === 'auth/weak-password') {
      return res.status(400).json({ error: 'Password should be at least 6 characters' });
    } else if (error.code === 'auth/invalid-email') {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Get user from Firestore
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Skip email verification check in development mode to avoid rate limits
    if (process.env.NODE_ENV !== 'development' && !firebaseUser.emailVerified) {
      return res.status(403).json({ error: 'Please verify your email before logging in' });
    }

    // Update verification status
    if (!user.isVerified) {
      await user.update({ isVerified: true });
    }

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: true,
        profileComplete: user.profileComplete
      }
    });
  } catch (error) {
    console.error('Login error:', error);

    // Handle Firebase Auth errors
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      return res.status(401).json({ error: 'Invalid email or password' });
    } else if (error.code === 'auth/too-many-requests') {
      return res.status(429).json({ error: 'Too many failed login attempts. Try again later.' });
    }

    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout user
router.post('/logout', async (req, res) => {
  try {
    await signOut(auth);
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user in Firestore
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get Firebase user and resend verification
    const firebaseUser = auth.currentUser;
    if (firebaseUser && firebaseUser.email === email) {
      await sendEmailVerification(firebaseUser);
      res.json({ message: 'Verification email sent' });
    } else {
      res.status(400).json({ error: 'Unable to send verification email' });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

module.exports = router;
