const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Contractor, Project, Payment, Bid } = require('../models');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const notifier = require('../utils/notifier');
const auditLogger = require('../utils/auditLogger');
const upload = require('../utils/uploader');

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
    organizationName, 
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

// Get comprehensive profile with activity stats and completeness score
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [Contractor]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    let stats = {
      projectsCount: 0,
      completedProjectsCount: 0,
      bidsCount: 0,
      paymentsRequested: 0,
      paymentsReleased: 0,
      totalAmountEarned: 0
    };

    if (user.Contractor) {
      const contractorId = user.Contractor.id;
      const [projectsCount, completedCount, bidsCount, payments] = await Promise.all([
        Project.count({ where: { contractorId } }).catch(() => 0),
        Project.count({ where: { contractorId, status: 'completed' } }).catch(() => 0),
        Bid.count({ where: { contractorId } }).catch(() => 0),
        Payment.findAll({ where: { contractorId } }).catch(() => [])
      ]);

      let requested = 0;
      let released = 0;
      let earned = 0;
      payments.forEach(p => {
        if (p.status === 'requested') requested += 1;
        if (p.status === 'released') {
          released += 1;
          earned += parseFloat(p.amount || 0);
        }
      });

      stats = {
        projectsCount,
        completedProjectsCount: completedCount,
        bidsCount,
        paymentsRequested: requested,
        paymentsReleased: released,
        totalAmountEarned: earned
      };
    }

    // Calculate profile completeness score (0 to 100)
    let completeness = 30; // base account
    if (user.firstName && user.lastName) completeness += 15;
    if (user.phone) completeness += 10;
    if (user.Contractor) {
      if (user.Contractor.gstNumber) completeness += 15;
      if (user.Contractor.panNumber) completeness += 10;
      if (user.Contractor.technicalCapacity) completeness += 10;
      if (user.Contractor.verificationDocument) completeness += 10;
    } else if (user.organizationName) {
      completeness += 30;
    }
    completeness = Math.min(100, completeness);

    res.json({
      ...user.toJSON(),
      stats,
      completeness
    });
  } catch (err) {
    console.error('Fetch profile error:', err);
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// Update personal user profile
router.put('/profile', authenticateToken, async (req, res) => {
  const { firstName, lastName, phone, organizationName } = req.body;

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (firstName !== undefined) user.firstName = firstName.trim();
    if (lastName !== undefined) user.lastName = lastName.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (organizationName !== undefined) user.organizationName = organizationName.trim();

    await user.save();

    await auditLogger.log({
      userId: user.id,
      action: 'PROFILE_UPDATED',
      entityType: 'user',
      entityId: user.id,
      details: { firstName, lastName, phone },
      req
    });

    res.json({
      message: 'Personal profile updated successfully.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        organizationName: user.organizationName,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Update Contractor business profile & compliance details
router.put('/profile/contractor', authenticateToken, async (req, res) => {
  const {
    companyName,
    gstNumber,
    panNumber,
    registrationNumber,
    technicalCapacity,
    address,
    city,
    state,
    pincode,
    yearsOfExperience
  } = req.body;

  try {
    let contractor = await Contractor.findOne({ where: { userId: req.user.id } });
    if (!contractor) {
      return res.status(404).json({ error: 'Contractor profile not found for this account.' });
    }

    if (companyName) contractor.companyName = companyName.trim();
    if (gstNumber !== undefined) contractor.gstNumber = gstNumber.trim().toUpperCase();
    if (panNumber !== undefined) contractor.panNumber = panNumber.trim().toUpperCase();
    if (registrationNumber) contractor.registrationNumber = registrationNumber.trim();
    if (technicalCapacity !== undefined) contractor.technicalCapacity = technicalCapacity.trim();
    if (address !== undefined) contractor.address = address.trim();
    if (city !== undefined) contractor.city = city.trim();
    if (state !== undefined) contractor.state = state.trim();
    if (pincode !== undefined) contractor.pincode = pincode.trim();
    if (yearsOfExperience !== undefined) contractor.yearsOfExperience = Number(yearsOfExperience) || 0;

    await contractor.save();

    await auditLogger.log({
      userId: req.user.id,
      action: 'CONTRACTOR_PROFILE_UPDATED',
      entityType: 'contractor',
      entityId: contractor.id,
      details: { companyName, gstNumber, panNumber },
      req
    });

    res.json({
      message: 'Contractor business credentials updated successfully.',
      contractor
    });
  } catch (err) {
    console.error('Update contractor profile error:', err);
    res.status(500).json({ error: 'Failed to update contractor credentials.' });
  }
});

// Upload verification documents or certificates
router.post('/profile/upload-doc', authenticateToken, upload.single('document'), async (req, res) => {
  const { title = 'Compliance Document', certificateType = 'Certificate' } = req.body;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document file provided.' });
    }

    const documentPath = `/uploads/${req.file.filename}`;
    const contractor = await Contractor.findOne({ where: { userId: req.user.id } });

    if (contractor) {
      const currentCertificates = Array.isArray(contractor.certificates) ? [...contractor.certificates] : [];
      const newCert = {
        id: `cert-${Date.now()}`,
        title,
        type: certificateType,
        path: documentPath,
        filename: req.file.originalname,
        uploadedAt: new Date().toISOString(),
        status: 'verified'
      };

      currentCertificates.push(newCert);
      contractor.certificates = currentCertificates;
      contractor.verificationDocument = documentPath;
      await contractor.save();

      res.json({
        message: 'Document uploaded successfully.',
        certificate: newCert,
        contractor
      });
    } else {
      res.json({
        message: 'Document uploaded successfully.',
        path: documentPath
      });
    }
  } catch (err) {
    console.error('Upload document error:', err);
    res.status(500).json({ error: 'Failed to upload document.' });
  }
});

// Update password securely
router.put('/profile/password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password does not match.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await auditLogger.log({
      userId: user.id,
      action: 'PASSWORD_CHANGED',
      entityType: 'user',
      entityId: user.id,
      details: { email: user.email },
      req
    });

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Password update error:', err);
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

module.exports = router;
