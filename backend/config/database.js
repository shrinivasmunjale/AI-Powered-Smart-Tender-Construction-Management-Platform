const { Sequelize } = require('sequelize');
const path = require('path');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const resolvedDialect = process.env.DB_DIALECT || (connectionString && (connectionString.startsWith('postgres') ? 'postgres' : 'sqlite')) || 'sqlite';

let sequelize;

if (resolvedDialect === 'sqlite') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../database.sqlite'),
    logging: false
  });
} else {
  // MySQL or PostgreSQL using connection string or details
  if (connectionString) {
    sequelize = new Sequelize(connectionString, {
      dialect: resolvedDialect,
      logging: false,
      dialectOptions: resolvedDialect === 'postgres' ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      } : {}
    });
  } else {
    sequelize = new Sequelize(
      process.env.DB_NAME || 'tender_db',
      process.env.DB_USER || 'root',
      process.env.DB_PASSWORD || '',
      {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || (dbDialect === 'postgres' ? 5432 : 3306),
        dialect: dbDialect,
        logging: false
      }
    );
  }
}

module.exports = sequelize;
