const { AuditLog } = require('../models');

/**
 * Create an audit log entry
 * @param {Object} params - Audit log parameters
 * @param {number} params.userId - ID of the user performing the action
 * @param {string} params.action - Action performed (e.g., 'LOGIN', 'TENDER_CREATED', 'BID_SUBMITTED')
 * @param {string} params.entityType - Type of entity affected (e.g., 'tender', 'user', 'project')
 * @param {number} params.entityId - ID of the affected entity
 * @param {Object} params.details - Additional details about the action
 * @param {Object} params.req - Express request object (optional, for IP and user agent)
 */
async function log({ userId, action, entityType, entityId, details = {}, req = null }) {
  try {
    const auditData = {
      userId,
      action,
      entityType,
      entityId,
      details,
      ipAddress: req ? (req.ip || req.connection?.remoteAddress) : null,
      userAgent: req ? req.get('user-agent') : null
    };

    await AuditLog.create(auditData);
  } catch (err) {
    console.error('Audit logging error:', err);
    // Don't throw - audit logging failures shouldn't break the main flow
  }
}

// Predefined action constants
const ACTIONS = {
  // Authentication
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  
  // Tender actions
  TENDER_CREATED: 'TENDER_CREATED',
  TENDER_UPDATED: 'TENDER_UPDATED',
  TENDER_DELETED: 'TENDER_DELETED',
  TENDER_PUBLISHED: 'TENDER_PUBLISHED',
  TENDER_AWARDED: 'TENDER_AWARDED',
  
  // Bid actions
  BID_SUBMITTED: 'BID_SUBMITTED',
  BID_UPDATED: 'BID_UPDATED',
  BID_WITHDRAWN: 'BID_WITHDRAWN',
  
  // Project actions
  PROJECT_CREATED: 'PROJECT_CREATED',
  PROJECT_UPDATED: 'PROJECT_UPDATED',
  PROJECT_STATUS_CHANGED: 'PROJECT_STATUS_CHANGED',
  
  // Payment actions
  PAYMENT_REQUESTED: 'PAYMENT_REQUESTED',
  PAYMENT_APPROVED: 'PAYMENT_APPROVED',
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  PAYMENT_RELEASED: 'PAYMENT_RELEASED',
  
  // Contractor actions
  CONTRACTOR_VERIFIED: 'CONTRACTOR_VERIFIED',
  CONTRACTOR_REJECTED: 'CONTRACTOR_REJECTED',
  
  // User management
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  
  // Inspection actions
  INSPECTION_CREATED: 'INSPECTION_CREATED',
  INSPECTION_UPDATED: 'INSPECTION_UPDATED',
  
  // Material actions
  MATERIAL_ADDED: 'MATERIAL_ADDED',
  MATERIAL_UPDATED: 'MATERIAL_UPDATED',
  MATERIAL_CONSUMED: 'MATERIAL_CONSUMED'
};

module.exports = {
  log,
  ACTIONS
};
