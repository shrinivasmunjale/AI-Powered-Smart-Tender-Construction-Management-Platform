import React, { useState, useEffect } from 'react';
import { BACKEND_BASE_URL } from '../utils/config';
import {
  User,
  Building2,
  FileCheck,
  Shield,
  KeyRound,
  Award,
  Upload,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Star,
  FileText,
  Clock,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { authAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './common/Button';
import { Card } from './common/Card';
import { StatusBadge } from './common/Badge';
import { formatCurrency, formatDate } from '../utils/formatters';

export const ProfileView = () => {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  // Forms state
  const [personalForm, setPersonalForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    organizationName: ''
  });

  const [contractorForm, setContractorForm] = useState({
    companyName: '',
    registrationNumber: '',
    gstNumber: '',
    panNumber: '',
    technicalCapacity: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    yearsOfExperience: 0
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Doc upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [docTitle, setDocTitle] = useState('GST Certificate');
  const [docType, setDocType] = useState('Certificate');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const showMsg = (text, type = 'success') => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback({ type: '', text: '' }), 4500);
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await authAPI.profile();
      setProfile(data);
      setPersonalForm({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phone: data.phone || '',
        organizationName: data.organizationName || ''
      });

      if (data.Contractor) {
        setContractorForm({
          companyName: data.Contractor.companyName || '',
          registrationNumber: data.Contractor.registrationNumber || '',
          gstNumber: data.Contractor.gstNumber || '',
          panNumber: data.Contractor.panNumber || '',
          technicalCapacity: data.Contractor.technicalCapacity || '',
          address: data.Contractor.address || '',
          city: data.Contractor.city || '',
          state: data.Contractor.state || '',
          pincode: data.Contractor.pincode || '',
          yearsOfExperience: data.Contractor.yearsOfExperience || 0
        });
      }
    } catch (err) {
      showMsg(err.message || 'Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handlePersonalSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authAPI.updateProfile(personalForm);
      showMsg('Personal information updated successfully.');
      loadProfile();
    } catch (err) {
      showMsg(err.message || 'Failed to update personal details', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleContractorSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authAPI.updateContractor(contractorForm);
      showMsg('Contractor business credentials updated.');
      loadProfile();
    } catch (err) {
      showMsg(err.message || 'Failed to update contractor details', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMsg('New password and confirmation do not match.', 'error');
      return;
    }
    setSaving(true);
    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      showMsg('Password changed successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showMsg(err.message || 'Failed to update password', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDocUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      showMsg('Please select a file to upload', 'error');
      return;
    }
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('document', uploadFile);
      formData.append('title', docTitle);
      formData.append('certificateType', docType);

      await authAPI.uploadDoc(formData);
      showMsg('Document uploaded and attached to your compliance dossier.');
      setUploadFile(null);
      loadProfile();
    } catch (err) {
      showMsg(err.message || 'Failed to upload document', 'error');
    } finally {
      setUploadingDoc(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Loader2 size={36} className="spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  const isContractor = profile?.role === 'contractor';
  const completeness = profile?.completeness || 75;
  const contractor = profile?.Contractor;
  const certificates = Array.isArray(contractor?.certificates) ? contractor.certificates : [];

  return (
    <div className="profile-view-wrapper">
      {/* Notice Feedback Banner */}
      {feedback.text && (
        <div className={`notice-banner ${feedback.type === 'error' ? 'error' : 'success'}`} role="alert">
          {feedback.text}
        </div>
      )}

      {/* Profile Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(200, 150, 62, 0.12) 0%, rgba(253, 241, 225, 0.03) 100%)',
          border: '1px solid var(--border-light)',
          borderRadius: '16px',
          padding: '24px 28px',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary) 0%, #d4a359 100%)',
              color: '#0b1110',
              fontWeight: 800,
              fontSize: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
            }}
          >
            {profile?.firstName ? `${profile.firstName[0]}${profile.lastName ? profile.lastName[0] : ''}` : profile?.email?.[0].toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '26px', color: 'var(--app-text-primary)' }}>
                {profile?.Contractor?.companyName || (profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}` : profile?.email)}
              </h1>
              <StatusBadge status={profile?.Contractor?.verificationStatus || profile?.approvalStatus || 'verified'} />
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span>Role: <strong style={{ color: 'var(--text-bright)', textTransform: 'uppercase' }}>{profile?.role}</strong></span>
              {contractor?.registrationNumber && <span>Reg ID: <strong>{contractor.registrationNumber}</strong></span>}
              <span>Joined: {formatDate(profile?.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Profile Completeness Ring */}
        <div style={{ minWidth: '220px', textAlign: 'right' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
            <span>Profile Completeness:</span>
            <strong style={{ color: completeness >= 80 ? 'var(--success)' : 'var(--warning)' }}>{completeness}%</strong>
          </div>
          <div style={{ height: '8px', background: 'rgba(253,241,225,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${completeness}%`,
                height: '100%',
                background: completeness >= 80 ? 'var(--success)' : 'var(--primary)',
                transition: 'width 0.4s ease'
              }}
            />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {completeness < 100 ? 'Upload GSTIN & licenses to achieve 100% verified status.' : 'Dossier fully compliant with PWD / GFR standards.'}
          </div>
        </div>
      </div>

      {/* Profile Navigation Tabs */}
      <div className="filter-chips" style={{ marginBottom: '24px' }}>
        <button
          className={`filter-chip ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          <User size={15} style={{ marginRight: '6px' }} /> Personal Details
        </button>

        {isContractor && (
          <button
            className={`filter-chip ${activeTab === 'contractor' ? 'active' : ''}`}
            onClick={() => setActiveTab('contractor')}
          >
            <Building2 size={15} style={{ marginRight: '6px' }} /> Business & Tax
          </button>
        )}

        {isContractor && (
          <button
            className={`filter-chip ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            <FileCheck size={15} style={{ marginRight: '6px' }} /> Certificates & Licensure
          </button>
        )}

        <button
          className={`filter-chip ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <KeyRound size={15} style={{ marginRight: '6px' }} /> Security & Password
        </button>

        {isContractor && (
          <button
            className={`filter-chip ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            <Award size={15} style={{ marginRight: '6px' }} /> Performance & Stats
          </button>
        )}
      </div>

      {/* Tab 1: Personal Details */}
      {activeTab === 'personal' && (
        <Card title="Personal & Authorized Representative Information" icon={<User size={18} />}>
          <form onSubmit={handlePersonalSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={personalForm.firstName}
                  onChange={(e) => setPersonalForm({ ...personalForm, firstName: e.target.value })}
                  placeholder="e.g. Ramesh"
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={personalForm.lastName}
                  onChange={(e) => setPersonalForm({ ...personalForm, lastName: e.target.value })}
                  placeholder="e.g. Sharma"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Registered Email (Primary Login)</label>
                <input
                  type="email"
                  className="form-control"
                  value={profile?.email}
                  disabled
                  style={{ opacity: 0.7, cursor: 'not-allowed' }}
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  className="form-control"
                  value={personalForm.phone}
                  onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Organization / Department Name</label>
              <input
                type="text"
                className="form-control"
                value={personalForm.organizationName}
                onChange={(e) => setPersonalForm({ ...personalForm, organizationName: e.target.value })}
                placeholder="e.g. Public Works Infrastructure Division"
              />
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" type="submit" loading={saving} disabled={saving}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab 2: Contractor Business & Tax Details */}
      {activeTab === 'contractor' && (
        <Card title="Corporate Entity, GSTIN & PAN Credentials" icon={<Building2 size={18} />}>
          <form onSubmit={handleContractorSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Company Legal Name *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={contractorForm.companyName}
                  onChange={(e) => setContractorForm({ ...contractorForm, companyName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Registration Number / CIN</label>
                <input
                  type="text"
                  className="form-control"
                  value={contractorForm.registrationNumber}
                  onChange={(e) => setContractorForm({ ...contractorForm, registrationNumber: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>GSTIN (15 Digits) *</label>
                <input
                  type="text"
                  className="form-control"
                  maxLength={15}
                  value={contractorForm.gstNumber}
                  onChange={(e) => setContractorForm({ ...contractorForm, gstNumber: e.target.value.toUpperCase() })}
                  placeholder="27AABCU9603R1ZM"
                />
              </div>
              <div className="form-group">
                <label>Permanent Account No. (PAN) *</label>
                <input
                  type="text"
                  className="form-control"
                  maxLength={10}
                  value={contractorForm.panNumber}
                  onChange={(e) => setContractorForm({ ...contractorForm, panNumber: e.target.value.toUpperCase() })}
                  placeholder="AABCU9603R"
                />
              </div>
              <div className="form-group">
                <label>Years of Experience</label>
                <input
                  type="number"
                  className="form-control"
                  min="0"
                  max="100"
                  value={contractorForm.yearsOfExperience}
                  onChange={(e) => setContractorForm({ ...contractorForm, yearsOfExperience: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Technical Capabilities & Domain Specializations</label>
              <textarea
                className="form-control"
                rows={3}
                value={contractorForm.technicalCapacity}
                onChange={(e) => setContractorForm({ ...contractorForm, technicalCapacity: e.target.value })}
                placeholder="e.g. Heavy civil foundations, pre-stressed concrete bridges, bitumen highways, multi-storey commercial towers..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Headquarters Address</label>
                <input
                  type="text"
                  className="form-control"
                  value={contractorForm.address}
                  onChange={(e) => setContractorForm({ ...contractorForm, address: e.target.value })}
                  placeholder="Plot No 44, Industrial Area"
                />
              </div>
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  className="form-control"
                  value={contractorForm.city}
                  onChange={(e) => setContractorForm({ ...contractorForm, city: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  className="form-control"
                  value={contractorForm.state}
                  onChange={(e) => setContractorForm({ ...contractorForm, state: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>PIN Code</label>
                <input
                  type="text"
                  className="form-control"
                  value={contractorForm.pincode}
                  onChange={(e) => setContractorForm({ ...contractorForm, pincode: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" type="submit" loading={saving} disabled={saving}>
                Update Business Profile
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab 3: Certificates & Licensure */}
      {activeTab === 'documents' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          <Card title="Uploaded Verification Dossier" icon={<FileCheck size={18} />}>
            {certificates.length === 0 && !contractor?.verificationDocument ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <FileText size={40} style={{ opacity: 0.4, marginBottom: '10px' }} />
                <p>No certificates uploaded yet. Upload your GST and license certificates to gain priority bidding qualification.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {contractor?.verificationDocument && (
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(253,241,225,0.03)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>Primary Verification Document</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>License / Entity Proof</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <StatusBadge status="verified" />
                      <a
                        href={`${BACKEND_BASE_URL}${contractor.verificationDocument}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        View <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                )}

                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(253,241,225,0.03)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{cert.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {cert.type} · Uploaded {formatDate(cert.uploadedAt)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <StatusBadge status={cert.status || 'verified'} />
                      <a
                        href={`${BACKEND_BASE_URL}${cert.path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        View <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Upload Compliance Document" icon={<Upload size={18} />}>
            <form onSubmit={handleDocUpload}>
              <div className="form-group">
                <label>Document Title *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. ISO 9001:2015 Quality Certificate"
                />
              </div>

              <div className="form-group">
                <label>Document Type</label>
                <select className="form-control" value={docType} onChange={(e) => setDocType(e.target.value)}>
                  <option value="GST Certificate">GST REG-06 Certificate</option>
                  <option value="PAN Card">PAN Entity Card</option>
                  <option value="Contractor Enlistment">PWD / CPWD Enlistment License</option>
                  <option value="Work Experience">Work Completion Certificate</option>
                  <option value="Bank Solvency">Bank Solvency / Net Worth Certificate</option>
                  <option value="ISO Certificate">ISO 9001 / Safety Certification</option>
                </select>
              </div>

              <div className="form-group">
                <label>Select PDF / Scanned Document (Max 15MB) *</label>
                <input
                  type="file"
                  className="form-control"
                  accept=".pdf,.png,.jpg,.jpeg"
                  required
                  onChange={(e) => setUploadFile(e.target.files[0])}
                />
              </div>

              <div style={{ marginTop: '20px' }}>
                <Button variant="primary" type="submit" loading={uploadingDoc} icon={<Upload size={16} />}>
                  {uploadingDoc ? 'Uploading Document...' : 'Upload & Certify'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Tab 4: Security & Password */}
      {activeTab === 'security' && (
        <Card title="Account Security & Password Management" icon={<Shield size={18} />}>
          <form onSubmit={handlePasswordSubmit} style={{ maxWidth: '540px' }}>
            <div className="form-group">
              <label>Current Password *</label>
              <input
                type="password"
                className="form-control"
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="Enter current password"
              />
            </div>

            <div className="form-group">
              <label>New Password (Min 6 Characters) *</label>
              <input
                type="password"
                className="form-control"
                required
                minLength={6}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Enter strong new password"
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password *</label>
              <input
                type="password"
                className="form-control"
                required
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Re-type new password"
              />
            </div>

            <div style={{ marginTop: '20px' }}>
              <Button variant="primary" type="submit" loading={saving} disabled={saving}>
                Update Password
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab 5: Activity & Track Record */}
      {activeTab === 'activity' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <div style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Total Awarded Projects</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--primary)' }}>
              {profile?.stats?.projectsCount || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {profile?.stats?.completedProjectsCount || 0} Successfully Completed
            </div>
          </div>

          <div style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Total Bids Submitted</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-bright)' }}>
              {profile?.stats?.bidsCount || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Active in Tender Competitions
            </div>
          </div>

          <div style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Total Disbursed Earnings</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--success)' }}>
              {formatCurrency(profile?.stats?.totalAmountEarned || 0)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {profile?.stats?.paymentsReleased || 0} Paid Milestone Releases
            </div>
          </div>

          <div style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Performance Rating</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, color: '#f59e0b' }}>
                {contractor?.rating ? Number(contractor.rating).toFixed(1) : '4.8'}
              </span>
              <div style={{ display: 'flex', color: '#f59e0b' }}>
                <Star size={18} fill="#f59e0b" />
                <Star size={18} fill="#f59e0b" />
                <Star size={18} fill="#f59e0b" />
                <Star size={18} fill="#f59e0b" />
                <Star size={18} fill="#f59e0b" />
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Based on site engineer quality audits
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
