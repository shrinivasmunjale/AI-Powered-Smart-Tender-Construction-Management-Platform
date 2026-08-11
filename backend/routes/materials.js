const express = require('express');
const router = express.Router();
const { Material } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const auditLogger = require('../utils/auditLogger');

// Get all materials (with filters and low stock alert)
router.get('/', authenticateToken, async (req, res) => {
  const { category, warehouse, lowStock } = req.query;
  
  try {
    const { Op } = require('sequelize');
    const whereClause = {};
    
    if (category) whereClause.category = category;
    if (warehouse) whereClause.warehouse = warehouse;
    if (lowStock === 'true') {
      whereClause.currentStock = { [Op.lte]: require('sequelize').literal('minimumStock') };
    }
    
    const materials = await Material.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });
    
    // Add low stock warning flag
    const materialsWithWarnings = materials.map(m => {
      const material = m.toJSON();
      material.isLowStock = material.currentStock <= material.minimumStock;
      return material;
    });
    
    res.json(materialsWithWarnings);
  } catch (err) {
    console.error('Fetch materials error:', err);
    res.status(500).json({ error: 'Failed to fetch materials.' });
  }
});

// Get single material
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const material = await Material.findByPk(req.params.id);
    
    if (!material) {
      return res.status(404).json({ error: 'Material not found.' });
    }
    
    res.json(material);
  } catch (err) {
    console.error('Fetch material error:', err);
    res.status(500).json({ error: 'Failed to fetch material.' });
  }
});

// Create new material (Admin/Engineer)
router.post('/', authenticateToken, requireRole(['admin', 'engineer', 'project_manager']), async (req, res) => {
  const {
    name,
    category,
    unit,
    currentStock,
    minimumStock,
    unitPrice,
    warehouse,
    description
  } = req.body;
  
  try {
    const material = await Material.create({
      name,
      category,
      unit,
      currentStock: currentStock || 0,
      minimumStock: minimumStock || 0,
      unitPrice,
      warehouse,
      description
    });
    
    // Audit log
    await auditLogger.log({
      userId: req.user.id,
      action: auditLogger.ACTIONS.MATERIAL_ADDED,
      entityType: 'material',
      entityId: material.id,
      details: { name, category, currentStock },
      req
    });
    
    res.status(201).json({
      message: 'Material added successfully.',
      material
    });
  } catch (err) {
    console.error('Create material error:', err);
    res.status(500).json({ error: 'Failed to add material.' });
  }
});

// Update material
router.put('/:id', authenticateToken, requireRole(['admin', 'engineer', 'project_manager']), async (req, res) => {
  try {
    const material = await Material.findByPk(req.params.id);
    
    if (!material) {
      return res.status(404).json({ error: 'Material not found.' });
    }
    
    const {
      name,
      category,
      unit,
      currentStock,
      minimumStock,
      unitPrice,
      warehouse,
      description
    } = req.body;
    
    // Update fields if provided
    if (name) material.name = name;
    if (category) material.category = category;
    if (unit) material.unit = unit;
    if (currentStock !== undefined) material.currentStock = currentStock;
    if (minimumStock !== undefined) material.minimumStock = minimumStock;
    if (unitPrice !== undefined) material.unitPrice = unitPrice;
    if (warehouse) material.warehouse = warehouse;
    if (description !== undefined) material.description = description;
    
    await material.save();
    
    // Audit log
    await auditLogger.log({
      userId: req.user.id,
      action: auditLogger.ACTIONS.MATERIAL_UPDATED,
      entityType: 'material',
      entityId: material.id,
      details: { changes: req.body },
      req
    });
    
    res.json({
      message: 'Material updated successfully.',
      material
    });
  } catch (err) {
    console.error('Update material error:', err);
    res.status(500).json({ error: 'Failed to update material.' });
  }
});

