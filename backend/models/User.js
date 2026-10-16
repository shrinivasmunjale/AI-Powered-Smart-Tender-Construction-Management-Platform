const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('super_admin', 'admin', 'organization', 'engineer', 'contractor', 'finance_officer', 'project_manager'),
    allowNull: false,
    defaultValue: 'contractor'
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  organizationName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  registrationNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  approvalStatus: {
    type: DataTypes.STRING, // 'pending', 'approved', 'rejected'
    allowNull: false,
    defaultValue: 'pending'
  },
  approvalNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  timestamps: true
});

module.exports = User;
