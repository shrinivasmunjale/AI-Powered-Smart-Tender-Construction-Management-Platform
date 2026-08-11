const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DocumentAnalysis = sequelize.define('DocumentAnalysis', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  documentPath: {
    type: DataTypes.STRING,
    allowNull: false
  },
  documentType: {
    type: DataTypes.ENUM('tender', 'bid', 'contract', 'certificate', 'other'),
    allowNull: false,
    defaultValue: 'tender'
  },
  extractedData: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {}
  },
  rawText: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  confidence: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: 0,
      max: 1
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'pending'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = DocumentAnalysis;
