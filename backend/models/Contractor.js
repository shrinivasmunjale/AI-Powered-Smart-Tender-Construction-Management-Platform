const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Contractor = sequelize.define('Contractor', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  registrationNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  technicalCapacity: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  verificationStatus: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  verificationDocument: {
    type: DataTypes.STRING,
    allowNull: true
  },
  gstNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  panNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pincode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  yearsOfExperience: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  rating: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 5
    }
  },
  completedProjects: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  performanceScore: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0
  },
  certificates: {
    type: DataTypes.JSON, // Array of certificate objects
    allowNull: true,
    defaultValue: []
  },
  workHistory: {
    type: DataTypes.JSON, // Array of work history objects
    allowNull: true,
    defaultValue: []
  },
  verificationExpiryDate: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Contractor;
