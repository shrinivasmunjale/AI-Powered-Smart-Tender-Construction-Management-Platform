const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Tender, Bid, Contractor, User } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const upload = require('../utils/uploader');
const notifier = require('../utils/notifier');

// Create a new Tender (Admin only, supports document upload)
router.post('/', authenticateToken, requireRole('admin'), upload.single('document'), async (req, res) => {
  const { title, description, category, estimatedBudget, deadline, status } = req.body;

  try {
    const documentPath = req.file ? `/uploads/${req.file.filename}` : null;

    const tender = await Tender.create({
      title,
      description,
      category,
      estimatedBudget: parseFloat(estimatedBudget),
      deadline: new Date(deadline),
      status: status || 'draft',
      documentPath
    });

    // If published, trigger notifications for contractors
    if (tender.status === 'published') {
      const contractors = await Contractor.findAll({
        include: [{ model: User }]
      });

      for (const contractor of contractors) {
        if (contractor.User) {
          await notifier.sendEmail(
            contractor.User.email,
            `New Tender Published: ${tender.title}`,
            `A new tender under category "${tender.category}" has been published. Estimated budget is $${tender.estimatedBudget}. Submission deadline is ${tender.deadline}. Place your bid inside the contractor portal!`
          );
        }
      }
    }

    res.status(201).json({
      message: 'Tender created successfully.',
      tender
    });

  } catch (err) {
    console.error('Tender creation error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Failed to create tender.', details: err.message });
  }
});

// List all Tenders
router.get('/', authenticateToken, async (req, res) => {
  const { category, search } = req.query;
  
  const whereClause = {};

  // Filters for contractors: cannot see draft tenders
  if (req.user.role === 'contractor') {
    whereClause.status = { [Op.ne]: 'draft' };
  }

  if (category) {
    whereClause.category = category;
  }

  if (search) {
    whereClause.title = { [Op.like]: `%${search}%` };
  }

  try {
    const tenders = await Tender.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });
    res.json(tenders);
  } catch (err) {
    console.error('Fetch tenders error:', err);
    res.status(500).json({ error: 'Failed to fetch tenders.' });
  }
});

// Get a single Tender's details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const tender = await Tender.findByPk(req.params.id, {
      include: [
        {
          model: Bid,
          include: [{ model: Contractor }]
        },
        {
          model: Bid,
          as: 'AwardedBid',
          include: [{ model: Contractor }]
        }
      ]
    });

    if (!tender) {
      return res.status(404).json({ error: 'Tender not found.' });
    }

    // Safeguard draft tenders from contractors
    if (req.user.role === 'contractor' && tender.status === 'draft') {
      return res.status(403).json({ error: 'Forbidden. Draft tenders are hidden.' });
    }

    res.json(tender);
  } catch (err) {
    console.error('Fetch tender detail error:', err);
    res.status(500).json({ error: 'Failed to fetch tender details.' });
  }
});

// Update Tender status or details (Admin only)
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const { title, description, category, estimatedBudget, deadline, status } = req.body;

  try {
    const tender = await Tender.findByPk(req.params.id);
    if (!tender) {
      return res.status(404).json({ error: 'Tender not found.' });
    }

    const previousStatus = tender.status;

    if (title) tender.title = title;
    if (description) tender.description = description;
    if (category) tender.category = category;
    if (estimatedBudget) tender.estimatedBudget = parseFloat(estimatedBudget);
    if (deadline) tender.deadline = new Date(deadline);
    if (status) tender.status = status;

    await tender.save();

    // Alert contractors if tender was transition from Draft to Published
    if (previousStatus === 'draft' && status === 'published') {
      const contractors = await Contractor.findAll({
        include: [{ model: User }]
      });

      for (const contractor of contractors) {
        if (contractor.User) {
          await notifier.sendEmail(
            contractor.User.email,
            `New Tender Published: ${tender.title}`,
            `A new tender under category "${tender.category}" has been published. Estimated budget is $${tender.estimatedBudget}. Submission deadline is ${tender.deadline}. Place your bid inside the contractor portal!`
          );
        }
      }
    }

    res.json({
      message: 'Tender updated successfully.',
      tender
    });

  } catch (err) {
    console.error('Update tender error:', err);
    res.status(500).json({ error: 'Failed to update tender.' });
  }
});

// Award Tender to a Bid (Admin only)
router.post('/:id/award', authenticateToken, requireRole('admin'), async (req, res) => {
  const { bidId } = req.body;

  try {
    const tender = await Tender.findByPk(req.params.id);
    if (!tender) {
      return res.status(404).json({ error: 'Tender not found.' });
    }

    const winningBid = await Bid.findByPk(bidId, {
      include: [{ model: Contractor, include: [User] }]
    });

    if (!winningBid || winningBid.tenderId !== tender.id) {
      return res.status(400).json({ error: 'Invalid bid selected for this tender.' });
    }

    // Update status of tender and references
    tender.status = 'awarded';
    tender.awardedBidId = winningBid.id;
    await tender.save();

    // Update winning bid status
    winningBid.status = 'accepted';
    await winningBid.save();

    // Send Winner Notification
    await notifier.sendEmail(
      winningBid.Contractor.User.email,
      `Tender Awarded! ${tender.title}`,
      `Congratulations! Your bid of $${winningBid.price} for the tender "${tender.title}" has been accepted. We will coordinate contract execution shortly.`
    );
    await notifier.sendSMS(
      winningBid.Contractor.registrationNumber,
      `Tender Award: Congratulations! Your bid for "${tender.title}" was successful.`
    );

    // Update and notify runner-up bids
    const losingBids = await Bid.findAll({
      where: {
        tenderId: tender.id,
        id: { [Op.ne]: winningBid.id }
      },
      include: [{ model: Contractor, include: [User] }]
    });

    for (const lostBid of losingBids) {
      lostBid.status = 'rejected';
      await lostBid.save();

      await notifier.sendEmail(
        lostBid.Contractor.User.email,
        `Tender Evaluation Completed: ${tender.title}`,
        `Thank you for submitting your bid for "${tender.title}". The tender evaluation is complete, and another contractor has been awarded the contract. We hope to see your proposals on future tenders.`
      );
    }

    res.json({
      message: 'Tender successfully awarded.',
      tender
    });

  } catch (err) {
    console.error('Award tender error:', err);
    res.status(500).json({ error: 'Failed to award tender.' });
  }
});

module.exports = router;
