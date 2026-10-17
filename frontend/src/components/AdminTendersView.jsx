import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  PlusCircle,
  Eye,
  CheckCircle,
  Clock,
  DollarSign,
  Building2,
  Calendar,
  X,
  Award,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Download
} from 'lucide-react';
import { tendersAPI, bidsAPI } from '../utils/api';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'All',
  'Infrastructure',
  'Construction',
  'Highway',
  'Healthcare',
  'Education',
  'Electrical',
  'Water Works',
  'IT & Technology'
];

export const AdminTendersView = ({ token }) => {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [selectedTender, setSelectedTender] = useState(null);
  const [tenderBids, setTenderBids] = useState([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Infrastructure',
    estimatedBudget: '',
    deadline: '',
    status: 'published'
  });

  const fetchTenders = async () => {
    setLoading(true);
    try {
      const data = await tendersAPI.getAll();
      setTenders(data || []);
    } catch (err) {
      console.error('Failed to fetch tenders:', err);
      toast.error('Failed to load tenders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenders();
  }, []);

  const handleOpenDetails = async (tender) => {
    setSelectedTender(tender);
    setLoadingBids(true);
    try {
      const bids = await bidsAPI.getByTender(tender.id);
      setTenderBids(bids || []);
    } catch (err) {
      console.error('Failed to load tender bids:', err);
      setTenderBids([]);
    } finally {
      setLoadingBids(false);
    }
  };

  const handleStatusChange = async (tenderId, newStatus) => {
    try {
      await tendersAPI.update(tenderId, { status: newStatus });
      toast.success(`Tender status changed to ${newStatus}`);
      setTenders(prev =>
        prev.map(t => (t.id === tenderId ? { ...t, status: newStatus } : t))
      );
      if (selectedTender && selectedTender.id === tenderId) {
        setSelectedTender(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update tender status');
    }
  };

  const handleCreateTender = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.estimatedBudget || !formData.deadline) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await tendersAPI.create({
        ...formData,
        estimatedBudget: parseFloat(formData.estimatedBudget)
      });
      toast.success('New tender created successfully!');
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        category: 'Infrastructure',
        estimatedBudget: '',
        deadline: '',
        status: 'published'
      });
      fetchTenders();
    } catch (err) {
      toast.error(err.message || 'Failed to create tender');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered list
  const filteredTenders = tenders.filter(t => {
    const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (t.title || '').toLowerCase().includes(q) ||
      (t.organizationName || '').toLowerCase().includes(q) ||
      String(t.id).includes(q);
    return matchesCategory && matchesStatus && matchesSearch;
  });

  // KPI calculations
  const totalCount = tenders.length;
  const publishedCount = tenders.filter(t => t.status === 'published').length;
  const evaluatingCount = tenders.filter(t => t.status === 'evaluating').length;
  const awardedCount = tenders.filter(t => t.status === 'awarded').length;
  const totalBudget = tenders.reduce((acc, t) => acc + (Number(t.estimatedBudget) || 0), 0);

  return (
    <div className="view-container">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(2, 132, 199, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--app-text-primary)' }}>
                Platform Tenders Management & Oversight
              </h1>
            </div>
          </div>
          <p style={{ margin: 0, color: 'var(--app-text-muted)', fontSize: '14px' }}>
            Comprehensive platform oversight of all public & private tenders, bid submissions, procurement budgets, and awards.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
        >
          <PlusCircle size={18} /> Publish New Tender
        </button>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.75rem' }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper primary">
            <Layers size={20} />
          </div>
          <div className="stat-info">
            <h4>Total Tenders</h4>
            <p>{totalCount}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper success">
            <CheckCircle size={20} />
          </div>
          <div className="stat-info">
            <h4>Live & Published</h4>
            <p>{publishedCount}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper warning">
            <Clock size={20} />
          </div>
          <div className="stat-info">
            <h4>In Evaluation</h4>
            <p>{evaluatingCount}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper info">
            <DollarSign size={20} />
          </div>
          <div className="stat-info">
            <h4>Total Platform Budget</h4>
            <p>${(totalBudget / 1000000).toFixed(2)}M</p>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="card" style={{ background: 'var(--app-bg-secondary)', border: '1px solid var(--app-border)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['all', 'published', 'evaluating', 'awarded', 'draft'].map((status) => (
              <button
                key={status}
                className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter(status)}
                style={{ textTransform: 'capitalize' }}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--app-text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search title, org, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
            />
          </div>
        </div>

        {/* Category Filter Chips */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px', borderBottom: '1px solid var(--app-border)' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: categoryFilter === cat ? 'var(--primary)' : 'var(--app-border)',
                background: categoryFilter === cat ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                color: categoryFilter === cat ? 'var(--primary)' : 'var(--app-text-muted)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Tenders Table */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--app-text-muted)' }}>
            <Clock size={32} className="spin" style={{ marginBottom: '8px' }} />
            <p>Loading platform tenders...</p>
          </div>
        ) : filteredTenders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--app-text-muted)' }}>
            <FileText size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--app-text-primary)', margin: '0 0 6px' }}>No tenders found</h3>
            <p style={{ fontSize: '13px', margin: 0 }}>Try clearing search keywords or choosing another category.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Tender Title & ID</th>
                  <th>Category</th>
                  <th>Issuing Organization</th>
                  <th>Budget</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Admin Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenders.map((tender) => (
                  <tr key={tender.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--app-text-primary)', fontSize: '14px' }}>
                        {tender.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>
                        ID: #{tender.id}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: '11px' }}>
                        {tender.category || 'Infrastructure'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--app-text-secondary)', fontSize: '13px' }}>
                        <Building2 size={14} style={{ color: 'var(--primary)' }} />
                        <span>{tender.organizationName || 'Public Works Authority'}</span>
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--app-text-primary)' }}>
                        ${Number(tender.estimatedBudget).toLocaleString()}
                      </strong>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--app-text-secondary)' }}>
                        <Calendar size={13} style={{ color: 'var(--app-text-muted)' }} />
                        <span>{new Date(tender.deadline).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td>
                      <select
                        value={tender.status}
                        onChange={(e) => handleStatusChange(tender.id, e.target.value)}
                        className={`badge ${tender.status === 'published' ? 'badge-success' : tender.status === 'awarded' ? 'badge-info' : 'badge-warning'}`}
                        style={{ border: 'none', cursor: 'pointer', outline: 'none', fontWeight: 700, padding: '4px 8px' }}
                      >
                        <option value="draft">DRAFT</option>
                        <option value="published">PUBLISHED</option>
                        <option value="evaluating">EVALUATING</option>
                        <option value="awarded">AWARDED</option>
                        <option value="closed">CLOSED</option>
                      </select>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenDetails(tender)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                      >
                        <Eye size={13} /> View Bids
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tender Bids & Details Modal */}
      {selectedTender && (
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
            maxWidth: '740px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            position: 'relative',
            boxShadow: '0 24px 60px rgba(0,0,0,0.3)'
          }}>
            <button
              onClick={() => setSelectedTender(null)}
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

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span className="badge badge-info">{selectedTender.category}</span>
                <span className={`badge ${selectedTender.status === 'published' ? 'badge-success' : 'badge-warning'}`}>
                  {selectedTender.status.toUpperCase()}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>ID: #{selectedTender.id}</span>
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: 800, color: 'var(--app-text-primary)' }}>
                {selectedTender.title}
              </h2>
              <p style={{ margin: 0, color: 'var(--app-text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>
                {selectedTender.description || 'No detailed specifications provided.'}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '14px', background: 'var(--app-bg-primary)', borderRadius: '12px', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>Budget</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--app-text-primary)' }}>
                  ${Number(selectedTender.estimatedBudget).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>Deadline</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--app-text-primary)' }}>
                  {new Date(selectedTender.deadline).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>Organization</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--app-text-primary)' }}>
                  {selectedTender.organizationName || 'N/A'}
                </div>
              </div>
            </div>

            {/* Submitted Bids Section */}
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} style={{ color: 'var(--primary)' }} />
                Submitted Contractor Bids ({tenderBids.length})
              </h3>

              {loadingBids ? (
                <p style={{ color: 'var(--app-text-muted)', fontSize: '13px' }}>Loading submitted bids...</p>
              ) : tenderBids.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', background: 'var(--app-bg-primary)', borderRadius: '10px', color: 'var(--app-text-muted)', fontSize: '13px' }}>
                  No contractor bids have been submitted for this tender yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {tenderBids.map((bid) => (
                    <div
                      key={bid.id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '10px',
                        background: 'var(--app-bg-primary)',
                        border: '1px solid var(--app-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--app-text-primary)', fontSize: '14px', marginBottom: '2px' }}>
                          {bid.Contractor?.companyName || `Contractor #${bid.contractorId}`}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>
                          Estimated Duration: <strong>{bid.proposedDurationDays || bid.duration || '—'} days</strong> · Submitted {new Date(bid.createdAt).toLocaleDateString()}
                        </div>
                        {bid.proposalDetails && (
                          <div style={{ fontSize: '12px', color: 'var(--app-text-secondary)', marginTop: '4px' }}>
                            "{bid.proposalDetails}"
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>
                          ${Number(bid.bidAmount || bid.price || 0).toLocaleString()}
                        </div>
                        <span className={`badge ${bid.status === 'accepted' ? 'badge-success' : bid.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '10px', marginTop: '4px' }}>
                          {bid.status ? bid.status.toUpperCase() : 'PENDING'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Tender Modal */}
      {showCreateModal && (
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
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            position: 'relative',
            boxShadow: '0 24px 60px rgba(0,0,0,0.3)'
          }}>
            <button
              onClick={() => setShowCreateModal(false)}
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

            <h2 style={{ margin: '0 0 16px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--app-text-primary)' }}>
              Publish New Public Tender
            </h2>

            <form onSubmit={handleCreateTender}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--app-text-primary)', marginBottom: '6px' }}>
                  Tender Title *
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Metro Expressway Expansion Phase II"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--app-text-primary)', marginBottom: '6px' }}>
                    Category *
                  </label>
                  <select
                    className="form-control"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--app-text-primary)', marginBottom: '6px' }}>
                    Estimated Budget ($) *
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 500000"
                    value={formData.estimatedBudget}
                    onChange={(e) => setFormData({ ...formData, estimatedBudget: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--app-text-primary)', marginBottom: '6px' }}>
                    Submission Deadline *
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--app-text-primary)', marginBottom: '6px' }}>
                    Initial Status
                  </label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="published">Published (Live)</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--app-text-primary)', marginBottom: '6px' }}>
                  Description & Scope of Work
                </label>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Provide scope details, prerequisites, and milestone structures..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Tender'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminTendersView;
