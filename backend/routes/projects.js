const express = require('express');
const router = express.Router();
const { Project, Contractor, Tender, User } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const auditLogger = require('../utils/auditLogger');

// Get all projects (with filters)
router.get('/', authenticateToken, async (req, res) => {
  const { status, department, contractorId } = req.query;
  
  try {
    const whereClause = {};
    
    if (status) whereClause.status = status;
    if (department) whereClause.department = department;
    if (contractorId) whereClause.contractorId = contractorId;
    
    // Contractors can only see their own projects
    if (req.user.role === 'contractor' && req.user.contractorId) {
      whereClause.contractorId = req.user.contractorId;
    }
    
    const projects = await Project.findAll({
      where: whereClause,
      include: [
        {
          model: Contractor,
          include: [{ model: User, attributes: ['email'] }]
        },
        {
          model: Tender,
          attributes: ['title', 'category']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(projects);
  } catch (err) {
    console.error('Fetch projects error:', err);
    res.status(500).json({ error: 'Failed to fetch projects.' });
  }
});

// Get single project details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [
        {
          model: Contractor,
          include: [{ model: User, attributes: ['email', 'phone'] }]
        },
        {
          model: Tender,
          attributes: ['title', 'category', 'estimatedBudget']
        }
      ]
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    
    // Contractors can only view their own projects
    if (req.user.role === 'contractor' && project.contractorId !== req.user.contractorId) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    
    res.json(project);
  } catch (err) {
    console.error('Fetch project error:', err);
    res.status(500).json({ error: 'Failed to fetch project.' });
  }
});

// Create new project (Admin/Engineer)
router.post('/', authenticateToken, requireRole(['admin', 'engineer', 'project_manager']), async (req, res) => {
  const {
    name,
    department,
    startDate,
    endDate,
    budget,
    contractorId,
    tenderId,
    location,
    latitude,
    longitude,
    description,
    assignedEngineers
  } = req.body;
  
  try {
    const project = await Project.create({
      name,
      department,
      startDate,
      endDate,
      budget,
      contractorId,
      tenderId,
      location,
      latitude,
      longitude,
      description,
      assignedEngineers: assignedEngineers || [],
      status: 'planning',
      progress: 0,
      actualCost: 0
    });
    
    // Audit log
    await auditLogger.log({
      userId: req.user.id,
      action: auditLogger.ACTIONS.PROJECT_CREATED,
      entityType: 'project',
      entityId: project.id,
      details: { projectName: name, department, budget },
      req
    });
    
    res.status(201).json({
      message: 'Project created successfully.',
      project
    });
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Failed to create project.' });
  }
});

// Update project
router.put('/:id', authenticateToken, requireRole(['admin', 'engineer', 'project_manager']), async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    
    const {
      name,
      department,
      startDate,
      endDate,
      budget,
      actualCost,
      status,
      progress,
      location,
      latitude,
      longitude,
      description,
      assignedEngineers,
      milestones
    } = req.body;
    
    const oldStatus = project.status;
    
    // Update fields if provided
    if (name) project.name = name;
    if (department) project.department = department;
    if (startDate) project.startDate = startDate;
    if (endDate) project.endDate = endDate;
    if (budget !== undefined) project.budget = budget;
    if (actualCost !== undefined) project.actualCost = actualCost;
    if (status) project.status = status;
    if (progress !== undefined) project.progress = progress;
    if (location) project.location = location;
    if (latitude !== undefined) project.latitude = latitude;
    if (longitude !== undefined) project.longitude = longitude;
    if (description) project.description = description;
    if (assignedEngineers) project.assignedEngineers = assignedEngineers;
    if (milestones) project.milestones = milestones;
    
    await project.save();
    
    // Audit log
    const action = oldStatus !== status ? 
      auditLogger.ACTIONS.PROJECT_STATUS_CHANGED : 
      auditLogger.ACTIONS.PROJECT_UPDATED;
    
    await auditLogger.log({
      userId: req.user.id,
      action,
      entityType: 'project',
      entityId: project.id,
      details: { 
        changes: req.body,
        oldStatus: oldStatus !== status ? oldStatus : undefined,
        newStatus: oldStatus !== status ? status : undefined
      },
      req
    });
    
    res.json({
      message: 'Project updated successfully.',
      project
    });
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ error: 'Failed to update project.' });
  }
});

// Get project statistics
router.get('/stats/overview', authenticateToken, requireRole(['admin', 'engineer', 'project_manager']), async (req, res) => {
  try {
    const totalProjects = await Project.count();
    const ongoingProjects = await Project.count({
      where: {
        status: ['foundation', 'construction', 'finishing']
      }
    });
    const completedProjects = await Project.count({
      where: { status: 'completed' }
    });
    const delayedProjects = await Project.count({
      where: {
        endDate: { [require('sequelize').Op.lt]: new Date() },
        status: { [require('sequelize').Op.notIn]: ['completed', 'cancelled'] }
      }
    });
    
    // Budget statistics
    const projects = await Project.findAll({
      attributes: ['budget', 'actualCost', 'status']
    });
    
    let totalBudget = 0;
    let totalActualCost = 0;
    
    projects.forEach(p => {
      totalBudget += parseFloat(p.budget || 0);
      totalActualCost += parseFloat(p.actualCost || 0);
    });
    
    res.json({
      totalProjects,
      ongoingProjects,
      completedProjects,
      delayedProjects,
      totalBudget,
      totalActualCost,
      budgetUtilization: totalBudget > 0 ? (totalActualCost / totalBudget * 100).toFixed(2) : 0
    });
  } catch (err) {
    console.error('Fetch project stats error:', err);
    res.status(500).json({ error: 'Failed to fetch statistics.' });
  }
});

module.exports = router;
