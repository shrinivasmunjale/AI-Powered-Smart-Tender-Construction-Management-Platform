import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PlusCircle,
  Building2,
  CalendarDays,
  AlertTriangle,
  DollarSign,
  MapPin,
  Loader2,
} from 'lucide-react';
import { projectsAPI, contractorsAPI, tendersAPI } from '../utils/api';
import { StatCard } from './common/Card';
import { Button } from './common/Button';
import { StatusBadge } from './common/Badge';
import { Modal } from './common/Modal';
import { EmptyState } from './common/EmptyState';
import { formatCurrency, formatDate } from '../utils/formatters';

const MANAGER_ROLES = ['admin', 'engineer', 'project_manager'];

const PROJECT_STATUSES = [
  'planning',
  'foundation',
  'construction',
  'finishing',
  'inspection',
  'completed',
  'on_hold',
  'cancelled',
];

const INITIAL_FORM = {
  name: '',
  department: 'Civil Works',
  location: '',
  budget: '',
  startDate: '',
  endDate: '',
  contractorId: '',
  tenderId: '',
  description: '',
};

const DAY_MS = 1000 * 60 * 60 * 24;
const daysUntil = (date) => (date ? Math.ceil((new Date(date).getTime() - Date.now()) / DAY_MS) : null);

/**
 * Projects Management — full CRUD against the ready /api/projects backend.
 * Managers (admin/engineer/project_manager) can create and update projects;
 * contractors view, and are restricted to, their own projects server-side.
 */
