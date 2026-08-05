const express = require('express');
const router = express.Router();
const { Contractor, User } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const upload = require('../utils/uploader');
const notifier = require('../utils/notifier');

// Contractor uploads verification document
router.put('/upload-docs', authenticateToken, requireRole('contractor'), upload.single('verificationDoc'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No verification document provided.' });
    }

    const contractor = await Contractor.findByPk(req.user.contractorId);
    if (!contractor) {
      return res.status(404).json({ error: 'Contractor profile not found.' });
    }

    contractor.verificationDocument = `/uploads/${req.file.filename}`;
    contractor.verificationStatus = 'pending'; // Reset status to pending when a new document is uploaded
    await contractor.save();

    res.json({
      message: 'Verification document uploaded successfully.',
      verificationDocument: contractor.verificationDocument,
      verificationStatus: contractor.verificationStatus
    });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload verification document.' });
  }
});

// Admin lists all contractors
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const contractors = await Contractor.findAll({
      include: [{ model: User, attributes: ['email'] }]
    });
    res.json(contractors);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve contractors list.' });
  }
});

// Admin approves/rejects contractor verification
router.put('/:id/verify', authenticateToken, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'verified' or 'rejected'

  if (!['verified', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be "verified" or "rejected".' });
  }

  try {
    const contractor = await Contractor.findByPk(id, {
      include: [{ model: User }]
    });

    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found.' });
    }

    contractor.verificationStatus = status;
    await contractor.save();

    // Trigger Notification to contractor user
    const subject = status === 'verified' ? 'Profile Verified!' : 'Profile Verification Rejected';
    const body = status === 'verified'
      ? `Congratulations! Your contractor profile has been verified. You can now place active bids on available tenders.`
      : `We were unable to verify your contractor credentials. Please review your uploaded licensing/tax paperwork and submit again.`;

    await notifier.sendEmail(contractor.User.email, subject, body);
    await notifier.sendSMS(contractor.registrationNumber, `TenderBridge Status Alert: Your registration has been ${status}.`);

    res.json({
      message: `Contractor has been successfully ${status}.`,
      contractor
    });

  } catch (err) {
    console.error('Verification status update error:', err);
    res.status(500).json({ error: 'Failed to update contractor status.' });
  }
});

module.exports = router;
