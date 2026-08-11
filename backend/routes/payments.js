const express = require('express');
const router = express.Router();
const { Payment, Project, Contractor, User } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const auditLogger = require('../utils/auditLogger');
const upload = require('../utils/uploader');

// Get all payments (with filters)
router.get('/', authenticateToken, async (req, res) => {
  const { status, contractorId, projectId } = req.query;
  
  try {
    const whereClause = {};
    
    if (status) whereClause.status = status;
    if (projectId) whereClause.projectId = projectId;
    
    // Contractors can only see their own payments
    if (req.user.role === 'contractor') {
      whereClause.contractorId = req.user.contractorId;
    } else if (contractorId) {
      whereClause.contractorId = contractorId;
    }
    
    const payments = await Payment.findAll({
      where: whereClause,
      include: [
        {
          model: Project,
          attributes: ['name', 'department']
        },
        {
          model: Contractor,
          attributes: ['companyName', 'registrationNumber']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(payments);
  } catch (err) {
    console.error('Fetch payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payments.' });
  }
});

// Get single payment
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [
        {
          model: Project,
          attributes: ['name', 'department', 'budget']
        },
        {
          model: Contractor,
          include: [{ model: User, attributes: ['email'] }]
        }
      ]
    });
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found.' });
    }
    
    // Contractors can only view their own payments
    if (req.user.role === 'contractor' && payment.contractorId !== req.user.contractorId) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    
    res.json(payment);
  } catch (err) {
    console.error('Fetch payment error:', err);
    res.status(500).json({ error: 'Failed to fetch payment.' });
  }
});

// Request payment (Contractor)
router.post('/request', authenticateToken, requireRole('contractor'), async (req, res) => {
  const { projectId, amount, paymentType, description } = req.body;
  
  try {
    if (!req.user.contractorId) {
      return res.status(400).json({ error: 'Contractor profile not found.' });
    }
    
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    
    if (project.contractorId !== req.user.contractorId) {
      return res.status(403).json({ error: 'You are not assigned to this project.' });
    }
    
    const payment = await Payment.create({
      projectId,
      contractorId: req.user.contractorId,
      amount,
      paymentType,
      description,
      status: 'requested',
      taxAmount: parseFloat(amount) * 0.18 // 18% GST
    });
    
    // Audit log
    await auditLogger.log({
      userId: req.user.id,
      action: auditLogger.ACTIONS.PAYMENT_REQUESTED,
      entityType: 'payment',
      entityId: payment.id,
      details: { amount, paymentType, projectId },
      req
    });
    
    res.status(201).json({
      message: 'Payment request submitted successfully.',
      payment
    });
  } catch (err) {
    console.error('Payment request error:', err);
    res.status(500).json({ error: 'Failed to submit payment request.' });
  }
});

// Approve payment (Engineer)
router.put('/:id/engineer-approve', authenticateToken, requireRole(['engineer', 'project_manager']), async (req, res) => {
  const { verificationNotes } = req.body;
  
  try {
    const payment = await Payment.findByPk(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found.' });
    }
    
    if (payment.status !== 'requested') {
      return res.status(400).json({ error: 'Payment is not in requested status.' });
    }
    
    payment.status = 'engineer_approved';
    payment.verificationNotes = verificationNotes;
    await payment.save();
    
    // Audit log
    await auditLogger.log({
      userId: req.user.id,
      action: auditLogger.ACTIONS.PAYMENT_APPROVED,
      entityType: 'payment',
      entityId: payment.id,
      details: { level: 'engineer', verificationNotes },
      req
    });
    
    res.json({
      message: 'Payment approved by engineer.',
      payment
    });
  } catch (err) {
    console.error('Payment approval error:', err);
    res.status(500).json({ error: 'Failed to approve payment.' });
  }
});

// Finance approval and release payment
router.put('/:id/finance-approve', authenticateToken, requireRole(['finance_officer', 'admin']), upload.single('invoice'), async (req, res) => {
  const { invoiceNumber } = req.body;
  
  try {
    const payment = await Payment.findByPk(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found.' });
    }
    
    if (payment.status !== 'engineer_approved') {
      return res.status(400).json({ error: 'Payment must be engineer-approved first.' });
    }
    
    payment.status = 'released';
    payment.invoiceNumber = invoiceNumber || `INV-${Date.now()}`;
    payment.invoicePath = req.file ? `/uploads/${req.file.filename}` : null;
    payment.approvedBy = req.user.id;
    payment.releasedAt = new Date();
    
    await payment.save();
    
    // Update project actual cost
    const project = await Project.findByPk(payment.projectId);
    if (project) {
      project.actualCost = parseFloat(project.actualCost || 0) + parseFloat(payment.amount);
      await project.save();
    }
    
    // Audit log
    await auditLogger.log({
      userId: req.user.id,
      action: auditLogger.ACTIONS.PAYMENT_RELEASED,
      entityType: 'payment',
      entityId: payment.id,
      details: { amount: payment.amount, invoiceNumber: payment.invoiceNumber },
      req
    });
    
    res.json({
      message: 'Payment released successfully.',
      payment
    });
  } catch (err) {
    console.error('Payment release error:', err);
    res.status(500).json({ error: 'Failed to release payment.' });
  }
});

// Reject payment
router.put('/:id/reject', authenticateToken, requireRole(['engineer', 'finance_officer', 'admin']), async (req, res) => {
  const { verificationNotes } = req.body;
  
  try {
    const payment = await Payment.findByPk(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found.' });
    }
    
    payment.status = 'rejected';
    payment.verificationNotes = verificationNotes;
    await payment.save();
    
    // Audit log
    await auditLogger.log({
      userId: req.user.id,
      action: auditLogger.ACTIONS.PAYMENT_REJECTED,
      entityType: 'payment',
      entityId: payment.id,
      details: { verificationNotes },
      req
    });
    
    res.json({
      message: 'Payment rejected.',
      payment
    });
  } catch (err) {
    console.error('Payment rejection error:', err);
    res.status(500).json({ error: 'Failed to reject payment.' });
  }
});

// Get payment statistics
router.get('/stats/overview', authenticateToken, requireRole(['admin', 'finance_officer']), async (req, res) => {
  try {
    const totalRequested = await Payment.count({ where: { status: 'requested' } });
    const totalApproved = await Payment.count({ where: { status: 'engineer_approved' } });
    const totalReleased = await Payment.count({ where: { status: 'released' } });
    
    const payments = await Payment.findAll({
      where: { status: 'released' },
      attributes: ['amount', 'taxAmount']
    });
    
    let totalAmount = 0;
    let totalTax = 0;
    
    payments.forEach(p => {
      totalAmount += parseFloat(p.amount || 0);
      totalTax += parseFloat(p.taxAmount || 0);
    });
    
    res.json({
      pendingRequests: totalRequested,
      pendingApprovals: totalApproved,
      totalReleased,
      totalAmountReleased: totalAmount,
      totalTaxCollected: totalTax
    });
  } catch (err) {
    console.error('Fetch payment stats error:', err);
    res.status(500).json({ error: 'Failed to fetch statistics.' });
  }
});

module.exports = router;
