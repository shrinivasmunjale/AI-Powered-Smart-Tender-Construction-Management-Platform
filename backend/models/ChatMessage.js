const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  sessionId: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true
  },
  role: {
    type: DataTypes.ENUM('user', 'assistant', 'system'),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  context: {
    type: DataTypes.JSON, // Store related tender IDs, documents, etc.
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON, // Store AI model info, tokens used, etc.
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = ChatMessage;
