const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Material = sequelize.define('Material', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  currentStock: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  minimumStock: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  warehouse: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Material;
