const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

/**
 * Lightweight column migrations for database snapshots created before a
 * model gained new fields. `sequelize.sync({ force: false })` creates new
 * tables with the full schema but never ALTERs existing ones, so columns
 * added after a table was first created would be missing forever.
 *
 * Every check is idempotent and non-destructive; failures are logged and
 * skipped so a migration problem can never block server startup.
 */
async function ensureColumn(table, column, definition) {
  try {
    const cols = await sequelize.getQueryInterface().describeTable(table);
    if (column in cols) return false;
    await sequelize.getQueryInterface().addColumn(table, column, definition);
    console.log(`[migration] Added column ${table}.${column}`);
    return true;
  } catch (err) {
    console.error(`[migration] Skipping ${table}.${column}: ${err.message}`);
    return false;
  }
}

/** Run all known drift repairs. Call after sequelize.sync(). */
async function runMigrations() {
  await ensureColumn('ChatMessages', 'userId', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });
  await ensureColumn('DocumentAnalyses', 'tenderId', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });
  await ensureColumn('Users', 'organizationName', {
    type: DataTypes.STRING,
    allowNull: true,
  });
  await ensureColumn('Users', 'registrationNumber', {
    type: DataTypes.STRING,
    allowNull: true,
  });
  await ensureColumn('Users', 'approvalStatus', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending',
  });
  await ensureColumn('Users', 'approvalNotes', {
    type: DataTypes.TEXT,
    allowNull: true,
  });
  await ensureColumn('Users', 'approvedAt', {
    type: DataTypes.DATE,
    allowNull: true,
  });
  await ensureColumn('Users', 'approvedBy', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });
  await ensureColumn('Tenders', 'organizationId', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });
  await ensureColumn('Tenders', 'organizationName', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  try {
    await sequelize.query(`UPDATE "Users" SET "approvalStatus" = 'approved' WHERE "role" IN ('admin', 'super_admin') OR "approvalStatus" IS NULL;`);
  } catch (e) {
    // ignore if table doesn't have column yet
  }
}

module.exports = { runMigrations, ensureColumn };