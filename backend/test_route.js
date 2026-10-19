const { sequelize, User, Contractor } = require('./models');

async function testRoute() {
  // Simulate what the /auth/approval-requests route does
  const users = await User.findAll({
    where: {
      role: ['contractor', 'organization', 'engineer']
    },
    include: [Contractor],
    order: [['createdAt', 'DESC']]
  });

  console.log('Total users found by route:', users.length);

  const pending  = users.filter(u => u.approvalStatus === 'pending');
  const approved = users.filter(u => u.approvalStatus === 'approved');
  const rejected = users.filter(u => u.approvalStatus === 'rejected');

  console.log('Pending:', pending.length);
  console.log('Approved:', approved.length);
  console.log('Rejected:', rejected.length);

  console.log('\nRaw approvalStatus values:');
  users.forEach(u => console.log(` [${u.id}] ${u.email} => approvalStatus: "${u.approvalStatus}" (type: ${typeof u.approvalStatus})`));

  process.exit(0);
}
testRoute().catch(e => { console.error(e.message, e.stack); process.exit(1); });
