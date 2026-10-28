import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ModuleLayout from '../components/ModuleLayout.jsx';
import { money } from '../utils/currency.js';

const EXPENSE_CATEGORIES = ['input_cost', 'labour_cost', 'fuel_cost', 'equipment_cost', 'vet_cost', 'loan_repayment', 'other_expense'];
const INCOME_CATEGORIES = ['sale_income', 'loan_received', 'other_income'];

const input = 'mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20';
const primaryBtn = 'rounded-full bg-farm-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-farm-800';
const ghostBtn = 'rounded-full border border-farm-200 px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-farm-50';
const label = (s) => s.replace(/_/g, ' ');
const today = () => new Date().toISOString().slice(0, 10);

function errorText(err, fallback) {
    const errors = err.response?.data?.errors;
    if (errors) return Object.values(errors).flat().join(' ');
    return err.response?.data?.message || fallback;
}

export default function FinanceManagement() {
    const { api } = useAuth();
    const [tab, setTab] = useState('transactions');
    const [farms, setFarms] = useState([]);
    const [farmFilter, setFarmFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [rows, setRows] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [formError, setFormError] = useState(null);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState(null);

    const blankTx = { farm_id: '', type: 'expense', category: 'input_cost', description: '', amount: '', transaction_date: today() };
    const blankBudget = { farm_id: '', category: 'input_cost', period_start: '', period_end: '', planned_amount: '' };
    const [form, setForm] = useState(blankTx);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const params = {};
        if (farmFilter) params.farm_id = farmFilter;
        try {
            const farmRes = await api.get('/api/farms');
            setFarms(farmRes.data.data);
            if (tab === 'transactions') {
                if (typeFilter) params.type = typeFilter;
                const res = await api.get('/api/financial-transactions', { params });
                setRows(res.data.data);
            } else {
                const res = await api.get('/api/budgets', { params });
                setBudgets(res.data.data);
            }
        } catch (err) {
            setError(errorText(err, 'Failed to load finance data.'));
        } finally {
            setLoading(false);
        }
    }, [api, tab, farmFilter, typeFilter]);

    useEffect(() => { load(); }, [load]);

    function openModal(item = null) {
        setFormError(null);
        setEditing(item);
        if (tab === 'transactions') {
            setForm(item ? {
                farm_id: item.farm_id, type: item.type, category: item.category,
                description: item.description || '', amount: item.amount,
                transaction_date: item.transaction_date.slice(0, 10),
            } : { ...blankTx, farm_id: farmFilter });
        } else {
            setForm(item ? {
                farm_id: item.farm_id, category: item.category,
                period_start: item.period_start.slice(0, 10), period_end: item.period_end.slice(0, 10),
                planned_amount: item.planned_amount,
            } : { ...blankBudget, farm_id: farmFilter });
        }
        setModal(true);
    }

    async function save(e) {
        e.preventDefault();
        setFormError(null);
        const base = tab === 'transactions' ? '/api/financial-transactions' : '/api/budgets';
        const payload = { ...form };
        if (tab === 'transactions' && !payload.description) payload.description = null;
        try {
            if (editing) await api.put(`${base}/${editing.id}`, payload);
            else await api.post(base, payload);
            setModal(false);
            load();
        } catch (err) {
            setFormError(errorText(err, 'Could not save.'));
        }
    }

    async function remove(item) {
        if (!window.confirm('Delete this record?')) return;
        const base = tab === 'transactions' ? '/api/financial-transactions' : '/api/budgets';
        try {
            await api.delete(`${base}/${item.id}`);
            load();
        } catch (err) {
            alert(errorText(err, 'Could not delete.'));
        }
    }

    function changeType(type) {
        setForm({ ...form, type, category: type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0] });
    }

    const categories = tab === 'transactions' && form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    return (
        <ModuleLayout
          title="Financial Management"
          subtitle="Record income and expenses, and plan budgets per farm."
          actions={<>
<button className="rounded-full bg-harvest-400 px-5 py-2 text-sm font-medium text-farm-900 transition hover:bg-harvest-500 disabled:opacity-60" onClick={() => openModal()}>
                        {tab === 'transactions' ? '+ Record Transaction' : '+ Add Budget'}
                    </button>
          </>}
        >
            <div className="mx-auto max-w-7xl">

                <div className="mb-4 flex gap-2 border-b border-farm-100">
                    {['transactions', 'budgets'].map((t) => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-2 text-sm font-medium capitalize ${tab === t ? 'border-b-2 border-farm-700 text-farm-700' : 'text-slate-500'}`}>
                            {t}
                        </button>
                    ))}
                </div>

                <div className="mb-4 flex flex-wrap gap-3">
                    <select className={input + ' !mt-0 !w-auto'} value={farmFilter} onChange={(e) => setFarmFilter(e.target.value)}>
                        <option value="">All farms</option>
                        {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    {tab === 'transactions' && (
                        <select className={input + ' !mt-0 !w-auto'} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                            <option value="">Income &amp; expenses</option>
                            <option value="income">Income</option>
                            <option value="expense">Expenses</option>
                        </select>
                    )}
                </div>

                {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

                <div className="overflow-x-auto rounded-3xl bg-white shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
                    {tab === 'transactions' ? (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-farm-50 text-farm-700 text-xs"><tr>
                                <th className="px-4 py-3 font-medium">Date</th>
                                <th className="px-4 py-3 font-medium">Farm</th>
                                <th className="px-4 py-3 font-medium">Type</th>
                                <th className="px-4 py-3 font-medium">Category</th>
                                <th className="px-4 py-3 font-medium">Description</th>
                                <th className="px-4 py-3 font-medium">Amount</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr></thead>
                            <tbody className="divide-y divide-farm-100">
                                {loading ? <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-500">Loading...</td></tr>
                                : rows.length === 0 ? <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-500">No transactions yet.</td></tr>
                                : rows.map((t) => (
                                    <tr key={t.id} className="hover:bg-farm-50">
                                        <td className="px-4 py-3 text-slate-500">{t.transaction_date.slice(0, 10)}</td>
                                        <td className="px-4 py-3 font-medium text-farm-900">{t.farm?.name}</td>
                                        <td className={`px-4 py-3 capitalize ${t.type === 'income' ? 'text-farm-700' : 'text-red-700'}`}>{t.type}</td>
                                        <td className="px-4 py-3 capitalize text-slate-500">{label(t.category)}</td>
                                        <td className="px-4 py-3 text-slate-500">{t.description || '—'}</td>
                                        <td className="px-4 py-3 font-medium text-farm-900">{money(t.amount)}</td>
                                        <td className="space-x-3 px-4 py-3 text-right">
                                            <button className="text-farm-700 hover:underline" onClick={() => openModal(t)}>Edit</button>
                                            <button className="text-red-600 hover:underline" onClick={() => remove(t)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-farm-50 text-farm-700 text-xs"><tr>
                                <th className="px-4 py-3 font-medium">Farm</th>
                                <th className="px-4 py-3 font-medium">Category</th>
                                <th className="px-4 py-3 font-medium">Period</th>
                                <th className="px-4 py-3 font-medium">Planned</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr></thead>
                            <tbody className="divide-y divide-farm-100">
                                {loading ? <tr><td colSpan="5" className="px-4 py-10 text-center text-slate-500">Loading...</td></tr>
                                : budgets.length === 0 ? <tr><td colSpan="5" className="px-4 py-10 text-center text-slate-500">No budgets yet.</td></tr>
                                : budgets.map((b) => (
                                    <tr key={b.id} className="hover:bg-farm-50">
                                        <td className="px-4 py-3 font-medium text-farm-900">{b.farm?.name}</td>
                                        <td className="px-4 py-3 capitalize text-slate-500">{label(b.category)}</td>
                                        <td className="px-4 py-3 text-slate-500">{b.period_start.slice(0, 10)} → {b.period_end.slice(0, 10)}</td>
                                        <td className="px-4 py-3 font-medium text-farm-900">{money(b.planned_amount)}</td>
                                        <td className="space-x-3 px-4 py-3 text-right">
                                            <button className="text-farm-700 hover:underline" onClick={() => openModal(b)}>Edit</button>
                                            <button className="text-red-600 hover:underline" onClick={() => remove(b)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {modal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                        <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
                            <h2 className="mb-4 text-xl font-semibold text-farm-900">
                                {editing ? 'Edit' : 'New'} {tab === 'transactions' ? 'transaction' : 'budget'}
                            </h2>
                            {formError && <p className="mb-4 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>}
                            <form onSubmit={save} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Farm</label>
                                    <select className={input} value={form.farm_id} required onChange={(e) => setForm({ ...form, farm_id: e.target.value })}>
                                        <option value="">Choose a farm...</option>
                                        {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                </div>
                                {tab === 'transactions' && (
                                    <div>
                                        <label className="block text-sm font-medium text-farm-900">Type</label>
                                        <select className={input} value={form.type} onChange={(e) => changeType(e.target.value)}>
                                            <option value="expense">Expense</option>
                                            <option value="income">Income</option>
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Category</label>
                                    <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                        {categories.map((c) => <option key={c} value={c}>{label(c)}</option>)}
                                    </select>
                                </div>
                                {tab === 'transactions' ? (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-farm-900">Amount (K)</label>
                                            <input type="number" step="0.01" min="0.01" className={input} value={form.amount} required
                                                onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-farm-900">Description</label>
                                            <input className={input} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-farm-900">Date</label>
                                            <input type="date" max={today()} className={input} value={form.transaction_date} required
                                                onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium text-farm-900">Start</label>
                                                <input type="date" className={input} value={form.period_start} required
                                                    onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-farm-900">End</label>
                                                <input type="date" className={input} value={form.period_end} required
                                                    onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-farm-900">Planned amount (K)</label>
                                            <input type="number" step="0.01" min="0" className={input} value={form.planned_amount} required
                                                onChange={(e) => setForm({ ...form, planned_amount: e.target.value })} />
                                        </div>
                                    </>
                                )}
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" className={ghostBtn} onClick={() => setModal(false)}>Cancel</button>
                                    <button type="submit" className={primaryBtn}>Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </ModuleLayout>
    );
}
