import React, { Fragment, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ModuleLayout from '../components/ModuleLayout.jsx';
import { money } from '../utils/currency.js';

const today = () => new Date().toISOString().slice(0, 10);
const suffix = () => Date.now().toString().slice(-6);

const defaults = {
    customer: () => ({ farm_id: '', name: '', contact_phone: '', contact_email: '', address: '', customer_type: 'Individual' }),
    order: () => ({ customer_id: '', order_number: `SO-${suffix()}`, order_date: today(), is_contract_farming: false, agreement_notes: '' }),
    item: () => ({ crop_name: '', quantity: '', unit: 'kg', unit_price: '', production_cost: '' }),
    payment: () => ({ amount_paid: '', payment_date: today(), payment_method: 'Cash' }),
    price: () => ({ farm_id: '', crop_name: '', price_per_unit: '', unit: 'kg', market_destination: '', recorded_date: today() }),
};

const inputClass =
    'mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20';

const orderStatusStyles = {
    Pending: 'bg-amber-100 text-amber-800',
    Fulfilled: 'bg-farm-100 text-farm-800',
    Cancelled: 'bg-red-100 text-red-800',
};

const invoiceStatusStyles = {
    Unpaid: 'bg-red-100 text-red-800',
    'Partially Paid': 'bg-amber-100 text-amber-800',
    Paid: 'bg-farm-100 text-farm-800',
};

const modalTitles = {
    customer: (editing) => (editing ? 'Edit customer' : 'Add customer'),
    order: () => 'New sales order',
    item: (_, record) => `Add item to ${record?.order_number}`,
    payment: (_, record) => `Record payment for ${record?.invoice_number}`,
    price: () => 'Add market price',
};

const submitLabels = {
    customer: (editing) => (editing ? 'Save changes' : 'Add customer'),
    order: () => 'Create order',
    item: () => 'Add item',
    payment: () => 'Record payment',
    price: () => 'Add price',
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

export default function SalesManagement() {
    const { api } = useAuth();
    const [tab, setTab] = useState('orders');
    const [customers, setCustomers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({});
    const [expandedOrder, setExpandedOrder] = useState(null);

    useEffect(() => {
        fetchAll();
    }, []);

    async function fetchAll() {
        setLoading(true);
        setError(null);
        try {
            const [c, o, i, p] = await Promise.all([
                api.get('/api/customers'),
                api.get('/api/sales-orders'),
                api.get('/api/invoices'),
                api.get('/api/market-prices'),
            ]);
            setCustomers(c.data.data ?? c.data);
            setOrders(o.data.data ?? o.data);
            setInvoices(i.data.data ?? i.data);
            setPrices(p.data.data ?? p.data);
        } catch (err) {
            setError('Could not load sales data. Check that the API is running and you are logged in.');
        } finally {
            setLoading(false);
        }
    }

    const orderTotal = (order) =>
        (order.items || []).reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
    const paidAmount = (invoice) => (invoice.payments || []).reduce((sum, p) => sum + Number(p.amount_paid), 0);
    const invoiceFor = (order) => invoices.find((inv) => inv.sales_order_id === order.id);

    const pendingOrders = orders.filter((o) => o.status === 'Pending').length;
    const outstanding = invoices
        .filter((inv) => inv.status !== 'Paid')
        .reduce((sum, inv) => sum + (Number(inv.total_amount) - paidAmount(inv)), 0);

    function openModal(type, record = null) {
        if (type === 'customer' && record) {
            setForm({
                farm_id: record.farm_id,
                name: record.name,
                contact_phone: record.contact_phone || '',
                contact_email: record.contact_email || '',
                address: record.address || '',
                customer_type: record.customer_type || 'Individual',
            });
        } else {
            setForm(defaults[type]());
        }
        setModal({ type, record });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (modal.type === 'customer') {
                if (modal.record) await api.put(`/api/customers/${modal.record.id}`, form);
                else await api.post('/api/customers', form);
            } else if (modal.type === 'order') {
                const customer = customers.find((c) => String(c.id) === String(form.customer_id));
                if (!customer) {
                    alert('Pick a customer first.');
                    return;
                }
                await api.post('/api/sales-orders', { ...form, farm_id: customer.farm_id });
            } else if (modal.type === 'item') {
                await api.post(`/api/sales-orders/${modal.record.id}/items`, form);
            } else if (modal.type === 'payment') {
                const invoice = modal.record;
                await api.post(`/api/invoices/${invoice.id}/payments`, form);
                const paid = paidAmount(invoice) + Number(form.amount_paid);
                await api.put(`/api/invoices/${invoice.id}`, {
                    status: paid >= Number(invoice.total_amount) ? 'Paid' : 'Partially Paid',
                });
            } else if (modal.type === 'price') {
                await api.post('/api/market-prices', form);
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

    async function setOrderStatus(order, status) {
        try {
            await api.put(`/api/sales-orders/${order.id}`, { status });
            fetchAll();
        } catch (err) {
            alert(err.response?.data?.message || 'Could not update the order.');
        }
    }

    async function createInvoice(order) {
        const total = orderTotal(order);
        if (total <= 0) {
            alert('Add at least one item to this order before creating an invoice.');
            return;
        }
        if (!window.confirm(`Create an invoice for ${money(total)}?`)) return;
        const due = new Date();
        due.setDate(due.getDate() + 14);
        try {
            await api.post('/api/invoices', {
                sales_order_id: order.id,
                invoice_number: `INV-${suffix()}`,
                total_amount: total.toFixed(2),
                due_date: due.toISOString().slice(0, 10),
                status: 'Unpaid',
            });
            setTab('invoices');
            fetchAll();
        } catch (err) {
            alert(err.response?.data?.message || 'Could not create the invoice.');
        }
    }

    const addButtons = {
        customers: ['+ Add customer', () => openModal('customer')],
        orders: ['+ New order', () => openModal('order')],
        prices: ['+ Add price', () => openModal('price')],
    };

    const tabs = [
        ['orders', 'Orders'],
        ['invoices', 'Invoices'],
        ['customers', 'Customers'],
        ['prices', 'Market prices'],
    ];

    return (
        <ModuleLayout
          title="Market and sales"
          subtitle="Take orders from buyers, invoice them, and record the payments as they come in."
          actions={<>
{addButtons[tab] && (
                        <button
                            onClick={addButtons[tab][1]}
                            className="rounded-full bg-harvest-400 px-5 py-2 text-sm font-medium text-farm-900 transition hover:bg-harvest-500 disabled:opacity-60"
                        >
                            {addButtons[tab][0]}
                        </button>
                    )}
          </>}
        >
            <div className="mx-auto max-w-7xl">

                <div className="mb-6 grid gap-4 sm:grid-cols-3">
                    {[
                        ['Customers', customers.length],
                        ['Orders awaiting fulfilment', pendingOrders],
                        ['Money still owed to you', money(outstanding)],
                    ].map(([label, value]) => (
                        <article key={label} className="rounded-3xl bg-white p-5 shadow-[0_2px_16px_rgba(15,60,35,0.07)]">
                            <p className="text-sm font-medium text-slate-500">{label}</p>
                            <p className="mt-2 text-2xl font-semibold text-farm-900">{loading ? '...' : value}</p>
                        </article>
                    ))}
                </div>

                <div className="mb-4 flex gap-2 border-b border-farm-100">
                    {tabs.map(([key, label]) => (
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

                {tab === 'orders' && (
                    <DataTable
                        headers={['Order', 'Customer', 'Date', 'Total', 'Status', 'Actions']}
                        loading={loading}
                        isEmpty={orders.length === 0}
                        emptyText="No orders yet. Add a customer, then create the first order."
                    >
                        {orders.map((o) => {
                            const invoice = invoiceFor(o);
                            return (
                                <Fragment key={o.id}>
                                    <tr className="transition hover:bg-farm-50">
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-farm-900">{o.order_number}</p>
                                            {o.is_contract_farming && (
                                                <p className="text-xs text-farm-600">Contract farming</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{o.customer?.name || `#${o.customer_id}`}</td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {o.order_date ? String(o.order_date).slice(0, 10) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {money(orderTotal(o))}
                                            <span className="ml-1 text-xs">({(o.items || []).length} items)</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge styles={orderStatusStyles} value={o.status} />
                                        </td>
                                        <td className="space-x-3 px-6 py-4 text-right">
                                            <button
                                                onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
                                                className="text-farm-700 hover:underline"
                                            >
                                                {expandedOrder === o.id ? 'Hide items' : 'View items'}
                                            </button>
                                            {o.status === 'Pending' && (
                                                <>
                                                    <button onClick={() => openModal('item', o)} className="text-farm-700 hover:underline">
                                                        Add item
                                                    </button>
                                                    <button
                                                        onClick={() => setOrderStatus(o, 'Fulfilled')}
                                                        className="text-farm-700 hover:underline"
                                                    >
                                                        Mark fulfilled
                                                    </button>
                                                    <button
                                                        onClick={() => setOrderStatus(o, 'Cancelled')}
                                                        className="text-amber-700 hover:underline"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            )}
                                            {!invoice && o.status !== 'Cancelled' && (
                                                <button onClick={() => createInvoice(o)} className="text-farm-700 hover:underline">
                                                    Create invoice
                                                </button>
                                            )}
                                            <button
                                                onClick={() =>
                                                    remove(`/api/sales-orders/${o.id}`, 'Delete this order and its items?', 'Could not delete the order.')
                                                }
                                                className="text-red-600 hover:underline"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedOrder === o.id && (
                                        <tr className="bg-farm-50">
                                            <td colSpan="6" className="px-6 py-4">
                                                {(o.items || []).length === 0 ? (
                                                    <p className="text-sm text-slate-500">No items yet. Use "Add item" to list the crops in this order.</p>
                                                ) : (
                                                    <ul className="space-y-1 text-sm text-farm-900">
                                                        {o.items.map((item) => (
                                                            <li key={item.id}>
                                                                {item.crop_name}: {Number(item.quantity)} {item.unit} at {money(item.unit_price)} each
                                                                = <strong>{money(Number(item.quantity) * Number(item.unit_price))}</strong>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                                {o.agreement_notes && (
                                                    <p className="mt-2 text-xs text-slate-500">Agreement: {o.agreement_notes}</p>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </DataTable>
                )}

                {tab === 'invoices' && (
                    <DataTable
                        headers={['Invoice', 'Order', 'Total', 'Paid', 'Balance', 'Due', 'Status', 'Actions']}
                        loading={loading}
                        isEmpty={invoices.length === 0}
                        emptyText="No invoices yet. Create one from an order on the Orders tab."
                    >
                        {invoices.map((inv) => {
                            const paid = paidAmount(inv);
                            const balance = Number(inv.total_amount) - paid;
                            return (
                                <tr key={inv.id} className="transition hover:bg-farm-50">
                                    <td className="px-6 py-4 font-medium text-farm-900">{inv.invoice_number}</td>
                                    <td className="px-6 py-4 text-slate-500">{inv.sales_order?.order_number || `#${inv.sales_order_id}`}</td>
                                    <td className="px-6 py-4 text-slate-500">{money(inv.total_amount)}</td>
                                    <td className="px-6 py-4 text-slate-500">{money(paid)}</td>
                                    <td className="px-6 py-4 text-slate-500">{money(Math.max(balance, 0))}</td>
                                    <td className="px-6 py-4 text-slate-500">{inv.due_date ? String(inv.due_date).slice(0, 10) : '-'}</td>
                                    <td className="px-6 py-4">
                                        <Badge styles={invoiceStatusStyles} value={inv.status} />
                                    </td>
                                    <td className="space-x-3 px-6 py-4 text-right">
                                        {inv.status !== 'Paid' && (
                                            <button onClick={() => openModal('payment', inv)} className="text-farm-700 hover:underline">
                                                Record payment
                                            </button>
                                        )}
                                        <button
                                            onClick={() =>
                                                remove(`/api/invoices/${inv.id}`, 'Delete this invoice and its payments?', 'Could not delete the invoice.')
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

                {tab === 'customers' && (
                    <DataTable
                        headers={['Name', 'Type', 'Contact', 'Address', 'Actions']}
                        loading={loading}
                        isEmpty={customers.length === 0}
                        emptyText="No customers yet. Add your first buyer to start taking orders."
                    >
                        {customers.map((c) => (
                            <tr key={c.id} className="transition hover:bg-farm-50">
                                <td className="px-6 py-4 font-medium text-farm-900">{c.name}</td>
                                <td className="px-6 py-4 text-slate-500">{c.customer_type}</td>
                                <td className="px-6 py-4 text-slate-500">
                                    <p>{c.contact_phone || '-'}</p>
                                    <p className="text-xs">{c.contact_email || ''}</p>
                                </td>
                                <td className="px-6 py-4 text-slate-500">{c.address || '-'}</td>
                                <td className="space-x-3 px-6 py-4 text-right">
                                    <button onClick={() => openModal('customer', c)} className="text-farm-700 hover:underline">
                                        Edit
                                    </button>
                                    <button
                                        onClick={() =>
                                            remove(`/api/customers/${c.id}`, 'Delete this customer and all their orders?', 'Could not delete the customer.')
                                        }
                                        className="text-red-600 hover:underline"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </DataTable>
                )}

                {tab === 'prices' && (
                    <DataTable
                        headers={['Crop', 'Price', 'Market', 'Date recorded', 'Actions']}
                        loading={loading}
                        isEmpty={prices.length === 0}
                        emptyText="No prices logged yet. Record what crops are selling for to spot trends."
                    >
                        {prices.map((p) => (
                            <tr key={p.id} className="transition hover:bg-farm-50">
                                <td className="px-6 py-4 font-medium text-farm-900">{p.crop_name}</td>
                                <td className="px-6 py-4 text-slate-500">
                                    {money(p.price_per_unit)} per {p.unit}
                                </td>
                                <td className="px-6 py-4 text-slate-500">{p.market_destination || '-'}</td>
                                <td className="px-6 py-4 text-slate-500">{p.recorded_date ? String(p.recorded_date).slice(0, 10) : '-'}</td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() =>
                                            remove(`/api/market-prices/${p.id}`, 'Delete this price record?', 'Could not delete the price.')
                                        }
                                        className="text-red-600 hover:underline"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </DataTable>
                )}

                {modal && (
                    <Modal
                        title={modalTitles[modal.type](!!modal.record, modal.record)}
                        submitLabel={submitLabels[modal.type](!!modal.record)}
                        onClose={() => setModal(null)}
                        onSubmit={handleSubmit}
                    >
                        {modal.type === 'customer' && (
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
                                <Field label="Customer name">
                                    <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                                </Field>
                                <Field label="Customer type">
                                    <select className={inputClass} value={form.customer_type} onChange={(e) => setForm({ ...form, customer_type: e.target.value })}>
                                        <option value="Individual">Individual</option>
                                        <option value="Business">Business</option>
                                        <option value="Cooperative">Cooperative</option>
                                    </select>
                                </Field>
                                <Field label="Phone">
                                    <input className={inputClass} value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                                </Field>
                                <Field label="Email">
                                    <input type="email" className={inputClass} value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                                </Field>
                                <Field label="Address">
                                    <input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                                </Field>
                            </>
                        )}

                        {modal.type === 'order' && (
                            <>
                                <Field label="Customer">
                                    <select className={inputClass} value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required>
                                        <option value="">Choose a customer...</option>
                                        {customers.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Order number">
                                    <input className={inputClass} value={form.order_number} onChange={(e) => setForm({ ...form, order_number: e.target.value })} required />
                                </Field>
                                <Field label="Order date">
                                    <input type="date" className={inputClass} value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} required />
                                </Field>
                                <label className="flex items-center gap-2 text-sm text-farm-900">
                                    <input
                                        type="checkbox"
                                        checked={form.is_contract_farming}
                                        onChange={(e) => setForm({ ...form, is_contract_farming: e.target.checked })}
                                    />
                                    This is a contract farming order
                                </label>
                                {form.is_contract_farming && (
                                    <Field label="Agreement notes">
                                        <textarea rows="3" className={inputClass} value={form.agreement_notes} onChange={(e) => setForm({ ...form, agreement_notes: e.target.value })} />
                                    </Field>
                                )}
                            </>
                        )}

                        {modal.type === 'item' && (
                            <>
                                <Field label="Crop">
                                    <input className={inputClass} placeholder="e.g. Maize" value={form.crop_name} onChange={(e) => setForm({ ...form, crop_name: e.target.value })} required />
                                </Field>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Quantity">
                                        <input type="number" step="0.01" className={inputClass} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
                                    </Field>
                                    <Field label="Unit">
                                        <input className={inputClass} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                                    </Field>
                                </div>
                                <Field label="Selling price per unit">
                                    <input type="number" step="0.01" className={inputClass} value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} required />
                                </Field>
                                <Field label="Cost to produce per unit (optional)">
                                    <input type="number" step="0.01" className={inputClass} value={form.production_cost} onChange={(e) => setForm({ ...form, production_cost: e.target.value })} />
                                </Field>
                            </>
                        )}

                        {modal.type === 'payment' && (
                            <>
                                <p className="rounded-2xl bg-farm-50 px-3 py-2 text-sm text-farm-900">
                                    Balance due: <strong>{money(Number(modal.record.total_amount) - paidAmount(modal.record))}</strong>
                                </p>
                                <Field label="Amount paid">
                                    <input type="number" step="0.01" className={inputClass} value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} required />
                                </Field>
                                <Field label="Payment date">
                                    <input type="date" className={inputClass} value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} required />
                                </Field>
                                <Field label="Payment method">
                                    <select className={inputClass} value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                                        <option value="Cash">Cash</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Mobile Money">Mobile Money</option>
                                    </select>
                                </Field>
                            </>
                        )}

                        {modal.type === 'price' && (
                            <>
                                <Field label="Farm ID">
                                    <input type="number" className={inputClass} value={form.farm_id} onChange={(e) => setForm({ ...form, farm_id: e.target.value })} required />
                                </Field>
                                <Field label="Crop">
                                    <input className={inputClass} value={form.crop_name} onChange={(e) => setForm({ ...form, crop_name: e.target.value })} required />
                                </Field>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Price per unit">
                                        <input type="number" step="0.01" className={inputClass} value={form.price_per_unit} onChange={(e) => setForm({ ...form, price_per_unit: e.target.value })} required />
                                    </Field>
                                    <Field label="Unit">
                                        <input className={inputClass} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                                    </Field>
                                </div>
                                <Field label="Market (optional)">
                                    <input className={inputClass} placeholder="e.g. Soweto market, export" value={form.market_destination} onChange={(e) => setForm({ ...form, market_destination: e.target.value })} />
                                </Field>
                                <Field label="Date recorded">
                                    <input type="date" className={inputClass} value={form.recorded_date} onChange={(e) => setForm({ ...form, recorded_date: e.target.value })} required />
                                </Field>
                            </>
                        )}
                    </Modal>
                )}
            </div>
        </ModuleLayout>
    );
}
