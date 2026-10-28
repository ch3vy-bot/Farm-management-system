// Lets Farm-owners invite their own employees, and limits Admins to inviting Admins and Farm-owners.
// Usage (from the project root):  node enable-owner-invites.mjs
// Edits 5 existing files and adds 1 migration. If any expected text is missing, it changes NOTHING.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const files = {
    routes: 'routes/api.php',
    controller: 'app/Http/Controllers/InvitationController.php',
    model: 'app/Models/UserInvitation.php',
    users: 'src/pages/UserManagement.jsx',
    employees: 'src/pages/EmployeeManagement.jsx',
};
const migrationPath = 'database/migrations/2026_10_28_100000_add_farm_to_user_invitations_table.php';

const state = {};
for (const [key, path] of Object.entries(files)) {
    if (!existsSync(path)) {
        console.error(`Missing ${path}. Run this from the project root. Nothing was changed.`);
        process.exit(1);
    }
    const raw = readFileSync(path, 'utf8');
    state[key] = { path, crlf: raw.includes('\r\n'), text: raw.replace(/\r\n/g, '\n') };
}

if (state.controller.text.includes('hourly_rate')) {
    console.log('Already patched. Nothing to do.');
    process.exit(0);
}

function edit(key, name, from, to) {
    const count = state[key].text.split(from).length - 1;
    if (count !== 1) {
        console.error(`Could not apply "${name}" in ${state[key].path}: expected the text once, found ${count}. Nothing was changed.`);
        process.exit(1);
    }
    state[key].text = state[key].text.replace(from, () => to);
}

// ---- routes/api.php: let Farm-owner reach the invitation endpoint ----
edit('routes', 'invitation route',
    `Route::post('users/invitations', [InvitationController::class, 'store'])->middleware('role:Admin');`,
    `Route::post('users/invitations', [InvitationController::class, 'store'])->middleware('role:Admin,Farm-owner');`);

// ---- InvitationController ----
edit('controller', 'imports',
    `use App\\Models\\User;\nuse App\\Models\\UserInvitation;`,
    `use App\\Models\\Employee;\nuse App\\Models\\User;\nuse App\\Models\\UserInvitation;`);

edit('controller', 'validation',
`        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'role' => ['required', Rule::in(['Admin', 'Manager', 'Agronomist', 'Worker', 'Accountant', 'Farm-owner'])],
        ]);`,
`        $inviter = $request->user();
        $isAdmin = $inviter->role === 'Admin';

        // Admins invite other Admins and farm owners. Farm owners invite their own employees.
        $allowedRoles = $isAdmin
            ? ['Admin', 'Farm-owner']
            : ['Manager', 'Agronomist', 'Accountant', 'Worker'];

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'role' => ['required', Rule::in($allowedRoles)],
            'farm_id' => $isAdmin
                ? ['prohibited']
                : ['required', 'integer', Rule::exists('farms', 'id')->where('owner_id', $inviter->id)],
            'hourly_rate' => $isAdmin ? ['prohibited'] : ['nullable', 'numeric', 'min:0'],
            'task_assignment' => $isAdmin ? ['prohibited'] : ['nullable', 'string', 'max:255'],
        ], [
            'role.in' => $isAdmin
                ? 'Admins can only invite other Admins and farm owners. Farm owners invite their own employees.'
                : 'You can invite Managers, Agronomists, Accountants and Workers.',
            'farm_id.exists' => 'You can only invite employees to a farm that you own.',
        ]);`);

edit('controller', 'attach employee on accept',
`            $invitation->update(['accepted_at' => now()]);

            return $user;`,
`            // Invited by a farm owner: attach the new user to that farm straight away.
            if ($invitation->farm_id) {
                Employee::create([
                    'user_id' => $user->id,
                    'farm_id' => $invitation->farm_id,
                    'task_assignment' => $invitation->task_assignment,
                    'hourly_rate' => $invitation->hourly_rate ?? 0,
                ]);
            }

            $invitation->update(['accepted_at' => now()]);

            return $user;`);

// ---- UserInvitation model ----
edit('model', 'fillable',
    `        'token',\n        'expires_at',\n        'accepted_at',\n    ];`,
    `        'token',\n        'expires_at',\n        'accepted_at',\n        'farm_id',\n        'hourly_rate',\n        'task_assignment',\n    ];`);

// ---- Admin screen: only Admin and Farm-owner can be invited ----
edit('users', 'invite default role',
    `    const openInvitationModal = () => {\n        setEditingUser(null);\n        setNewUser({ name: '', email: '', role: 'Worker' });`,
    `    const openInvitationModal = () => {\n        setEditingUser(null);\n        setNewUser({ name: '', email: '', role: 'Farm-owner' });`);

edit('users', 'invite role options',
`                                    <option value="Admin">Admin</option>
                                    <option value="Manager">Manager</option>
                                    <option value="Agronomist">Agronomist</option>
                                    <option value="Worker">Worker</option>
                                    <option value="Accountant">Accountant</option>
                                    <option value="Farm-owner">Farm-owner</option>`,
`                                    <option value="Admin">Admin</option>
                                    {editingUser && <option value="Manager">Manager</option>}
                                    {editingUser && <option value="Agronomist">Agronomist</option>}
                                    {editingUser && <option value="Worker">Worker</option>}
                                    {editingUser && <option value="Accountant">Accountant</option>}
                                    <option value="Farm-owner">Farm-owner</option>`);

