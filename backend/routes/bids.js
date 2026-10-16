const express = require('express');
const router = express.Router();
const { Bid, Tender, Contractor, User } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const upload = require('../utils/uploader');
const notifier = require('../utils/notifier');

// Submit a Bid (Contractor only, requires profile verification)
router.post('/', authenticateToken, requireRole('contractor'), upload.single('document'), async (req, res) => {
  const { tenderId, price, duration, technicalProposal } = req.body;

  try {
    // 1. Verify contractor status
    const contractor = await Contractor.findByPk(req.user.contractorId);
    if (!contractor) {
      return res.status(404).json({ error: 'Contractor profile not found.' });
    }

    if (contractor.verificationStatus !== 'verified') {
      return res.status(403).json({ error: 'Access Denied. Only verified contractors can submit bids. Please check your verification status.' });
    }

    // 2. Verify tender exists and is open
    const tender = await Tender.findByPk(tenderId);
    if (!tender) {
      return res.status(404).json({ error: 'Tender not found.' });
    }

    if (['awarded', 'closed'].includes(tender.status)) {
      return res.status(400).json({ error: 'This tender is closed for new bids.' });
    }

    if (new Date() > new Date(tender.deadline)) {
      return res.status(400).json({ error: 'Submissions are closed. The deadline has passed.' });
    }

    // Check if contractor already submitted a bid for this tender
    const existingBid = await Bid.findOne({
      where: { tenderId, contractorId: contractor.id }
    });

    if (existingBid) {
      return res.status(400).json({ error: 'You have already submitted a bid for this tender. Multi-bid submissions are not permitted.' });
    }

    const documentPath = req.file ? `/uploads/${req.file.filename}` : null;

    const bid = await Bid.create({
      tenderId: parseInt(tenderId),
      contractorId: contractor.id,
      price: parseFloat(price),
      duration: parseInt(duration),
      technicalProposal,
      documentPath,
      status: 'submitted'
    });

    // Alert Contractor
    await notifier.sendEmail(
      req.user.email,
      `Bid Submitted Successfully: ${tender.title}`,
      `Your bid proposal of $${price} has been received. You can track the tender's evaluation status in the portal dashboard.`
    );

    res.status(201).json({
      message: 'Bid submitted successfully.',
      bid
    });

  } catch (err) {
    console.error('Bid submission error:', err);
    res.status(500).json({ error: 'Failed to submit bid.' });
  }
});

// List bids for a Tender
// - Admin sees all bids
// - Contractor sees only their own bid
router.get('/tender/:tenderId', authenticateToken, async (req, res) => {
  const { tenderId } = req.params;

  try {
    const tender = await Tender.findByPk(tenderId);
    if (!tender) {
      return res.status(404).json({ error: 'Tender not found.' });
    }

    let bids;
    if (req.user.role === 'admin' || req.user.role === 'organization') {
      bids = await Bid.findAll({
        where: { tenderId },
        include: [{ model: Contractor }]
      });
    } else {
      bids = await Bid.findAll({
        where: { tenderId, contractorId: req.user.contractorId },
        include: [{ model: Contractor }]
      });
    }

    res.json(bids);

  } catch (err) {
    console.error('Fetch bids error:', err);
    res.status(500).json({ error: 'Failed to fetch bids.' });
  }
});

// Compare bids and calculate rankings (Organization & Admin)
router.get('/tender/:tenderId/compare', authenticateToken, requireRole(['organization', 'admin']), async (req, res) => {
  const { tenderId } = req.params;

  try {
    const tender = await Tender.findByPk(tenderId);
    if (!tender) {
      return res.status(404).json({ error: 'Tender not found.' });
    }

    const bids = await Bid.findAll({
      where: { tenderId },
      include: [{ model: Contractor, include: [User] }]
    });

    if (bids.length === 0) {
      return res.json({
        stats: {
          minPrice: 0,
          maxPrice: 0,
          avgPrice: 0,
          bidCount: 0,
          estimatedBudget: tender.estimatedBudget
        },
        rankings: []
      });
    }

    // Extract values for calculations
    const prices = bids.map(b => parseFloat(b.price));
    const durations = bids.map(b => parseInt(b.duration));

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((acc, p) => acc + p, 0) / prices.length;

    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    // Calculate scores and details
    let rankedBids = bids.map(bid => {
      const bidPrice = parseFloat(bid.price);
      const bidDuration = parseInt(bid.duration);

      // Price Score (70% weight): Ratio of lowest price compared to current price
      const priceScore = (minPrice / bidPrice) * 70;

      // Duration Score (30% weight): Ratio of fastest duration compared to current duration
      const durationScore = (minDuration / bidDuration) * 30;

      const totalScore = priceScore + durationScore;

      const budget = parseFloat(tender.estimatedBudget);
      const budgetDeviation = ((bidPrice - budget) / budget) * 100;

      return {
        id: bid.id,
        price: bidPrice,
        duration: bidDuration,
        technicalProposal: bid.technicalProposal,
        documentPath: bid.documentPath,
        status: bid.status,
        contractor: {
          id: bid.Contractor.id,
          companyName: bid.Contractor.companyName,
          registrationNumber: bid.Contractor.registrationNumber,
          email: bid.Contractor.User ? bid.Contractor.User.email : null
        },
        scores: {
          priceScore: parseFloat(priceScore.toFixed(2)),
          durationScore: parseFloat(durationScore.toFixed(2)),
          totalScore: parseFloat(totalScore.toFixed(2))
        },
        budgetDeviation: parseFloat(budgetDeviation.toFixed(2)),
        isCheapest: bidPrice === minPrice,
        isFastest: bidDuration === minDuration
      };
    });

    // Sort by Total Score DESC
    rankedBids.sort((a, b) => b.scores.totalScore - a.scores.totalScore);

    // Update the database records with computed scores
    for (const rb of rankedBids) {
      await Bid.update(
        { score: rb.scores.totalScore },
        { where: { id: rb.id } }
      );
    }

    res.json({
      stats: {
        minPrice,
        maxPrice,
        avgPrice: parseFloat(avgPrice.toFixed(2)),
        bidCount: bids.length,
        estimatedBudget: parseFloat(tender.estimatedBudget)
      },
      rankings: rankedBids
    });

  } catch (err) {
    console.error('Bid comparison error:', err);
    res.status(500).json({ error: 'Failed to run bid comparison.' });
  }
});

module.exports = router;
