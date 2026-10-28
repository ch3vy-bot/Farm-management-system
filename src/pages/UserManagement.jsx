import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ModuleLayout from '../components/ModuleLayout.jsx';

const UserManagement = () => {
    const { api } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        role: 'Worker'
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/api/users');
            setUsers(response.data.data || response.data);
        } catch (err) {
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingUser(null);
        setNewUser({ name: '', email: '', role: 'Worker' });
    };

    const openInvitationModal = () => {
        setEditingUser(null);
        setNewUser({ name: '', email: '', role: 'Farm-owner' });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await api.put(`/api/users/${editingUser.id}`, newUser);
                alert('User updated successfully.');
            } else {
                await api.post('/api/users/invitations', newUser);
                alert(`Invitation sent successfully to ${newUser.email}.`);
            }
            closeModal();
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.message || 'Error saving user');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await api.delete(`/api/users/${id}`);
                fetchUsers();
            } catch (err) {
                alert(err.response?.data?.message || 'Error deleting user');
            }
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setNewUser({
            name: user.name,
            email: user.email,
            role: user.role
        });
        setShowModal(true);
    };

    if (loading) return <div className="p-8 text-center">Loading users...</div>;

    return (
        <ModuleLayout
          title="User Management"
          actions={<>
<button
                    onClick={openInvitationModal}
                    className="rounded-full bg-harvest-400 px-5 py-2 text-sm font-medium text-farm-900 transition hover:bg-harvest-500 disabled:opacity-60"
                >
                    + Invite User
                </button>
          </>}
        >

            {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

            <div className="bg-white shadow-[0_2px_16px_rgba(15,60,35,0.07)] rounded-3xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-farm-50 border-b">
                        <tr>
                            <th className="px-6 py-3 text-sm font-semibold text-slate-600">Name</th>
                            <th className="px-6 py-3 text-sm font-semibold text-slate-600">Email</th>
                            <th className="px-6 py-3 text-sm font-semibold text-slate-600">Role</th>
                            <th className="px-6 py-3 text-sm font-semibold text-slate-600 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-farm-50 transition">
                                <td className="px-6 py-4 text-sm text-farm-900">{user.name}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                                <td className="px-6 py-4 text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                                        ${user.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
                                          user.role === 'Manager' ? 'bg-blue-100 text-blue-700' :
                                          'bg-slate-100 text-slate-700'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right text-sm">
                                    <button
                                        onClick={() => handleEdit(user)}
                                        className="text-farm-700 hover:underline mr-3"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        className="text-red-600 hover:underline"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-xl">
                        <h2 className="text-xl font-bold mb-4">
                            {editingUser ? 'Edit User' : 'Invite New User'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Full Name</label>
                                <input
                                    className="w-full border rounded-xl p-2 mt-1"
                                    value={newUser.name}
                                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Email</label>
                                <input
                                    type="email"
                                    className="w-full border rounded-xl p-2 mt-1"
                                    value={newUser.email}
                                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                                    required
                                />
                            </div>
                            {!editingUser && <p className="rounded-2xl bg-farm-50 p-3 text-sm text-farm-800">The new user will receive an email invitation and choose their own password. Admins invite Admins and farm owners; farm owners invite their own employees.</p>}
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Role</label>
                                <select
                                    className="w-full border rounded-xl p-2 mt-1"
                                    value={newUser.role}
                                    onChange={e => setNewUser({...newUser, role: e.target.value})}
                                >
                                    <option value="Admin">Admin</option>
                                    {editingUser && <option value="Manager">Manager</option>}
                                    {editingUser && <option value="Agronomist">Agronomist</option>}
                                    {editingUser && <option value="Worker">Worker</option>}
                                    {editingUser && <option value="Accountant">Accountant</option>}
                                    <option value="Farm-owner">Farm-owner</option>
                                </select>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-slate-600 hover:text-farm-900"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-farm-600 text-white px-4 py-2 rounded-full hover:bg-farm-700"
                                >
                                    {editingUser ? 'Update User' : 'Send Invitation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </ModuleLayout>
    );
};

export default UserManagement;