edit('users', 'invite hint',
    `The new user will receive an email invitation and choose their own password.</p>}`,
    `The new user will receive an email invitation and choose their own password. Admins invite Admins and farm owners; farm owners invite their own employees.</p>}`);

// ---- Employees screen: owners can invite employees ----
edit('employees', 'auth user',
    `    const { api } = useAuth();`,
    `    const { api, user } = useAuth();
    const isOwner = user?.role === 'Farm-owner';
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteSending, setInviteSending] = useState(false);
    const emptyInvite = { name: '', email: '', role: 'Worker', farm_id: '', task_assignment: '', hourly_rate: '' };
    const [invite, setInvite] = useState(emptyInvite);`);

edit('employees', 'invite handler',
    `    return (\n        <ModuleLayout\n          title="Employee Management"`,
`    async function handleInvite(e) {
        e.preventDefault();
        setInviteSending(true);
        try {
            await api.post('/api/users/invitations', {
                ...invite,
                hourly_rate: invite.hourly_rate === '' ? null : invite.hourly_rate,
                task_assignment: invite.task_assignment || null,
            });
            alert(\`Invitation sent to \${invite.email}. They will appear in your employee list once they accept.\`);
            setInviteOpen(false);
            setInvite(emptyInvite);
        } catch (err) {
            const errors = err.response?.data?.errors;
            alert((errors && Object.values(errors).flat()[0]) || err.response?.data?.message || 'Could not send the invitation.');
        } finally {
            setInviteSending(false);
        }
    }

    return (
        <ModuleLayout
          title="Employee Management"`);

edit('employees', 'invite button',
    `          actions={<>\n<button\n                        onClick={() => handleOpenModal()}`,
`          actions={<>
                    {isOwner && (
                        <button
                            onClick={() => setInviteOpen(true)}
                            className="mr-2 rounded-full bg-farm-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-farm-800"
                        >
                            + Invite Employee
                        </button>
                    )}
<button
                        onClick={() => handleOpenModal()}`);

const fieldClass = 'mt-1 w-full rounded-xl border border-farm-200 px-3 py-2 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-500/20';
edit('employees', 'invite modal',
    `                )}\n            </div>\n        </ModuleLayout>`,
`                )}

                {inviteOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                        <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
                            <h2 className="mb-2 text-xl font-semibold text-farm-900">Invite Employee</h2>
                            <p className="mb-5 text-sm text-slate-500">
                                They get an email, choose their own password, and are added to the farm you pick.
                            </p>
                            <form onSubmit={handleInvite} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Full name</label>
                                    <input
                                        className="${fieldClass}"
                                        value={invite.name}
                                        onChange={(e) => setInvite({ ...invite, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Email</label>
                                    <input
                                        type="email"
                                        className="${fieldClass}"
                                        value={invite.email}
                                        onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Role</label>
                                    <select
                                        className="${fieldClass}"
                                        value={invite.role}
                                        onChange={(e) => setInvite({ ...invite, role: e.target.value })}
                                    >
                                        <option value="Worker">Worker</option>
                                        <option value="Agronomist">Agronomist</option>
                                        <option value="Accountant">Accountant</option>
                                        <option value="Manager">Manager</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Farm</label>
                                    <select
                                        className="${fieldClass}"
                                        value={invite.farm_id}
                                        onChange={(e) => setInvite({ ...invite, farm_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Choose a farm...</option>
                                        {farms.map((f) => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Task assignment (optional)</label>
                                    <input
                                        className="${fieldClass}"
                                        placeholder="e.g. Irrigation Operator, Harvester"
                                        value={invite.task_assignment}
                                        onChange={(e) => setInvite({ ...invite, task_assignment: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-farm-900">Hourly rate in K (optional)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="${fieldClass}"
                                        value={invite.hourly_rate}
                                        onChange={(e) => setInvite({ ...invite, hourly_rate: e.target.value })}
                                    />
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setInviteOpen(false)}
                                        className="rounded-full border border-farm-200 px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-farm-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={inviteSending}
                                        className="rounded-full bg-farm-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-farm-800 disabled:opacity-60"
                                    >
                                        {inviteSending ? 'Sending...' : 'Send Invitation'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </ModuleLayout>`);

// ---- write everything (only reached if every edit matched) ----
for (const { path, crlf, text } of Object.values(state)) {
    writeFileSync(path, crlf ? text.replace(/\n/g, '\r\n') : text);
}

writeFileSync(migrationPath, `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_invitations', function (Blueprint $table) {
            if (! Schema::hasColumn('user_invitations', 'farm_id')) {
                $table->foreignId('farm_id')->nullable()->constrained('farms')->cascadeOnDelete();
            }
            if (! Schema::hasColumn('user_invitations', 'hourly_rate')) {
                $table->decimal('hourly_rate', 10, 2)->nullable();
            }
            if (! Schema::hasColumn('user_invitations', 'task_assignment')) {
                $table->string('task_assignment')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('user_invitations', function (Blueprint $table) {
            if (Schema::hasColumn('user_invitations', 'farm_id')) {
                $table->dropConstrainedForeignId('farm_id');
            }
            foreach (['hourly_rate', 'task_assignment'] as $column) {
                if (Schema::hasColumn('user_invitations', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
`);

console.log('Done. Edited routes/api.php, InvitationController, UserInvitation, UserManagement.jsx, EmployeeManagement.jsx and added the migration.');
console.log('Next: php artisan migrate, then npm run build.');
