import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PlusCircle, DollarSign, FileText, CheckCircle2, XCircle, Wallet, Loader2 } from 'lucide-react';
import { paymentsAPI, projectsAPI } from '../utils/api';
import { StatCard } from './common/Card';
import { Button } from './common/Button';
import { StatusBadge } from './common/Badge';
import { Modal } from './common/Modal';
import { EmptyState } from './common/EmptyState';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';

const ENGINEER_ROLES = ['engineer', 'project_manager'];
const FINANCE_ROLES = ['finance_officer', 'admin'];
const STAFF_ROLES = ['admin', 'engineer', 'project_manager', 'finance_officer'];

const INITIAL_REQUEST = { projectId: '', amount: '', paymentType: 'milestone', description: '' };

/**
 * Payments workflow: contractors request, engineers approve, finance releases.
 */
export const PaymentsView = ({ userRole }) => {
  const isContractor = userRole === 'contractor';
  const isEngineer = ENGINEER_ROLES.includes(userRole);
  const isFinance = FINANCE_ROLES.includes(userRole);
  const isStaff = STAFF_ROLES.includes(userRole);

  const [payments, setPayments] = useState([]);
  const [myProjects, setMyProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [filter, setFilter] = useState('all');

  const [showRequest, setShowRequest] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestForm, setRequestForm] = useState(INITIAL_REQUEST);
  const [busyId, setBusyId] = useState(null);
  const [releaseNotes, setReleaseNotes] = useState('');
  const [releasingId, setReleasingId] = useState(null);

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 4000);
  };

  const fetchData = useCallback(async () => {
    const [paymentsRes, statsRes] = await Promise.all([
      paymentsAPI.getAll(),
      isStaff ? paymentsAPI.getStats().catch(() => null) : Promise.resolve(null),
    ]);
    setPayments(paymentsRes);
    setStats(statsRes);
  }, [isStaff]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        await fetchData();
        if (isContractor) {
          try {
            setMyProjects(await projectsAPI.getAll());
          } catch (err) {
            console.error('Failed to load projects:', err);
          }
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load payments.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [fetchData, isContractor]);

  const filteredPayments = useMemo(
    () => (filter === 'all' ? payments : payments.filter(p => p.status === filter)),
    [payments, filter]
  );

  const statusOptions = useMemo(
    () => ['all', ...['requested', 'engineer_approved', 'released', 'rejected'].filter(s => payments.some(p => p.status === s))],
    [payments]
  );

  const act = async (id, fn, successMsg) => {
    setBusyId(id);
    setError('');
    try {
      await fn();
      showFeedback(successMsg);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Action failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleEngineerApprove = (payment) =>
    act(payment.id, () => paymentsAPI.engineerApprove(payment.id, {}), 'Payment approved by engineer.');

  const handleRelease = (payment) =>
    act(payment.id, () => paymentsAPI.financeApprove(payment.id, { invoiceNumber: payment.invoiceNumber || undefined }), 'Payment released.');

  const handleReject = (payment) =>
    act(payment.id, () => paymentsAPI.reject(payment.id, {}), 'Payment rejected.');

  const handleRequest = async (e) => {
    e.preventDefault();
    setRequesting(true);
    setError('');
    try {
      await paymentsAPI.request({
        projectId: Number(requestForm.projectId),
        amount: Number(requestForm.amount),
        paymentType: requestForm.paymentType,
        description: requestForm.description,
      });
      setShowRequest(false);
      setRequestForm(INITIAL_REQUEST);
      showFeedback('Payment request submitted (18% GST auto-applied).');
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to submit payment request.');
    } finally {
      setRequesting(false);
    }
  };

  const canAction = (payment) => {
    if (!isStaff) return null;
    if (payment.status === 'requested' && isEngineer) return 'engineer';
    if (payment.status === 'engineer_approved' && isFinance) return 'finance';
    if (['requested', 'engineer_approved'].includes(payment.status) && (isEngineer || isFinance)) return 'reject';
    return null;
  };

  const setRequestField = (f) => (e) => setRequestForm(prev => ({ ...prev, [f]: e.target.value }));
return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: '32px', color: 'var(--app-text-primary)' }}>
            Payments
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px', maxWidth: '520px' }}>
            {isContractor
              ? 'Request milestone, advance or final payments against your projects.'
              : 'Engineer verification → finance approval → release workflow.'}
          </p>
        </div>
        {isContractor && (
          <Button variant="primary" icon={<PlusCircle size={18} />} onClick={() => setShowRequest(true)}>
            Request Payment
          </Button>
        )}
      </div>

      {feedback && <div className="notice-banner success" role="status">{feedback}</div>}
      {error && <div className="notice-banner error" role="alert">{error}</div>}

      {loading ? (
        <EmptyState icon={<Loader2 size={32} className="spin" />} title="Loading payments..." />
      ) : (
        <>
          {stats && (
            <div className="stats-grid">
              <StatCard icon={<FileText size={20} />} iconColor="primary" title="Pending Requests" value={stats.pendingRequests || 0} subtitle="Awaiting engineer review" />
              <StatCard icon={<CheckCircle2 size={20} />} iconColor="warning" title="Pending Approvals" value={stats.pendingApprovals || 0} subtitle="Engineer-approved, awaiting finance" />
              <StatCard icon={<Wallet size={20} />} iconColor="success" title="Released" value={stats.totalReleased || 0} subtitle={`${stats.totalAmountReleased ? formatCurrency(stats.totalAmountReleased) : ''} paid out`} />
              <StatCard icon={<DollarSign size={20} />} iconColor="warning" title="Tax Collected" value={formatCurrency(stats.totalTaxCollected)} subtitle="18% GST on releases" />
            </div>
          )}

          <div className="filter-chips">
            {statusOptions.map(status => (
              <button key={status} className={`filter-chip ${filter === status ? 'active' : ''}`} onClick={() => setFilter(status)}>
                {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
{filteredPayments.length === 0 ? (
            <EmptyState
              icon={<Wallet size={32} />}
              title="No payments yet"
              description={isContractor
                ? 'Request your first payment once work advances on a project.'
                : 'Payment requests from contractors will appear here.'}
            />
          ) : (
            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Contractor</th>
                    <th>Amount</th>
                    <th>Tax</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Requested</th>
                    {isStaff && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map(payment => {
                    const action = canAction(payment);
                    return (
                      <tr key={payment.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{payment.Project?.name || '—'}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {payment.description || ''}
                          </div>
                        </td>
                        <td>{payment.Contractor?.companyName || '—'}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(payment.amount)}</td>
                        <td>
                          {formatCurrency(payment.taxAmount)}
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{payment.invoiceNumber || ''}</div>
                        </td>
                        <td><StatusBadge status={payment.paymentType} /></td>
                        <td><StatusBadge status={payment.status} /></td>
                        <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{formatDateTime(payment.createdAt)}</td>
                        {isStaff && (
                          <td>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {action === 'engineer' && (
                                <Button variant="success" size="sm" loading={busyId === payment.id} onClick={() => handleEngineerApprove(payment)}>
                                  Approve
                                </Button>
                              )}
                              {action === 'finance' && (
                                <Button variant="success" size="sm" loading={busyId === payment.id} onClick={() => handleRelease(payment)}>
                                  Release
                                </Button>
                              )}
                              {action === 'reject' && (
                                <Button variant="danger" size="sm" loading={busyId === payment.id} onClick={() => handleReject(payment)}>
                                  Reject
                                </Button>
                              )}
                              {!action && payment.status === 'rejected' && (
                                <span style={{ fontSize: '12px', color: 'var(--danger)' }}>{payment.verificationNotes || 'Rejected'}</span>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Request payment modal (contractors) */}
      <Modal isOpen={showRequest} onClose={() => setShowRequest(false)} title="Request Payment">
        <form onSubmit={handleRequest}>
          <div className="form-group">
            <label>Project *</label>
            <select className="form-control" required value={requestForm.projectId} onChange={setRequestField('projectId')}>
              <option value="">— Select project —</option>
              {myProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Amount ($) *</label>
              <input className="form-control" type="number" min="0" step="0.01" required value={requestForm.amount} onChange={setRequestField('amount')} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Payment Type</label>
              <select className="form-control" value={requestForm.paymentType} onChange={setRequestField('paymentType')}>
                {['advance', 'milestone', 'final', 'penalty'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea className="form-control" value={requestForm.description} onChange={setRequestField('description')} placeholder="Work completed, milestone reached..." />
          </div>

          <div className="modal-footer" style={{ padding: '16px 0 0', borderTop: '1px solid var(--border-light)' }}>
            <Button variant="secondary" type="button" onClick={() => setShowRequest(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={requesting} disabled={requesting}>
              {requesting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};