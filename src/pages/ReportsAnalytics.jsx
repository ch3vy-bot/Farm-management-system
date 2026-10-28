import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ModuleLayout from '../components/ModuleLayout.jsx';
import { money } from '../utils/currency.js';

const input = 'rounded-full border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20';
const label = (s) => s.replace(/_/g, ' ');

function Card({ title, value, tone }) {
    return (
        <article className="rounded-3xl bg-white p-5 shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className={`mt-2 text-2xl font-semibold ${tone || 'text-farm-900'}`}>{value}</p>
        </article>
    );
}

function Breakdown({ title, data }) {
    const entries = Object.entries(data || {});
    return (
        <div className="rounded-3xl bg-white p-5 shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
            <h3 className="mb-3 text-base font-semibold text-farm-900">{title}</h3>
            {entries.length === 0 ? <p className="text-sm text-slate-500">No records.</p> : (
                <ul className="divide-y divide-farm-100 text-sm">
                    {entries.map(([k, v]) => (
                        <li key={k} className="flex justify-between py-2">
                            <span className="capitalize text-slate-500">{label(k)}</span>
                            <span className="font-medium text-farm-900">{money(v)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function ReportsAnalytics() {
    const { api } = useAuth();
    const [farms, setFarms] = useState([]);
    const [farmId, setFarmId] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [summary, setSummary] = useState(null);
    const [pl, setPl] = useState(null);
    const [perHa, setPerHa] = useState(null);
    const [bva, setBva] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.get('/api/farms')
            .then((r) => {
                setFarms(r.data.data);
                if (r.data.data.length) setFarmId(String(r.data.data[0].id));
            })
            .catch(() => setError('Failed to load farms.'));
    }, [api]);

    const load = useCallback(async () => {
        if (!farmId) return;
        setLoading(true);
        setError(null);
        const params = { farm_id: farmId };
        if (from) params.from = from;
        if (to) params.to = to;
        try {
            const [s, p, h, b] = await Promise.all([
                api.get('/api/finance/summary', { params }),
                api.get('/api/finance/profit-loss', { params }),
                api.get('/api/finance/cost-per-hectare', { params }),
                api.get('/api/finance/budget-vs-actual', { params: { farm_id: farmId } }),
            ]);
            setSummary(s.data.data);
            setPl(p.data.data);
            setPerHa(h.data);
            setBva(b.data.data);
        } catch (err) {
            const errors = err.response?.data?.errors;
            setError(errors ? Object.values(errors).flat().join(' ') : 'Failed to load reports.');
        } finally {
            setLoading(false);
        }
    }, [api, farmId, from, to]);

    useEffect(() => { load(); }, [load]);

    return (
        <ModuleLayout
          title="Reports &amp; Analytics"
          subtitle="Profit and loss, cost per hectare, inventory value and budget performance."
        >
            <div className="mx-auto max-w-7xl">

                <div className="mb-6 flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-500">Farm</label>
                        <select className={input} value={farmId} onChange={(e) => setFarmId(e.target.value)}>
                            {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500">From</label>
                        <input type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500">To</label>
                        <input type="date" className={input} value={to} onChange={(e) => setTo(e.target.value)} />
                    </div>
                    <button className="rounded-full border border-farm-200 px-3 py-2 text-sm text-slate-500 hover:bg-white"
                        onClick={() => { setFrom(''); setTo(''); }}>Clear dates</button>
                </div>

                {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
                {loading && <p className="mb-4 text-sm text-slate-500">Loading reports...</p>}

                {summary && (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <Card title="Total income" value={money(summary.total_income)} />
                            <Card title="Total expenses" value={money(summary.total_expenses)} />
                            <Card title="Net profit" value={money(summary.net_profit)}
                                tone={summary.net_profit < 0 ? 'text-red-700' : 'text-farm-700'} />
                            <Card title="Inventory value" value={money(summary.inventory_value)} />
                        </div>
                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                            <Card title="Low-stock items" value={summary.low_stock_count} />
                            <Card title="Expiring soon" value={summary.expiring_soon_count} />
                            <Card title="Expired" value={summary.expired_count} />
                        </div>
                    </>
                )}

                {pl && (
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <Breakdown title="Income by category" data={pl.income_by_category} />
                        <Breakdown title="Expenses by category" data={pl.expense_by_category} />
                    </div>
                )}

                {perHa && (
                    <div className="mt-6 rounded-3xl bg-white p-5 shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
                        <h3 className="mb-2 text-base font-semibold text-farm-900">Production cost per hectare</h3>
                        {perHa.data?.cost_per_hectare != null ? (
                            <p className="text-sm text-slate-500">
                                <span className="text-2xl font-semibold text-farm-900">{money(perHa.data.cost_per_hectare)}</span> per ha
                                {' '}({money(perHa.data.total_cost)} over {perHa.data.size_hectares} ha)
                            </p>
                        ) : (
                            <p className="text-sm text-slate-500">{perHa.message || 'Not available.'}</p>
                        )}
                    </div>
                )}

                <div className="mt-6 overflow-x-auto rounded-3xl bg-white shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
                    <h3 className="px-5 pt-5 text-base font-semibold text-farm-900">Budget vs actual</h3>
                    <table className="mt-3 w-full text-left text-sm">
                        <thead className="bg-farm-50 text-farm-700 text-xs"><tr>
                            <th className="px-5 py-3 font-medium">Category</th>
                            <th className="px-5 py-3 font-medium">Period</th>
                            <th className="px-5 py-3 font-medium">Planned</th>
                            <th className="px-5 py-3 font-medium">Actual</th>
                            <th className="px-5 py-3 font-medium">Variance</th>
                        </tr></thead>
                        <tbody className="divide-y divide-farm-100">
                            {bva.length === 0 ? (
                                <tr><td colSpan="5" className="px-5 py-8 text-center text-slate-500">No budgets for this farm.</td></tr>
                            ) : bva.map((r) => (
                                <tr key={r.budget_id}>
                                    <td className="px-5 py-3 capitalize text-farm-900">{label(r.category)}</td>
                                    <td className="px-5 py-3 text-slate-500">{r.period_start} → {r.period_end}</td>
                                    <td className="px-5 py-3">{money(r.planned_amount)}</td>
                                    <td className="px-5 py-3">{money(r.actual_amount)}</td>
                                    <td className={`px-5 py-3 font-medium ${r.variance < 0 ? 'text-red-700' : 'text-farm-700'}`}>
                                        {money(r.variance)} {r.variance < 0 ? '(over)' : '(under)'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ModuleLayout>
    );
}
