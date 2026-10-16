const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Tender = sequelize.define('Tender', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  estimatedBudget: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'under_evaluation', 'awarded', 'closed'),
    allowNull: false,
    defaultValue: 'draft'
  },
  documentPath: {
    type: DataTypes.STRING,
    allowNull: true
  },
  awardedBidId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  organizationId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  organizationName: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Tender;
