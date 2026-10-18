import React, { useState, useEffect } from 'react';
import { BACKEND_BASE_URL } from '../utils/config';
import {
  Users,
  ShieldCheck,
  Search,
  Check,
  X,
  Clock,
  AlertCircle,
  FileText,
  Mail,
  MapPin,
  Briefcase,
  Hash,
  ExternalLink,
  Award,
  Eye,
  Filter,
  CheckCircle2,
  XCircle,
  Building
} from 'lucide-react';
import { contractorsAPI, authAPI } from '../utils/api';
import toast from 'react-hot-toast';

export const ContractorsView = ({ userRole = 'admin', token }) => {
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'authorizations'
  const [contractors, setContractors] = useState([]);
  const [approvalRequests, setApprovalRequests] = useState({
    summary: { totalPending: 0, totalApproved: 0, totalRejected: 0 },
    pending: [],
    approved: [],
    rejected: [],
    all: []
  });

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'verified' | 'pending' | 'rejected'
  const [authFilter, setAuthFilter] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contractorsData, authData] = await Promise.allSettled([
        contractorsAPI.getAll(),
        authAPI.getApprovalRequests()
      ]);

      if (contractorsData.status === 'fulfilled') {
        setContractors(contractorsData.value || []);
      }
      if (authData.status === 'fulfilled') {
        setApprovalRequests(authData.value || {
          summary: { totalPending: 0, totalApproved: 0, totalRejected: 0 },
          pending: [],
          approved: [],
          rejected: [],
          all: []
        });
      }
    } catch (err) {
      console.error('Failed to load contractor data:', err);
      toast.error('Failed to load contractors list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVerify = async (id, status) => {
    setProcessingId(id);
    try {
      await contractorsAPI.verify(id, status);
      toast.success(`Contractor has been marked as ${status}.`);
      setContractors(prev =>
        prev.map(c => (c.id === id ? { ...c, verificationStatus: status } : c))
      );
      if (selectedContractor && selectedContractor.id === id) {
        setSelectedContractor(prev => ({ ...prev, verificationStatus: status }));
      }
    } catch (err) {
      toast.error(err.message || `Failed to update status to ${status}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveAuth = async (userId, userEmail, entityName) => {
    setProcessingId(`auth-${userId}`);
    try {
      await authAPI.approveUser(userId, 'Authorized contractor login access');
      toast.success(`Authorized login access for ${entityName || userEmail}`);
      const updated = await authAPI.getApprovalRequests();
      setApprovalRequests(updated);
    } catch (err) {
      toast.error(err.message || 'Failed to approve user login');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectAuth = async (userId, userEmail) => {
    const reason = window.prompt('Reason for rejecting login access:', 'Credentials do not match registry.');
    if (reason === null) return;
    setProcessingId(`auth-${userId}`);
    try {
      await authAPI.rejectUser(userId, reason);
      toast.success(`Rejected login request for ${userEmail}`);
      const updated = await authAPI.getApprovalRequests();
      setApprovalRequests(updated);
    } catch (err) {
      toast.error(err.message || 'Failed to reject user');
    } finally {
      setProcessingId(null);
    }
  };

  // Directory filter
  const filteredContractors = contractors.filter(c => {
    const matchesStatus = statusFilter === 'all' || c.verificationStatus === statusFilter;
    const q = searchTerm.toLowerCase();
    const name = (c.companyName || '').toLowerCase();
    const reg = (c.registrationNumber || '').toLowerCase();
    const gst = (c.gstNumber || '').toLowerCase();
    const city = (c.city || '').toLowerCase();
    const state = (c.state || '').toLowerCase();
    const email = (c.User?.email || '').toLowerCase();
    const matchesSearch = !searchTerm || name.includes(q) || reg.includes(q) || gst.includes(q) || city.includes(q) || state.includes(q) || email.includes(q);
    return matchesStatus && matchesSearch;
  });

  // KPI Calculations
  const totalContractors = contractors.length;
  const verifiedCount = contractors.filter(c => c.verificationStatus === 'verified').length;
  const pendingCount = contractors.filter(c => c.verificationStatus === 'pending').length;
  const rejectedCount = contractors.filter(c => c.verificationStatus === 'rejected').length;

  // Contractor-specific authorization requests
  const contractorAuthList = (authFilter === 'all'
    ? approvalRequests.all
    : approvalRequests[authFilter] || []
  ).filter(u => u.role === 'contractor');

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(2, 132, 199, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--app-text-primary)' }}>
                Contractors & Builders Directory
              </h1>
            </div>
          </div>
          <p style={{ margin: 0, color: 'var(--app-text-muted)', fontSize: '14px' }}>
            Manage registered contractors, inspect business credentials and verification documents, and govern entity authorizations.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div style={{ display: 'flex', background: 'var(--app-bg-secondary)', padding: '4px', borderRadius: '12px', border: '1px solid var(--app-border)' }}>
          <button
            onClick={() => setActiveTab('directory')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'directory' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'directory' ? '#fff' : 'var(--app-text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Users size={16} /> Directory ({totalContractors})
          </button>
          <button
            onClick={() => setActiveTab('authorizations')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'authorizations' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'authorizations' ? '#fff' : 'var(--app-text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <ShieldCheck size={16} /> Login Authorizations
            {approvalRequests.summary.totalPending > 0 && (
              <span style={{
                background: activeTab === 'authorizations' ? 'rgba(255,255,255,0.3)' : '#ef4444',
                color: '#fff',
                padding: '2px 7px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700
              }}>
                {approvalRequests.summary.totalPending}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.75rem' }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper primary">
            <Users size={20} />
          </div>
          <div className="stat-info">
            <h4>Total Registered</h4>
            <p>{totalContractors}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper success">
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-info">
            <h4>Verified Contractors</h4>
            <p>{verifiedCount}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper warning">
            <Clock size={20} />
          </div>
          <div className="stat-info">
            <h4>Pending Verification</h4>
            <p>{pendingCount}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper danger">
            <XCircle size={20} />
          </div>
          <div className="stat-info">
            <h4>Rejected / Incomplete</h4>
            <p>{rejectedCount}</p>
          </div>
        </div>
      </div>

      {/* TAB 1: CONTRACTOR DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="card" style={{ background: 'var(--app-bg-secondary)', border: '1px solid var(--app-border)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter('all')}
              >
                All ({totalContractors})
              </button>
              <button
                className={`btn btn-sm ${statusFilter === 'verified' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter('verified')}
              >
                Verified ({verifiedCount})
              </button>
              <button
                className={`btn btn-sm ${statusFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter('pending')}
              >
                Pending ({pendingCount})
              </button>
              <button
                className={`btn btn-sm ${statusFilter === 'rejected' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter('rejected')}
              >
                Rejected ({rejectedCount})
              </button>
            </div>

            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--app-text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search contractor, reg, GST, city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--app-text-muted)' }}>
              <Clock size={32} className="spin" style={{ marginBottom: '8px' }} />
              <p>Loading contractors directory...</p>
            </div>
          ) : filteredContractors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--app-text-muted)' }}>
              <Users size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--app-text-primary)', margin: '0 0 6px' }}>No contractors found</h3>
              <p style={{ fontSize: '13px', margin: 0 }}>Try adjusting your search criteria or status filter.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
              {filteredContractors.map((c) => {
                const isVerified = c.verificationStatus === 'verified';
                const isPending = c.verificationStatus === 'pending';
                const isRejected = c.verificationStatus === 'rejected';

                return (
                  <div
                    key={c.id}
                    style={{
                      background: 'var(--app-bg-primary)',
                      border: `1px solid ${isPending ? 'rgba(245, 158, 11, 0.3)' : 'var(--app-border)'}`,
                      borderRadius: '14px',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div>
                      {/* Top Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <div style={{
                            width: 42,
                            height: 42,
                            borderRadius: '10px',
                            background: isVerified ? 'rgba(16, 185, 129, 0.12)' : isPending ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: isVerified ? 'var(--success)' : isPending ? 'var(--warning)' : 'var(--danger)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '16px'
                          }}>
                            {c.companyName ? c.companyName.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                              {c.companyName || 'Unnamed Contractor'}
                            </h3>
                            <span style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>
                              Reg ID: <strong style={{ color: 'var(--app-text-secondary)' }}>{c.registrationNumber || 'N/A'}</strong>
                            </span>
                          </div>
                        </div>

                        <span className={`badge ${isVerified ? 'badge-success' : isPending ? 'badge-warning' : 'badge-danger'}`}>
                          {c.verificationStatus ? c.verificationStatus.toUpperCase() : 'PENDING'}
                        </span>
                      </div>

                      {/* Detail Chips */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: 'var(--app-text-muted)', marginBottom: '12px' }}>
                        <div>
                          <span>GST: </span>
                          <strong style={{ color: 'var(--app-text-secondary)' }}>{c.gstNumber || '—'}</strong>
                        </div>
                        <div>
                          <span>Experience: </span>
                          <strong style={{ color: 'var(--app-text-secondary)' }}>{c.yearsOfExperience || 0} years</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', gridColumn: 'span 2' }}>
                          <Mail size={12} />
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {c.User?.email || 'No email attached'}
                          </span>
                        </div>
                        {(c.city || c.state) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', gridColumn: 'span 2' }}>
                            <MapPin size={12} />
                            <span>{[c.city, c.state].filter(Boolean).join(', ')}</span>
                          </div>
                        )}
                      </div>

                      {c.technicalCapacity && (
                        <div style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--app-border)',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          fontSize: '12px',
                          color: 'var(--app-text-secondary)',
                          marginBottom: '8px',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          <strong>Capacity: </strong>{c.technicalCapacity}
                        </div>
                      )}

                      {c.verificationDocument && (
                        <div style={{ marginBottom: '8px' }}>
                          <a
                            href={`${BACKEND_BASE_URL}${c.verificationDocument}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              color: 'var(--primary)',
                              textDecoration: 'none',
                              fontWeight: 600
                            }}
                          >
                            <FileText size={14} /> Review Uploaded Document <ExternalLink size={12} />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--app-border)' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        onClick={() => setSelectedContractor(c)}
                      >
                        <Eye size={14} /> View Details
                      </button>

                      {userRole === 'admin' && (
                        <>
                          {c.verificationStatus !== 'verified' && (
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={processingId === c.id}
                              style={{ background: 'var(--success)', borderColor: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleVerify(c.id, 'verified')}
                              title="Verify Contractor Credentials"
                            >
                              <Check size={14} /> Verify
                            </button>
                          )}
                          {c.verificationStatus !== 'rejected' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={processingId === c.id}
                              style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleVerify(c.id, 'rejected')}
                              title="Reject Verification"
                            >
                              <X size={14} /> Reject
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LOGIN AUTHORIZATIONS */}
      {activeTab === 'authorizations' && (
        <div className="card" style={{ background: 'var(--app-bg-secondary)', border: '1px solid var(--app-border)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={`btn btn-sm ${authFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setAuthFilter('pending')}
              >
                Pending ({approvalRequests.summary.totalPending})
              </button>
              <button
                className={`btn btn-sm ${authFilter === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setAuthFilter('approved')}
              >
                Authorized ({approvalRequests.summary.totalApproved})
              </button>
              <button
                className={`btn btn-sm ${authFilter === 'rejected' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setAuthFilter('rejected')}
              >
                Rejected ({approvalRequests.summary.totalRejected})
              </button>
              <button
                className={`btn btn-sm ${authFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setAuthFilter('all')}
              >
                All Requests
              </button>
            </div>
          </div>

          {contractorAuthList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--app-text-muted)' }}>
              <ShieldCheck size={44} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p style={{ fontSize: '15px', fontWeight: 600 }}>No authorization requests found in this filter.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {contractorAuthList.map((user) => {
                const entityName = user.Contractor?.companyName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
                const regNumber = user.Contractor?.registrationNumber || 'N/A';
                const isPending = user.approvalStatus === 'pending';

                return (
                  <div
                    key={user.id}
                    style={{
                      padding: '16px 20px',
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
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                          {entityName}
                        </h4>
                        <span className="badge badge-primary">CONTRACTOR</span>
                        <span className={`badge ${user.approvalStatus === 'approved' ? 'badge-success' : user.approvalStatus === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                          {user.approvalStatus.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--app-text-muted)', flexWrap: 'wrap' }}>
                        <span>Reg ID: <strong>{regNumber}</strong></span>
                        <span>Email: {user.email}</span>
                        {user.phone && <span>Phone: {user.phone}</span>}
                        <span>Registered: {new Date(user.createdAt).toLocaleDateString()}</span>
                      </div>
                      {user.approvalNotes && (
                        <p style={{ margin: '6px 0 0', fontSize: '12px', color: user.approvalStatus === 'rejected' ? '#ef4444' : 'var(--success)' }}>
                          Note: {user.approvalNotes}
                        </p>
                      )}
                    </div>

                    {userRole === 'admin' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {user.approvalStatus !== 'approved' && (
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={processingId === `auth-${user.id}`}
                            onClick={() => handleApproveAuth(user.id, user.email, entityName)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Check size={14} /> Authorize Login
                          </button>
                        )}
                        {user.approvalStatus !== 'rejected' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={processingId === `auth-${user.id}`}
                            onClick={() => handleRejectAuth(user.id, user.email)}
                            style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <X size={14} /> Reject
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Contractor Full Details Modal */}
      {selectedContractor && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--app-bg-secondary)',
            border: '1px solid var(--app-border)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '620px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            position: 'relative',
            boxShadow: '0 24px 60px rgba(0,0,0,0.3)'
          }}>
            <button
              onClick={() => setSelectedContractor(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                border: 'none',
                background: 'transparent',
                color: 'var(--app-text-muted)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                background: 'rgba(2, 132, 199, 0.12)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Building size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--app-text-primary)' }}>
                  {selectedContractor.companyName}
                </h2>
                <span className={`badge ${selectedContractor.verificationStatus === 'verified' ? 'badge-success' : 'badge-warning'}`}>
                  {selectedContractor.verificationStatus ? selectedContractor.verificationStatus.toUpperCase() : 'PENDING'}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', fontSize: '13px' }}>
              <div>
                <div style={{ color: 'var(--app-text-muted)', marginBottom: '4px' }}>Registration ID</div>
                <div style={{ fontWeight: 600, color: 'var(--app-text-primary)' }}>{selectedContractor.registrationNumber || 'N/A'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--app-text-muted)', marginBottom: '4px' }}>GST Number</div>
                <div style={{ fontWeight: 600, color: 'var(--app-text-primary)' }}>{selectedContractor.gstNumber || 'N/A'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--app-text-muted)', marginBottom: '4px' }}>PAN Number</div>
                <div style={{ fontWeight: 600, color: 'var(--app-text-primary)' }}>{selectedContractor.panNumber || 'N/A'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--app-text-muted)', marginBottom: '4px' }}>Experience</div>
                <div style={{ fontWeight: 600, color: 'var(--app-text-primary)' }}>{selectedContractor.yearsOfExperience || 0} Years</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ color: 'var(--app-text-muted)', marginBottom: '4px' }}>Email Address</div>
                <div style={{ fontWeight: 600, color: 'var(--app-text-primary)' }}>{selectedContractor.User?.email || 'N/A'}</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ color: 'var(--app-text-muted)', marginBottom: '4px' }}>Address & Location</div>
                <div style={{ fontWeight: 600, color: 'var(--app-text-primary)' }}>
                  {[selectedContractor.address, selectedContractor.city, selectedContractor.state, selectedContractor.pincode].filter(Boolean).join(', ') || 'No address provided'}
                </div>
              </div>
              {selectedContractor.technicalCapacity && (
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ color: 'var(--app-text-muted)', marginBottom: '4px' }}>Technical Capacity</div>
                  <div style={{ background: 'var(--app-bg-primary)', padding: '10px 14px', borderRadius: '8px', color: 'var(--app-text-secondary)', lineHeight: 1.5 }}>
                    {selectedContractor.technicalCapacity}
                  </div>
                </div>
              )}
              {selectedContractor.verificationDocument && (
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ color: 'var(--app-text-muted)', marginBottom: '4px' }}>Verification Document</div>
                  <a
                    href={`${BACKEND_BASE_URL}${selectedContractor.verificationDocument}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <FileText size={14} /> Open Document File <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            {userRole === 'admin' && (
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--app-border)' }}>
                {selectedContractor.verificationStatus !== 'verified' && (
                  <button
                    className="btn btn-primary"
                    style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
                    onClick={() => handleVerify(selectedContractor.id, 'verified')}
                  >
                    <Check size={16} /> Mark as Verified
                  </button>
                )}
                {selectedContractor.verificationStatus !== 'rejected' && (
                  <button
                    className="btn btn-secondary"
                    style={{ color: '#ef4444' }}
                    onClick={() => handleVerify(selectedContractor.id, 'rejected')}
                  >
                    <X size={16} /> Mark as Rejected
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default ContractorsView;
