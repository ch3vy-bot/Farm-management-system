import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ModuleLayout from '../components/ModuleLayout.jsx';
import { money } from '../utils/currency.js';

const TYPES = ['tractor', 'harvester', 'sprayer', 'pump', 'vehicle', 'implement', 'generator', 'other'];
const STATUSES = ['available', 'in_use', 'maintenance', 'retired'];
const MAINT_TYPES = ['routine', 'repair', 'inspection'];

const input = 'mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20';
const primaryBtn = 'rounded-full bg-farm-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-farm-800';
const ghostBtn = 'rounded-full border border-farm-200 px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-farm-50';
const label = (s) => s.replace(/_/g, ' ');
const today = () => new Date().toISOString().slice(0, 10);
const day = (d) => (d ? String(d).slice(0, 10) : '—');

const STATUS_STYLE = {
    available: 'bg-farm-100 text-farm-800',
    in_use: 'bg-blue-100 text-blue-800',
    maintenance: 'bg-amber-100 text-amber-800',
    retired: 'bg-slate-200 text-slate-700',
};

function errorText(err, fallback) {
    const errors = err.response?.data?.errors;
    if (errors) return Object.values(errors).flat().join(' ');
    return err.response?.data?.message || fallback;
}

const emptyForm = { farm_id: '', name: '', type: 'tractor', serial_number: '', purchase_date: '', purchase_cost: '', status: 'available', notes: '' };
const emptyMaint = { type: 'routine', description: '', cost: '', maintenance_date: today(), next_service_date: '', record_expense: false };
const emptyFuel = { log_date: today(), litres: '', cost: '', hours_reading: '', record_expense: false };

