const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Contractor } = require('../models');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const notifier = require('../utils/notifier');
const auditLogger = require('../utils/auditLogger');

// Register a User (or Contractor)
router.post('/register', async (req, res) => {
  const { email, password, role, companyName, registrationNumber, technicalCapacity } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      role: role || 'contractor'
    });

    let contractor = null;

    // If role is contractor, create profile
    if (user.role === 'contractor') {
      if (!companyName || !registrationNumber) {
        // Rollback user creation
        await user.destroy();
        return res.status(400).json({ error: 'Company Name and Registration Number are required for contractors.' });
      }

      contractor = await Contractor.create({
        userId: user.id,
        companyName,
        registrationNumber,
        technicalCapacity: technicalCapacity || '',
        verificationStatus: 'pending'
      });

      // Send Mock Notification
      await notifier.sendEmail(
        user.email,
        'Welcome to TenderBridge!',
        `Your contractor profile for ${companyName} has been created. Please upload your verification documents in the portal to begin bidding.`
      );
    }

    res.status(201).json({
      message: 'Registration successful.',
      user: { id: user.id, email: user.email, role: user.role }
    });

    // Audit log (after response)
    await auditLogger.log({
      userId: user.id,
      action: auditLogger.ACTIONS.REGISTER,
      entityType: 'user',
      entityId: user.id,
      details: { email: user.email, role: user.role },
      req
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'An error occurred during registration.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({
      where: { email },
      include: [Contractor]
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate Token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        contractorId: user.Contractor ? user.Contractor.id : null,
        verificationStatus: user.Contractor ? user.Contractor.verificationStatus : null,
        companyName: user.Contractor ? user.Contractor.companyName : null
      }
    });

    // Audit log (after response)
    await auditLogger.log({
      userId: user.id,
      action: auditLogger.ACTIONS.LOGIN,
      entityType: 'user',
      entityId: user.id,
      details: { email: user.email, role: user.role },
      req
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'An error occurred during login.' });
  }
});

// Get profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [Contractor]
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

module.exports = router;
