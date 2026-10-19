const { sequelize } = require('./models');
async function check() {
  // Check columns
  const [cols] = await sequelize.query('PRAGMA table_info(Users)');
  console.log('Columns:', cols.map(c => c.name).join(', '));

  // Check user states
  const [users] = await sequelize.query(
    'SELECT id, email, role, approvalStatus, isActive FROM Users'
  );
  console.log('\nUsers:');
  users.forEach(u => console.log(` [${u.id}] ${u.email} | ${u.role} | status:${u.approvalStatus} | active:${u.isActive}`));
  process.exit(0);
}
check().catch(e => { console.error(e.message); process.exit(1); });
