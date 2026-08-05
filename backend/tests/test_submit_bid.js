const http = require('http');

async function testSubmitBid() {
  console.log('=== TESTING BID SUBMISSION PIPELINE ===');

  try {
    // 1. Log in as Contractor BuildCorp (verified)
    console.log('[STEP 1] Logging in as buildcorp@contractor.com...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'buildcorp@contractor.com', password: 'buildcorp123' })
    });

    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.statusText}`);
    }

    const session = await loginRes.json();
    console.log(`✓ Contractor logged in. Status: ${session.user.verificationStatus}`);

    const token = session.token;

    // 2. Submit a Bid for Tender #5 (Bazaar Lane Cobblestone Resurfacing)
    console.log('\n[STEP 2] Submitting bid for Tender #5...');
    
    // We mock file upload by sending multipart form data manually or just raw JSON if backend allows,
    // wait! The backend uses upload.single('document'), so we must send multipart/form-data!
    // Since fetch in Node support FormData, let's construct FormData:
    const formData = new FormData();
    formData.append('tenderId', '5');
    formData.append('price', '275000.00');
    formData.append('duration', '15');
    formData.append('technicalProposal', 'We will pave the bazaar lane using high-durability heritage cobble. Working in night-shifts only to keep local stalls fully open during business hours.');
    
    const bidRes = await fetch('http://localhost:5000/api/bids', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const bidData = await bidRes.json();

    if (!bidRes.ok) {
      throw new Error(`Bid submission rejected: ${JSON.stringify(bidData)}`);
    }

    console.log('✓ Bid submitted successfully!');
    console.log(`  Bid ID: ${bidData.bid.id}`);
    console.log(`  Tender ID: ${bidData.bid.tenderId}`);
    console.log(`  Price: $${bidData.bid.price}`);
    console.log(`  Duration: ${bidData.bid.duration} days`);

    console.log('\n=== TEST SUCCESSFUL ===');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exit(1);
  }
}

testSubmitBid();