export default function EquipmentManagement() {
    const { api } = useAuth();
    const [items, setItems] = useState([]);
    const [farms, setFarms] = useState([]);
    const [farmFilter, setFarmFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formError, setFormError] = useState(null);

    const [modal, setModal] = useState(null); // 'form' | 'log' | null
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);

    const [target, setTarget] = useState(null);
    const [detail, setDetail] = useState(null);
    const [logTab, setLogTab] = useState('maintenance');
    const [maint, setMaint] = useState(emptyMaint);
    const [fuel, setFuel] = useState(emptyFuel);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const params = {};
        if (farmFilter) params.farm_id = farmFilter;
        if (statusFilter) params.status = statusFilter;
        try {
            const [res, farmRes] = await Promise.all([
                api.get('/api/equipment', { params }),
                api.get('/api/farms'),
            ]);
            setItems(res.data.data);
            setFarms(farmRes.data.data);
        } catch (err) {
            setError(errorText(err, 'Failed to load equipment.'));
        } finally {
            setLoading(false);
        }
    }, [api, farmFilter, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const limit = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const nextService = (e) => (e.maintenance_records_max_next_service_date ? String(e.maintenance_records_max_next_service_date).slice(0, 10) : null);
    const isDue = (e) => e.status !== 'retired' && nextService(e) && nextService(e) <= limit;
    const count = (s) => items.filter((e) => e.status === s).length;

    function openForm(item = null) {
        setFormError(null);
        setEditing(item);
        setForm(item ? {
            farm_id: item.farm_id,
            name: item.name,
            type: item.type,
            serial_number: item.serial_number || '',
            purchase_date: item.purchase_date ? item.purchase_date.slice(0, 10) : '',
            purchase_cost: item.purchase_cost,
            status: item.status,
            notes: item.notes || '',
        } : { ...emptyForm, farm_id: farmFilter });
        setModal('form');
    }

    async function save(e) {
        e.preventDefault();
        setFormError(null);
        const payload = {
            name: form.name,
            type: form.type,
            serial_number: form.serial_number || null,
            purchase_date: form.purchase_date || null,
            purchase_cost: form.purchase_cost === '' ? 0 : form.purchase_cost,
            status: form.status,
            notes: form.notes || null,
        };
        try {
            if (editing) await api.put(`/api/equipment/${editing.id}`, payload);
            else await api.post('/api/equipment', { ...payload, farm_id: form.farm_id });
            setModal(null);
            load();
        } catch (err) {
            setFormError(errorText(err, 'Could not save the equipment.'));
        }
    }

    async function changeStatus(item, status) {
        try {
            await api.put(`/api/equipment/${item.id}`, { status });
            load();
        } catch (err) {
            alert(errorText(err, 'Could not change the status.'));
        }
    }

    async function remove(item) {
        if (!window.confirm(`Delete "${item.name}"?`)) return;
        try {
            await api.delete(`/api/equipment/${item.id}`);
            load();
        } catch (err) {
            alert(errorText(err, 'Could not delete the equipment.'));
        }
    }

    async function loadDetail(item) {
        try {
            const res = await api.get(`/api/equipment/${item.id}`);
            setDetail(res.data.data);
        } catch {
            setDetail(null);
        }
    }

    function openLog(item, tab) {
        setFormError(null);
        setTarget(item);
        setDetail(null);
        setLogTab(tab);
        setMaint(emptyMaint);
        setFuel(emptyFuel);
        setModal('log');
        loadDetail(item);
    }

    async function saveMaint(e) {
        e.preventDefault();
        setFormError(null);
        try {
            await api.post(`/api/equipment/${target.id}/maintenance`, {
                type: maint.type,
                description: maint.description || null,
                cost: maint.cost === '' ? 0 : maint.cost,
                maintenance_date: maint.maintenance_date,
                next_service_date: maint.next_service_date || null,
                record_expense: maint.record_expense,
            });
            setMaint(emptyMaint);
            await loadDetail(target);
            load();
        } catch (err) {
            setFormError(errorText(err, 'Could not record maintenance.'));
        }
    }

    async function saveFuel(e) {
        e.preventDefault();
        setFormError(null);
        try {
            await api.post(`/api/equipment/${target.id}/fuel`, {
                log_date: fuel.log_date,
                litres: fuel.litres,
                cost: fuel.cost === '' ? 0 : fuel.cost,
                hours_reading: fuel.hours_reading === '' ? null : fuel.hours_reading,
                record_expense: fuel.record_expense,
            });
            setFuel(emptyFuel);
            await loadDetail(target);
            load();
        } catch (err) {
            setFormError(errorText(err, 'Could not record fuel.'));
        }
    }

    return (
        <ModuleLayout
          title="Farm Equipment &amp; Machinery"
          subtitle="Equipment register, maintenance, fuel and availability."
          actions={<>
<button className="rounded-full bg-harvest-400 px-5 py-2 text-sm font-medium text-farm-900 transition hover:bg-harvest-500 disabled:opacity-60" onClick={() => openForm()}>+ Add Equipment</button>
          </>}
        >
            <div className="mx-auto max-w-7xl">

                <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        ['Available', count('available')],
                        ['In use', count('in_use')],
                        ['In maintenance', count('maintenance')],
                        ['Service due (14 days)', items.filter(isDue).length],
                    ].map(([t, v]) => (
                        <div key={t} className="rounded-3xl bg-white p-4 shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
                            <p className="text-sm text-slate-500">{t}</p>
                            <p className="mt-1 text-2xl font-semibold text-farm-900">{v}</p>
                        </div>
                    ))}
                </div>

                <div className="mb-4 flex flex-wrap gap-3">
                    <select className={input + ' !mt-0 !w-auto'} value={farmFilter} onChange={(e) => setFarmFilter(e.target.value)}>
                        <option value="">All farms</option>
                        {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    <select className={input + ' !mt-0 !w-auto'} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">All statuses</option>
                        {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                    </select>
                </div>

                {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

                <div className="overflow-x-auto rounded-3xl bg-white shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-farm-50 text-farm-700 text-xs">
                            <tr>
                                <th className="px-4 py-3 font-medium">Name</th>
                                <th className="px-4 py-3 font-medium">Farm</th>
                                <th className="px-4 py-3 font-medium">Type</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Next service</th>
                                <th className="px-4 py-3 font-medium">Purchase cost</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-farm-100">
                            {loading ? (
                                <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-500">Loading equipment...</td></tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-500">No equipment registered yet.</td></tr>
                            ) : items.map((e) => (
                                <tr key={e.id} className="hover:bg-farm-50">
                                    <td className="px-4 py-3 font-medium text-farm-900">
                                        {e.name}
                                        {e.serial_number && <span className="ml-2 text-xs font-normal text-slate-500">#{e.serial_number}</span>}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">{e.farm?.name}</td>
                                    <td className="px-4 py-3 capitalize text-slate-500">{e.type}</td>
                                    <td className="px-4 py-3">
                                        <select
                                            className={`rounded px-2 py-1 text-xs font-medium capitalize ${STATUS_STYLE[e.status]}`}
                                            value={e.status}
                                            onChange={(ev) => changeStatus(e, ev.target.value)}
                                        >
                                            {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {day(nextService(e))}
                                        {isDue(e) && <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">Due</span>}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">{money(e.purchase_cost)}</td>
                                    <td className="space-x-3 px-4 py-3 text-right whitespace-nowrap">
                                        <button className="text-farm-700 hover:underline" onClick={() => openLog(e, 'maintenance')}>Maintenance</button>
                                        <button className="text-amber-700 hover:underline" onClick={() => openLog(e, 'fuel')}>Fuel</button>
                                        <button className="text-farm-700 hover:underline" onClick={() => openForm(e)}>Edit</button>
                                        <button className="text-red-600 hover:underline" onClick={() => remove(e)}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {modal === 'form' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                        <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
                            <h2 className="mb-4 text-xl font-semibold text-farm-900">{editing ? 'Edit Equipment' : 'Add Equipment'}</h2>
                            {formError && <p className="mb-4 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>}
                            <form onSubmit={save} className="space-y-4">
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
                                    <input className={input} placeholder="e.g. John Deere 5075E" value={form.name} required
                                        onChange={(e) => setForm({ ...form, name: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-farm-900">Type</label>
                                        <select className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-farm-900">Status</label>
                                        <select className={input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                            {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Serial number (optional)</label>
                                    <input className={input} value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-farm-900">Purchase date</label>
                                        <input type="date" max={today()} className={input} value={form.purchase_date}
                                            onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-farm-900">Purchase cost (K)</label>
                                        <input type="number" step="0.01" min="0" className={input} value={form.purchase_cost}
                                            onChange={(e) => setForm({ ...form, purchase_cost: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Notes (optional)</label>
                                    <textarea rows="2" className={input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" className={ghostBtn} onClick={() => setModal(null)}>Cancel</button>
                                    <button type="submit" className={primaryBtn}>{editing ? 'Save changes' : 'Add equipment'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {modal === 'log' && target && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
                            <h2 className="mb-1 text-xl font-semibold text-farm-900">{target.name}</h2>
                            <p className="mb-4 text-sm text-slate-500">Maintenance and fuel records</p>

                            <div className="mb-4 flex gap-2 border-b border-farm-100">
                                {['maintenance', 'fuel'].map((t) => (
                                    <button key={t} type="button" onClick={() => { setLogTab(t); setFormError(null); }}
                                        className={`px-4 py-2 text-sm font-medium capitalize ${logTab === t ? 'border-b-2 border-farm-700 text-farm-700' : 'text-slate-500'}`}>
                                        {t}
                                    </button>
                                ))}
                            </div>

                            {formError && <p className="mb-4 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>}

                            {logTab === 'maintenance' ? (
                                <>
                                    <form onSubmit={saveMaint} className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium text-farm-900">Type</label>
                                                <select className={input} value={maint.type} onChange={(e) => setMaint({ ...maint, type: e.target.value })}>
                                                    {MAINT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-farm-900">Cost (K)</label>
                                                <input type="number" step="0.01" min="0" className={input} value={maint.cost}
                                                    onChange={(e) => setMaint({ ...maint, cost: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-farm-900">Date done</label>
                                                <input type="date" max={today()} className={input} value={maint.maintenance_date} required
                                                    onChange={(e) => setMaint({ ...maint, maintenance_date: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-farm-900">Next service (optional)</label>
                                                <input type="date" className={input} value={maint.next_service_date}
                                                    onChange={(e) => setMaint({ ...maint, next_service_date: e.target.value })} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-farm-900">What was done (optional)</label>
                                            <input className={input} value={maint.description} onChange={(e) => setMaint({ ...maint, description: e.target.value })} />
                                        </div>
                                        <label className="flex items-center gap-2 text-sm text-farm-900">
                                            <input type="checkbox" checked={maint.record_expense}
                                                onChange={(e) => setMaint({ ...maint, record_expense: e.target.checked })} />
                                            Also record this cost as a finance expense
                                        </label>
                                        <div className="flex justify-end"><button type="submit" className={primaryBtn}>Record maintenance</button></div>
                                    </form>

                                    <h3 className="mb-2 mt-6 text-sm font-semibold text-farm-900">Recent maintenance</h3>
                                    {!detail ? <p className="text-sm text-slate-500">Loading...</p>
                                    : detail.maintenance_records.length === 0 ? <p className="text-sm text-slate-500">No maintenance recorded.</p> : (
                                        <table className="w-full text-left text-sm">
                                            <thead className="text-slate-500"><tr>
                                                <th className="py-2">Date</th><th>Type</th><th>Cost</th><th>Next service</th><th>Notes</th>
                                            </tr></thead>
                                            <tbody className="divide-y divide-farm-100">
                                                {detail.maintenance_records.map((r) => (
                                                    <tr key={r.id}>
                                                        <td className="py-2 text-slate-500">{day(r.maintenance_date)}</td>
                                                        <td className="capitalize">{r.type}</td>
                                                        <td>{money(r.cost)}</td>
                                                        <td className="text-slate-500">{day(r.next_service_date)}</td>
                                                        <td className="text-slate-500">{r.description || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </>
                            ) : (
                                <>
                                    <form onSubmit={saveFuel} className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium text-farm-900">Date</label>
                                                <input type="date" max={today()} className={input} value={fuel.log_date} required
                                                    onChange={(e) => setFuel({ ...fuel, log_date: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-farm-900">Litres</label>
                                                <input type="number" step="0.01" min="0.01" className={input} value={fuel.litres} required
                                                    onChange={(e) => setFuel({ ...fuel, litres: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-farm-900">Cost (K)</label>
                                                <input type="number" step="0.01" min="0" className={input} value={fuel.cost}
                                                    onChange={(e) => setFuel({ ...fuel, cost: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-farm-900">Hours reading (optional)</label>
                                                <input type="number" step="0.1" min="0" className={input} value={fuel.hours_reading}
                                                    onChange={(e) => setFuel({ ...fuel, hours_reading: e.target.value })} />
                                            </div>
                                        </div>
                                        <label className="flex items-center gap-2 text-sm text-farm-900">
                                            <input type="checkbox" checked={fuel.record_expense}
                                                onChange={(e) => setFuel({ ...fuel, record_expense: e.target.checked })} />
                                            Also record this cost as a finance expense
                                        </label>
                                        <div className="flex justify-end"><button type="submit" className={primaryBtn}>Record fuel</button></div>
                                    </form>

                                    <h3 className="mb-2 mt-6 text-sm font-semibold text-farm-900">Recent fuel logs</h3>
                                    {!detail ? <p className="text-sm text-slate-500">Loading...</p>
                                    : detail.fuel_logs.length === 0 ? <p className="text-sm text-slate-500">No fuel recorded.</p> : (
                                        <table className="w-full text-left text-sm">
                                            <thead className="text-slate-500"><tr>
                                                <th className="py-2">Date</th><th>Litres</th><th>Cost</th><th>Hours</th>
                                            </tr></thead>
                                            <tbody className="divide-y divide-farm-100">
                                                {detail.fuel_logs.map((r) => (
                                                    <tr key={r.id}>
                                                        <td className="py-2 text-slate-500">{day(r.log_date)}</td>
                                                        <td>{r.litres}</td>
                                                        <td>{money(r.cost)}</td>
                                                        <td className="text-slate-500">{r.hours_reading ?? '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </>
                            )}

                            <div className="mt-6 flex justify-end">
                                <button className={ghostBtn} onClick={() => setModal(null)}>Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ModuleLayout>
    );
}