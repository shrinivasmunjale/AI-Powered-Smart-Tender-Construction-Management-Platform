import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PlusCircle, ClipboardCheck, AlertTriangle, FileText, Eye, Loader2, MapPin, CloudSun } from 'lucide-react';
import { inspectionsAPI, projectsAPI } from '../utils/api';
import { StatCard } from './common/Card';
import { Button } from './common/Button';
import { StatusBadge, Badge } from './common/Badge';
import { Modal } from './common/Modal';
import { EmptyState } from './common/EmptyState';
import { formatDateTime } from '../utils/formatters';

const INSPECTOR_ROLES = ['engineer', 'project_manager'];
const STAFF_ROLES = ['admin', 'engineer', 'project_manager'];

const INITIAL_FORM = {
  projectId: '',
  inspectorName: '',
  status: 'needs_review',
  weather: '',
  notes: '',
  defects: '[]',
  safetyViolations: '[]',
};

const INSPECTION_STATUSES = ['needs_review', 'passed', 'failed'];

/**
 * Site inspections: engineers log inspections (with defects/violations/media),
 * everyone with portal access can view them.
 */
export const InspectionsView = ({ userRole }) => {
  const canInspect = INSPECTOR_ROLES.includes(userRole);
  const isStaff = STAFF_ROLES.includes(userRole);

  const [inspections, setInspections] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [reportingId, setReportingId] = useState(null);

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 4000);
  };

  const fetchData = useCallback(async () => {
    const [list, statsRes] = await Promise.all([
      inspectionsAPI.getAll(),
      isStaff ? inspectionsAPI.getStats().catch(() => null) : Promise.resolve(null),
    ]);
    setInspections(list);
    setStats(statsRes);
  }, [isStaff]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        await fetchData();
        if (canInspect) {
          try {
            setProjects(await projectsAPI.getAll());
          } catch (err) {
            console.error('Failed to load projects:', err);
          }
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load inspections.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [fetchData, canInspect]);

  const filtered = useMemo(
    () => (filter === 'all' ? inspections : inspections.filter(i => i.status === filter)),
    [inspections, filter]
  );

  const statusOptions = useMemo(
    () => ['all', ...INSPECTION_STATUSES.filter(s => inspections.some(i => i.status === s))],
    [inspections]
  );

  const setField = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      // Validate JSON lists before sending
      JSON.parse(form.defects || '[]');
      JSON.parse(form.safetyViolations || '[]');

      const data = new FormData();
      data.append('projectId', String(form.projectId));
      data.append('inspectorName', form.inspectorName);
      data.append('status', form.status);
      data.append('weather', form.weather);
      data.append('notes', form.notes);
      data.append('defects', form.defects || '[]');
      data.append('safetyViolations', form.safetyViolations || '[]');
      mediaFiles.forEach(file => data.append('media', file));

      await inspectionsAPI.create(data);
      setShowCreate(false);
      setForm(INITIAL_FORM);
      setMediaFiles([]);
      showFeedback('Inspection logged.');
      await fetchData();
    } catch (err) {
      const msg = err.message || 'Failed to create inspection.';
      setError(msg.includes('JSON') || msg.includes('Unexpected') ? 'Defects / violations must be valid JSON arrays, e.g. [{"detail":"..."}]' : msg);
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (inspection, status) => {
    setBusyId(inspection.id);
    setError('');
    try {
      await inspectionsAPI.update(inspection.id, { status });
      showFeedback(`Inspection marked as ${status.replace(/_/g, ' ')}.`);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to update inspection.');
    } finally {
      setBusyId(null);
    }
  };

  const handleGenerateReport = async (inspection) => {
    setReportingId(inspection.id);
    try {
      await inspectionsAPI.generateReport(inspection.id);
      showFeedback('Inspection report generated.');
    } catch (err) {
      setError(err.message || 'Failed to generate report.');
    } finally {
      setReportingId(null);
    }
  };

return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: '32px', color: 'var(--app-text-primary)' }}>
            Site Inspections
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
            Log and review quality checks, defects and safety violations on active projects.
          </p>
        </div>
        {canInspect && (
          <Button variant="primary" icon={<PlusCircle size={18} />} onClick={() => setShowCreate(true)}>
            Log Inspection
          </Button>
        )}
      </div>

      {feedback && <div className="notice-banner success" role="status">{feedback}</div>}
      {error && <div className="notice-banner error" role="alert">{error}</div>}

      {loading ? (
        <EmptyState icon={<Loader2 size={32} className="spin" />} title="Loading inspections..." />
      ) : (
        <>
          {stats && (
            <div className="stats-grid">
              <StatCard icon={<ClipboardCheck size={20} />} iconColor="primary" title="Total Inspections" value={stats.totalInspections || 0} />
              <StatCard icon={<ClipboardCheck size={20} />} iconColor="success" title="Passed" value={stats.passedInspections || 0} subtitle={`Pass rate ${stats.passRate || 0}%`} />
              <StatCard icon={<ClipboardCheck size={20} />} iconColor="warning" title="Needs Review" value={stats.needsReview || 0} />
              <StatCard icon={<AlertTriangle size={20} />} iconColor="danger" title="Defects / Violations" value={`${stats.totalDefects || 0} / ${stats.totalSafetyViolations || 0}`} subtitle="Defects / safety violations" />
            </div>
          )}

          <div className="filter-chips">
            {statusOptions.map(status => (
              <button key={status} className={`filter-chip ${filter === status ? 'active' : ''}`} onClick={() => setFilter(status)}>
                {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={<ClipboardCheck size={32} />} title="No inspections yet" description="Site inspection records will appear here." />
          ) : (
            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Project</th>
                    <th>Inspector</th>
                    <th>Weather</th>
                    <th>Defects</th>
                    <th>Violations</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inspection => (
                    <tr key={inspection.id}>
                      <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{formatDateTime(inspection.inspectionDate)}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{inspection.Project?.name || '—'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{inspection.Project?.Contractor?.companyName || ''}</div>
                      </td>
                      <td>{inspection.inspectorName}</td>
                      <td>
                        {inspection.weather ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CloudSun size={14} /> {inspection.weather}
                          </span>
                        ) : '—'}
                      </td>
                      <td>{inspection.defects?.length || 0}</td>
                      <td>{inspection.safetyViolations?.length || 0}</td>
                      <td><StatusBadge status={inspection.status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <Button variant="secondary" size="sm" icon={<Eye size={14} />} onClick={() => setDetail(inspection)}>View</Button>
                          {canInspect && (
                            <select
                              className="form-control"
                              style={{ width: '130px', padding: '6px 8px', fontSize: '12px' }}
                              value={inspection.status}
                              disabled={busyId === inspection.id}
                              onChange={(e) => handleStatusChange(inspection, e.target.value)}
                            >
                              {INSPECTION_STATUSES.map(s => (
                                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
{/* Log inspection modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Log Site Inspection">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>Project *</label>
            <select className="form-control" required value={form.projectId} onChange={setField('projectId')}>
              <option value="">— Select project —</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Inspector Name *</label>
              <input className="form-control" required value={form.inspectorName} onChange={setField('inspectorName')} placeholder="e.g. Er. Hasan K." />
            </div>
            <div className="form-group">
              <label>Weather</label>
              <input className="form-control" value={form.weather} onChange={setField('weather')} placeholder="e.g. Clear, 24°C" />
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea className="form-control" value={form.notes} onChange={setField('notes')} placeholder="Work quality, scope check, general observations..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Status</label>
              <select className="form-control" value={form.status} onChange={setField('status')}>
                {INSPECTION_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Photos / Videos</label>
              <input className="form-control" type="file" multiple accept="image/*,video/*" onChange={e => setMediaFiles([...e.target.files])} />
              {mediaFiles.length > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>{mediaFiles.length} file(s) attached</div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Defects (JSON array)</label>
            <textarea className="form-control" value={form.defects} onChange={setField('defects')} placeholder='[{"description":"Crack in pier 2 beam","severity":"medium"}]' />
          </div>
          <div className="form-group">
            <label>Safety Violations (JSON array)</label>
            <textarea className="form-control" value={form.safetyViolations} onChange={setField('safetyViolations')} placeholder='[{"description":"Missing guardrails","action":"Install barriers"}]' />
          </div>

          <div className="modal-footer" style={{ padding: '16px 0 0', borderTop: '1px solid var(--border-light)' }}>
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={creating} disabled={creating}>
              {creating ? 'Saving...' : 'Log Inspection'}
            </Button>
          </div>
        </form>
      </Modal>
{/* Inspection detail modal */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={`Inspection #${detail?.id || ''}`} size="lg">
        {detail && (
          <div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <StatusBadge status={detail.status} />
              <Badge variant="secondary">{detail.Project?.name || '—'}</Badge>
              {detail.weather && <Badge variant="info">{detail.weather}</Badge>}
            </div>

            {detail.notes && (
              <div className="form-group">
                <label>Notes</label>
                <p style={{ margin: 0, color: 'var(--text-bright)', fontSize: '14px' }}>{detail.notes}</p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--text-muted)' }}>Defects ({detail.defects?.length || 0})</h4>
                {detail.defects?.length ? detail.defects.map((d, i) => (
                  <div key={i} style={{ fontSize: '13px', padding: '8px', background: 'rgba(255,90,95,0.08)', borderRadius: '8px', marginBottom: '6px' }}>
                    {d.description || d.detail || JSON.stringify(d)}
                    {d.severity && <div style={{ color: 'var(--warning)', fontSize: '12px' }}>{d.severity}</div>}
                  </div>
                )) : <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>None</p>}
              </div>
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--text-muted)' }}>Violations ({detail.safetyViolations?.length || 0})</h4>
                {detail.safetyViolations?.length ? detail.safetyViolations.map((v, i) => (
                  <div key={i} style={{ fontSize: '13px', padding: '8px', background: 'rgba(245,166,35,0.08)', borderRadius: '8px', marginBottom: '6px' }}>
                    {v.description || JSON.stringify(v)}
                    {v.action && <div style={{ fontSize: '12px' }}>Action: {v.action}</div>}
                  </div>
                )) : <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>None</p>}
              </div>
            </div>

            {detail.media?.length > 0 && (
              <div className="form-group">
                <label>Media ({detail.media.length})</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {detail.media.map((m, i) => (
                    <a key={i} href={m.url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--primary)' }}>
                      [{m.type}] {m.caption || m.url}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {isStaff && (
              <div className="modal-footer" style={{ padding: '16px 0 0', borderTop: '1px solid var(--border-light)' }}>
                <Button variant="secondary" size="sm" loading={reportingId === detail.id} onClick={() => handleGenerateReport(detail)}>
                  <FileText size={14} /> Generate Report
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};