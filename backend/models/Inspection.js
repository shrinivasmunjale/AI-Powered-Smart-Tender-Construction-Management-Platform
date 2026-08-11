const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Inspection = sequelize.define('Inspection', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  inspectionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  inspectorName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  defects: {
    type: DataTypes.JSON, // Array of defect objects
    allowNull: true,
    defaultValue: []
  },
  safetyViolations: {
    type: DataTypes.JSON, // Array of safety violation objects
    allowNull: true,
    defaultValue: []
  },
  media: {
    type: DataTypes.JSON, // Array of {type, url, caption}
    allowNull: true,
    defaultValue: []
  },
  weather: {
    type: DataTypes.STRING,
    allowNull: true
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('passed', 'failed', 'needs_review'),
    allowNull: false,
    defaultValue: 'needs_review'
  },
  reportPath: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Inspection;
