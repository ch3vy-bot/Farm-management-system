import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ModuleLayout from '../components/ModuleLayout.jsx';
import { money } from '../utils/currency.js';

const CATEGORIES = ['seeds', 'fertilizer', 'chemical', 'feed', 'medicine', 'packaging', 'fuel', 'tool'];

const input = 'mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20';
const primaryBtn = 'rounded-full bg-farm-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-farm-800';
const ghostBtn = 'rounded-full border border-farm-200 px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-farm-50';

function errorText(err, fallback) {
    const errors = err.response?.data?.errors;
    if (errors) return Object.values(errors).flat().join(' ');
    return err.response?.data?.message || fallback;
}

const emptyForm = {
    farm_id: '', name: '', category: 'seeds', unit: '', quantity: '',
    minimum_stock: '', unit_cost: '', expiry_date: '',
};

export default function InventoryManagement() {
    const { api } = useAuth();
    const [resources, setResources] = useState([]);
    const [farms, setFarms] = useState([]);
    const [farmFilter, setFarmFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [alerts, setAlerts] = useState({ low: [], expired: [], soon: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formError, setFormError] = useState(null);

    const [modal, setModal] = useState(null); // 'form' | 'stock' | 'history' | null
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [stockTarget, setStockTarget] = useState(null);
    const [stock, setStock] = useState({ direction: 'in', quantity: '', unit_cost: '', reason: '' });
    const [history, setHistory] = useState([]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const params = {};
        if (farmFilter) params.farm_id = farmFilter;
        if (categoryFilter) params.category = categoryFilter;
        try {
            const [res, farmRes, low, exp] = await Promise.all([
                api.get('/api/resources', { params }),
                api.get('/api/farms'),
                api.get('/api/resources/low-stock', { params: farmFilter ? { farm_id: farmFilter } : {} }),
                api.get('/api/resources/expiring', { params: farmFilter ? { farm_id: farmFilter } : {} }),
            ]);
            setResources(res.data.data);
            setFarms(farmRes.data.data);
            setAlerts({
                low: low.data.data,
                expired: exp.data.data.expired,
                soon: exp.data.data.expiring_soon,
            });
        } catch (err) {
            setError(errorText(err, 'Failed to load inventory.'));
        } finally {
            setLoading(false);
        }
    }, [api, farmFilter, categoryFilter]);

    useEffect(() => { load(); }, [load]);

    function openForm(resource = null) {
        setFormError(null);
        setEditing(resource);
        setForm(resource ? {
            farm_id: resource.farm_id,
            name: resource.name,
            category: resource.category,
            unit: resource.unit,
            quantity: resource.quantity,
            minimum_stock: resource.minimum_stock,
            unit_cost: resource.unit_cost,
            expiry_date: resource.expiry_date ? resource.expiry_date.slice(0, 10) : '',
        } : { ...emptyForm, farm_id: farmFilter });
        setModal('form');
    }

    async function saveResource(e) {
        e.preventDefault();
        setFormError(null);
        try {
            const payload = {
                name: form.name,
                category: form.category,
                unit: form.unit,
                minimum_stock: form.minimum_stock === '' ? 0 : form.minimum_stock,
                unit_cost: form.unit_cost === '' ? 0 : form.unit_cost,
                expiry_date: form.expiry_date || null,
            };
            if (editing) {
                // farm and quantity cannot be changed by the API
                await api.put(`/api/resources/${editing.id}`, payload);
            } else {
                await api.post('/api/resources', {
                    ...payload,
                    farm_id: form.farm_id,
                    quantity: form.quantity === '' ? 0 : form.quantity,
                });
            }
            setModal(null);
            load();
        } catch (err) {
            setFormError(errorText(err, 'Could not save the resource.'));
        }
    }

    async function deleteResource(r) {
        if (!window.confirm(`Delete "${r.name}"?`)) return;
        try {
            await api.delete(`/api/resources/${r.id}`);
            load();
        } catch (err) {
            alert(errorText(err, 'Could not delete the resource.'));
        }
    }

    function openStock(r, direction) {
        setFormError(null);
        setStockTarget(r);
        setStock({ direction, quantity: '', unit_cost: '', reason: '' });
        setModal('stock');
    }

    async function saveStock(e) {
        e.preventDefault();
        setFormError(null);
        try {
            const body = { quantity: stock.quantity, reason: stock.reason || null };
            if (stock.direction === 'in' && stock.unit_cost !== '') body.unit_cost = stock.unit_cost;
            await api.post(`/api/resources/${stockTarget.id}/stock-${stock.direction}`, body);
            setModal(null);
            load();
        } catch (err) {
            setFormError(errorText(err, 'Could not record the stock movement.'));
        }
    }

    async function openHistory(r) {
        setStockTarget(r);
        setHistory([]);
        setModal('history');
        try {
            const res = await api.get(`/api/resources/${r.id}`);
            setHistory(res.data.data.transactions || []);
        } catch {
            setHistory([]);
        }
    }

    const isLow = (r) => Number(r.quantity) <= Number(r.minimum_stock);
    const today = new Date().toISOString().slice(0, 10);
    const expiryBadge = (r) => {
        if (!r.expiry_date) return null;
        const d = r.expiry_date.slice(0, 10);
        if (d < today) return <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">Expired</span>;
        if (alerts.soon.some((s) => s.id === r.id)) return <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Expiring soon</span>;
        return null;
    };

    return (
        <ModuleLayout
          title="Inventory &amp; Inputs"
          subtitle="Seeds, fertilizer, chemicals, feed, medicine and other farm resources."
          actions={<>
<button className="rounded-full bg-harvest-400 px-5 py-2 text-sm font-medium text-farm-900 transition hover:bg-harvest-500 disabled:opacity-60" onClick={() => openForm()}>+ Add Resource</button>
          </>}
        >
            <div className="mx-auto max-w-7xl">

                <div className="mb-6 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-3xl bg-white p-4 shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
                        <p className="text-sm text-slate-500">Low stock</p>
                        <p className="mt-1 text-2xl font-semibold text-farm-900">{alerts.low.length}</p>
                    </div>
                    <div className="rounded-3xl bg-white p-4 shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
                        <p className="text-sm text-slate-500">Expiring soon</p>
                        <p className="mt-1 text-2xl font-semibold text-farm-900">{alerts.soon.length}</p>
                    </div>
                    <div className="rounded-3xl bg-white p-4 shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
                        <p className="text-sm text-slate-500">Expired</p>
                        <p className="mt-1 text-2xl font-semibold text-farm-900">{alerts.expired.length}</p>
                    </div>
                </div>

                <div className="mb-4 flex flex-wrap gap-3">
                    <select className={input + ' !mt-0 !w-auto'} value={farmFilter} onChange={(e) => setFarmFilter(e.target.value)}>
                        <option value="">All farms</option>
                        {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    <select className={input + ' !mt-0 !w-auto'} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                        <option value="">All categories</option>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

                <div className="overflow-x-auto rounded-3xl bg-white shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-farm-50 text-farm-700 text-xs">
                            <tr>
                                <th className="px-4 py-3 font-medium">Name</th>
                                <th className="px-4 py-3 font-medium">Farm</th>
                                <th className="px-4 py-3 font-medium">Category</th>
                                <th className="px-4 py-3 font-medium">In stock</th>
                                <th className="px-4 py-3 font-medium">Min</th>
                                <th className="px-4 py-3 font-medium">Unit cost</th>
                                <th className="px-4 py-3 font-medium">Expiry</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-farm-100">
                            {loading ? (
                                <tr><td colSpan="8" className="px-4 py-10 text-center text-slate-500">Loading inventory...</td></tr>
                            ) : resources.length === 0 ? (
                                <tr><td colSpan="8" className="px-4 py-10 text-center text-slate-500">No resources yet.</td></tr>
                            ) : resources.map((r) => (
                                <tr key={r.id} className="hover:bg-farm-50">
                                    <td className="px-4 py-3 font-medium text-farm-900">{r.name}{expiryBadge(r)}</td>
                                    <td className="px-4 py-3 text-slate-500">{r.farm?.name}</td>
                                    <td className="px-4 py-3 capitalize text-slate-500">{r.category}</td>
                                    <td className={`px-4 py-3 font-medium ${isLow(r) ? 'text-red-700' : 'text-farm-900'}`}>
                                        {r.quantity} {r.unit}{isLow(r) && <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs">Low</span>}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">{r.minimum_stock}</td>
                                    <td className="px-4 py-3 text-slate-500">{money(r.unit_cost)}</td>
                                    <td className="px-4 py-3 text-slate-500">{r.expiry_date ? r.expiry_date.slice(0, 10) : '—'}</td>
                                    <td className="space-x-3 px-4 py-3 text-right whitespace-nowrap">
                                        <button className="text-farm-700 hover:underline" onClick={() => openStock(r, 'in')}>Stock in</button>
                                        <button className="text-amber-700 hover:underline" onClick={() => openStock(r, 'out')}>Stock out</button>
                                        <button className="text-slate-500 hover:underline" onClick={() => openHistory(r)}>History</button>
                                        <button className="text-farm-700 hover:underline" onClick={() => openForm(r)}>Edit</button>
                                        <button className="text-red-600 hover:underline" onClick={() => deleteResource(r)}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {modal === 'form' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                        <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
                            <h2 className="mb-4 text-xl font-semibold text-farm-900">{editing ? 'Edit Resource' : 'Add Resource'}</h2>
                            {formError && <p className="mb-4 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>}
                            <form onSubmit={saveResource} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Farm</label>
                                    <select className={input} value={form.farm_id} disabled={!!editing} required
                                        onChange={(e) => setForm({ ...form, farm_id: e.target.value })}>
                                        <option value="">Choose a farm...</option>
                                        {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Name</label>
                                    <input className={input} value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-farm-900">Category</label>
                                        <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-farm-900">Unit</label>
                                        <input className={input} placeholder="kg, L, bags" value={form.unit} required onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-farm-900">Opening qty</label>
                                        <input type="number" step="0.01" min="0" className={input} value={form.quantity} disabled={!!editing}
                                            onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-farm-900">Min stock</label>
                                        <input type="number" step="0.01" min="0" className={input} value={form.minimum_stock}
                                            onChange={(e) => setForm({ ...form, minimum_stock: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-farm-900">Unit cost</label>
                                        <input type="number" step="0.01" min="0" className={input} value={form.unit_cost}
                                            onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
                                    </div>
                                </div>
                                {editing && <p className="text-xs text-slate-500">Quantity changes only through Stock in / Stock out so the history stays accurate.</p>}
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Expiry date (optional)</label>
                                    <input type="date" className={input} value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" className={ghostBtn} onClick={() => setModal(null)}>Cancel</button>
                                    <button type="submit" className={primaryBtn}>{editing ? 'Save changes' : 'Add resource'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {modal === 'stock' && stockTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
                            <h2 className="mb-1 text-xl font-semibold text-farm-900">
                                {stock.direction === 'in' ? 'Stock in' : 'Stock out'}: {stockTarget.name}
                            </h2>
                            <p className="mb-4 text-sm text-slate-500">Currently {stockTarget.quantity} {stockTarget.unit}</p>
                            {formError && <p className="mb-4 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>}
                            <form onSubmit={saveStock} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Quantity ({stockTarget.unit})</label>
                                    <input type="number" step="0.01" min="0.01" className={input} value={stock.quantity} required
                                        onChange={(e) => setStock({ ...stock, quantity: e.target.value })} />
                                </div>
                                {stock.direction === 'in' && (
                                    <div>
                                        <label className="block text-sm font-medium text-farm-900">Unit cost (optional)</label>
                                        <input type="number" step="0.01" min="0" className={input} value={stock.unit_cost}
                                            onChange={(e) => setStock({ ...stock, unit_cost: e.target.value })} />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Reason (optional)</label>
                                    <input className={input} value={stock.reason} onChange={(e) => setStock({ ...stock, reason: e.target.value })} />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" className={ghostBtn} onClick={() => setModal(null)}>Cancel</button>
                                    <button type="submit" className={primaryBtn}>Record</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {modal === 'history' && stockTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
                            <h2 className="mb-4 text-xl font-semibold text-farm-900">Stock history: {stockTarget.name}</h2>
                            {history.length === 0 ? (
                                <p className="text-sm text-slate-500">No movements recorded.</p>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="text-slate-500"><tr>
                                        <th className="py-2">Date</th><th>Type</th><th>Qty</th><th>Reason</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-farm-100">
                                        {history.map((t) => (
                                            <tr key={t.id}>
                                                <td className="py-2 text-slate-500">{t.created_at?.slice(0, 10)}</td>
                                                <td className={t.type === 'stock_in' ? 'text-farm-700' : 'text-amber-700'}>{t.type === 'stock_in' ? 'In' : 'Out'}</td>
                                                <td>{t.quantity}</td>
                                                <td className="text-slate-500">{t.reason || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            <div className="mt-4 flex justify-end">
                                <button className={ghostBtn} onClick={() => setModal(null)}>Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ModuleLayout>
    );
}
