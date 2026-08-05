import React, { useState, useEffect } from 'react';
import { FileText, Users, DollarSign, Award, ChevronRight, Check, X, Shield, PlusCircle, BarChart2 } from 'lucide-react';

export default function AdminDashboard({ token }) {
  const [tenders, setTenders] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [selectedTender, setSelectedTender] = useState(null);
  const [comparison, setComparison] = useState(null);
  
  // Form states for creating tender
  const [newTender, setNewTender] = useState({
    title: '',
    description: '',
    category: 'Infrastructure',
    estimatedBudget: '',
    deadline: '',
    status: 'published' // publish immediately by default
  });
  const [tenderFile, setTenderFile] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loadingTenders, setLoadingTenders] = useState(false);
  const [loadingContractors, setLoadingContractors] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Fetch Tenders and Contractors
  const fetchData = async () => {
    setLoadingTenders(true);
    setLoadingContractors(true);
    try {
      const tendersRes = await fetch('http://localhost:5000/api/tenders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tendersRes.ok) {
        const data = await tendersRes.json();
        setTenders(data);
      }

      const contractorsRes = await fetch('http://localhost:5000/api/contractors', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (contractorsRes.ok) {
        const data = await contractorsRes.json();
        setContractors(data);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoadingTenders(false);
      setLoadingContractors(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Handle Contractor Verification
  const handleVerifyContractor = async (contractorId, status) => {
    try {
      const res = await fetch(`http://localhost:5000/api/contractors/${contractorId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      
      if (res.ok) {
        setFeedbackMsg(`Contractor profile successfully ${status}.`);
        setTimeout(() => setFeedbackMsg(''), 4000);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update contractor status.');
      }
    } catch (err) {
      console.error('Error verifying contractor:', err);
    }
  };

  // Handle Create Tender Submission
  const handleCreateTender = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    
    const formData = new FormData();
    formData.append('title', newTender.title);
    formData.append('description', newTender.description);
    formData.append('category', newTender.category);
    formData.append('estimatedBudget', newTender.estimatedBudget);
    formData.append('deadline', newTender.deadline);
    formData.append('status', newTender.status);
    if (tenderFile) {
      formData.append('document', tenderFile);
    }

    try {
      const res = await fetch('http://localhost:5000/api/tenders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        setFeedbackMsg('New tender published and notification alerts broadcasted to contractors.');
        setTimeout(() => setFeedbackMsg(''), 5000);
        setNewTender({
          title: '',
          description: '',
          category: 'Infrastructure',
          estimatedBudget: '',
          deadline: '',
          status: 'published'
        });
        setTenderFile(null);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create tender.');
      }
    } catch (err) {
      console.error('Error creating tender:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // Compare Bids for a Tender
  const handleCompareBids = async (tender) => {
    setSelectedTender(tender);
    setLoadingCompare(true);
    setComparison(null);

    try {
      const res = await fetch(`http://localhost:5000/api/bids/tender/${tender.id}/compare`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setComparison(data);
      }
    } catch (err) {
      console.error('Error comparing bids:', err);
    } finally {
      setLoadingCompare(false);
    }
  };

  // Award Tender to a Bid
  const handleAwardTender = async (bidId) => {
    if (!window.confirm('Are you sure you want to award this tender? This will notify the winner and decline other submissions.')) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/tenders/${selectedTender.id}/award`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bidId })
      });

      if (res.ok) {
        setFeedbackMsg('Tender successfully awarded! Email and SMS alerts dispatched.');
        setTimeout(() => setFeedbackMsg(''), 5000);
        // Refresh comparisons & tenders
        handleCompareBids(selectedTender);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to award tender.');
      }
    } catch (err) {
      console.error('Error awarding tender:', err);
    }
  };

  // Calculate KPIs
  const totalTenders = tenders.length;
  const verifiedContractors = contractors.filter(c => c.verificationStatus === 'verified').length;
  const pendingVerifications = contractors.filter(c => c.verificationStatus === 'pending');
  const awardedValue = tenders
    .filter(t => t.status === 'awarded' && t.estimatedBudget)
    .reduce((acc, t) => acc + parseFloat(t.estimatedBudget), 0);

  return (
    <div className="admin-dashboard">
      {feedbackMsg && (
        <div style={{
          background: 'rgba(62,207,142,0.15)',
          border: '1px solid var(--success)',
          color: 'var(--success)',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '14px',
          fontWeight: 500
        }}>
          ✓ {feedbackMsg}
        </div>
      )}

      {/* KPIs Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper primary">
            <FileText size={20} />
          </div>
          <div className="stat-info">
            <h4>Total Tenders</h4>
            <p>{totalTenders}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper success">
            <Users size={20} />
          </div>
          <div className="stat-info">
            <h4>Verified Builders</h4>
            <p>{verifiedContractors}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper warning">
            <Shield size={20} />
          </div>
          <div className="stat-info">
            <h4>Pending Verifications</h4>
            <p>{pendingVerifications.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper primary">
            <DollarSign size={20} />
          </div>
          <div className="stat-info">
            <h4>Awarded Value</h4>
            <p>${awardedValue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Publish a Tender Form */}
        <div className="glass-card" style={{ marginBottom: 0 }}>
          <h3 className="glass-card-title">
            <span>Publish New Tender</span>
            <PlusCircle size={20} style={{ color: 'var(--primary)' }} />
          </h3>
          <form onSubmit={handleCreateTender}>
            <div className="form-group">
              <label>Tender Title</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Municipal Hospital Ventilation System"
                value={newTender.title}
                onChange={e => setNewTender({ ...newTender, title: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Tender Description</label>
              <textarea 
                className="form-control" 
                placeholder="Describe project details, building standards, tech requirements..."
                value={newTender.description}
                onChange={e => setNewTender({ ...newTender, description: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Category</label>
                <select 
                  className="form-control"
                  value={newTender.category}
                  onChange={e => setNewTender({ ...newTender, category: e.target.value })}
                >
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="IT & Energy">IT & Energy</option>
                  <option value="Environmental">Environmental</option>
                  <option value="Civil Works">Civil Works</option>
                  <option value="Sewerage">Sewerage</option>
                </select>
              </div>
              <div className="form-group">
                <label>Estimated Budget ($)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="e.g. 500000"
                  value={newTender.estimatedBudget}
                  onChange={e => setNewTender({ ...newTender, estimatedBudget: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Submission Deadline</label>
                <input 
                  type="datetime-local" 
                  className="form-control"
                  value={newTender.deadline}
                  onChange={e => setNewTender({ ...newTender, deadline: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Tender Drawings/Specs (PDF/DWG)</label>
                <input 
                  type="file" 
                  className="form-control"
                  onChange={e => setTenderFile(e.target.files[0])}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={isCreating}>
              {isCreating ? 'Broadcasting Alert and Publishing...' : 'Broadcast & Publish Tender'}
            </button>
          </form>
        </div>

        {/* Contractor Verification Board */}
        <div className="glass-card" style={{ marginBottom: 0 }}>
          <h3 className="glass-card-title">
            <span>Contractor Verification Queue</span>
            <Shield size={20} style={{ color: 'var(--warning)' }} />
          </h3>
          {loadingContractors ? (
            <div style={{ color: 'var(--text-muted)' }}>Loading contractors list...</div>
          ) : pendingVerifications.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', color: 'var(--text-muted)' }}>
              <p style={{ margin: 0, fontSize: '14px' }}>No contractors awaiting verification.</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Verified suppliers can bid on published tenders.</p>
            </div>
          ) : (
            <div className="table-wrapper" style={{ maxHeight: '340px', overflowY: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Reg No.</th>
                    <th>Credentials</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingVerifications.map((con) => (
                    <tr key={con.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{con.companyName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{con.technicalCapacity || 'No capacity description'}</div>
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{con.registrationNumber}</td>
                      <td>
                        {con.verificationDocument ? (
                          <a 
                            href={`http://localhost:5000${con.verificationDocument}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: 'var(--primary)', textDecoration: 'underline' }}
                          >
                            View Docs PDF
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No documents uploaded</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button 
                            className="btn btn-success btn-sm" 
                            title="Verify profile"
                            onClick={() => handleVerifyContractor(con.id, 'verified')}
                          >
                            <Check size={14} />
                          </button>
                          <button 
                            className="btn btn-danger btn-sm" 
                            title="Reject documentation"
                            onClick={() => handleVerifyContractor(con.id, 'rejected')}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Tenders Pipeline Tracker */}
      <div className="glass-card">
        <h3 className="glass-card-title">Tender Operations & Bid Evaluations</h3>
        {loadingTenders ? (
          <div style={{ color: 'var(--text-muted)' }}>Loading tenders...</div>
        ) : tenders.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>No tenders created yet. Use the form above to publish your first procurement.</div>
        ) : (
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Tender Title</th>
                  <th>Category</th>
                  <th>Estimated Budget</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Evaluations</th>
                </tr>
              </thead>
              <tbody>
                {tenders.map((tender) => (
                  <tr key={tender.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '15px' }}>{tender.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '460px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {tender.description}
                      </div>
                    </td>
                    <td>{tender.category}</td>
                    <td style={{ fontWeight: 500 }}>${parseFloat(tender.estimatedBudget).toLocaleString()}</td>
                    <td>{new Date(tender.deadline).toLocaleDateString()} at {new Date(tender.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>
                      <span className={`badge ${tender.status}`}>
                        {tender.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleCompareBids(tender)}
                      >
                        <BarChart2 size={14} />
                        Analyze Bids
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Automatic Bid Comparison Drawer / Module */}
      {selectedTender && (
        <div className="glass-card" style={{ border: '1px solid var(--primary)' }}>
          <div className="glass-card-title">
            <div>
              <span style={{ fontSize: '12px', color: 'var(--primary)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>Automatic Comparison</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '24px' }}>{selectedTender.title}</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedTender(null)}>Close Panel</button>
          </div>

          {loadingCompare ? (
            <div style={{ color: 'var(--text-muted)' }}>Running comparison algorithms...</div>
          ) : !comparison || comparison.rankings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
              No bids have been submitted for this tender yet. Once contractors bid, they will be ranked here.
            </div>
          ) : (
            <div className="comparison-grid">
              {/* Left Side: Table of Rankings and details */}
              <div>
                <h4 style={{ margin: '0 0 16px', fontSize: '16px' }}>Computed Composite Scoring Rankings (70% Price / 30% Timeline)</h4>
                <div className="table-wrapper">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>Rank</th>
                        <th>Contractor</th>
                        <th>Price Offer</th>
                        <th>Timeline</th>
                        <th>Composite Score</th>
                        <th>Deviation</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.rankings.map((bid, index) => {
                        const isWinner = index === 0 && selectedTender.status !== 'awarded';
                        const isAwardedWinner = selectedTender.status === 'awarded' && selectedTender.awardedBidId === bid.id;
                        
                        return (
                          <tr key={bid.id} style={isAwardedWinner ? { background: 'rgba(62,207,142,0.06)' } : {}}>
                            <td>
                              <span style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifySelf: 'center',
                                justifyContent: 'center',
                                background: index === 0 ? 'var(--success)' : 'rgba(253,241,225,0.05)',
                                color: index === 0 ? '#0b1110' : 'var(--text-bright)',
                                fontWeight: 'bold',
                                fontSize: '12px'
                              }}>
                                {index + 1}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{bid.contractor.companyName}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{bid.contractor.email}</div>
                              {bid.isCheapest && <span style={{ background: 'rgba(74,185,224,0.15)', color: 'var(--primary)', fontSize: '9px', padding: '2px 4px', borderRadius: '3px', marginRight: '4px', fontWeight: 600 }}>CHEAPEST</span>}
                              {bid.isFastest && <span style={{ background: 'rgba(62,207,142,0.15)', color: 'var(--success)', fontSize: '9px', padding: '2px 4px', borderRadius: '3px', fontWeight: 600 }}>FASTEST</span>}
                            </td>
                            <td style={{ fontWeight: 600 }}>${bid.price.toLocaleString()}</td>
                            <td>{bid.duration} days</td>
                            <td>
                              <div style={{ fontWeight: 'bold', color: index === 0 ? 'var(--success)' : 'var(--text-bright)' }}>{bid.scores.totalScore} pts</div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                price: {bid.scores.priceScore} | speed: {bid.scores.durationScore}
                              </div>
                            </td>
                            <td style={{ color: bid.budgetDeviation > 0 ? 'var(--danger)' : 'var(--success)' }}>
                              {bid.budgetDeviation > 0 ? `+${bid.budgetDeviation}%` : `${bid.budgetDeviation}%`}
                            </td>
                            <td>
                              <span className={`badge ${bid.status}`}>
                                {bid.status}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {selectedTender.status !== 'awarded' ? (
                                <button 
                                  className={`btn ${index === 0 ? 'btn-success' : 'btn-secondary'} btn-sm`}
                                  onClick={() => handleAwardTender(bid.id)}
                                >
                                  Award
                                </button>
                              ) : isAwardedWinner ? (
                                <span style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignExact: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                  ✓ Contract Awarded
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Declined</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Side: Graph Comparison chart */}
              <div className="chart-card glass-card" style={{ background: 'rgba(253,241,225,0.02)', border: '1px solid var(--border-light)', margin: 0 }}>
                <h4 style={{ margin: '0 0 16px', fontSize: '15px' }}>Offers vs Estimated Budget</h4>
                <div className="bar-chart-container">
                  {/* Estimated Budget column */}
                  <div className="chart-bar-wrapper">
                    <div 
                      className="chart-bar budget" 
                      style={{ height: '70%' }}
                    >
                      <div className="chart-tooltip">${comparison.stats.estimatedBudget.toLocaleString()}</div>
                    </div>
                    <div className="chart-label">Budget</div>
                  </div>

                  {/* Bids Columns */}
                  {comparison.rankings.map((bid, index) => {
                    const budget = parseFloat(selectedTender.estimatedBudget);
                    const bidPrice = parseFloat(bid.price);
                    
                    // Normalize height relative to the max price in comparison
                    const maxVal = Math.max(comparison.stats.maxPrice, budget) * 1.1;
                    const heightPercent = Math.round((bidPrice / maxVal) * 100);
                    
                    const isWinner = index === 0;

                    return (
                      <div className="chart-bar-wrapper" key={bid.id}>
                        <div 
                          className={`chart-bar ${selectedTender.awardedBidId === bid.id || (selectedTender.status !== 'awarded' && isWinner) ? 'winner' : ''}`} 
                          style={{ height: `${heightPercent}%` }}
                        >
                          <div className="chart-tooltip">${bidPrice.toLocaleString()}</div>
                        </div>
                        <div className="chart-label" title={bid.contractor.companyName}>
                          {bid.contractor.companyName}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Estimated Budget:</span>
                    <span style={{ fontWeight: 600 }}>${comparison.stats.estimatedBudget.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Lowest Bid:</span>
                    <span style={{ fontWeight: 600, color: 'var(--success)' }}>${comparison.stats.minPrice.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Average Bid:</span>
                    <span style={{ fontWeight: 600 }}>${comparison.stats.avgPrice.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Highest Bid:</span>
                    <span style={{ fontWeight: 600, color: 'var(--danger)' }}>${comparison.stats.maxPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
