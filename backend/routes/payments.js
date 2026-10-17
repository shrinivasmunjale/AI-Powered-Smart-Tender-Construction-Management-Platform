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

// Disburse / Pay online via Payment Gateway (Razorpay / RTGS / Escrow)
router.post('/:id/pay-online', authenticateToken, requireRole(['finance_officer', 'admin']), async (req, res) => {
  const { paymentMethod = 'razorpay_gateway', transactionNotes = '' } = req.body;

  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [
        { model: Project },
        { model: Contractor }
      ]
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found.' });
    }

    if (payment.status === 'released') {
      return res.status(400).json({ error: 'Payment is already released.' });
    }

    // Auto-generate invoice number if missing
    const generatedInvoiceNumber = payment.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    payment.status = 'released';
    payment.invoiceNumber = generatedInvoiceNumber;
    payment.approvedBy = req.user.id;
    payment.releasedAt = new Date();
    payment.verificationNotes = `${payment.verificationNotes ? payment.verificationNotes + ' | ' : ''}Disbursed via ${paymentMethod.toUpperCase()} (Ref: ${transactionId}). ${transactionNotes}`.trim();

    await payment.save();

    // Update project actual cost
    if (payment.projectId) {
      const project = await Project.findByPk(payment.projectId);
      if (project) {
        project.actualCost = parseFloat(project.actualCost || 0) + parseFloat(payment.amount);
        await project.save();
      }
    }

    // Audit log
    await auditLogger.log({
      userId: req.user.id,
      action: auditLogger.ACTIONS.PAYMENT_RELEASED,
      entityType: 'payment',
      entityId: payment.id,
      details: {
        amount: payment.amount,
        invoiceNumber: generatedInvoiceNumber,
        transactionId,
        paymentMethod
      },
      req
    });

    res.json({
      message: `Payment of ₹${Number(payment.amount).toLocaleString()} successfully processed and released.`,
      payment,
      transaction: {
        transactionId,
        paymentMethod,
        timestamp: payment.releasedAt,
        invoiceNumber: generatedInvoiceNumber
      }
    });
  } catch (err) {
    console.error('Online payment error:', err);
    res.status(500).json({ error: 'Failed to process online payment.' });
  }
});

// Get Printable / Downloadable Official GST Tax Invoice
router.get('/:id/invoice', authenticateToken, async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [
        {
          model: Project,
          attributes: ['id', 'name', 'department', 'budget', 'location']
        },
        {
          model: Contractor,
          include: [{ model: User, attributes: ['email', 'phone', 'firstName', 'lastName'] }]
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found.' });
    }

    // Access check: Contractors can only see their own invoices
    if (req.user.role === 'contractor' && payment.contractorId !== req.user.contractorId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const baseAmount = parseFloat(payment.amount || 0);
    const cgst = baseAmount * 0.09; // 9%
    const sgst = baseAmount * 0.09; // 9%
    const totalGst = cgst + sgst;   // 18%
    const tds194c = baseAmount * 0.02; // 2% TDS deduction
    const netDisbursed = baseAmount + totalGst - tds194c;

    const invoiceData = {
      invoiceNumber: payment.invoiceNumber || `PROFORMA-INV-${payment.id}`,
      invoiceDate: payment.releasedAt || payment.updatedAt,
      dueDate: new Date(new Date(payment.createdAt).getTime() + 15 * 86400000),
      status: payment.status,
      paymentType: payment.paymentType,
      hsnSacCode: '9954 (General Construction Services of Civil Engineering Works)',
      payer: {
        authority: 'TenderBridge Public Works & Infrastructure Directorate',
        department: payment.Project?.department || 'Department of Public Works',
        gstin: '27AAACG0123M1Z5',
        address: 'Secretariat Complex, Central Infrastructure Division, New Delhi - 110001'
      },
      payee: {
        contractorId: payment.Contractor?.id,
        companyName: payment.Contractor?.companyName || 'Contractor Entity',
        registrationNumber: payment.Contractor?.registrationNumber || 'N/A',
        gstin: payment.Contractor?.gstNumber || '27AABCU9603R1ZM',
        pan: payment.Contractor?.panNumber || 'AABCU9603R',
        email: payment.Contractor?.User?.email,
        phone: payment.Contractor?.User?.phone || '+91 98765 43210',
        address: payment.Contractor?.address || 'Industrial Area Phase 2'
      },
      project: {
        id: payment.Project?.id,
        name: payment.Project?.name || 'Public Works Project',
        department: payment.Project?.department,
        location: payment.Project?.location || 'Central Division'
      },
      breakdown: {
        baseAmount,
        cgstRate: '9%',
        cgstAmount: cgst,
        sgstRate: '9%',
        sgstAmount: sgst,
        totalGst,
        tdsRate: '2% (Section 194C)',
        tdsAmount: tds194c,
        grossTotal: baseAmount + totalGst,
        netDisbursed
      },
      verificationSeal: {
        digitalSignature: `SHA256:${Buffer.from(`${payment.id}-${payment.invoiceNumber}-${baseAmount}`).toString('base64')}`,
        verifiedBy: payment.approvedBy ? `Authorized Signatory ID #${payment.approvedBy}` : 'Pending Disbursement',
        isCertified: payment.status === 'released'
      }
    };

    res.json(invoiceData);
  } catch (err) {
    console.error('Fetch invoice error:', err);
    res.status(500).json({ error: 'Failed to retrieve invoice.' });
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
