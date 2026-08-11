const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  paymentType: {
    type: DataTypes.ENUM('advance', 'milestone', 'final', 'penalty'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('requested', 'engineer_approved', 'finance_approved', 'released', 'rejected'),
    allowNull: false,
    defaultValue: 'requested'
  },
  invoiceNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  invoicePath: {
    type: DataTypes.STRING,
    allowNull: true
  },
  taxAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  verificationNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  approvedBy: {
    type: DataTypes.INTEGER, // User ID
    allowNull: true
  },
  releasedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Payment;
