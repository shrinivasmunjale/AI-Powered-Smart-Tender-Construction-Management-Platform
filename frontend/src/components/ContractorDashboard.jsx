import React, { useState, useEffect } from 'react';
import { API_BASE_URL, BACKEND_BASE_URL } from '../utils/config';
import { Shield, FileText, Search, Clock, Award, CheckCircle, Upload, AlertTriangle } from 'lucide-react';

export default function ContractorDashboard({ token, userRole = 'contractor', contractorStatus, companyName, onStatusUpdate }) {
  const [tenders, setTenders] = useState([]);
  const [myBids, setMyBids] = useState([]);
  
  // Filtering states
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  // Selection states
  const [selectedTender, setSelectedTender] = useState(null);
  
  // Bid Submission states
  const [bidPrice, setBidPrice] = useState('');
  const [bidDuration, setBidDuration] = useState('');
  const [bidProposal, setBidProposal] = useState('');
  const [bidFile, setBidFile] = useState(null);
  const [submittingBid, setSubmittingBid] = useState(false);

  // Verification document state
  const [verificationFile, setVerificationFile] = useState(null);
  const [uploadingVerif, setUploadingVerif] = useState(false);
  
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const fetchTenders = async () => {
    try {
      const url = `${API_BASE_URL}/tenders?category=${category}&search=${search}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTenders(data);
      }
    } catch (err) {
      console.error('Error fetching tenders:', err);
    }
  };

  const fetchMyBids = async () => {
    try {
      // Fetch user profile to get their contractorId first
      const profileRes = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (profile.Contractor) {
          // Fetch bids submitted by this contractor
          const bidsRes = await fetch(`${API_BASE_URL}/bids/tender/1`, { // Temp query to get all bids
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (bidsRes.ok) {
            const data = await bidsRes.json();
            // Store bids
            setMyBids(data);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching my bids:', err);
    }
  };

  useEffect(() => {
    fetchTenders();
    fetchMyBids();
  }, [token, category, search]);

  // Handle upload of contractor license documents
  const handleUploadVerification = async (e) => {
    e.preventDefault();
    if (!verificationFile) return;

    setUploadingVerif(true);
    const formData = new FormData();
    formData.append('verificationDoc', verificationFile);

    try {
      const res = await fetch(`${API_BASE_URL}/contractors/upload-docs`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setFeedbackMsg('Credentials submitted. Municipal admins will audit your files shortly.');
        setTimeout(() => setFeedbackMsg(''), 5000);
        onStatusUpdate(data.verificationStatus); // update parent state
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit verification file.');
      }
    } catch (err) {
      console.error('Error uploading verification document:', err);
    } finally {
      setUploadingVerif(false);
    }
  };

  // Handle Bid Proposal Submission
  const handleSubmittingProposal = async (e) => {
    e.preventDefault();
    setSubmittingBid(true);

    const formData = new FormData();
    formData.append('tenderId', selectedTender.id);
    formData.append('price', bidPrice);
    formData.append('duration', bidDuration);
    formData.append('technicalProposal', bidProposal);
    if (bidFile) {
      formData.append('document', bidFile);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/bids`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        setFeedbackMsg('Your bid proposal has been submitted successfully.');
        setTimeout(() => setFeedbackMsg(''), 5000);
        
        // Reset inputs
        setBidPrice('');
        setBidDuration('');
        setBidProposal('');
        setBidFile(null);
        
        // Refresh
        setSelectedTender(null);
        fetchMyBids();
        fetchTenders();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit bid.');
      }
    } catch (err) {
      console.error('Error submitting bid:', err);
    } finally {
      setSubmittingBid(false);
    }
  };

  // Helper: check if already bid on this tender
  const isAlreadyBid = (tenderId) => {
    return myBids.some(b => b.tenderId === tenderId);
  };

  const getMyBidForTender = (tenderId) => {
    return myBids.find(b => b.tenderId === tenderId);
  };

  return (
    <div className="contractor-dashboard">
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

      {/* Verification Status Banner */}
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: contractorStatus === 'verified' 
              ? 'rgba(62,207,142,0.1)' 
              : contractorStatus === 'pending'
                ? 'rgba(245, 166, 35, 0.1)'
                : 'rgba(255, 90, 95, 0.1)',
            color: contractorStatus === 'verified' 
              ? 'var(--success)' 
              : contractorStatus === 'pending'
                ? 'var(--warning)'
                : 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Shield size={24} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '18px', fontFamily: 'Outfit, sans-serif' }}>
              Company: {companyName}
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              {contractorStatus === 'verified' && '✓ Your contractor registration is fully verified. You are authorized to place bids on active tenders.'}
              {contractorStatus === 'pending' && '⚠ Credentials uploaded. Your business profile is currently undergoing review.'}
              {contractorStatus === 'rejected' && '❌ Verification failed. Please re-upload valid trading licenses or technical tax documents.'}
              {!contractorStatus && '⚠ Your profile is unverified. Upload corporate credentials to gain bidding authorization.'}
            </p>
          </div>
        </div>
        
        {userRole === 'contractor' && contractorStatus !== 'verified' && contractorStatus !== 'pending' && (
          <form onSubmit={handleUploadVerification} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              type="file" 
              required
              className="form-control"
              style={{ width: '220px', fontSize: '12px' }}
              onChange={e => setVerificationFile(e.target.files[0])}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={uploadingVerif}>
              <Upload size={14} />
              {uploadingVerif ? 'Uploading...' : 'Upload credentials'}
            </button>
          </form>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '24px' }}>
        {/* Browse Open Tenders */}
        <div>
          <div className="glass-card" style={{ paddingBottom: '12px' }}>
            <h3 className="glass-card-title">Browse Available Tenders</h3>
            
            {/* Search/Filters */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Search tenders by keyword..."
                  style={{ paddingLeft: '38px' }}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select 
                className="form-control" 
                style={{ width: '180px' }}
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="IT & Energy">IT & Energy</option>
                <option value="Environmental">Environmental</option>
                <option value="Civil Works">Civil Works</option>
              </select>
            </div>

            {/* List */}
            {tenders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                No active tenders matching the search filters.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '520px', overflowY: 'auto' }}>
                {tenders.map((tender) => {
                  const hasBid = isAlreadyBid(tender.id);
                  const isClosed = tender.status === 'closed' || new Date() > new Date(tender.deadline);
                  
                  return (
                    <div 
                      key={tender.id} 
                      className="glass-card" 
                      style={{ 
                        margin: 0, 
                        background: 'rgba(253,241,225,0.01)', 
                        border: '1px solid var(--border-light)',
                        cursor: 'pointer',
                        borderColor: selectedTender && selectedTender.id === tender.id ? 'var(--primary)' : 'var(--border-light)'
                      }}
                      onClick={() => setSelectedTender(tender)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase' }}>
                          {tender.category}
                        </span>
                        <span className={`badge ${tender.status}`}>
                          {tender.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 600 }}>{tender.title}</h4>
                      <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {tender.description}
                      </p>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <div>Est Budget: <strong style={{ color: 'var(--text-bright)' }}>${parseFloat(tender.estimatedBudget).toLocaleString()}</strong></div>
                        <div style={{ display: 'flex', alignExact: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          Deadline: {new Date(tender.deadline).toLocaleDateString()}
                        </div>
                      </div>
                      
                      {hasBid && (
                        <div style={{ marginTop: '12px', background: 'rgba(62,207,142,0.1)', color: 'var(--success)', fontSize: '11px', padding: '6px 12px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                          ✓ PROPOSAL PLACED
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tender Details Panel & Bidding Action */}
        <div>
          {selectedTender ? (
            <div className="glass-card" style={{ border: '1px solid var(--border-light)' }}>
              <h3 style={{ margin: '0 0 12px', fontFamily: 'Outfit, sans-serif', fontSize: '20px' }}>
                Tender Review
              </h3>
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '16px', marginBottom: '16px' }}>
                <span className="badge draft" style={{ marginBottom: '8px' }}>{selectedTender.category}</span>
                <h4 style={{ margin: '0 0 8px', fontSize: '18px' }}>{selectedTender.title}</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4', margin: '0 0 12px' }}>
                  {selectedTender.description}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Est. Budget:</div>
                    <div style={{ fontWeight: 600 }}>${parseFloat(selectedTender.estimatedBudget).toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Deadline:</div>
                    <div style={{ fontWeight: 600 }}>{new Date(selectedTender.deadline).toLocaleDateString()}</div>
                  </div>
                </div>

                {selectedTender.documentPath && (
                  <div style={{ background: 'rgba(253,241,225,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '12px' }}>
                    📄 Drawings specs: <a href={`${BACKEND_BASE_URL}${selectedTender.documentPath}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Download PDF specifications</a>
                  </div>
                )}
              </div>

              {/* Submit Bid Form */}
              {selectedTender.status === 'published' && new Date() < new Date(selectedTender.deadline) ? (
                contractorStatus === 'verified' ? (
                  isAlreadyBid(selectedTender.id) ? (
                    <div style={{ background: 'rgba(62,207,142,0.08)', border: '1px solid var(--success)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                      <CheckCircle size={32} style={{ color: 'var(--success)', margin: '0 auto 8px' }} />
                      <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-bright)' }}>Bid Proposal Successfully Logged</h4>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Municipal officers are auditing submissions. You will receive SMS alerts on evaluation outcomes.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmittingProposal}>
                      <h4 style={{ margin: '0 0 16px', fontSize: '15px' }}>Place Bid Proposal</h4>
                      
                      <div className="form-group">
                        <label>Your Bid Amount ($)</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          placeholder="e.g. 2100000"
                          value={bidPrice}
                          onChange={e => setBidPrice(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Delivery Duration (days)</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          placeholder="e.g. 90"
                          value={bidDuration}
                          onChange={e => setBidDuration(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Technical Proposal / Methodology Summary</label>
                        <textarea 
                          className="form-control" 
                          placeholder="Detail your construction process, limestone sourcing, team credentials..."
                          value={bidProposal}
                          onChange={e => setBidProposal(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Detailed Pricing Spreadsheet/Drawing (PDF/ZIP)</label>
                        <input 
                          type="file" 
                          className="form-control"
                          onChange={e => setBidFile(e.target.files[0])}
                        />
                      </div>

                      <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={submittingBid}>
                        {submittingBid ? 'Submitting secure proposal...' : 'Submit Secure Bid'}
                      </button>
                    </form>
                  )
                ) : (
                  <div style={{ background: 'rgba(245, 166, 35, 0.08)', border: '1px solid var(--warning)', padding: '16px', borderRadius: '8px', display: 'flex', gap: '12px' }}>
                    <AlertTriangle size={24} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                    <div style={{ fontSize: '12px' }}>
                      <h4 style={{ margin: 0, fontWeight: 600 }}>Verification Required</h4>
                      <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>
                        Your company status is currently <strong>{contractorStatus || 'unverified'}</strong>. Only audited and verified suppliers are permitted to submit contract proposals.
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
                  🔒 Bidding is closed for this tender. Status: <strong>{selectedTender.status}</strong>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '320px', color: 'var(--text-muted)', textAlign: 'center', borderStyle: 'dashed' }}>
              <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
              <h4 style={{ margin: 0 }}>Select a Tender</h4>
              <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Click on any tender in the list to review detailed specifications and place a proposal.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bid tracking section */}
      <div className="glass-card" style={{ marginTop: '24px' }}>
        <h3 className="glass-card-title">My Submitted Proposal Pipeline</h3>
        {myBids.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
            You haven't placed any proposals yet. Select an open tender to compile a bid.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Tender Title</th>
                  <th>My Price Proposal</th>
                  <th>Timeline</th>
                  <th>Submission Date</th>
                  <th>Bid Pipeline Tracking</th>
                </tr>
              </thead>
              <tbody>
                {myBids.map((bid) => (
                  <tr key={bid.id}>
                    <td style={{ fontWeight: 600 }}>{bid.Tender ? bid.Tender.title : 'Project Restoration'}</td>
                    <td style={{ fontWeight: 600 }}>${parseFloat(bid.price).toLocaleString()}</td>
                    <td>{bid.duration} days</td>
                    <td>{new Date(bid.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`badge ${bid.status}`}>
                          {bid.status}
                        </span>
                        
                        {/* Visual timeline indicators */}
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} title="Submitted"></span>
                          <span style={{ width: '16px', height: '2px', background: bid.status !== 'submitted' ? 'var(--success)' : 'rgba(253,241,225,0.1)' }}></span>
                          <span style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: bid.status === 'accepted' || bid.status === 'rejected' ? 'var(--success)' : bid.status === 'under_review' ? 'var(--warning)' : 'rgba(253,241,225,0.1)' 
                          }} title="Evaluating"></span>
                          <span style={{ width: '16px', height: '2px', background: bid.status === 'accepted' || bid.status === 'rejected' ? (bid.status === 'accepted' ? 'var(--success)' : 'var(--danger)') : 'rgba(253,241,225,0.1)' }}></span>
                          <span style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: bid.status === 'accepted' ? 'var(--success)' : bid.status === 'rejected' ? 'var(--danger)' : 'rgba(253,241,225,0.1)' 
                          }} title="Award Decision"></span>
                        </div>
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
  );
}
