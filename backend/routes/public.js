const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Tender } = require('../models');

/**
 * Public endpoints (no authentication required).
 * Used by the marketing/landing page so anyone can browse published
 * opportunities without creating an account.
 */

// List published tenders for public browsing
router.get('/tenders', async (req, res) => {
  const { category, search, limit } = req.query;

  const whereClause = {
    status: { [Op.in]: ['published', 'under_evaluation'] }
  };

  if (category) {
    whereClause.category = category;
  }

  if (search) {
    whereClause.title = { [Op.like]: `%${search}%` };
  }

  const maxLimit = Math.min(parseInt(limit, 10) || 12, 50);

  try {
    const tenders = await Tender.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: maxLimit
    });
    res.json(tenders);
  } catch (err) {
    console.error('Public tenders fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch tenders.' });
  }
});

module.exports = router;
