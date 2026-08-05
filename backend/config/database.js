const { Sequelize } = require('sequelize');
const path = require('path');

const dbDialect = process.env.DB_DIALECT || 'sqlite';

let sequelize;

if (dbDialect === 'sqlite') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../database.sqlite'),
    logging: false
  });
} else {
  // MySQL or PostgreSQL using connection string or details
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    sequelize = new Sequelize(connectionString, {
      dialect: dbDialect,
      logging: false,
      dialectOptions: dbDialect === 'postgres' ? {
        ssl: process.env.DB_SSL === 'true' ? {
          require: true,
          rejectUnauthorized: false
        } : false
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
