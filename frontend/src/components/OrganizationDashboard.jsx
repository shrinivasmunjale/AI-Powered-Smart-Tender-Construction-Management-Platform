import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  DollarSign, 
  Award, 
  ChevronRight, 
  Check, 
  X, 
  PlusCircle, 
  BarChart2, 
  Building2, 
  Upload, 
  Calendar, 
  Tag, 
  FileCheck,
  TrendingUp,
  Clock,
  Sparkles
} from 'lucide-react';

export default function OrganizationDashboard({ token }) {
  const [tenders, setTenders] = useState([]);
  const [selectedTender, setSelectedTender] = useState(null);
  const [comparison, setComparison] = useState(null);
  
  // Form states for creating tender
  const [newTender, setNewTender] = useState({
    title: '',
    description: '',
    category: 'Infrastructure',
    estimatedBudget: '',
    deadline: '',
    status: 'published'
  });
  const [tenderFile, setTenderFile] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingTenders, setLoadingTenders] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Fetch Tenders
  const fetchTenders = async () => {
    setLoadingTenders(true);
    try {
      const res = await fetch('http://localhost:5000/api/tenders?mine=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTenders(data);
      }
    } catch (err) {
      console.error('Error fetching tenders:', err);
    } finally {
      setLoadingTenders(false);
    }
  };

  useEffect(() => {
    fetchTenders();
  }, [token]);

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
        setFeedbackMsg('New tender successfully published! Broadcast notifications sent to registered builders & contractors.');
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
        setShowCreateModal(false);
        fetchTenders();
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
    if (!window.confirm('Are you sure you want to award this tender? This will notify the winner and decline other contractor submissions.')) {
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
        setFeedbackMsg('Tender successfully awarded! Winner has been notified via email and SMS.');
        setTimeout(() => setFeedbackMsg(''), 5000);
        handleCompareBids(selectedTender);
        fetchTenders();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to award tender.');
      }
    } catch (err) {
      console.error('Error awarding tender:', err);
    }
  };

  // KPIs
  const totalTenders = tenders.length;
  const activeTenders = tenders.filter(t => t.status === 'published').length;
  const awardedTenders = tenders.filter(t => t.status === 'awarded').length;
  const totalBudget = tenders.reduce((acc, t) => acc + (parseFloat(t.estimatedBudget) || 0), 0);

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--app-text-primary)' }}>
            Organization Procurement Portal
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--app-text-muted)', fontSize: '14px' }}>
            Issue public tenders, review contractor proposals, run AI bid comparisons, and award contracts.
          </p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', fontWeight: 600 }}
        >
          <PlusCircle size={18} /> Publish New Tender
        </button>
      </div>

      {feedbackMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid var(--success)',
          color: 'var(--success)',
          padding: '14px 18px',
          borderRadius: '10px',
          marginBottom: '24px',
          fontSize: '14px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Check size={18} /> {feedbackMsg}
        </div>
      )}

      {/* KPIs Grid */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
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
            <TrendingUp size={20} />
          </div>
          <div className="stat-info">
            <h4>Active / Bidding</h4>
            <p>{activeTenders}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper warning">
            <Award size={20} />
          </div>
          <div className="stat-info">
            <h4>Awarded Contracts</h4>
            <p>{awardedTenders}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper info">
            <DollarSign size={20} />
          </div>
          <div className="stat-info">
            <h4>Allocated Budget</h4>
            <p>${(totalBudget / 1000000).toFixed(2)}M</p>
          </div>
        </div>
      </div>

      {/* Main Content Layout: Tenders List + Compare Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedTender ? '1.1fr 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Tenders Management List */}
        <div className="card" style={{ background: 'var(--app-bg-secondary)', border: '1px solid var(--app-border)', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
              Published Tenders ({tenders.length})
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={fetchTenders}>
              Refresh
            </button>
          </div>

          {loadingTenders ? (
            <p style={{ color: 'var(--app-text-muted)' }}>Loading tenders...</p>
          ) : tenders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--app-text-muted)' }}>
              <FileText size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p>No tenders published yet. Click "Publish New Tender" to launch your first procurement RFP.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tenders.map((tender) => {
                const isSelected = selectedTender?.id === tender.id;
                return (
                  <div
                    key={tender.id}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: isSelected ? 'rgba(2, 132, 199, 0.08)' : 'var(--app-bg-primary)',
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--app-border)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onClick={() => handleCompareBids(tender)}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span className={`badge ${tender.status === 'published' ? 'badge-success' : tender.status === 'awarded' ? 'badge-info' : 'badge-warning'}`}>
                          {tender.status.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>
                          {tender.category}
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                        {tender.title}
                      </h4>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--app-text-muted)' }}>
                        <span>Budget: <strong>${Number(tender.estimatedBudget).toLocaleString()}</strong></span>
                        <span>Deadline: {new Date(tender.deadline).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={(e) => { e.stopPropagation(); handleCompareBids(tender); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <span>Review Bids</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Tender Bid Evaluation Panel */}
        {selectedTender && (
          <div className="card" style={{ background: 'var(--app-bg-secondary)', border: '1px solid var(--app-border)', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <span className="badge badge-info" style={{ marginBottom: '6px' }}>AI BID COMPARISON</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                  {selectedTender.title}
                </h3>
                <p style={{ margin: '4px 0 0', color: 'var(--app-text-muted)', fontSize: '13px' }}>
                  Budget: ${Number(selectedTender.estimatedBudget).toLocaleString()} • Status: {selectedTender.status}
                </p>
              </div>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedTender(null)}
              >
                Close
              </button>
            </div>

            {loadingCompare ? (
              <p style={{ color: 'var(--app-text-muted)' }}>Running multi-contractor bid evaluation...</p>
            ) : !comparison || comparison.rankings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--app-text-muted)' }}>
                <Clock size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <p>No contractor bids submitted yet for this tender.</p>
                <p style={{ fontSize: '12px' }}>Registered contractors have been notified to submit proposals.</p>
              </div>
            ) : (
              <div>
                {/* Stats Summary Bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: 'var(--app-bg-primary)', padding: '12px', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid var(--app-border)' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>Submissions</span>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{comparison.stats.bidCount}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>Lowest Bid</span>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: 'var(--success)' }}>
                      ${comparison.stats.minPrice.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>Average Bid</span>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>
                      ${comparison.stats.avgPrice.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Ranked Proposals */}
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--app-text-muted)', marginBottom: '10px' }}>
                  Ranked Contractor Proposals (Price 70% + Speed 30%)
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {comparison.rankings.map((bid, index) => {
                    const isWinning = selectedTender.status === 'awarded' && selectedTender.awardedBidId === bid.id;
                    return (
                      <div 
                        key={bid.id}
                        style={{
                          padding: '14px',
                          borderRadius: '10px',
                          background: isWinning ? 'rgba(16, 185, 129, 0.08)' : 'var(--app-bg-primary)',
                          border: `1px solid ${isWinning ? 'var(--success)' : 'var(--app-border)'}`,
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ 
                                width: 22, 
                                height: 22, 
                                borderRadius: '50%', 
                                background: index === 0 ? '#f59e0b' : 'var(--app-border)', 
                                color: index === 0 ? '#fff' : 'var(--app-text-muted)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: 700
                              }}>
                                #{index + 1}
                              </span>
                              <strong style={{ fontSize: '15px', color: 'var(--app-text-primary)' }}>
                                {bid.contractor.companyName}
                              </strong>
                              {isWinning && (
                                <span className="badge badge-success">AWARDED WINNER</span>
                              )}
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginLeft: '30px' }}>
                              Reg: {bid.contractor.registrationNumber}
                            </span>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--app-text-primary)' }}>
                              ${bid.price.toLocaleString()}
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>
                              Duration: {bid.duration} days
                            </span>
                          </div>
                        </div>

                        <p style={{ fontSize: '13px', color: 'var(--app-text-secondary)', margin: '8px 0 12px', lineHeight: '1.5' }}>
                          "{bid.technicalProposal}"
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--app-border)', paddingTop: '10px' }}>
                          <div style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>
                            AI Composite Score: <strong>{bid.scores.totalScore} / 100</strong> (Price: {bid.scores.priceScore}, Speed: {bid.scores.durationScore})
                          </div>

                          {selectedTender.status !== 'awarded' && (
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleAwardTender(bid.id)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                            >
                              <Award size={14} /> Award Contract
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Publish Tender Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--app-bg-secondary)',
            border: '1px solid var(--app-border)',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(2, 132, 199, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PlusCircle size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                    Publish New Tender
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>Broadcast RFP specifications to verified builders</span>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTender} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--app-text-primary)' }}>
                  Tender Title *
                </label>
                <input 
                  type="text"
                  className="form-control"
                  placeholder="e.g., Downtown Metro Corridor Structural Reinforcement"
                  value={newTender.title}
                  onChange={(e) => setNewTender({ ...newTender, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--app-text-primary)' }}>
                    Category *
                  </label>
                  <select 
                    className="form-control"
                    value={newTender.category}
                    onChange={(e) => setNewTender({ ...newTender, category: e.target.value })}
                  >
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Civil Works">Civil Works</option>
                    <option value="Electrical & Power">Electrical & Power</option>
                    <option value="Water & Sanitation">Water & Sanitation</option>
                    <option value="Urban Development">Urban Development</option>
                    <option value="IT & Smart Grid">IT & Smart Grid</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--app-text-primary)' }}>
                    Estimated Budget ($ USD) *
                  </label>
                  <input 
                    type="number"
                    className="form-control"
                    placeholder="e.g. 1500000"
                    value={newTender.estimatedBudget}
                    onChange={(e) => setNewTender({ ...newTender, estimatedBudget: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--app-text-primary)' }}>
                  Submission Deadline *
                </label>
                <input 
                  type="date"
                  className="form-control"
                  value={newTender.deadline}
                  onChange={(e) => setNewTender({ ...newTender, deadline: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--app-text-primary)' }}>
                  Technical Description & Requirements *
                </label>
                <textarea 
                  className="form-control"
                  rows={3}
                  placeholder="Outline engineering scope, compliance standards, material grades, and contractor qualifications required."
                  value={newTender.description}
                  onChange={(e) => setNewTender({ ...newTender, description: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--app-text-primary)' }}>
                  RFP Specification Document (PDF/Docs)
                </label>
                <input 
                  type="file"
                  className="form-control"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setTenderFile(e.target.files[0])}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isCreating}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  {isCreating ? 'Publishing...' : 'Broadcast & Publish Tender'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
