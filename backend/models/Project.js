const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  budget: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  actualCost: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('planning', 'foundation', 'construction', 'finishing', 'inspection', 'completed', 'on_hold', 'cancelled'),
    allowNull: false,
    defaultValue: 'planning'
  },
  progress: {
    type: DataTypes.INTEGER, // percentage 0-100
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  location: {
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
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  assignedEngineers: {
    type: DataTypes.JSON, // Array of engineer IDs
    allowNull: true,
    defaultValue: []
  },
  milestones: {
    type: DataTypes.JSON, // Array of milestone objects
    allowNull: true,
    defaultValue: []
  }
}, {
  timestamps: true
});

module.exports = Project;
