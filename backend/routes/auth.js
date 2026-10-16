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
  const { 
    email, 
    password, 
    role, 
    firstName, 
    lastName, 
    fullName, 
    phone, 
    companyName, 
    registrationNumber, 
    technicalCapacity 
  } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    // Split fullName if firstName/lastName not provided
    let derivedFirstName = firstName;
    let derivedLastName = lastName;
    if (fullName && !derivedFirstName) {
      const parts = fullName.trim().split(/\s+/);
      derivedFirstName = parts[0] || '';
      derivedLastName = parts.slice(1).join(' ') || '';
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if role is admin vs organization vs contractor
    const isSystemAdmin = role === 'admin' || role === 'super_admin';
    const initialApproval = isSystemAdmin ? 'approved' : 'pending';

    const resolvedOrgName = role === 'organization' 
      ? (organizationName || companyName || (fullName ? `${fullName} Authority` : `${email.split('@')[0]} Department`))
      : null;

    const resolvedRegNo = registrationNumber || (
      role === 'organization' 
        ? `ORG-${Math.floor(100000 + Math.random() * 900000)}` 
        : `REG-${Math.floor(100000 + Math.random() * 900000)}`
    );

    // Create user with full User table schema
    const user = await User.create({
      email,
      password: hashedPassword,
      role: role || 'contractor',
      firstName: derivedFirstName || null,
      lastName: derivedLastName || null,
      phone: phone || null,
      organizationName: resolvedOrgName,
      registrationNumber: resolvedRegNo,
      approvalStatus: initialApproval,
      isActive: isSystemAdmin // pending accounts await admin activation
    });

    let contractor = null;

    // If role is contractor (Corporation / Builder), create profile
    if (user.role === 'contractor') {
      const resolvedCompany = companyName || (fullName ? `${fullName} Enterprises` : `${email.split('@')[0]} Enterprises`);

      contractor = await Contractor.create({
        userId: user.id,
        companyName: resolvedCompany,
        registrationNumber: resolvedRegNo,
        technicalCapacity: technicalCapacity || 'General Civil & Commercial Procurement Contractor',
        verificationStatus: 'pending'
      });

      // Send Mock Notification
      await notifier.sendEmail(
        user.email,
        'Registration Submitted - Pending Administrator Approval',
        `Your contractor registration for ${resolvedCompany} (Reg No: ${resolvedRegNo}) has been submitted. The platform administrator will review your credentials and approve your access shortly.`
      );
    } else if (user.role === 'organization') {
      // Send Mock Notification for Organization
      await notifier.sendEmail(
        user.email,
        'Organization Registration Submitted - Pending Approval',
        `Your organization registration for ${resolvedOrgName} (ID: ${resolvedRegNo}) has been received. The administrator will review your authorization request and approve your access shortly.`
      );
    }

    res.status(201).json({
      message: isSystemAdmin 
        ? 'Admin account created successfully.' 
        : 'Registration submitted successfully. Your account is pending Administrator review and approval.',
      approvalStatus: user.approvalStatus,
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        approvalStatus: user.approvalStatus,
        organizationName: user.organizationName
      }
    });

    // Audit log (after response)
    await auditLogger.log({
      userId: user.id,
      action: auditLogger.ACTIONS.REGISTER,
      entityType: 'user',
      entityId: user.id,
      details: { email: user.email, role: user.role, approvalStatus: user.approvalStatus },
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

    // Role-based approval check: Corporations/Builders & Organizations require Admin Approval
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      if (user.approvalStatus === 'pending') {
        return res.status(403).json({ 
          error: 'Your account is pending Administrator approval. Access will be authorized once the administrator reviews your credentials.', 
          approvalStatus: 'pending' 
        });
      }

      if (user.approvalStatus === 'rejected') {
        return res.status(403).json({ 
          error: `Your registration request was rejected by the administrator. ${user.approvalNotes ? `Reason: ${user.approvalNotes}` : 'Please contact administrator for details.'}`, 
          approvalStatus: 'rejected' 
        });
      }
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
        approvalStatus: user.approvalStatus,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        organizationName: user.organizationName,
        registrationNumber: user.registrationNumber,
        contractorId: user.Contractor ? user.Contractor.id : null,
        verificationStatus: user.Contractor ? user.Contractor.verificationStatus : null,
        companyName: user.Contractor ? user.Contractor.companyName : user.organizationName
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

// Admin: List all pending and managed authorization requests
router.get('/approval-requests', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }

    const users = await User.findAll({
      where: {
        role: ['contractor', 'organization', 'engineer']
      },
      include: [Contractor],
      order: [['createdAt', 'DESC']]
    });

    const pending = users.filter(u => u.approvalStatus === 'pending');
    const approved = users.filter(u => u.approvalStatus === 'approved');
    const rejected = users.filter(u => u.approvalStatus === 'rejected');

    res.json({
      summary: {
        totalPending: pending.length,
        totalApproved: approved.length,
        totalRejected: rejected.length,
        totalUsers: users.length
      },
      pending,
      approved,
      rejected,
      all: users
    });
  } catch (err) {
    console.error('Fetch approval requests error:', err);
    res.status(500).json({ error: 'Failed to retrieve authorization requests.' });
  }
});

// Admin: Approve user login & authorization request
router.post('/approve-user/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }

    const user = await User.findByPk(req.params.id, { include: [Contractor] });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    user.approvalStatus = 'approved';
    user.approvedAt = new Date();
    user.approvedBy = req.user.id;
    user.isActive = true;
    user.approvalNotes = req.body.notes || 'Credentials and entity registration verified by Administrator.';
    await user.save();

    // If contractor, also set contractor profile verificationStatus to verified
    if (user.Contractor) {
      user.Contractor.verificationStatus = 'verified';
      await user.Contractor.save();
    }

    // Send confirmation email to user
    await notifier.sendEmail(
      user.email,
      'Account Authorized - TenderBridge Access Approved',
      `Congratulations! Your ${user.role === 'organization' ? 'Organization' : 'Contractor / Builder'} account for ${user.organizationName || user.Contractor?.companyName || user.email} has been approved by the Administrator. You can now log in and access the platform.`
    );

    res.json({
      message: `Account for ${user.email} successfully approved and authorized.`,
      user
    });

  } catch (err) {
    console.error('Approve user error:', err);
    res.status(500).json({ error: 'Failed to approve user.' });
  }
});

// Admin: Reject user login & authorization request
router.post('/reject-user/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }

    const user = await User.findByPk(req.params.id, { include: [Contractor] });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    user.approvalStatus = 'rejected';
    user.approvalNotes = req.body.notes || 'Verification requirements not satisfied.';
    user.isActive = false;
    await user.save();

    if (user.Contractor) {
      user.Contractor.verificationStatus = 'rejected';
      await user.Contractor.save();
    }

    await notifier.sendEmail(
      user.email,
      'Account Authorization Update - Request Not Approved',
      `Your account authorization request could not be approved at this time. Reason: ${user.approvalNotes}. You may contact the administrator for further details.`
    );

    res.json({
      message: `Account for ${user.email} has been rejected.`,
      user
    });

  } catch (err) {
    console.error('Reject user error:', err);
    res.status(500).json({ error: 'Failed to reject user.' });
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
