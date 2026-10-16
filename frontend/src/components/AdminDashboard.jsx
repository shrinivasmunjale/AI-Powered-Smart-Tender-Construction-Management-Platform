import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Building2, 
  FileText, 
  Check, 
  X, 
  Clock, 
  AlertCircle, 
  Eye, 
  Activity, 
  Calendar, 
  Phone, 
  Mail, 
  Hash, 
  Search,
  Filter
} from 'lucide-react';

export default function AdminDashboard({ token }) {
  const [activeTab, setActiveTab] = useState('authorizations'); // 'authorizations' | 'tender_activity'
  const [approvalFilter, setApprovalFilter] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'
  
  // Data states
  const [requestsData, setRequestsData] = useState({
    summary: { totalPending: 0, totalApproved: 0, totalRejected: 0, totalUsers: 0 },
    pending: [],
    approved: [],
    rejected: [],
    all: []
  });
  const [tenders, setTenders] = useState([]);
  const [selectedTender, setSelectedTender] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Fetch Authorization Requests
  const fetchAuthorizations = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/approval-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequestsData(data);
      }
    } catch (err) {
      console.error('Error fetching approval requests:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch All Tenders for Activity Monitoring
  const fetchTenders = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/tenders', {
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

  useEffect(() => {
    fetchAuthorizations();
    fetchTenders();
  }, [token]);

  // Handle Approve User
  const handleApproveUser = async (userId, userEmail, entityName) => {
    setProcessingId(userId);
    try {
      const res = await fetch(`http://localhost:5000/api/auth/approve-user/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes: 'Verified credentials and authorized by Administrator.' })
      });

      if (res.ok) {
        setFeedbackMsg(`Successfully authorized login access for ${entityName || userEmail}!`);
        setTimeout(() => setFeedbackMsg(''), 5000);
        fetchAuthorizations();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to approve user.');
      }
    } catch (err) {
      console.error('Error approving user:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Reject User
  const handleRejectUser = async (userId, userEmail) => {
    const reason = window.prompt('Enter reason for rejecting this authorization request:', 'Verification details do not match official registry.');
    if (reason === null) return; // user cancelled

    setProcessingId(userId);
    try {
      const res = await fetch(`http://localhost:5000/api/auth/reject-user/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes: reason })
      });

      if (res.ok) {
        setFeedbackMsg(`Authorization request for ${userEmail} was rejected.`);
        setTimeout(() => setFeedbackMsg(''), 5000);
        fetchAuthorizations();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to reject user.');
      }
    } catch (err) {
      console.error('Error rejecting user:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Current list filtered by tab status
  const currentList = approvalFilter === 'all' 
    ? requestsData.all 
    : requestsData[approvalFilter] || [];

  const filteredUsers = currentList.filter(u => {
    const q = searchTerm.toLowerCase();
    const entity = (u.organizationName || u.Contractor?.companyName || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const reg = (u.registrationNumber || u.Contractor?.registrationNumber || '').toLowerCase();
    return entity.includes(q) || email.includes(q) || reg.includes(q);
  });

  return (
    <div className="admin-dashboard">
      
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(2, 132, 199, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={20} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--app-text-primary)' }}>
            Administrator Authorization & Oversight Portal
          </h2>
        </div>
        <p style={{ margin: 0, color: 'var(--app-text-muted)', fontSize: '14px' }}>
          Review registration credentials, authorize login access for Organizations and Contractors/Builders, and observe platform tender activities.
        </p>
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

      {/* KPI Stats */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper warning">
            <Clock size={20} />
          </div>
          <div className="stat-info">
            <h4>Pending Approvals</h4>
            <p>{requestsData.summary.totalPending}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper success">
            <ShieldCheck size={20} />
          </div>
          <div className="stat-info">
            <h4>Authorized Entities</h4>
            <p>{requestsData.summary.totalApproved}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper info">
            <Activity size={20} />
          </div>
          <div className="stat-info">
            <h4>Active Tenders</h4>
            <p>{tenders.filter(t => t.status === 'published').length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper primary">
            <FileText size={20} />
          </div>
          <div className="stat-info">
            <h4>Total Platform Tenders</h4>
            <p>{tenders.length}</p>
          </div>
        </div>
      </div>

      {/* Top Navigation Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--app-border)', marginBottom: '1.5rem', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('authorizations')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'authorizations' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'authorizations' ? '#ffffff' : 'var(--app-text-muted)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <ShieldCheck size={18} />
          <span>Entity Login Authorizations</span>
          {requestsData.summary.totalPending > 0 && (
            <span style={{ 
              background: activeTab === 'authorizations' ? 'rgba(255,255,255,0.3)' : '#ef4444', 
              color: '#ffffff', 
              padding: '2px 8px', 
              borderRadius: '999px', 
              fontSize: '11px', 
              fontWeight: 700 
            }}>
              {requestsData.summary.totalPending}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tender_activity')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'tender_activity' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'tender_activity' ? '#ffffff' : 'var(--app-text-muted)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <Activity size={18} />
          <span>Tender Activity Oversight (Read-Only)</span>
        </button>
      </div>

      {/* TAB 1: AUTHORIZATIONS & ACCOUNT APPROVALS */}
      {activeTab === 'authorizations' && (
        <div className="card" style={{ background: 'var(--app-bg-secondary)', border: '1px solid var(--app-border)', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          
          {/* Sub-filter bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={`btn btn-sm ${approvalFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setApprovalFilter('pending')}
              >
                Pending ({requestsData.summary.totalPending})
              </button>
              <button
                className={`btn btn-sm ${approvalFilter === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setApprovalFilter('approved')}
              >
                Authorized ({requestsData.summary.totalApproved})
              </button>
              <button
                className={`btn btn-sm ${approvalFilter === 'rejected' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setApprovalFilter('rejected')}
              >
                Rejected ({requestsData.summary.totalRejected})
              </button>
              <button
                className={`btn btn-sm ${approvalFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setApprovalFilter('all')}
              >
                All Entities
              </button>
            </div>

            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--app-text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search entity, email, reg no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '34px', height: '38px', fontSize: '13px' }}
              />
            </div>
          </div>

          {loading ? (
            <p style={{ color: 'var(--app-text-muted)' }}>Loading authorization requests...</p>
          ) : filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--app-text-muted)' }}>
              <ShieldCheck size={42} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p style={{ fontSize: '15px', fontWeight: 600 }}>No authorization requests found in this category.</p>
              <p style={{ fontSize: '13px' }}>When new Corporations or Organizations register, their credentials will appear here for review.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredUsers.map((user) => {
                const entityName = user.organizationName || user.Contractor?.companyName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
                const regNumber = user.registrationNumber || user.Contractor?.registrationNumber || 'N/A';
                const isOrg = user.role === 'organization';
                const isPending = user.approvalStatus === 'pending';

                return (
                  <div
                    key={user.id}
                    style={{
                      padding: '18px',
                      borderRadius: '12px',
                      background: 'var(--app-bg-primary)',
                      border: `1px solid ${isPending ? 'rgba(245, 158, 11, 0.3)' : 'var(--app-border)'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      <div style={{ 
                        width: 44, 
                        height: 44, 
                        borderRadius: '12px', 
                        background: isOrg ? 'rgba(99, 102, 241, 0.12)' : 'rgba(16, 185, 129, 0.12)', 
                        color: isOrg ? '#6366f1' : 'var(--success)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {isOrg ? <Building2 size={22} /> : <Users size={22} />}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                            {entityName}
                          </h4>
                          <span className={`badge ${isOrg ? 'badge-info' : 'badge-primary'}`}>
                            {isOrg ? 'ORGANIZATION (ISSUER)' : 'BUILDER / CONTRACTOR'}
                          </span>
                          <span className={`badge ${user.approvalStatus === 'approved' ? 'badge-success' : user.approvalStatus === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                            {user.approvalStatus.toUpperCase()}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '18px', fontSize: '13px', color: 'var(--app-text-muted)', flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Hash size={13} /> Reg ID: <strong>{regNumber}</strong>
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={13} /> {user.email}
                          </span>
                          {user.phone && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={13} /> {user.phone}
                            </span>
                          )}
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={13} /> Registered: {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {user.Contractor?.technicalCapacity && (
                          <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--app-text-secondary)', fontStyle: 'italic' }}>
                            Capacity: "{user.Contractor.technicalCapacity}"
                          </p>
                        )}
                        {user.approvalNotes && (
                          <p style={{ margin: '6px 0 0', fontSize: '12px', color: user.approvalStatus === 'rejected' ? '#ef4444' : 'var(--success)' }}>
                            Note: {user.approvalNotes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons for Admin Authorization */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {user.approvalStatus !== 'approved' && (
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={processingId === user.id}
                          onClick={() => handleApproveUser(user.id, user.email, entityName)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                        >
                          <Check size={14} /> Authorize & Approve Login
                        </button>
                      )}

                      {user.approvalStatus !== 'rejected' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={processingId === user.id}
                          onClick={() => handleRejectUser(user.id, user.email)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#ef4444' }}
                        >
                          <X size={14} /> Reject
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TENDER ACTIVITY MONITOR (READ-ONLY OVERSIGHT) */}
      {activeTab === 'tender_activity' && (
        <div className="card" style={{ background: 'var(--app-bg-secondary)', border: '1px solid var(--app-border)', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--app-text-primary)' }}>
              Platform Tender Activity Stream (Read-Only)
            </h3>
            <p style={{ margin: '4px 0 0', color: 'var(--app-text-muted)', fontSize: '13px' }}>
              Admin oversight: Observe all live, evaluating, and awarded tenders published by Organizations.
            </p>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Tender Title</th>
                  <th>Category</th>
                  <th>Issuing Organization</th>
                  <th>Allocated Budget</th>
                  <th>Submission Deadline</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tenders.map((tender) => (
                  <tr key={tender.id}>
                    <td>
                      <strong style={{ color: 'var(--app-text-primary)' }}>{tender.title}</strong>
                      <div style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>ID: #{tender.id}</div>
                    </td>
                    <td>{tender.category}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                        {tender.organizationName || 'Department of Public Works'}
                      </span>
                    </td>
                    <td>
                      <strong>${Number(tender.estimatedBudget).toLocaleString()}</strong>
                    </td>
                    <td>{new Date(tender.deadline).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${tender.status === 'published' ? 'badge-success' : tender.status === 'awarded' ? 'badge-info' : 'badge-warning'}`}>
                        {tender.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