export const ProjectsView = ({ userRole }) => {
  const canManage = MANAGER_ROLES.includes(userRole);

  const [projects, setProjects] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [tenders, setTenders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [filter, setFilter] = useState('all');

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [savingId, setSavingId] = useState(null);

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 4000);
  };

  const fetchProjects = useCallback(async () => {
    const data = await projectsAPI.getAll();
    setProjects(data);
  }, []);

  const fetchStats = useCallback(async () => {
    if (!canManage) return; // stats endpoint is role-gated to managers
    const data = await projectsAPI.getStats();
    setStats(data);
  }, [canManage]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        await Promise.all([fetchProjects(), fetchStats()]);
        if (canManage) {
          try {
            setContractors(await contractorsAPI.getAll());
          } catch (err) {
            console.error('Failed to load contractors for form:', err);
          }
          try {
            setTenders(await tendersAPI.getAll());
          } catch (err) {
            console.error('Failed to load tenders for form:', err);
          }
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load projects.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [fetchProjects, fetchStats, canManage]);

  const derivedStats = useMemo(() => {
    if (stats) return stats;
    // Contractor view: derive from the (own) project list.
    const ongoing = projects.filter(p => ['foundation', 'construction', 'finishing'].includes(p.status)).length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const delayed = projects.filter(p =>
      p.endDate && new Date(p.endDate) < new Date() && !['completed', 'cancelled'].includes(p.status)
    ).length;
    return {
      totalProjects: projects.length,
      ongoingProjects: ongoing,
      completedProjects: completed,
      delayedProjects: delayed,
      totalBudget: projects.reduce((sum, p) => sum + Number(p.budget || 0), 0),
    };
  }, [projects, stats]);

  const filteredProjects = useMemo(
    () => (filter === 'all' ? projects : projects.filter(p => p.status === filter)),
    [projects, filter]
  );

  const statusOptions = useMemo(
    () => ['all', ...PROJECT_STATUSES.filter(s => projects.some(p => p.status === s))],
    [projects]
  );

  const setField = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await projectsAPI.create({
        name: form.name.trim(),
        department: form.department,
        location: form.location.trim(),
        budget: Number(form.budget),
        startDate: form.startDate,
        endDate: form.endDate,
        contractorId: form.contractorId ? Number(form.contractorId) : null,
        tenderId: form.tenderId ? Number(form.tenderId) : null,
        description: form.description.trim(),
      });
      setShowCreate(false);
      setForm(INITIAL_FORM);
      showFeedback('Project created successfully.');
      await Promise.all([fetchProjects(), fetchStats()]);
    } catch (err) {
      setError(err.message || 'Failed to create project.');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (project, nextStatus) => {
    setSavingId(project.id);
    setError('');
    try {
      await projectsAPI.update(project.id, { status: nextStatus });
      showFeedback(`Project "${project.name}" moved to ${nextStatus}.`);
      await Promise.all([fetchProjects(), fetchStats()]);
    } catch (err) {
      setError(err.message || 'Failed to update project.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: '32px', color: 'var(--app-text-primary)' }}>
            Projects
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
            {canManage
              ? 'Track budgets, progress and milestones across all projects.'
              : 'Your awarded construction projects.'}
          </p>
        </div>
        {canManage && (
          <Button variant="primary" icon={<PlusCircle size={18} />} onClick={() => setShowCreate(true)}>
            New Project
          </Button>
        )}
      </div>

      {feedback && (
        <div className="notice-banner success" role="status">{feedback}</div>
      )}
      {error && (
        <div className="notice-banner error" role="alert">{error}</div>
      )}

      {loading ? (
        <EmptyState icon={<Loader2 size={32} className="spin" />} title="Loading projects..." />
      ) : (
        <>
          {/* Stats overview */}
          <div className="stats-grid">
            <StatCard icon={<Building2 size={20} />} iconColor="primary" title="Total Projects" value={derivedStats.totalProjects || 0} />
            <StatCard icon={<Building2 size={20} />} iconColor="info" title="Ongoing" value={derivedStats.ongoingProjects || 0} />
            <StatCard icon={<Building2 size={20} />} iconColor="success" title="Completed" value={derivedStats.completedProjects || 0} />
            <StatCard icon={<AlertTriangle size={20} />} iconColor="warning" title="At Risk / Delayed" value={derivedStats.delayedProjects || 0} />
            <StatCard
              icon={<DollarSign size={20} />}
              iconColor="warning"
              title="Total Budget"
              value={formatCurrency(derivedStats.totalBudget)}
              subtitle={derivedStats.budgetUtilization !== undefined
                ? `Utilization ${Number(derivedStats.budgetUtilization).toFixed(1)}%`
                : undefined}
            />
          </div>

          {/* Status filter chips */}
          <div className="filter-chips">
            {statusOptions.map(status => (
              <button
                key={status}
                className={`filter-chip ${filter === status ? 'active' : ''}`}
                onClick={() => setFilter(status)}
              >
                {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
{/* Projects table */}
          {filteredProjects.length === 0 ? (
            <EmptyState
              icon={<Building2 size={32} />}
              title="No projects found"
              description={canManage
                ? 'Create your first project to start tracking site work.'
                : 'Projects will appear here once a tender is awarded to you.'}
              action={canManage && (
                <Button variant="primary" icon={<PlusCircle size={18} />} onClick={() => setShowCreate(true)}>
                  New Project
                </Button>
              )}
            />
          ) : (
            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Department</th>
                    <th>Contractor</th>
                    <th>Timeline</th>
                    <th>Budget / Actual</th>
                    <th>Progress</th>
                    <th>Status</th>
                    {canManage && <th>Quick Update</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map(project => {
                    const isDelayed = project.endDate
                      && new Date(project.endDate) < new Date()
                      && !['completed', 'cancelled'].includes(project.status);
                    const progress = Math.min(100, Math.max(0, Number(project.progress) || 0));
                    const isSaving = savingId === project.id;

                    return (
                      <tr key={project.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{project.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {project.description ? `${project.description.slice(0, 80)}${project.description.length > 80 ? '…' : ''}` : ''}
                          </div>
                          {project.location && (
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={12} /> {project.location}
                            </div>
                          )}
                        </td>
                        <td><StatusBadge status={project.department} /></td>
                        <td>{project.Contractor?.companyName || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '13px' }}>
                            <CalendarDays size={13} />
                            {formatDate(project.startDate)}
                            <span>→</span>
                            {formatDate(project.endDate)}
                          </div>
                          {isDelayed && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>
                              <AlertTriangle size={12} /> {Math.abs(daysUntil(project.endDate) || 0)}d overdue
                            </div>
                          )}
                        </td>
                        <td>
                          <div>{formatCurrency(project.budget)}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Actual: {formatCurrency(project.actualCost)}
                          </div>
                        </td>
                        <td>
                          <div className="project-progress">
                            <div className="project-progress-fill" style={{ width: `${progress}%` }} />
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{progress}%</div>
                        </td>
                        <td><StatusBadge status={project.status} /></td>
                        {canManage && (
                          <td>
                            <select
                              className="form-control"
                              style={{ width: '140px', padding: '6px 8px', fontSize: '12px' }}
                              value={project.status}
                              disabled={isSaving}
                              onChange={(e) => handleStatusChange(project, e.target.value)}
                            >
                              {PROJECT_STATUSES.map(s => (
                                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                              ))}
                            </select>
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
{/* Create project modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create New Project"
      >
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>Project Name *</label>
            <input className="form-control" required value={form.name} onChange={setField('name')} placeholder="e.g. Aluminij Bridge Rehabilitation" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Department *</label>
              <select className="form-control" value={form.department} onChange={setField('department')}>
                {['Civil Works', 'Infrastructure', 'IT & Energy', 'Environmental', 'Water & Sewage', 'Transportation', 'Facilities'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Location</label>
              <input className="form-control" value={form.location} onChange={setField('location')} placeholder="e.g. Mostar, BiH" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Budget ($) *</label>
              <input className="form-control" type="number" min="0" step="0.01" required value={form.budget} onChange={setField('budget')} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Contractor</label>
              <select className="form-control" value={form.contractorId} onChange={setField('contractorId')}>
                <option value="">— Unassigned —</option>
                {contractors.map(c => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Start Date *</label>
              <input className="form-control" type="date" required value={form.startDate} onChange={setField('startDate')} />
            </div>
            <div className="form-group">
              <label>End Date *</label>
              <input className="form-control" type="date" required value={form.endDate} onChange={setField('endDate')} />
            </div>
          </div>

          <div className="form-group">
            <label>Linked Tender (optional)</label>
            <select className="form-control" value={form.tenderId} onChange={setField('tenderId')}>
              <option value="">— None —</option>
              {tenders.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea className="form-control" value={form.description} onChange={setField('description')} placeholder="Scope, standards, key milestones..." />
          </div>

          <div className="modal-footer" style={{ padding: '16px 0 0', borderTop: '1px solid var(--border-light)' }}>
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={creating} disabled={creating}>
              {creating ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};