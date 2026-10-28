import React, { Fragment, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ModuleLayout from '../components/ModuleLayout.jsx';
import { money } from '../utils/currency.js';

const today = () => new Date().toISOString().slice(0, 10);
const num = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const daysSince = (date) => {
    if (!date) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(String(date).slice(0, 10)).getTime()) / 86400000));
};

const defaults = {
    facility: () => ({ farm_id: '', name: '', facility_type: 'Warehouse', capacity: '', capacity_unit: 'kg', current_temperature_c: '' }),
    produce: () => ({ storage_facility_id: '', crop_name: '', quantity: '', unit: 'kg', grade: '', quality_status: 'Good', date_stored: today(), valuation_amount: '' }),
    movement: () => ({ movement_type: 'Stock In', quantity: '', movement_date: today(), notes: '' }),
    dispatch: () => ({ quantity_dispatched: '', destination: '', dispatch_date: today() }),
};

const inputClass =
    'mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20';

const qualityStyles = {
    Good: 'bg-farm-100 text-farm-800',
    Fair: 'bg-amber-100 text-amber-800',
    Spoiled: 'bg-red-100 text-red-800',
};

const modalTitles = {
    facility: (rec) => (rec ? 'Edit storage facility' : 'Add storage facility'),
    produce: (rec) => (rec ? 'Edit stored batch' : 'Store produce'),
    movement: (rec) => `Move stock: ${rec?.crop_name}`,
    dispatch: (rec) => `Dispatch ${rec?.crop_name}`,
};

const submitLabels = {
    facility: (rec) => (rec ? 'Save changes' : 'Add facility'),
    produce: (rec) => (rec ? 'Save changes' : 'Store produce'),
    movement: () => 'Record movement',
    dispatch: () => 'Dispatch',
};

