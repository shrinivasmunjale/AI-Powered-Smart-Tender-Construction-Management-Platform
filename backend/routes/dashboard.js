const express = require('express');
const router = express.Router();
const { 
  Tender, 
  Contractor, 
  Project, 
  Payment, 
  Bid, 
  Material,
  Inspection,
  AuditLog,
  User
} = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Op } = require('sequelize');

// Get comprehensive dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = {};
    
    // === TENDERS ===
    stats.tenders = {
      total: await Tender.count(),
      active: await Tender.count({ where: { status: 'published' } }),
      draft: await Tender.count({ where: { status: 'draft' } }),
      underEvaluation: await Tender.count({ where: { status: 'under_evaluation' } }),
      awarded: await Tender.count({ where: { status: 'awarded' } }),
      closed: await Tender.count({ where: { status: 'closed' } })
    };
    
    // === CONTRACTORS ===
    stats.contractors = {
      total: await Contractor.count(),
      verified: await Contractor.count({ where: { verificationStatus: 'verified' } }),
      pending: await Contractor.count({ where: { verificationStatus: 'pending' } }),
      rejected: await Contractor.count({ where: { verificationStatus: 'rejected' } })
    };

    // === USER AUTHORIZATIONS ===
    stats.authorizations = {
      pending: await User.count({ where: { approvalStatus: 'pending' } }),
      approved: await User.count({ where: { approvalStatus: 'approved' } }),
      rejected: await User.count({ where: { approvalStatus: 'rejected' } }),
      total: await User.count()
    };
    
    // === PROJECTS ===
    const now = new Date();
    stats.projects = {
      total: await Project.count(),
      ongoing: await Project.count({
        where: {
          status: ['foundation', 'construction', 'finishing']
        }
      }),
      completed: await Project.count({ where: { status: 'completed' } }),
      planning: await Project.count({ where: { status: 'planning' } }),
      delayed: await Project.count({
        where: {
          endDate: { [Op.lt]: now },
          status: { [Op.notIn]: ['completed', 'cancelled'] }
        }
      })
    };
    
    // === BUDGET & FINANCE ===
    const projects = await Project.findAll({
      attributes: ['budget', 'actualCost', 'status', 'department']
    });
    
    let totalBudget = 0;
    let totalActualCost = 0;
    let totalRevenue = 0;
    
    projects.forEach(p => {
      totalBudget += parseFloat(p.budget || 0);
      totalActualCost += parseFloat(p.actualCost || 0);
      if (p.status === 'completed') {
        totalRevenue += parseFloat(p.budget || 0);
      }
    });
    
    stats.finance = {
      totalBudget: totalBudget.toFixed(2),
      totalActualCost: totalActualCost.toFixed(2),
      totalRevenue: totalRevenue.toFixed(2),
      budgetUtilization: totalBudget > 0 ? ((totalActualCost / totalBudget) * 100).toFixed(2) : 0,
      savings: (totalBudget - totalActualCost).toFixed(2)
    };
    
    // === BUDGET BY CATEGORY (Department-level, for charts) ===
    const budgetMap = {};
    projects.forEach(p => {
      const dept = p.department || 'Other';
      if (!budgetMap[dept]) budgetMap[dept] = { department: dept, budget: 0, actualCost: 0 };
      budgetMap[dept].budget += parseFloat(p.budget || 0);
      budgetMap[dept].actualCost += parseFloat(p.actualCost || 0);
    });
    stats.budgetByCategory = Object.values(budgetMap);
    
    // === PAYMENTS ===
    const payments = await Payment.findAll({
      attributes: ['amount', 'status', 'taxAmount']
    });
    
    stats.payments = {
      total: payments.length,
      pending: await Payment.count({ where: { status: 'requested' } }),
      approved: await Payment.count({ where: { status: 'engineer_approved' } }),
      released: await Payment.count({ where: { status: 'released' } }),
      rejected: await Payment.count({ where: { status: 'rejected' } })
    };
    
    let totalPayments = 0;
    let totalTax = 0;
    
    payments.forEach(p => {
      if (p.status === 'released') {
        totalPayments += parseFloat(p.amount || 0);
        totalTax += parseFloat(p.taxAmount || 0);
      }
    });
    
    stats.payments.totalReleased = totalPayments.toFixed(2);
    stats.payments.totalTax = totalTax.toFixed(2);
    
    // === MATERIALS ===
    const materials = await Material.findAll({
      attributes: ['currentStock', 'minimumStock', 'unitPrice']
    });
    
    let totalValue = 0;
    let lowStockCount = 0;
    
    materials.forEach(m => {
      totalValue += parseFloat(m.currentStock || 0) * parseFloat(m.unitPrice || 0);
      if (m.currentStock <= m.minimumStock) {
        lowStockCount++;
      }
    });
    
    stats.materials = {
      total: materials.length,
      lowStockAlerts: lowStockCount,
      totalValue: totalValue.toFixed(2)
    };
    
    // === INSPECTIONS ===
    stats.inspections = {
      total: await Inspection.count(),
      passed: await Inspection.count({ where: { status: 'passed' } }),
      failed: await Inspection.count({ where: { status: 'failed' } }),
      pending: await Inspection.count({ where: { status: 'needs_review' } })
    };
    
    // === BIDS ===
    stats.bids = {
      total: await Bid.count(),
      submitted: await Bid.count({ where: { status: 'submitted' } }),
      underReview: await Bid.count({ where: { status: 'under_review' } }),
      accepted: await Bid.count({ where: { status: 'accepted' } }),
      rejected: await Bid.count({ where: { status: 'rejected' } })
    };
    
    // === RECENT ACTIVITIES ===
    const recentActivities = await AuditLog.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['email', 'role']
        }
      ]
    });
    
    stats.recentActivities = recentActivities.map(activity => ({
      id: activity.id,
      action: activity.action,
      entityType: activity.entityType,
      entityId: activity.entityId,
      user: activity.User ? {
        email: activity.User.email,
        role: activity.User.role
      } : null,
      timestamp: activity.createdAt,
      details: activity.details
    }));
    
    // === UPCOMING DEADLINES ===
    const upcomingDeadlines = await Tender.findAll({
      where: {
        deadline: {
          [Op.between]: [now, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)] // Next 7 days
        },
        status: 'published'
      },
      order: [['deadline', 'ASC']],
      limit: 5,
      attributes: ['id', 'title', 'category', 'deadline']
    });
    
    stats.upcomingDeadlines = upcomingDeadlines;
    
    // === MONTHLY STATISTICS (Last 6 months) ===
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyTenders = await Tender.findAll({
      where: {
        createdAt: { [Op.gte]: sixMonthsAgo }
      },
      attributes: ['createdAt']
    });

    // NOTE: Aggregated in JS below to stay dialect-agnostic (MySQL's
    // DATE_FORMAT and SQLite's strftime differ; grouping on it used to 500).
    
    const monthCounts = {};
    monthlyTenders.forEach(t => {
      const monthKey = t.createdAt.toISOString().slice(0, 7); // YYYY-MM
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    });

    stats.monthlyTenders = Object.keys(monthCounts)
      .sort()
      .map(month => ({ month, count: monthCounts[month] }));
    
    // === CATEGORY DISTRIBUTION ===
    const categoryDistribution = await Tender.findAll({
      attributes: [
        'category',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['category']
    });
    
    stats.categoryDistribution = categoryDistribution.map(cd => ({
      category: cd.category,
      count: cd.get('count')
    }));
    
    res.json(stats);
  } catch (err) {
    console.error('Fetch dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics.' });
  }
});

