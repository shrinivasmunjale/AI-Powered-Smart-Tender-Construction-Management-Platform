const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  recipient: {
    type: DataTypes.STRING,
    allowNull: false
  },
  channel: {
    type: DataTypes.ENUM('email', 'sms'),
    allowNull: false
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: true
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  timestamps: true,
  updatedAt: false // Notifications are append-only, no updates needed
});

module.exports = Notification;
