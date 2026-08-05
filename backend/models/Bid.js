const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Bid = sequelize.define('Bid', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER, // in days
    allowNull: false
  },
  technicalProposal: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  documentPath: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('submitted', 'under_review', 'accepted', 'rejected'),
    allowNull: false,
    defaultValue: 'submitted'
  },
  score: {
    type: DataTypes.FLOAT,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Bid;