function Badge({ styles, value }) {
    return (
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[value] || 'bg-slate-100 text-slate-700'}`}>
            {value}
        </span>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="block text-sm font-medium text-farm-900">{label}</label>
            {children}
        </div>
    );
}

function DataTable({ headers, loading, isEmpty, emptyText, children }) {
    return (
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
            <table className="w-full text-left text-sm">
                <thead className="bg-farm-50 text-slate-500">
                    <tr>
                        {headers.map((h, i) => (
                            <th key={h} className={`px-6 py-3 font-semibold ${i === headers.length - 1 ? 'text-right' : ''}`}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-farm-100">
                    {loading ? (
                        <tr>
                            <td colSpan={headers.length} className="px-6 py-10 text-center text-slate-500">
                                Loading...
                            </td>
                        </tr>
                    ) : isEmpty ? (
                        <tr>
                            <td colSpan={headers.length} className="px-6 py-10 text-center text-slate-500">
                                {emptyText}
                            </td>
                        </tr>
                    ) : (
                        children
                    )}
                </tbody>
            </table>
        </div>
    );
}

function Modal({ title, onClose, onSubmit, submitLabel, children }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
                <h2 className="mb-6 text-xl font-semibold text-farm-900">{title}</h2>
                <form onSubmit={onSubmit} className="space-y-4">
                    {children}
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-farm-200 px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-farm-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="rounded-full bg-farm-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-farm-800"
                        >
                            {submitLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function StorageManagement() {
    const { api } = useAuth();
    const [tab, setTab] = useState('produce');
    const [facilities, setFacilities] = useState([]);
    const [produce, setProduce] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({});
    const [expanded, setExpanded] = useState(null);
    const [history, setHistory] = useState({});

    useEffect(() => {
        fetchAll();
    }, []);

    async function fetchAll() {
        setLoading(true);
        setError(null);
        try {
            const [f, p] = await Promise.all([api.get('/api/storage-facilities'), api.get('/api/stored-produce')]);
            setFacilities(f.data.data ?? f.data);
            setProduce(p.data.data ?? p.data);
        } catch (err) {
            setError('Could not load storage data. Check that the API is running and you are logged in.');
        } finally {
            setLoading(false);
        }
    }

    async function loadHistory(id) {
        try {
            const [m, d] = await Promise.all([
                api.get(`/api/stored-produce/${id}/stock-movements`),
                api.get(`/api/stored-produce/${id}/dispatch-records`),
            ]);
            setHistory((h) => ({
                ...h,
                [id]: { movements: m.data.data ?? m.data, dispatches: d.data.data ?? d.data },
            }));
        } catch (err) {
            alert('Could not load the history for this batch.');
        }
    }

    function toggleHistory(id) {
        if (expanded === id) {
            setExpanded(null);
        } else {
            setExpanded(id);
            loadHistory(id);
        }
    }

    const facilityName = (id) => facilities.find((f) => f.id === id)?.name || `#${id}`;
    const usedIn = (facility) =>
        produce
            .filter((p) => p.storage_facility_id === facility.id && p.unit === facility.capacity_unit)
            .reduce((sum, p) => sum + Number(p.quantity), 0);

    const spoiledCount = produce.filter((p) => p.quality_status === 'Spoiled').length;
    const stockValue = produce.reduce((sum, p) => sum + Number(p.valuation_amount || 0), 0);

    function openModal(type, record = null) {
        if (type === 'facility' && record) {
            setForm({
                farm_id: record.farm_id,
                name: record.name,
                facility_type: record.facility_type || 'Warehouse',
                capacity: record.capacity ?? '',
                capacity_unit: record.capacity_unit || 'kg',
                current_temperature_c: record.current_temperature_c ?? '',
            });
        } else if (type === 'produce' && record) {
            setForm({
                storage_facility_id: record.storage_facility_id,
                crop_name: record.crop_name,
                quantity: record.quantity,
                unit: record.unit || 'kg',
                grade: record.grade || '',
                quality_status: record.quality_status || 'Good',
                date_stored: String(record.date_stored).slice(0, 10),
                valuation_amount: record.valuation_amount ?? '',
            });
        } else {
            setForm(defaults[type]());
        }
        setModal({ type, record });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (modal.type === 'facility') {
                if (modal.record) await api.put(`/api/storage-facilities/${modal.record.id}`, form);
                else await api.post('/api/storage-facilities', form);
            } else if (modal.type === 'produce') {
                if (modal.record) await api.put(`/api/stored-produce/${modal.record.id}`, form);
                else await api.post('/api/stored-produce', form);
            } else if (modal.type === 'movement') {
                const batch = modal.record;
                const qty = Number(form.quantity);
                if (form.movement_type === 'Stock Out' && qty > Number(batch.quantity)) {
                    alert(`Only ${num(batch.quantity)} ${batch.unit} in stock.`);
                    return;
                }
                await api.post(`/api/stored-produce/${batch.id}/stock-movements`, form);
                const delta = form.movement_type === 'Stock In' ? qty : form.movement_type === 'Stock Out' ? -qty : 0;
                if (delta !== 0) {
                    await api.put(`/api/stored-produce/${batch.id}`, { quantity: Number(batch.quantity) + delta });
                }
                setExpanded(batch.id);
                loadHistory(batch.id);
            } else if (modal.type === 'dispatch') {
                const batch = modal.record;
                const qty = Number(form.quantity_dispatched);
                if (qty > Number(batch.quantity)) {
                    alert(`Only ${num(batch.quantity)} ${batch.unit} in stock.`);
                    return;
                }
                await api.post(`/api/stored-produce/${batch.id}/dispatch-records`, form);
                await api.put(`/api/stored-produce/${batch.id}`, { quantity: Number(batch.quantity) - qty });
                setExpanded(batch.id);
                loadHistory(batch.id);
            }
            setModal(null);
            fetchAll();
        } catch (err) {
            alert(err.response?.data?.message || 'Could not save. Check the details and try again.');
        }
    }

    async function remove(url, question, failMessage) {
        if (!window.confirm(question)) return;
        try {
            await api.delete(url);
            fetchAll();
        } catch (err) {
            alert(failMessage);
        }
    }

    async function markSpoiled(batch) {
        if (!window.confirm(`Mark this batch of ${batch.crop_name} as spoiled?`)) return;
        try {
            await api.put(`/api/stored-produce/${batch.id}`, { quality_status: 'Spoiled' });
            fetchAll();
        } catch (err) {
            alert('Could not update the batch.');
        }
    }

    async function markDelivered(dispatch, batchId) {
        try {
            await api.put(`/api/dispatch-records/${dispatch.id}`, { status: 'Delivered' });
            loadHistory(batchId);
        } catch (err) {
            alert('Could not update the dispatch.');
        }
    }

    const addButtons = {
        produce: ['+ Store produce', () => openModal('produce')],
        facilities: ['+ Add facility', () => openModal('facility')],
    };

    return (
        <ModuleLayout
          title="Storage and post-harvest"
          subtitle="See what is in each warehouse, how long it has been there, and what has gone out the door."
          actions={<>
<button
                        onClick={addButtons[tab][1]}
                        className="rounded-full bg-harvest-400 px-5 py-2 text-sm font-medium text-farm-900 transition hover:bg-harvest-500 disabled:opacity-60"
                    >
                        {addButtons[tab][0]}
                    </button>
          </>}
        >
            <div className="mx-auto max-w-7xl">

                <div className="mb-6 grid gap-4 sm:grid-cols-4">
                    {[
                        ['Storage facilities', facilities.length],
                        ['Batches in storage', produce.length],
                        ['Spoiled batches', spoiledCount],
                        ['Stock value', money(stockValue)],
                    ].map(([label, value]) => (
                        <article key={label} className="rounded-3xl bg-white p-5 shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
                            <p className="text-sm font-medium text-slate-500">{label}</p>
                            <p className="mt-2 text-2xl font-semibold text-farm-900">{loading ? '...' : value}</p>
                        </article>
                    ))}
                </div>

                <div className="mb-4 flex gap-2 border-b border-farm-100">
                    {[
                        ['produce', 'Stored produce'],
                        ['facilities', 'Facilities'],
                    ].map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`px-4 py-2 text-sm font-medium transition ${
                                tab === key
                                    ? 'border-b-2 border-farm-700 text-farm-900'
                                    : 'text-slate-500 hover:text-farm-900'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

                {tab === 'produce' && (
                    <DataTable
                        headers={['Crop', 'Facility', 'In stock', 'Grade', 'Quality', 'Days stored', 'Value', 'Actions']}
                        loading={loading}
                        isEmpty={produce.length === 0}
                        emptyText="Nothing in storage yet. Add a facility first, then store your first batch."
                    >
                        {produce.map((p) => (
                            <Fragment key={p.id}>
                                <tr className="transition hover:bg-farm-50">
                                    <td className="px-6 py-4 font-medium text-farm-900">{p.crop_name}</td>
                                    <td className="px-6 py-4 text-slate-500">{facilityName(p.storage_facility_id)}</td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {num(p.quantity)} {p.unit}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{p.grade || '-'}</td>
                                    <td className="px-6 py-4">
                                        <Badge styles={qualityStyles} value={p.quality_status} />
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{daysSince(p.date_stored)}</td>
                                    <td className="px-6 py-4 text-slate-500">{p.valuation_amount != null ? money(p.valuation_amount) : '-'}</td>
                                    <td className="space-x-3 px-6 py-4 text-right">
                                        <button onClick={() => toggleHistory(p.id)} className="text-farm-700 hover:underline">
                                            {expanded === p.id ? 'Hide history' : 'History'}
                                        </button>
                                        <button onClick={() => openModal('movement', p)} className="text-farm-700 hover:underline">
                                            Move stock
                                        </button>
                                        <button onClick={() => openModal('dispatch', p)} className="text-farm-700 hover:underline">
                                            Dispatch
                                        </button>
                                        {p.quality_status !== 'Spoiled' && (
                                            <button onClick={() => markSpoiled(p)} className="text-amber-700 hover:underline">
                                                Mark spoiled
                                            </button>
                                        )}
                                        <button onClick={() => openModal('produce', p)} className="text-farm-700 hover:underline">
                                            Edit
                                        </button>
                                        <button
                                            onClick={() =>
                                                remove(`/api/stored-produce/${p.id}`, 'Delete this batch and its history?', 'Could not delete the batch.')
                                            }
                                            className="text-red-600 hover:underline"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                                {expanded === p.id && (
                                    <tr className="bg-farm-50">
                                        <td colSpan="8" className="px-6 py-4">
                                            {!history[p.id] ? (
                                                <p className="text-sm text-slate-500">Loading history...</p>
                                            ) : (
                                                <div className="grid gap-6 md:grid-cols-2">
                                                    <div>
                                                        <p className="mb-2 text-sm font-semibold text-farm-900">Stock movements</p>
                                                        {history[p.id].movements.length === 0 ? (
                                                            <p className="text-sm text-slate-500">No movements recorded.</p>
                                                        ) : (
                                                            <ul className="space-y-1 text-sm text-farm-900">
                                                                {history[p.id].movements.map((m) => (
                                                                    <li key={m.id}>
                                                                        {String(m.movement_date).slice(0, 10)}: {m.movement_type}, {num(m.quantity)} {p.unit}
                                                                        {m.notes ? ` (${m.notes})` : ''}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="mb-2 text-sm font-semibold text-farm-900">Dispatches</p>
                                                        {history[p.id].dispatches.length === 0 ? (
                                                            <p className="text-sm text-slate-500">Nothing dispatched yet.</p>
                                                        ) : (
                                                            <ul className="space-y-1 text-sm text-farm-900">
                                                                {history[p.id].dispatches.map((d) => (
                                                                    <li key={d.id}>
                                                                        {String(d.dispatch_date).slice(0, 10)}: {num(d.quantity_dispatched)} {p.unit} to{' '}
                                                                        {d.destination || 'unspecified'} ({d.status})
                                                                        {d.status === 'Dispatched' && (
                                                                            <button
                                                                                onClick={() => markDelivered(d, p.id)}
                                                                                className="ml-2 text-farm-700 hover:underline"
                                                                            >
                                                                                Mark delivered
                                                                            </button>
                                                                        )}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </DataTable>
                )}

                {tab === 'facilities' && (
                    <DataTable
                        headers={['Name', 'Type', 'Capacity used', 'Temperature', 'Batches', 'Actions']}
                        loading={loading}
                        isEmpty={facilities.length === 0}
                        emptyText="No storage facilities yet. Add a warehouse or cold store to start."
                    >
                        {facilities.map((f) => {
                            const used = usedIn(f);
                            const nearlyFull = f.capacity && used / Number(f.capacity) >= 0.9;
                            return (
                                <tr key={f.id} className="transition hover:bg-farm-50">
                                    <td className="px-6 py-4 font-medium text-farm-900">{f.name}</td>
                                    <td className="px-6 py-4 text-slate-500">{f.facility_type}</td>
                                    <td className={`px-6 py-4 ${nearlyFull ? 'font-medium text-amber-700' : 'text-slate-500'}`}>
                                        {f.capacity ? `${num(used)} of ${num(f.capacity)} ${f.capacity_unit}` : 'No capacity set'}
                                        {nearlyFull ? ' (nearly full)' : ''}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {f.current_temperature_c != null ? `${num(f.current_temperature_c)} °C` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {produce.filter((p) => p.storage_facility_id === f.id).length}
                                    </td>
                                    <td className="space-x-3 px-6 py-4 text-right">
                                        <button onClick={() => openModal('facility', f)} className="text-farm-700 hover:underline">
                                            Edit
                                        </button>
                                        <button
                                            onClick={() =>
                                                remove(
                                                    `/api/storage-facilities/${f.id}`,
                                                    'Delete this facility? Everything stored in it will be deleted too.',
                                                    'Could not delete the facility.'
                                                )
                                            }
                                            className="text-red-600 hover:underline"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </DataTable>
                )}

                {modal && (
                    <Modal
                        title={modalTitles[modal.type](modal.record)}
                        submitLabel={submitLabels[modal.type](modal.record)}
                        onClose={() => setModal(null)}
                        onSubmit={handleSubmit}
                    >
                        {modal.type === 'facility' && (
                            <>
                                <Field label="Farm ID">
                                    <input
                                        type="number"
                                        className={inputClass}
                                        value={form.farm_id}
                                        onChange={(e) => setForm({ ...form, farm_id: e.target.value })}
                                        disabled={!!modal.record}
                                        required
                                    />
                                </Field>
                                <Field label="Facility name">
                                    <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                                </Field>
                                <Field label="Type">
                                    <select className={inputClass} value={form.facility_type} onChange={(e) => setForm({ ...form, facility_type: e.target.value })}>
                                        <option value="Warehouse">Warehouse</option>
                                        <option value="Cold Storage">Cold Storage</option>
                                    </select>
                                </Field>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Capacity">
                                        <input type="number" step="0.01" className={inputClass} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                                    </Field>
                                    <Field label="Capacity unit">
                                        <input className={inputClass} value={form.capacity_unit} onChange={(e) => setForm({ ...form, capacity_unit: e.target.value })} required />
                                    </Field>
                                </div>
                                <Field label="Current temperature (°C, optional)">
                                    <input type="number" step="0.1" className={inputClass} value={form.current_temperature_c} onChange={(e) => setForm({ ...form, current_temperature_c: e.target.value })} />
                                </Field>
                            </>
                        )}

                        {modal.type === 'produce' && (
                            <>
                                <Field label="Storage facility">
                                    <select
                                        className={inputClass}
                                        value={form.storage_facility_id}
                                        onChange={(e) => setForm({ ...form, storage_facility_id: e.target.value })}
                                        disabled={!!modal.record}
                                        required
                                    >
                                        <option value="">Choose a facility...</option>
                                        {facilities.map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.name}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Crop">
                                    <input className={inputClass} placeholder="e.g. Maize" value={form.crop_name} onChange={(e) => setForm({ ...form, crop_name: e.target.value })} required />
                                </Field>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Quantity">
                                        <input type="number" step="0.01" className={inputClass} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
                                    </Field>
                                    <Field label="Unit">
                                        <input className={inputClass} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required />
                                    </Field>
                                </div>
                                <Field label="Grade (optional)">
                                    <input className={inputClass} placeholder="e.g. Grade A" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
                                </Field>
                                <Field label="Quality">
                                    <select className={inputClass} value={form.quality_status} onChange={(e) => setForm({ ...form, quality_status: e.target.value })}>
                                        <option value="Good">Good</option>
                                        <option value="Fair">Fair</option>
                                        <option value="Spoiled">Spoiled</option>
                                    </select>
                                </Field>
                                <Field label="Date stored">
                                    <input type="date" className={inputClass} value={form.date_stored} onChange={(e) => setForm({ ...form, date_stored: e.target.value })} required />
                                </Field>
                                <Field label="Value of the batch (optional)">
                                    <input type="number" step="0.01" className={inputClass} value={form.valuation_amount} onChange={(e) => setForm({ ...form, valuation_amount: e.target.value })} />
                                </Field>
                            </>
                        )}

                        {modal.type === 'movement' && (
                            <>
                                <p className="rounded-2xl bg-farm-50 px-3 py-2 text-sm text-farm-900">
                                    In stock now: <strong>{num(modal.record.quantity)} {modal.record.unit}</strong>
                                </p>
                                <Field label="Movement type">
                                    <select className={inputClass} value={form.movement_type} onChange={(e) => setForm({ ...form, movement_type: e.target.value })}>
                                        <option value="Stock In">Stock in (adds to the batch)</option>
                                        <option value="Stock Out">Stock out (takes from the batch)</option>
                                        <option value="Transfer">Transfer (record only, quantity unchanged)</option>
                                    </select>
                                </Field>
                                <Field label={`Quantity (${modal.record.unit})`}>
                                    <input type="number" step="0.01" className={inputClass} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
                                </Field>
                                <Field label="Date">
                                    <input type="date" className={inputClass} value={form.movement_date} onChange={(e) => setForm({ ...form, movement_date: e.target.value })} required />
                                </Field>
                                <Field label="Notes (optional)">
                                    <textarea rows="2" className={inputClass} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                                </Field>
                            </>
                        )}

                        {modal.type === 'dispatch' && (
                            <>
                                <p className="rounded-2xl bg-farm-50 px-3 py-2 text-sm text-farm-900">
                                    Available to dispatch: <strong>{num(modal.record.quantity)} {modal.record.unit}</strong>
                                </p>
                                <Field label={`Quantity (${modal.record.unit})`}>
                                    <input type="number" step="0.01" className={inputClass} value={form.quantity_dispatched} onChange={(e) => setForm({ ...form, quantity_dispatched: e.target.value })} required />
                                </Field>
                                <Field label="Destination">
                                    <input className={inputClass} placeholder="e.g. Customer name or market" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
                                </Field>
                                <Field label="Dispatch date">
                                    <input type="date" className={inputClass} value={form.dispatch_date} onChange={(e) => setForm({ ...form, dispatch_date: e.target.value })} required />
                                </Field>
                            </>
                        )}
                    </Modal>
                )}
            </div>
        </ModuleLayout>
    );
}
