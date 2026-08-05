const sequelize = require('../config/database');
const User = require('./User');
const Contractor = require('./Contractor');
const Tender = require('./Tender');
const Bid = require('./Bid');
const Notification = require('./Notification');

// Relationships

// User <-> Contractor (One-to-One)
User.hasOne(Contractor, { foreignKey: 'userId', onDelete: 'CASCADE' });
Contractor.belongsTo(User, { foreignKey: 'userId' });

// Tender <-> Bid (One-to-Many)
Tender.hasMany(Bid, { foreignKey: 'tenderId', onDelete: 'CASCADE' });
Bid.belongsTo(Tender, { foreignKey: 'tenderId' });

// Contractor <-> Bid (One-to-Many)
Contractor.hasMany(Bid, { foreignKey: 'contractorId', onDelete: 'CASCADE' });
Bid.belongsTo(Contractor, { foreignKey: 'contractorId' });

// Tender -> Bid (Awarded Bid relation, constraints disabled to prevent circular reference cycles)
Tender.belongsTo(Bid, { as: 'AwardedBid', foreignKey: 'awardedBidId', constraints: false });

module.exports = {
  sequelize,
  User,
  Contractor,
  Tender,
  Bid,
  Notification
};
