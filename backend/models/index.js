const sequelize = require('../config/database');
const User = require('./User');
const Contractor = require('./Contractor');
const Tender = require('./Tender');
const Bid = require('./Bid');
const Notification = require('./Notification');
const Project = require('./Project');
const Payment = require('./Payment');
const Inspection = require('./Inspection');
const Material = require('./Material');
const AuditLog = require('./AuditLog');
const DocumentAnalysis = require('./DocumentAnalysis');
const ChatMessage = require('./ChatMessage');

// Relationships

// User <-> Contractor (One-to-One)
User.hasOne(Contractor, { foreignKey: 'userId', onDelete: 'CASCADE' });
Contractor.belongsTo(User, { foreignKey: 'userId' });

// User <-> AuditLog (One-to-Many)
User.hasMany(AuditLog, { foreignKey: 'userId', onDelete: 'SET NULL' });
AuditLog.belongsTo(User, { foreignKey: 'userId' });

// User <-> Notification (One-to-Many)
User.hasMany(Notification, { foreignKey: 'userId', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId' });

// Tender <-> Bid (One-to-Many)
Tender.hasMany(Bid, { foreignKey: 'tenderId', onDelete: 'CASCADE' });
Bid.belongsTo(Tender, { foreignKey: 'tenderId' });

// Tender -> Bid (Awarded Bid relation, constraints disabled to prevent circular reference cycles)
Tender.belongsTo(Bid, { as: 'AwardedBid', foreignKey: 'awardedBidId', constraints: false });

// Tender <-> Project (One-to-One)
Tender.hasOne(Project, { foreignKey: 'tenderId', onDelete: 'SET NULL' });
Project.belongsTo(Tender, { foreignKey: 'tenderId' });

// Contractor <-> Bid (One-to-Many)
Contractor.hasMany(Bid, { foreignKey: 'contractorId', onDelete: 'CASCADE' });
Bid.belongsTo(Contractor, { foreignKey: 'contractorId' });

// Contractor <-> Project (One-to-Many)
Contractor.hasMany(Project, { foreignKey: 'contractorId', onDelete: 'SET NULL' });
Project.belongsTo(Contractor, { foreignKey: 'contractorId' });

// Contractor <-> Payment (One-to-Many)
Contractor.hasMany(Payment, { foreignKey: 'contractorId', onDelete: 'CASCADE' });
Payment.belongsTo(Contractor, { foreignKey: 'contractorId' });

// Project <-> Inspection (One-to-Many)
Project.hasMany(Inspection, { foreignKey: 'projectId', onDelete: 'CASCADE' });
Inspection.belongsTo(Project, { foreignKey: 'projectId' });

// Project <-> Payment (One-to-Many)
Project.hasMany(Payment, { foreignKey: 'projectId', onDelete: 'CASCADE' });
Payment.belongsTo(Project, { foreignKey: 'projectId' });

// User <-> ChatMessage (One-to-Many)
User.hasMany(ChatMessage, { foreignKey: 'userId', onDelete: 'CASCADE' });
ChatMessage.belongsTo(User, { foreignKey: 'userId' });

// Tender <-> DocumentAnalysis (One-to-Many)
Tender.hasMany(DocumentAnalysis, { foreignKey: 'tenderId', onDelete: 'SET NULL' });
DocumentAnalysis.belongsTo(Tender, { foreignKey: 'tenderId' });

module.exports = {
  sequelize,
  User,
  Contractor,
  Tender,
  Bid,
  Notification,
  Project,
  Payment,
  Inspection,
  Material,
  AuditLog,
  DocumentAnalysis,
  ChatMessage
};
