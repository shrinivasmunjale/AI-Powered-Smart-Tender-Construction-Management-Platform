const express = require('express');
const router = express.Router();
const { Inspection, Project, Contractor } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const auditLogger = require('../utils/auditLogger');
const upload = require('../utils/uploader');

// Get all inspections (with filters)
router.get('/', authenticateToken, async (req, res) => {
  const { projectId, status, inspectorName } = req.query;
  
  try {
    const whereClause = {};
    
    if (projectId) whereClause.projectId = projectId;
    if (status) whereClause.status = status;
    if (inspectorName) whereClause.inspectorName = inspectorName;
    
    const inspections = await Inspection.findAll({
      where: whereClause,
      include: [
        {
          model: Project,
          attributes: ['name', 'department', 'status'],
          include: [{ model: Contractor, attributes: ['companyName'] }]
        }
      ],
      order: [['inspectionDate', 'DESC']]
    });
    
    res.json(inspections);
  } catch (err) {
    console.error('Fetch inspections error:', err);
    res.status(500).json({ error: 'Failed to fetch inspections.' });
  }
});

// Get single inspection
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const inspection = await Inspection.findByPk(req.params.id, {
      include: [
        {
          model: Project,
          attributes: ['name', 'department', 'status', 'location'],
          include: [{ model: Contractor, attributes: ['companyName', 'registrationNumber'] }]
        }
      ]
    });
    
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found.' });
    }
    
    res.json(inspection);
  } catch (err) {
    console.error('Fetch inspection error:', err);
    res.status(500).json({ error: 'Failed to fetch inspection.' });
  }
});

// Create new inspection (Engineer)
router.post('/', authenticateToken, requireRole(['engineer', 'project_manager']), upload.array('media', 10), async (req, res) => {
  const {
    projectId,
    inspectorName,
    notes,
    defects,
    safetyViolations,
    weather,
    latitude,
    longitude,
    status
  } = req.body;
  
  try {
    // Process uploaded media files
    const media = req.files ? req.files.map(file => ({
      type: file.mimetype.startsWith('image/') ? 'image' : 'video',
      url: `/uploads/${file.filename}`,
      caption: file.originalname
    })) : [];
    
    const inspection = await Inspection.create({
      projectId,
      inspectorName: inspectorName || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,
      notes,
      defects: defects ? JSON.parse(defects) : [],
      safetyViolations: safetyViolations ? JSON.parse(safetyViolations) : [],
      media,
      weather,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      status: status || 'needs_review',
      inspectionDate: new Date()
    });
    
    // Audit log
    await auditLogger.log({
      userId: req.user.id,
      action: auditLogger.ACTIONS.INSPECTION_CREATED,
      entityType: 'inspection',
      entityId: inspection.id,
      details: { 
        projectId, 
        inspectorName: inspection.inspectorName,
        status: inspection.status,
        defectsCount: inspection.defects.length,
        violationsCount: inspection.safetyViolations.length
      },
      req
    });
    
    res.status(201).json({
      message: 'Inspection recorded successfully.',
      inspection
    });
  } catch (err) {
    console.error('Create inspection error:', err);
    res.status(500).json({ error: 'Failed to record inspection.' });
  }
});

// Update inspection
router.put('/:id', authenticateToken, requireRole(['engineer', 'project_manager', 'admin']), async (req, res) => {
  try {
    const inspection = await Inspection.findByPk(req.params.id);
    
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found.' });
    }
    
    const {
      notes,
      defects,
      safetyViolations,
      status,
      weather,
      latitude,
      longitude
    } = req.body;
    
    // Update fields if provided
    if (notes !== undefined) inspection.notes = notes;
    if (defects) inspection.defects = JSON.parse(defects);
    if (safetyViolations) inspection.safetyViolations = JSON.parse(safetyViolations);
    if (status) inspection.status = status;
    if (weather) inspection.weather = weather;
    if (latitude !== undefined) inspection.latitude = parseFloat(latitude);
    if (longitude !== undefined) inspection.longitude = parseFloat(longitude);
    
    await inspection.save();
    
    // Audit log
    await auditLogger.log({
      userId: req.user.id,
      action: auditLogger.ACTIONS.INSPECTION_UPDATED,
      entityType: 'inspection',
      entityId: inspection.id,
      details: { changes: req.body },
      req
    });
    
    res.json({
      message: 'Inspection updated successfully.',
      inspection
    });
  } catch (err) {
    console.error('Update inspection error:', err);
    res.status(500).json({ error: 'Failed to update inspection.' });
  }
});

// Add media to inspection
router.post('/:id/media', authenticateToken, requireRole(['engineer', 'project_manager']), upload.array('media', 10), async (req, res) => {
  try {
    const inspection = await Inspection.findByPk(req.params.id);
    
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found.' });
    }
    
    const newMedia = req.files ? req.files.map(file => ({
      type: file.mimetype.startsWith('image/') ? 'image' : 'video',
      url: `/uploads/${file.filename}`,
      caption: file.originalname
    })) : [];
    
    inspection.media = [...inspection.media, ...newMedia];
    await inspection.save();
    
    res.json({
      message: 'Media added successfully.',
      inspection
    });
  } catch (err) {
    console.error('Add media error:', err);
    res.status(500).json({ error: 'Failed to add media.' });
  }
});

// Get inspection statistics
router.get('/stats/overview', authenticateToken, requireRole(['admin', 'engineer', 'project_manager']), async (req, res) => {
  try {
    const totalInspections = await Inspection.count();
    const passedInspections = await Inspection.count({ where: { status: 'passed' } });
    const failedInspections = await Inspection.count({ where: { status: 'failed' } });
    const needsReview = await Inspection.count({ where: { status: 'needs_review' } });
    
    // Get inspections with violations or defects
    const inspections = await Inspection.findAll({
      attributes: ['defects', 'safetyViolations']
    });
    
    let totalDefects = 0;
    let totalViolations = 0;
    
    inspections.forEach(i => {
      totalDefects += i.defects ? i.defects.length : 0;
      totalViolations += i.safetyViolations ? i.safetyViolations.length : 0;
    });
    
    res.json({
      totalInspections,
      passedInspections,
      failedInspections,
      needsReview,
      totalDefects,
      totalSafetyViolations: totalViolations,
      passRate: totalInspections > 0 ? ((passedInspections / totalInspections) * 100).toFixed(2) : 0
    });
  } catch (err) {
    console.error('Fetch inspection stats error:', err);
    res.status(500).json({ error: 'Failed to fetch statistics.' });
  }
});

// Generate inspection report (placeholder)
router.post('/:id/generate-report', authenticateToken, requireRole(['engineer', 'project_manager', 'admin']), async (req, res) => {
  try {
    const inspection = await Inspection.findByPk(req.params.id, {
      include: [
        {
          model: Project,
          include: [{ model: Contractor }]
        }
      ]
    });
    
    if (!inspection) {
      return res.status(404).json({ error: 'Inspection not found.' });
    }
    
    // TODO: Implement PDF generation logic here
    // For now, just return the data
    
    res.json({
      message: 'Report generation feature coming soon.',
      inspection
    });
  } catch (err) {
    console.error('Generate report error:', err);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

module.exports = router;
