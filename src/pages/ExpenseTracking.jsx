import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ModuleLayout from '../components/ModuleLayout.jsx';
import { money } from '../utils/currency.js';

export default function ExpenseTracking() {
    const { api } = useAuth();
    const [expenses, setExpenses] = useState([]);
    const [farms, setFarms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [form, setForm] = useState({
        farm_id: '',
        category: '',
        amount: '',
        description: '',
        expense_date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    async function fetchAllData() {
        setLoading(true);
        try {
            const [expRes, farmRes] = await Promise.all([
                api.get('/api/farm-expenses'),
                api.get('/api/farms'),
            ]);
            setExpenses(expRes.data.data);
            setFarms(farmRes.data.data);
        } catch (err) {
            setError('Failed to load expense data.');
        } finally {
            setLoading(false);
        }
    }

    function handleOpenModal(expense = null) {
        if (expense) {
            setEditingExpense(expense);
            setForm({
                farm_id: expense.farm_id,
                category: expense.category,
                amount: expense.amount,
                description: expense.description || '',
                expense_date: expense.expense_date,
            });
        } else {
            setEditingExpense(null);
            setForm({
                farm_id: '',
                category: '',
                amount: '',
                description: '',
                expense_date: new Date().toISOString().split('T')[0],
            });
        }
        setIsModalOpen(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (editingExpense) {
                await api.put(`/api/farm-expenses/${editingExpense.id}`, form);
            } else {
                await api.post('/api/farm-expenses', form);
            }
            setIsModalOpen(false);
            fetchAllData();
        } catch (err) {
            alert(err.response?.data?.message || 'An error occurred while saving the expense.');
        }
    }

    async function handleDelete(id) {
        if (window.confirm('Are you sure you want to delete this expense record?')) {
            try {
                await api.delete(`/api/farm-expenses/${id}`);
                fetchAllData();
            } catch (err) {
                alert('Failed to delete expense.');
            }
        }
    }

    return (
        <ModuleLayout
          title="Farm Expense Tracking"
          subtitle="Log costs for seeds, fertilizers, labor, and machinery."
          actions={<>
<button
                        onClick={() => handleOpenModal()}
                        className="rounded-full bg-harvest-400 px-5 py-2 text-sm font-medium text-farm-900 transition hover:bg-harvest-500 disabled:opacity-60"
                    >
                        + Record Expense
                    </button>
          </>}
        >
            <div className="mx-auto max-w-7xl">

                {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

                <div className="overflow-hidden rounded-3xl bg-white shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-farm-50 text-farm-700 text-xs">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Date</th>
                                <th className="px-6 py-3 font-semibold">Farm</th>
                                <th className="px-6 py-3 font-semibold">Category</th>
                                <th className="px-6 py-3 font-semibold">Description</th>
                                <th className="px-6 py-3 font-semibold">Amount</th>
                                <th className="px-6 py-3 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-farm-100">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-500">Loading expenses...</td></tr>
                            ) : expenses.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-500">No expenses recorded yet.</td></tr>
                            ) : (
                                expenses.map((exp) => (
                                    <tr key={exp.id} className="hover:bg-farm-50 transition">
                                        <td className="px-6 py-4 text-slate-500">{exp.expense_date}</td>
                                        <td className="px-6 py-4 font-medium text-farm-900">{exp.farm?.name}</td>
                                        <td className="px-6 py-4 text-slate-500">{exp.category}</td>
                                        <td className="px-6 py-4 text-slate-500">{exp.description || 'N/A'}</td>
                                        <td className="px-6 py-4 font-medium text-farm-900">{money(exp.amount)}</td>
                                        <td className="px-6 py-4 text-right space-x-3">
                                            <button
                                                onClick={() => handleOpenModal(exp)}
                                                className="text-farm-700 hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(exp.id)}
                                                className="text-red-600 hover:underline"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
                            <h2 className="mb-6 text-xl font-semibold text-farm-900">
                                {editingExpense ? 'Edit Expense' : 'Record New Expense'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Farm</label>
                                    <select
                                        className="mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20"
                                        value={form.farm_id}
                                        onChange={(e) => setForm({ ...form, farm_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Choose a farm...</option>
                                        {farms.map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Category</label>
                                    <select
                                        className="mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20"
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        required
                                    >
                                        <option value="">Choose category...</option>
                                        <option value="Seeds">Seeds</option>
                                        <option value="Fertilizer">Fertilizer</option>
                                        <option value="Labour">Labour</option>
                                        <option value="Machinery">Machinery</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Amount (K)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20"
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Description</label>
                                    <input
                                        className="mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20"
                                        placeholder="e.g. Purchase of organic fertilizer"
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Date</label>
                                    <input
                                        type="date"
                                        className="mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20"
                                        value={form.expense_date}
                                        onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="rounded-full border border-farm-200 px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-farm-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-full bg-farm-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-farm-800"
                                    >
                                        {editingExpense ? 'Update Expense' : 'Record Expense'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </ModuleLayout>
    );
}