// Consume material (reduce stock)
router.post('/:id/consume', authenticateToken, requireRole(['engineer', 'project_manager']), async (req, res) => {
  const { quantity, projectId, notes } = req.body;
  
  try {
    const material = await Material.findByPk(req.params.id);
    
    if (!material) {
      return res.status(404).json({ error: 'Material not found.' });
    }
    
    if (material.currentStock < quantity) {
      return res.status(400).json({ 
        error: 'Insufficient stock.',
        available: material.currentStock,
        requested: quantity
      });
    }
    
    material.currentStock = parseFloat(material.currentStock) - parseFloat(quantity);
    await material.save();
    
    // Audit log
    await auditLogger.log({
      userId: req.user.id,
      action: auditLogger.ACTIONS.MATERIAL_CONSUMED,
      entityType: 'material',
      entityId: material.id,
      details: { 
        quantity, 
        projectId, 
        notes,
        remainingStock: material.currentStock,
        isLowStock: material.currentStock <= material.minimumStock
      },
      req
    });
    
    // Check if low stock alert needed
    let alert = null;
    if (material.currentStock <= material.minimumStock) {
      alert = {
        type: 'LOW_STOCK',
        message: `${material.name} is running low. Current: ${material.currentStock} ${material.unit}, Minimum: ${material.minimumStock} ${material.unit}`
      };
    }
    
    res.json({
      message: 'Material consumption recorded.',
      material,
      alert
    });
  } catch (err) {
    console.error('Consume material error:', err);
    res.status(500).json({ error: 'Failed to record consumption.' });
  }
});

// Restock material (add stock)
router.post('/:id/restock', authenticateToken, requireRole(['admin', 'engineer', 'project_manager']), async (req, res) => {
  const { quantity, notes } = req.body;
  
  try {
    const material = await Material.findByPk(req.params.id);
    
    if (!material) {
      return res.status(404).json({ error: 'Material not found.' });
    }
    
    material.currentStock = parseFloat(material.currentStock) + parseFloat(quantity);
    await material.save();
    
    // Audit log
    await auditLogger.log({
      userId: req.user.id,
      action: auditLogger.ACTIONS.MATERIAL_UPDATED,
      entityType: 'material',
      entityId: material.id,
      details: { 
        action: 'RESTOCK',
        quantity, 
        notes,
        newStock: material.currentStock
      },
      req
    });
    
    res.json({
      message: 'Material restocked successfully.',
      material
    });
  } catch (err) {
    console.error('Restock material error:', err);
    res.status(500).json({ error: 'Failed to restock material.' });
  }
});

// Get material statistics
router.get('/stats/overview', authenticateToken, requireRole(['admin', 'engineer', 'project_manager']), async (req, res) => {
  try {
    const { Op } = require('sequelize');
    
    const totalMaterials = await Material.count();
    const lowStockMaterials = await Material.count({
      where: {
        currentStock: { [Op.lte]: require('sequelize').literal('minimumStock') }
      }
    });
    
    const materials = await Material.findAll({
      attributes: ['currentStock', 'unitPrice']
    });
    
    let totalValue = 0;
    materials.forEach(m => {
      totalValue += parseFloat(m.currentStock || 0) * parseFloat(m.unitPrice || 0);
    });
    
    // Get category breakdown
    const categories = await Material.findAll({
      attributes: [
        'category',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['category']
    });
    
    res.json({
      totalMaterials,
      lowStockAlerts: lowStockMaterials,
      totalInventoryValue: totalValue.toFixed(2),
      categoryBreakdown: categories.map(c => ({
        category: c.category,
        count: c.get('count')
      }))
    });
  } catch (err) {
    console.error('Fetch material stats error:', err);
    res.status(500).json({ error: 'Failed to fetch statistics.' });
  }
});

// Delete material
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const material = await Material.findByPk(req.params.id);
    
    if (!material) {
      return res.status(404).json({ error: 'Material not found.' });
    }
    
    await material.destroy();
    
    res.json({ message: 'Material deleted successfully.' });
  } catch (err) {
    console.error('Delete material error:', err);
    res.status(500).json({ error: 'Failed to delete material.' });
  }
});

module.exports = router;
