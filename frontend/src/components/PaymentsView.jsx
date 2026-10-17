import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PlusCircle,
  DollarSign,
  FileText,
  CheckCircle2,
  XCircle,
  Wallet,
  Loader2,
  Download,
  CreditCard,
  Printer,
  ShieldCheck,
  Search,
  ExternalLink,
  Receipt
} from 'lucide-react';
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

const INITIAL_REQUEST = { projectId: '', amount: '', paymentType: 'milestone', description: '', completionMilestone: 'Foundation Phase (25%)' };

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
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showRequest, setShowRequest] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestForm, setRequestForm] = useState(INITIAL_REQUEST);
  const [busyId, setBusyId] = useState(null);

  // Online Payment / Disburse Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('razorpay_gateway');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paying, setPaying] = useState(false);

  // Invoice Modal
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 4500);
  };

  const fetchData = useCallback(async () => {
    const [paymentsRes, statsRes] = await Promise.all([
      paymentsAPI.getAll(),
      isStaff ? paymentsAPI.getStats().catch(() => null) : Promise.resolve(null),
    ]);
    setPayments(paymentsRes || []);
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

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesFilter = filter === 'all' || p.status === filter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (p.Project?.name && p.Project.name.toLowerCase().includes(q)) ||
        (p.Contractor?.companyName && p.Contractor.companyName.toLowerCase().includes(q)) ||
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [payments, filter, searchQuery]);

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
    act(payment.id, () => paymentsAPI.engineerApprove(payment.id, { verificationNotes: 'Site progress and quality metrics verified by inspecting engineer.' }), 'Payment approved by engineer.');

  const handleReject = (payment) => {
    const reason = window.prompt('Enter reason for payment rejection:');
    if (!reason) return;
    act(payment.id, () => paymentsAPI.reject(payment.id, { verificationNotes: reason }), 'Payment rejected.');
  };

  const openPayModal = (payment) => {
    setSelectedPayment(payment);
    setPaymentNotes('');
    setPaymentMethod('razorpay_gateway');
    setPayModalOpen(true);
  };

  const handleExecutePayment = async (e) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setPaying(true);
    setError('');
    try {
      const res = await paymentsAPI.payOnline(selectedPayment.id, {
        paymentMethod,
        transactionNotes: paymentNotes
      });
      setPayModalOpen(false);
      showFeedback(res.message || 'Payment disbursed successfully via online gateway.');
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to process online payment.');
    } finally {
      setPaying(false);
    }
  };

  const openInvoiceModal = async (payment) => {
    setLoadingInvoice(true);
    setInvoiceModalOpen(true);
    try {
      const inv = await paymentsAPI.getInvoice(payment.id);
      setInvoiceData(inv);
    } catch (err) {
      setError(err.message || 'Failed to generate invoice.');
      setInvoiceModalOpen(false);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    setRequesting(true);
    setError('');
    try {
      await paymentsAPI.request({
        projectId: Number(requestForm.projectId),
        amount: Number(requestForm.amount),
        paymentType: requestForm.paymentType,
        description: `${requestForm.completionMilestone} - ${requestForm.description}`.trim(),
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
    <div className="payments-view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: '32px', color: 'var(--app-text-primary)' }}>
            Financial Disbursals & Milestone Payments
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px', maxWidth: '620px' }}>
            {isContractor
              ? 'Request milestone settlements, track verification stages, and download GST tax invoices.'
              : 'Multi-tier verification workflow: Contractor Claim → Site Engineer Inspection → Finance Approval & Online Disbursement.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {isContractor && (
            <Button variant="primary" icon={<PlusCircle size={18} />} onClick={() => setShowRequest(true)}>
              Claim Milestone Payment
            </Button>
          )}
        </div>
      </div>

      {feedback && <div className="notice-banner success" role="status">{feedback}</div>}
      {error && <div className="notice-banner error" role="alert">{error}</div>}

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <StatCard icon={<FileText size={20} />} iconColor="primary" title="Pending Requests" value={stats.pendingRequests || 0} subtitle="Awaiting engineer site audit" />
          <StatCard icon={<CheckCircle2 size={20} />} iconColor="warning" title="Awaiting Finance" value={stats.pendingApprovals || 0} subtitle="Engineer-certified claims" />
          <StatCard icon={<Wallet size={20} />} iconColor="success" title="Total Disbursed" value={stats.totalReleased || 0} subtitle={`${stats.totalAmountReleased ? formatCurrency(stats.totalAmountReleased) : '₹0'} released`} />
          <StatCard icon={<DollarSign size={20} />} iconColor="warning" title="GST Processed" value={formatCurrency(stats.totalTaxCollected)} subtitle="18% statutory GST pool" />
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div className="filter-chips" style={{ margin: 0 }}>
          {statusOptions.map(status => (
            <button key={status} className={`filter-chip ${filter === status ? 'active' : ''}`} onClick={() => setFilter(status)}>
              {status === 'all' ? 'All Payments' : status.replace(/_/g, ' ').toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', minWidth: '260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '36px' }}
            placeholder="Search by project, contractor, invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Payments Table */}
      {loading ? (
        <EmptyState icon={<Loader2 size={32} className="spin" />} title="Loading payments ledger..." />
      ) : filteredPayments.length === 0 ? (
        <EmptyState
          icon={<Wallet size={36} />}
          title="No payment records found"
          description={isContractor
            ? 'Submit milestone claims once site works advance.'
            : 'Payment requests matching your filter will appear here.'}
        />
      ) : (
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Project & Description</th>
                <th>Contractor</th>
                <th>Claim Amount</th>
                <th>Tax (18% GST)</th>
                <th>Type</th>
                <th>Status</th>
                <th>Invoice / Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(payment => {
                const action = canAction(payment);
                const isReleased = payment.status === 'released';
                return (
                  <tr key={payment.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-bright)' }}>{payment.Project?.name || 'Project Unassigned'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {payment.description || 'Milestone settlement'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{payment.Contractor?.companyName || '—'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {payment.Contractor?.registrationNumber || ''}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--primary-bright)' }}>
                      {formatCurrency(payment.amount)}
                    </td>
                    <td>
                      <div style={{ fontSize: '13px' }}>{formatCurrency(payment.taxAmount)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SAC 9954</div>
                    </td>
                    <td>
                      <StatusBadge status={payment.paymentType} />
                    </td>
                    <td>
                      <StatusBadge status={payment.status} />
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', fontWeight: 500 }}>
                        {payment.invoiceNumber || 'Pending Release'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {formatDateTime(payment.releasedAt || payment.createdAt)}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Engineer Approval */}
                        {action === 'engineer' && (
                          <Button variant="success" size="sm" loading={busyId === payment.id} onClick={() => handleEngineerApprove(payment)}>
                            Verify & Approve
                          </Button>
                        )}

                        {/* Finance Release Online */}
                        {action === 'finance' && (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<CreditCard size={14} />}
                            loading={busyId === payment.id}
                            onClick={() => openPayModal(payment)}
                          >
                            Disburse
                          </Button>
                        )}

                        {/* Reject */}
                        {action === 'reject' && (
                          <Button variant="danger" size="sm" loading={busyId === payment.id} onClick={() => handleReject(payment)}>
                            Reject
                          </Button>
                        )}

                        {/* Invoice Download for Released / Approved Payments */}
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Receipt size={14} />}
                          title="View Official Tax Invoice"
                          onClick={() => openInvoiceModal(payment)}
                        >
                          Invoice
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Claim Payment Modal (Contractor) */}
      <Modal isOpen={showRequest} onClose={() => setShowRequest(false)} title="Claim Milestone Payment">
        <form onSubmit={handleRequest}>
          <div className="form-group">
            <label>Assigned Project *</label>
            <select className="form-control" required value={requestForm.projectId} onChange={setRequestField('projectId')}>
              <option value="">— Select approved project —</option>
              {myProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name} (Budget: {formatCurrency(p.budget)})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Claim Amount (INR) *</label>
              <input
                className="form-control"
                type="number"
                min="1000"
                step="0.01"
                required
                value={requestForm.amount}
                onChange={setRequestField('amount')}
                placeholder="0.00"
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                18% GST (CGST 9% + SGST 9%) will be calculated automatically.
              </span>
            </div>
            <div className="form-group">
              <label>Payment Category</label>
              <select className="form-control" value={requestForm.paymentType} onChange={setRequestField('paymentType')}>
                <option value="milestone">Milestone Progress Claim</option>
                <option value="advance">Mobilization Advance (Max 10%)</option>
                <option value="final">Final Project Settlement</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Completion Milestone</label>
            <select className="form-control" value={requestForm.completionMilestone} onChange={setRequestField('completionMilestone')}>
              <option value="Foundation & Substructure (25%)">Phase 1: Foundation & Substructure (25%)</option>
              <option value="Superstructure & Framework (50%)">Phase 2: Superstructure & Framework (50%)</option>
              <option value="Finishing & MEP Installation (75%)">Phase 3: Finishing & MEP Installation (75%)</option>
              <option value="Testing & Practical Handover (100%)">Phase 4: Testing & Practical Handover (100%)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Description & Work Proof Summary</label>
            <textarea
              className="form-control"
              rows={3}
              value={requestForm.description}
              onChange={setRequestField('description')}
              placeholder="Detail concrete cubic meters poured, quality test batch references, or inspection sign-offs..."
            />
          </div>

          <div className="modal-footer" style={{ padding: '16px 0 0', borderTop: '1px solid var(--border-light)' }}>
            <Button variant="secondary" type="button" onClick={() => setShowRequest(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={requesting} disabled={requesting}>
              {requesting ? 'Submitting...' : 'Submit Claim'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Online Disburse / Pay Modal (Finance / Admin) */}
      <Modal isOpen={payModalOpen} onClose={() => setPayModalOpen(false)} title="Disburse Milestone Payment">
        {selectedPayment && (
          <form onSubmit={handleExecutePayment}>
            <div style={{ padding: '16px', background: 'rgba(253,241,225,0.04)', borderRadius: '10px', marginBottom: '20px', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Project:</span>
                <strong>{selectedPayment.Project?.name || 'Assigned Project'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Contractor:</span>
                <strong>{selectedPayment.Contractor?.companyName || 'Contractor'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Claim Base Amount:</span>
                <span>{formatCurrency(selectedPayment.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>18% GST (CGST+SGST):</span>
                <span>{formatCurrency(selectedPayment.taxAmount || parseFloat(selectedPayment.amount) * 0.18)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '16px' }}>
                <span>Total Net Disbursal:</span>
                <span style={{ color: 'var(--primary)' }}>
                  {formatCurrency(parseFloat(selectedPayment.amount) + (parseFloat(selectedPayment.taxAmount) || parseFloat(selectedPayment.amount) * 0.18))}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label>Payment Gateway / Disbursal Channel *</label>
              <select className="form-control" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="razorpay_gateway">Razorpay Gateway (Instant Settlement / Virtual Account)</option>
                <option value="treasury_rtgs">PFMS / Treasury RTGS Core Direct Disbursal</option>
                <option value="escrow_milestone">Escrow Smart Contract Disbursement</option>
                <option value="corporate_neft">Corporate Banking NEFT / NetBanking</option>
              </select>
            </div>

            <div className="form-group">
              <label>Transaction Authorization & Notes</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Treasury sanction letter ref, voucher code..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>

            <div className="modal-footer" style={{ padding: '16px 0 0', borderTop: '1px solid var(--border-light)' }}>
              <Button variant="secondary" type="button" onClick={() => setPayModalOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit" loading={paying} icon={<CreditCard size={16} />}>
                {paying ? 'Processing Gateway...' : 'Authorize & Disburse Funds'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* GST Tax Invoice Preview Modal */}
      <Modal isOpen={invoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} title="Government e-Procurement GST Tax Invoice">
        {loadingInvoice ? (
          <EmptyState icon={<Loader2 size={32} className="spin" />} title="Generating Tax Invoice..." />
        ) : invoiceData ? (
          <div className="invoice-print-container" style={{ padding: '10px 0' }}>
            {/* Invoice Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--border-light)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>Government of India / State PWD</div>
                <h2 style={{ margin: '4px 0', fontSize: '20px', color: 'var(--app-text-primary)' }}>TAX INVOICE / PAYMENT RECEIPT</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Standard Form Under Section 31 of CGST Act, 2017</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--primary)' }}>{invoiceData.invoiceNumber}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Date: {formatDate(invoiceData.invoiceDate)}</div>
                <div style={{ marginTop: '6px' }}><StatusBadge status={invoiceData.status} /></div>
              </div>
            </div>

            {/* Payer and Payee Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', fontSize: '13px' }}>
              <div style={{ padding: '12px', background: 'rgba(253,241,225,0.03)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text-bright)' }}>ISSUED BY (PAYER):</div>
                <div>{invoiceData.payer.authority}</div>
                <div>{invoiceData.payer.department}</div>
                <div>GSTIN: <strong>{invoiceData.payer.gstin}</strong></div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>{invoiceData.payer.address}</div>
              </div>

              <div style={{ padding: '12px', background: 'rgba(253,241,225,0.03)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text-bright)' }}>BENEFICIARY (CONTRACTOR):</div>
                <div style={{ fontWeight: 600 }}>{invoiceData.payee.companyName}</div>
                <div>Reg No: {invoiceData.payee.registrationNumber}</div>
                <div>GSTIN: <strong>{invoiceData.payee.gstin}</strong> | PAN: <strong>{invoiceData.payee.pan}</strong></div>
                <div>Email: {invoiceData.payee.email}</div>
              </div>
            </div>

            {/* Project Details */}
            <div style={{ marginBottom: '20px', padding: '10px 14px', background: 'rgba(253,241,225,0.02)', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '13px' }}>
              <strong>Project:</strong> {invoiceData.project.name} ({invoiceData.project.department}) · Location: {invoiceData.project.location}
            </div>

            {/* Itemized Table */}
            <table className="custom-table" style={{ marginBottom: '20px' }}>
              <thead>
                <tr>
                  <th>Description of Service</th>
                  <th>HSN/SAC</th>
                  <th>Taxable Value</th>
                  <th>CGST (9%)</th>
                  <th>SGST (9%)</th>
                  <th>Total (INR)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Civil Infrastructure & Milestone Construction Works</td>
                  <td>9954</td>
                  <td>{formatCurrency(invoiceData.breakdown.baseAmount)}</td>
                  <td>{formatCurrency(invoiceData.breakdown.cgstAmount)}</td>
                  <td>{formatCurrency(invoiceData.breakdown.sgstAmount)}</td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(invoiceData.breakdown.grossTotal)}</td>
                </tr>
              </tbody>
            </table>

            {/* Financial Summary Calculation */}
            <div style={{ marginLeft: 'auto', maxWidth: '340px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Gross Work Total:</span>
                <span>{formatCurrency(invoiceData.breakdown.grossTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                <span>Less TDS u/s 194C (2%):</span>
                <span>- {formatCurrency(invoiceData.breakdown.tdsAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '16px', borderTop: '2px solid var(--border-light)', paddingTop: '6px', color: 'var(--primary)' }}>
                <span>Net Payable Disbursed:</span>
                <span>{formatCurrency(invoiceData.breakdown.netDisbursed)}</span>
              </div>
            </div>

            {/* Digital Signature Stamp */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(253,241,225,0.03)', borderRadius: '8px', border: '1px dashed var(--border-light)', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} style={{ color: 'var(--success)' }} />
                <div>
                  <div style={{ fontWeight: 600 }}>Digitally Certified & Timestamped</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{invoiceData.verificationSeal.digitalSignature}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontWeight: 600 }}>
                {invoiceData.verificationSeal.verifiedBy}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="modal-footer" style={{ padding: '16px 0 0', borderTop: '1px solid var(--border-light)' }}>
              <Button variant="secondary" onClick={() => setInvoiceModalOpen(false)}>Close</Button>
              <Button variant="primary" icon={<Printer size={16} />} onClick={() => window.print()}>
                Print / Save PDF
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};