// Get role-specific dashboard data
router.get('/my-dashboard', authenticateToken, async (req, res) => {
  try {
    const dashboardData = {
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      }
    };
    
    if (req.user.role === 'contractor' && req.user.contractorId) {
      // Contractor dashboard
      const contractor = await Contractor.findByPk(req.user.contractorId);
      
      dashboardData.contractor = {
        companyName: contractor.companyName,
        verificationStatus: contractor.verificationStatus,
        rating: contractor.rating,
        completedProjects: contractor.completedProjects
      };
      
      dashboardData.myProjects = await Project.count({
        where: { contractorId: req.user.contractorId }
      });
      
      dashboardData.myBids = await Bid.count({
        where: { contractorId: req.user.contractorId }
      });
      
      dashboardData.pendingPayments = await Payment.count({
        where: { 
          contractorId: req.user.contractorId,
          status: { [Op.in]: ['requested', 'engineer_approved'] }
        }
      });
      
      // Recent bids
      dashboardData.recentBids = await Bid.findAll({
        where: { contractorId: req.user.contractorId },
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: Tender,
            attributes: ['title', 'category', 'status']
          }
        ]
      });
      
    } else if (['admin', 'engineer', 'project_manager'].includes(req.user.role)) {
      // Admin/Engineer dashboard
      dashboardData.pendingApprovals = {
        contractors: await Contractor.count({ where: { verificationStatus: 'pending' } }),
        payments: await Payment.count({ where: { status: 'requested' } }),
        inspections: await Inspection.count({ where: { status: 'needs_review' } })
      };
      
      dashboardData.activeTenders = await Tender.count({ where: { status: 'published' } });
      dashboardData.ongoingProjects = await Project.count({
        where: {
          status: ['foundation', 'construction', 'finishing']
        }
      });
      
    } else if (req.user.role === 'finance_officer') {
      // Finance dashboard
      dashboardData.pendingPayments = await Payment.count({
        where: { status: 'engineer_approved' }
      });
      
      dashboardData.recentPayments = await Payment.findAll({
        where: { status: 'released' },
        limit: 10,
        order: [['releasedAt', 'DESC']],
        include: [
          {
            model: Project,
            attributes: ['name']
          },
          {
            model: Contractor,
            attributes: ['companyName']
          }
        ]
      });
    }
    
    res.json(dashboardData);
  } catch (err) {
    console.error('Fetch my dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data.' });
  }
});

module.exports = router;
