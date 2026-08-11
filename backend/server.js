const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { sequelize, User, Contractor, Tender, Bid, Project, Payment } = require('./models');
const authRoutes = require('./routes/auth');
const tenderRoutes = require('./routes/tenders');
const contractorRoutes = require('./routes/contractors');
const bidRoutes = require('./routes/bids');
const notificationRoutes = require('./routes/notifications');
const projectRoutes = require('./routes/projects');
const paymentRoutes = require('./routes/payments');
const materialRoutes = require('./routes/materials');
const inspectionRoutes = require('./routes/inspections');
const aiChatRoutes = require('./routes/ai-chat');
const dashboardRoutes = require('./routes/dashboard');
const { runMigrations } = require('./utils/migrations');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Serve uploads static folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenders', tenderRoutes);
app.use('/api/contractors', contractorRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/ai-chat', aiChatRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  console.error('Error stack:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Seed Database Function
async function seedDatabase() {
  const userCount = await User.count();
  if (userCount > 0) {
    console.log('Database already has data. Skipping seeder.');
    return;
  }

  console.log('Database is empty. Seeding initial data...');

  try {
    // 1. Create Admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      email: 'admin@tenderbridge.com',
      password: adminPassword,
      role: 'admin'
    });

    // 2. Create Contractors
    const c1Password = await bcrypt.hash('buildcorp123', 10);
    const u1 = await User.create({
      email: 'buildcorp@contractor.com',
      password: c1Password,
      role: 'contractor'
    });
    const contractor1 = await Contractor.create({
      userId: u1.id,
      companyName: 'BuildCorp Industries',
      registrationNumber: 'BC-99210-A',
      technicalCapacity: 'Structural engineering, heavy foundations, heritage masonry, bridge building.',
      verificationStatus: 'verified',
      verificationDocument: '/uploads/sample-license.pdf'
    });

    const c2Password = await bcrypt.hash('gridtech123', 10);
    const u2 = await User.create({
      email: 'gridtech@contractor.com',
      password: c2Password,
      role: 'contractor'
    });
    const contractor2 = await Contractor.create({
      userId: u2.id,
      companyName: 'GridTech Solutions',
      registrationNumber: 'GT-88124-B',
      technicalCapacity: 'Smart grids, municipal IoT integration, electrical grids, urban microgrids.',
      verificationStatus: 'verified',
      verificationDocument: '/uploads/sample-license.pdf'
    });

    const c3Password = await bcrypt.hash('greenwater123', 10);
    const u3 = await User.create({
      email: 'greenwater@contractor.com',
      password: c3Password,
      role: 'contractor'
    });
    await Contractor.create({
      userId: u3.id,
      companyName: 'GreenWater Bio',
      registrationNumber: 'GW-33412-C',
      technicalCapacity: 'Environmental cleanup, river dredging, ecological filtration facilities.',
      verificationStatus: 'pending',
      verificationDocument: '/uploads/sample-license.pdf'
    });

    // 3. Create Open Tenders
    const futureDate = (days) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d;
    };

    const tender1 = await Tender.create({
      title: 'Stari Most Arch Restoration',
      description: 'Restoration of the historic stone arch bridge of Stari Most in Mostar. Work includes stone treatment, riverbed stabilization, and aesthetic light integration. Must support high-weight architectural evaluation.',
      category: 'Infrastructure',
      estimatedBudget: 2400000.00,
      deadline: futureDate(14),
      status: 'published',
      documentPath: '/uploads/tender-bridge-specs.pdf'
    });

    const tender2 = await Tender.create({
      title: 'City Smart Lighting Grid Upgrade',
      description: 'Installation of intelligent LED streetlights across the urban core. Integrates with the central municipality IoT network to optimize power consumption based on traffic density.',
      category: 'IT & Energy',
      estimatedBudget: 850000.00,
      deadline: futureDate(7),
      status: 'published',
      documentPath: '/uploads/lighting-grid-specs.pdf'
    });

    const tender3 = await Tender.create({
      title: 'Neretva River Water Filtration Plant',
      description: 'Construction of a biological filtration sub-facility near the riverbanks. Requires high technical specification (PDF/DWG drawings attached).',
      category: 'Environmental',
      estimatedBudget: 1200000.00,
      deadline: futureDate(20),
      status: 'published',
      documentPath: '/uploads/river-filtration-specs.pdf'
    });

    const tender4 = await Tender.create({
      title: 'Municipal Hospital Supply Vault',
      description: 'Surgical-grade storage locker and secure supply room construction. Special concrete fortification required.',
      category: 'Civil Works',
      estimatedBudget: 450000.00,
      deadline: futureDate(3),
      status: 'published',
      documentPath: '/uploads/hospital-vault-specs.pdf'
    });

    const tender5 = await Tender.create({
      title: 'Bazaar Lane Cobblestone Resurfacing',
      description: 'Traditional stone replacement for 500 meters of the historic bazaar lane. Must coordinate with local shop owners to prevent business interruption.',
      category: 'Civil Works',
      estimatedBudget: 300000.00,
      deadline: futureDate(10),
      status: 'published',
      documentPath: '/uploads/bazaar-lane-specs.pdf'
    });

    // 4. Create Seed Bids
    // Bids for Tender 1 (Stari Most Arch Restoration)
    await Bid.create({
      tenderId: tender1.id,
      contractorId: contractor1.id,
      price: 2250000.00,
      duration: 120, // days
      technicalProposal: 'We propose a complete stone-by-stone structural mapping and reinforcement using local limestone. Experience includes 5 heritage masonry restorations and historical architectural awards. Full preservation compliance.',
      documentPath: '/uploads/buildcorp-bridge-bid.pdf',
      status: 'submitted'
    });

    // Bids for Tender 2 (City Smart Lighting Grid Upgrade)
    await Bid.create({
      tenderId: tender2.id,
      contractorId: contractor2.id,
      price: 790000.00,
      duration: 45,
      technicalProposal: 'We will deploy our modular smart LED controllers which reduce energy consumption by 40%. Full dashboard integration is included with real-time analytics and failure alert modules.',
      documentPath: '/uploads/gridtech-lighting-bid.pdf',
      status: 'submitted'
    });

    await Bid.create({
      tenderId: tender2.id,
      contractorId: contractor1.id,
      price: 840000.00,
      duration: 60,
      technicalProposal: 'We will sub-contract the LED components and manage civil works and installation. High reliability but standard hardware. Includes a 2-year warranty on poles and wiring.',
      documentPath: '/uploads/buildcorp-lighting-bid.pdf',
      status: 'submitted'
    });

    console.log('Database successfully seeded!');
  } catch (err) {
    console.error('Seeding database error:', err);
  }
}

// Sync Database and start server
sequelize.sync({ force: false })
  .then(async () => {
    console.log('Database synchronized.');
    // Repair columns missing from older DB snapshots (idempotent).
    await runMigrations();
    await seedDatabase();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });
