import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PlusCircle, Package, PackagePlus, MinusCircle, Pencil, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { materialsAPI } from '../utils/api';
import { StatCard } from './common/Card';
import { Button } from './common/Button';
import { Badge } from './common/Badge';
import { Modal } from './common/Modal';
import { EmptyState } from './common/EmptyState';
import { formatCurrency } from '../utils/formatters';

const MANAGER_ROLES = ['admin', 'engineer', 'project_manager'];

const INITIAL_FORM = {
  name: '', category: '', unit: 'unit', currentStock: '0', minimumStock: '0',
  unitPrice: '', warehouse: '', description: '',
};

/**
 * Materials inventory management with restock/consume and low-stock alerts.
 */
export const MaterialsView = ({ userRole }) => {
  const canManage = MANAGER_ROLES.includes(userRole);
  const isAdmin = userRole === 'admin';

  const [materials, setMaterials] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [filterCategory, setFilterCategory] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const [modal, setModal] = useState(null); // 'create' | 'edit' | 'restock' | 'consume'
  const [editing, setEditing] = useState(null); // material being edited/restocked/consumed
  const [form, setForm] = useState(INITIAL_FORM);
  const [busy, setBusy] = useState(false);
  const [qty, setQty] = useState('');

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 4000);
  };

  const fetchData = useCallback(async () => {
    const [mats, statsRes] = await Promise.all([
      materialsAPI.getAll(),
      canManage ? materialsAPI.getStats().catch(() => null) : Promise.resolve(null),
    ]);
    setMaterials(mats);
    setStats(statsRes);
  }, [canManage]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        await fetchData();
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load materials.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [fetchData]);

  const categories = useMemo(
    () => ['all', ...new Set(materials.filter(m => m.category).map(m => m.category))],
    [materials]
  );

  const filtered = useMemo(() => {
    let list = materials;
    if (filterCategory !== 'all') list = list.filter(m => m.category === filterCategory);
    if (showLowStockOnly) list = list.filter(m => m.isLowStock);
    return list;
  }, [materials, filterCategory, showLowStockOnly]);

  const lowStockCount = useMemo(() => materials.filter(m => m.isLowStock).length, [materials]);

  const openModal = (type, material = null) => {
    setModal(type);
    setEditing(material);
    setError('');
    setQty('');
    setForm(material ? {
      name: material.name,
      category: material.category,
      unit: material.unit,
      currentStock: material.currentStock,
      minimumStock: material.minimumStock,
      unitPrice: material.unitPrice ?? '',
      warehouse: material.warehouse || '',
      description: material.description || '',
    } : INITIAL_FORM);
  };

  const setField = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        unit: form.unit,
        currentStock: Number(form.currentStock),
        minimumStock: Number(form.minimumStock),
        unitPrice: form.unitPrice ? Number(form.unitPrice) : null,
        warehouse: form.warehouse.trim(),
        description: form.description.trim(),
      };
      if (editing) {
        await materialsAPI.update(editing.id, payload);
        showFeedback('Material updated.');
      } else {
        await materialsAPI.create(payload);
        showFeedback('Material added.');
      }
      setModal(null);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to save material.');
    } finally {
      setBusy(false);
    }
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await materialsAPI.restock(editing.id, { quantity: Number(qty) });
      setModal(null);
      showFeedback(`Restocked ${qty} ${editing.unit}(s).`);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Restock failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleConsume = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await materialsAPI.consume(editing.id, { quantity: Number(qty) });
      setModal(null);
      showFeedback(res.alert?.level === 'warning'
        ? `Consumed. ${res.alert.message}`
        : `Consumed ${qty} ${editing.unit}(s).`);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Consume failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (material) => {
    if (!window.confirm(`Delete "${material.name}"?`)) return;
    try {
      await materialsAPI.delete(material.id);
      showFeedback('Material deleted.');
      await fetchData();
    } catch (err) {
      setError(err.message || 'Delete failed.');
    }
  };
return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: '32px', color: 'var(--app-text-primary)' }}>
            Materials Inventory
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
            Track stock levels, valuations and reorder thresholds across warehouses.
          </p>
        </div>
        {canManage && (
          <Button variant="primary" icon={<PlusCircle size={18} />} onClick={() => openModal('create')}>
            Add Material
          </Button>
        )}
      </div>

      {feedback && <div className="notice-banner success" role="status">{feedback}</div>}
      {error && <div className="notice-banner error" role="alert">{error}</div>}

      {loading ? (
        <EmptyState icon={<Loader2 size={32} className="spin" />} title="Loading materials..." />
      ) : (
        <>
          {stats && (
            <div className="stats-grid">
              <StatCard icon={<Package size={20} />} iconColor="primary" title="Total Materials" value={stats.totalMaterials || 0} />
              <StatCard icon={<AlertTriangle size={20} />} iconColor="warning" title="Low Stock Alerts" value={stats.lowStockAlerts || 0} subtitle="At or below minimum" />
              <StatCard icon={<PackagePlus size={20} />} iconColor="success" title="Inventory Value" value={formatCurrency(stats.totalInventoryValue)} />
            </div>
          )}

          <div className="filter-chips" style={{ margin: '16px 0' }}>
            {categories.map(cat => (
              <button key={cat} className={`filter-chip ${filterCategory === cat ? 'active' : ''}`} onClick={() => setFilterCategory(cat)}>
                {cat === 'all' ? `All (${materials.length})` : cat}
              </button>
            ))}
            <button
              className={`filter-chip ${showLowStockOnly ? 'active' : ''}`}
              onClick={() => setShowLowStockOnly(v => !v)}
            >
              {lowStockCount > 0 ? `Low stock (${lowStockCount})` : 'Low stock'}
            </button>
          </div>
{filtered.length === 0 ? (
            <EmptyState icon={<Package size={32} />} title="No materials found" description="Add stock to start tracking inventory." />
          ) : (
            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Category</th>
                    <th>Warehouse</th>
                    <th>Stock</th>
                    <th>Unit Price</th>
                    <th>Value</th>
                    <th>Status</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(material => {
                    const stockPct = material.minimumStock > 0
                      ? Math.min(100, Math.round((material.currentStock / (material.minimumStock * 3)) * 100))
                      : 100;
                    return (
                      <tr key={material.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{material.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{material.description || ''}</div>
                        </td>
                        <td><Badge variant="primary">{material.category || '—'}</Badge></td>
                        <td>{material.warehouse || '—'}</td>
                        <td>
                          <div className="project-progress" style={{ background: material.isLowStock ? 'rgba(255,90,95,0.2)' : undefined }}>
                            <div className="project-progress-fill" style={{ width: `${stockPct}%`, background: material.isLowStock ? 'var(--danger)' : undefined }} />
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {material.currentStock} / min {material.minimumStock} {material.unit}(s)
                          </div>
                        </td>
                        <td>{material.unitPrice != null ? formatCurrency(material.unitPrice) : '—'}/unit</td>
                        <td>{material.unitPrice != null ? formatCurrency(material.currentStock * material.unitPrice) : '—'}</td>
                        <td>
                          {material.isLowStock
                            ? <Badge variant="danger">Low stock</Badge>
                            : <Badge variant="success">In stock</Badge>}
                        </td>
                        {canManage && (
                          <td>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <Button variant="secondary" size="sm" icon={<PackagePlus size={14} />} onClick={() => openModal('restock', material)}>Restock</Button>
                              <Button variant="secondary" size="sm" icon={<MinusCircle size={14} />} onClick={() => openModal('consume', material)}>Consume</Button>
                              <Button variant="secondary" size="sm" icon={<Pencil size={14} />} onClick={() => openModal('edit', material)}>Edit</Button>
                              {isAdmin && (
                                <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => handleDelete(material)}>Delete</Button>
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
{/* Add / Edit material modal */}
      <Modal isOpen={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={editing ? 'Edit Material' : 'Add Material'}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Material Name *</label>
            <input className="form-control" required value={form.name} onChange={setField('name')} placeholder="e.g. Portland Cement" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Category *</label>
              <input className="form-control" required value={form.category} onChange={setField('category')} placeholder="e.g. Concrete" />
            </div>
            <div className="form-group">
              <label>Unit *</label>
              <select className="form-control" value={form.unit} onChange={setField('unit')}>
                {['unit', 'kg', 'ton', 'm', 'm²', 'm³', 'L', 'bag'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Current Stock</label>
              <input className="form-control" type="number" min="0" step="any" value={form.currentStock} onChange={setField('currentStock')} />
            </div>
            <div className="form-group">
              <label>Minimum Stock</label>
              <input className="form-control" type="number" min="0" step="any" value={form.minimumStock} onChange={setField('minimumStock')} />
            </div>
            <div className="form-group">
              <label>Unit Price ($)</label>
              <input className="form-control" type="number" min="0" step="0.01" value={form.unitPrice} onChange={setField('unitPrice')} />
            </div>
          </div>

          <div className="form-group">
            <label>Warehouse</label>
            <input className="form-control" value={form.warehouse} onChange={setField('warehouse')} placeholder="e.g. Site Yard A" />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea className="form-control" value={form.description} onChange={setField('description')} />
          </div>

          <div className="modal-footer" style={{ padding: '16px 0 0', borderTop: '1px solid var(--border-light)' }}>
            <Button variant="secondary" type="button" onClick={() => setModal(null)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={busy} disabled={busy}>
              {busy ? 'Saving...' : editing ? 'Save Changes' : 'Add Material'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Restock modal */}
      <Modal isOpen={modal === 'restock'} onClose={() => setModal(null)} title={`Restock: ${editing?.name || ''}`}>
        <form onSubmit={handleRestock}>
          <div className="form-group">
            <label>Quantity to add ({editing?.unit || 'unit'}) *</label>
            <input className="form-control" type="number" min="0.01" step="any" required value={qty} onChange={e => setQty(e.target.value)} />
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Current stock: {editing?.currentStock} {editing?.unit}(s)
            </div>
          </div>
          <div className="modal-footer" style={{ padding: '16px 0 0', borderTop: '1px solid var(--border-light)' }}>
            <Button variant="secondary" type="button" onClick={() => setModal(null)}>Cancel</Button>
            <Button variant="success" type="submit" loading={busy} disabled={busy}>Restock</Button>
          </div>
        </form>
      </Modal>

      {/* Consume modal */}
      <Modal isOpen={modal === 'consume'} onClose={() => setModal(null)} title={`Consume: ${editing?.name || ''}`}>
        <form onSubmit={handleConsume}>
          <div className="form-group">
            <label>Quantity to consume ({editing?.unit || 'unit'}) *</label>
            <input className="form-control" type="number" min="0.01" step="any" required value={qty} onChange={e => setQty(e.target.value)} />
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Current stock: {editing?.currentStock} {editing?.unit}(s)
            </div>
          </div>
          <div className="modal-footer" style={{ padding: '16px 0 0', borderTop: '1px solid var(--border-light)' }}>
            <Button variant="secondary" type="button" onClick={() => setModal(null)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={busy} disabled={busy}>{busy ? 'Updating...' : 'Consume'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};