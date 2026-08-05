const http = require('http');

const API_BASE = 'http://localhost:5000/api';

// Simple fetch implementation in pure Node.js (since fetch is standard in Node 18+, we can use global fetch!)
async function testSanity() {
  console.log('=== TENDERBRIDGE BACKEND SANITY TEST ===');
  console.log('Waiting for backend server on http://localhost:5000...');

  // Short delay to let server startup in case of sequential calls
  await new Promise(r => setTimeout(r, 1000));

  try {
    // 1. Test Admin Login
    console.log('\n[TEST 1] Logging in as Admin (admin@tenderbridge.com)...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@tenderbridge.com', password: 'admin123' })
    });

    if (!loginRes.ok) {
      throw new Error(`Admin login failed: ${loginRes.status} ${loginRes.statusText}`);
    }

    const adminSession = await loginRes.json();
    console.log('✓ Admin login successful. Token received.');

    const adminToken = adminSession.token;

    // 2. Test Fetching Tenders
    console.log('\n[TEST 2] Fetching Tenders (Authorized)...');
    const tendersRes = await fetch('http://localhost:5000/api/tenders', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (!tendersRes.ok) {
      throw new Error(`Fetch tenders failed: ${tendersRes.status}`);
    }

    const tenders = await tendersRes.json();
    console.log(`✓ Tenders fetched successfully. Found ${tenders.length} tenders.`);
    tenders.forEach(t => {
      console.log(`  - [ID: ${t.id}] ${t.title} (${t.category}) - $${parseFloat(t.estimatedBudget).toLocaleString()} [${t.status}]`);
    });

    // 3. Test Contractor List
    console.log('\n[TEST 3] Fetching Contractors (Admin only)...');
    const contractorsRes = await fetch('http://localhost:5000/api/contractors', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (!contractorsRes.ok) {
      throw new Error(`Fetch contractors failed: ${contractorsRes.status}`);
    }

    const contractors = await contractorsRes.json();
    console.log(`✓ Contractors fetched successfully. Found ${contractors.length} registered contractors.`);
    contractors.forEach(c => {
      console.log(`  - ${c.companyName} | status: ${c.verificationStatus}`);
    });

    // 4. Test Bid Comparison Analytics
    console.log('\n[TEST 4] Compiling Bid Comparison Matrix for Tender #2 (City Smart Lighting Grid)...');
    const compareRes = await fetch('http://localhost:5000/api/bids/tender/2/compare', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (!compareRes.ok) {
      throw new Error(`Fetch comparison failed: ${compareRes.status}`);
    }

    const comparison = await compareRes.json();
    console.log(`✓ Bid Comparison compiled.`);
    console.log(`  Estimated Budget: $${comparison.stats.estimatedBudget.toLocaleString()}`);
    console.log(`  Total Bids: ${comparison.stats.bidCount}`);
    console.log(`  Average bid price: $${comparison.stats.avgPrice.toLocaleString()}`);
    
    comparison.rankings.forEach((rank, index) => {
      console.log(`  Rank #${index+1}: ${rank.contractor.companyName} | Price: $${rank.price.toLocaleString()} | Timeline: ${rank.duration} days | Score: ${rank.scores.totalScore} pts`);
    });

    console.log('\n=========================================');
    console.log('🎉 ALL SANITY TESTS COMPLETED SUCCESSFULLY!');
    console.log('=========================================');
  } catch (err) {
    console.error('\n❌ SANITY TEST FAILED:', err.message);
    console.log('Please ensure the backend server is running locally (npm run dev inside /backend) before running this test script.');
    process.exit(1);
  }
}

testSanity();
