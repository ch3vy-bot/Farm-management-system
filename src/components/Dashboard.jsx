import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import WeatherWidget from './WeatherWidget.jsx';
import MapWidget from './MapWidget.jsx';
import FarmScene from './FarmScene.jsx';
import Icon from './Icon.jsx';

const initialSummary = {
    infrastructure: { farms: 0, fields: 0, active_users: 0, total_acreage: 0 },
    financials: { total_expenses: 0, total_labor_cost: 0, total_outflow: 0 },
    production: { total_quantity: 0, yield_records: 0 },
};

const actionIcons = {
    '/farms': 'farm',
    '/livestock': 'paw',
    '/notifications': 'bell',
    '/suppliers': 'truck',
    '/sales': 'cart',
    '/storage': 'warehouse',
    '/employees': 'briefcase',
    '/tasks': 'tasks',
    '/production': 'factory',
    '/expenses': 'receipt',
    '/users': 'shield',
    '/crops': 'wheat',
    '/plantings': 'seedling',
    '/crop-monitoring': 'eye',
    '/irrigation-schedules': 'drop',
    '/pest-disease': 'bug',
    '/weather': 'cloudsun',
    '/harvest': 'basket',
    '/yield-records': 'trend',
    '/post-harvest-handling': 'package',
    '/inventory': 'boxes',
    '/equipment': 'wrench',
    '/finance': 'banknote',
    '/reports': 'chart',
};

// How the modules are grouped into tabs. Any page that is not listed here
// still shows up, under "More", so new modules never disappear.
const groups = [
    { title: 'Farm and land', paths: ['/farms', '/crops', '/plantings', '/crop-monitoring', '/pest-disease', '/livestock'] },
    { title: 'Water and weather', paths: ['/irrigation-schedules', '/weather'] },
    { title: 'Harvest and storage', paths: ['/harvest', '/yield-records', '/post-harvest-handling', '/storage'] },
    { title: 'Operations', paths: ['/tasks', '/production', '/employees', '/equipment', '/inventory'] },
    { title: 'Supply and sales', paths: ['/suppliers', '/sales'] },
    { title: 'Finance and reports', paths: ['/expenses', '/finance', '/reports'] },
    { title: 'Administration', paths: ['/notifications', '/users'] },
];

// The hero sky changes with the time of day (always in the brand greens).
function getSky(date) {
    const hour = date.getHours() + date.getMinutes() / 60;
    let greeting = 'Good evening';
    if (hour < 5) greeting = 'Working late';
    else if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';

    if (hour < 5 || hour >= 20) {
        return { phase: 'night', night: true, hour, greeting, gradient: 'from-[#04140d] via-[#082a1b] to-[#0d3a26]' };
    }
    if (hour < 8) {
        return { phase: 'dawn', night: false, hour, greeting, gradient: 'from-[#0a3524] via-[#1d6b4a] to-[#d9a05b]' };
    }
    if (hour < 17) {
        return { phase: 'day', night: false, hour, greeting, gradient: 'from-[#0a3f25] via-[#0f6b3a] to-[#26965f]' };
    }
    return { phase: 'dusk', night: false, hour, greeting, gradient: 'from-[#0a3524] via-[#3f6a52] to-[#d0795c]' };
}

const softShadow = 'shadow-[0_2px_16px_rgba(15,60,35,0.07)]';

function AnimatedNumber({ value, loading, prefix = '' }) {
    const target = Number(value ?? 0);
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        if (loading || !Number.isFinite(target)) return undefined;

        let frame;
        const start = performance.now();
        const duration = 800;

        const tick = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplay(target * eased);
            if (t < 1) frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [target, loading]);

    if (loading) return <span className="animate-pulse text-slate-300">&ndash;</span>;
    if (!Number.isFinite(target)) return <span>{String(value)}</span>;

    const shown = Number.isInteger(target) ? Math.round(display) : display;
    return <span>{prefix}{shown.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>;
}

function Panel({ title, className = '', children }) {
    return (
        <section className={`rounded-3xl bg-white ${softShadow} ${className}`}>
            <h2 className="px-6 pt-5 text-base font-semibold text-farm-900">{title}</h2>
            <div className="p-6 pt-4">{children}</div>
        </section>
    );
}

export default function Dashboard() {
    const { api, user, logout } = useAuth();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(initialSummary);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [farmId, setFarmId] = useState(null);
    const [now, setNow] = useState(() => new Date());
    const [query, setQuery] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('All');

    // keep the sky in step with the clock
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(id);
    }, []);

    const sky = getSky(now);
    const today = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    const firstName = (user?.name || 'there').split(' ')[0];
    const initials =
        (user?.name || '?')
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word[0].toUpperCase())
            .join('') || '?';

    useEffect(() => {
        let ignore = false;

        async function loadSummary() {
            setLoading(true);
            setError(null);

            try {
                const response = await api.get('/api/dashboard/summary');

                if (!ignore) {
                    const data = response.data.data || {};

                    setSummary({
                        ...initialSummary,
                        ...data,
                        infrastructure: { ...initialSummary.infrastructure, ...(data.infrastructure || {}) },
                        financials: { ...initialSummary.financials, ...(data.financials || {}) },
                        production: { ...initialSummary.production, ...(data.production || {}) },
                    });

                    if (data.infrastructure?.farms > 0) {
                        const farmRes = await api.get('/api/farms');
                        setFarmId(farmRes.data.data?.[0]?.id || null);
                    }
                }
            } catch {
                if (!ignore) {
                    setError('Dashboard summary could not be loaded.');
                }
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        }

        loadSummary();

        return () => {
            ignore = true;
        };
    }, [api]);

    const farmCount = summary.infrastructure?.farms ?? 0;
    const fieldCount = summary.infrastructure?.fields ?? 0;

    let subtitle = 'Checking on the farm…';
    if (!loading) {
        subtitle =
            farmCount > 0
                ? `${today}. Keeping an eye on ${farmCount} farm${farmCount === 1 ? '' : 's'} and ${fieldCount} field${fieldCount === 1 ? '' : 's'}.`
                : `${today}. Let’s get your first farm set up.`;
    }

    const farmTone = 'bg-farm-50 text-farm-700';
    const moneyTone = 'bg-harvest-50 text-harvest-600';

    const cards = [
        { label: 'Total farms', icon: 'farm', tone: farmTone, value: summary.infrastructure?.farms, roles: ['Admin', 'Manager', 'Accountant', 'Agronomist', 'Worker', 'Farm-owner'] },
        { label: 'Total fields', icon: 'field', tone: farmTone, value: summary.infrastructure?.fields, roles: ['Admin', 'Manager', 'Accountant', 'Agronomist', 'Worker', 'Farm-owner'] },
        { label: 'Total acreage', icon: 'area', tone: farmTone, value: summary.infrastructure?.total_acreage, roles: ['Admin', 'Manager', 'Accountant', 'Agronomist', 'Worker', 'Farm-owner'] },
        { label: 'Active users', icon: 'users', tone: farmTone, value: summary.infrastructure?.active_users, roles: ['Admin', 'Farm-owner', 'Manager', 'Accountant'] },
        { label: 'Total expenses', icon: 'wallet', prefix: 'K', tone: moneyTone, value: summary.financials?.total_expenses, roles: ['Farm-owner', 'Accountant'] },
        { label: 'Labour costs', icon: 'hardhat', prefix: 'K', tone: moneyTone, value: summary.financials?.total_labor_cost, roles: ['Farm-owner', 'Manager', 'Accountant'] },
        { label: 'Total production', icon: 'wheat', tone: farmTone, value: summary.production?.total_quantity, roles: ['Admin', 'Manager', 'Agronomist', 'Worker', 'Farm-owner'] },
        { label: 'Yield records', icon: 'trend', tone: farmTone, value: summary.production?.yield_records, roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
    ].filter(card => card.roles.includes(user?.role));

    const actions = [
        { label: 'Manage Farms', path: '/farms', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist'] },
        { label: 'Livestock Management', path: '/livestock', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Notifications', path: '/notifications', roles: ['Admin', 'Farm-owner', 'Manager', 'Accountant', 'Agronomist', 'Worker'] },
        { label: 'Suppliers & Procurement', path: '/suppliers', roles: ['Farm-owner', 'Manager', 'Accountant'] },
        { label: 'Market & Sales', path: '/sales', roles: ['Farm-owner', 'Manager', 'Accountant'] },
        { label: 'Storage & Post-Harvest', path: '/storage', roles: ['Admin', 'Farm-owner', 'Manager', 'Accountant', 'Agronomist', 'Worker'] },
        { label: 'Manage Employees', path: '/employees', roles: ['Farm-owner', 'Manager'] },
        { label: 'Task Tracking', path: '/tasks', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Production Logs', path: '/production', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist'] },
        { label: 'Crop Management', path: '/crops', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Planting Management', path: '/plantings', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Crop Monitoring', path: '/crop-monitoring', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Irrigation Schedules', path: '/irrigation-schedules', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Pest & Disease', path: '/pest-disease', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Weather', path: '/weather', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Harvest Management', path: '/harvest', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Yield Records', path: '/yield-records', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Post-Harvest Handling', path: '/post-harvest-handling', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Expense Tracking', path: '/expenses', roles: ['Farm-owner', 'Manager', 'Accountant'] },
        { label: 'Inventory & Inputs', path: '/inventory', roles: ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'] },
        { label: 'Equipment & Machinery', path: '/equipment', roles: ['Admin', 'Farm-owner', 'Manager', 'Worker'] },
        { label: 'Financial Management', path: '/finance', roles: ['Farm-owner', 'Accountant'] },
        { label: 'Reports & Analytics', path: '/reports', roles: ['Farm-owner', 'Manager', 'Accountant'] },
        { label: 'Manage Users', path: '/users', roles: ['Admin'] },
    ].filter(action => action.roles.includes(user?.role));

    const knownPaths = new Set(groups.flatMap((group) => group.paths));
    const leftovers = actions.filter((action) => !knownPaths.has(action.path));

    const visibleGroups = [
        ...groups.map((group) => ({
            title: group.title,
            items: group.paths.map((path) => actions.find((action) => action.path === path)).filter(Boolean),
        })),
        { title: 'More', items: leftovers },
    ].filter((group) => group.items.length > 0);

    const allItems = visibleGroups.flatMap((group) => group.items);
    const tabGroup = visibleGroups.find((group) => group.title === activeTab);
    const shownItems = tabGroup ? tabGroup.items : allItems;

    const results = query.trim()
        ? actions.filter((action) => action.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
        : [];

    const goTo = (path) => {
        setQuery('');
        setSearchOpen(false);
        navigate(path);
    };

    const canSeeNotifications = actions.some((action) => action.path === '/notifications');

    return (
        <main className="min-h-screen bg-farm-50 text-slate-800">
            <header className={`relative bg-gradient-to-b ${sky.gradient} text-white`}>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/25" />
                <FarmScene sky={sky} />

                <div className="relative mx-auto max-w-7xl px-6 pb-32 pt-5">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15 ring-1 ring-white/25">
                                <Icon name="leaf" className="h-5 w-5" />
                            </span>
                            <div className="leading-tight">
                                <p className="text-sm font-semibold">AgriCore</p>
                                <p className="hidden text-xs text-white/70 sm:block">Intelligence Core Dashboard</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {canSeeNotifications && (
                                <button
                                    type="button"
                                    onClick={() => navigate('/notifications')}
                                    className="grid h-10 w-10 place-items-center rounded-full bg-white/15 ring-1 ring-white/25 transition hover:bg-white/25"
                                    aria-label="Notifications"
                                >
                                    <Icon name="bell" className="h-5 w-5" />
                                </button>
                            )}
                            <div className="hidden text-right leading-tight sm:block">
                                <p className="text-sm font-medium">{user?.name}</p>
                                <p className="text-xs text-white/70">{user?.role}</p>
                            </div>
                            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20 text-sm font-semibold ring-1 ring-white/30">
                                {initials}
                            </span>
                            <button
                                className="flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                                type="button"
                                onClick={logout}
                                aria-label="Logout"
                            >
                                <Icon name="logout" className="h-4 w-4" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>

                    <div className="mt-9">
                        <p className="text-sm text-white/75">Hello,</p>
                        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                            {sky.greeting}, {firstName}
                        </h1>
                        <p className="mt-2 max-w-xl text-sm text-white/80">{subtitle}</p>
                    </div>

                    <div className="relative mt-6 max-w-xl">
                        <div className="flex items-center gap-3 rounded-full bg-black/25 px-5 py-3 ring-1 ring-white/20 backdrop-blur focus-within:ring-2 focus-within:ring-white/50">
                            <Icon name="search" className="h-5 w-5 shrink-0 text-white/80" />
                            <input
                                type="search"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                onFocus={() => setSearchOpen(true)}
                                onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && results[0]) goTo(results[0].path);
                                    if (event.key === 'Escape') setQuery('');
                                }}
                                placeholder="Search modules, e.g. harvest or irrigation"
                                aria-label="Search modules"
                                className="w-full bg-transparent text-sm text-white placeholder-white/60 focus:outline-none"
                            />
                        </div>

                        {searchOpen && results.length > 0 && (
                            <ul className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl bg-white py-1 text-slate-800 shadow-xl ring-1 ring-black/5">
                                {results.map((action) => (
                                    <li key={action.path}>
                                        <button
                                            type="button"
                                            onMouseDown={(event) => event.preventDefault()}
                                            onClick={() => goTo(action.path)}
                                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-farm-50"
                                        >
                                            <Icon name={actionIcons[action.path] || 'leaf'} className="h-4 w-4 text-farm-600" />
                                            {action.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </header>

            <section className="relative z-10 mx-auto -mt-24 max-w-7xl px-6 pb-14">
                {error && <p className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

                <div className="grid items-start gap-6 lg:grid-cols-3 lg:grid-rows-[auto_1fr]">
                    <div className="lg:col-start-1 lg:row-start-1">
                        <WeatherWidget farmId={farmId} />
                    </div>

                    <div className="space-y-6 lg:col-span-2 lg:col-start-2 lg:row-span-2 lg:row-start-1">
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            {cards.map((card) => (
                                <div key={card.label} className={`rounded-2xl bg-white p-4 ${softShadow}`}>
                                    <span className={`grid h-10 w-10 place-items-center rounded-full ${card.tone}`}>
                                        <Icon name={card.icon} className="h-5 w-5" />
                                    </span>
                                    <p className="mt-3 text-sm text-slate-500">{card.label}</p>
                                    <p className="mt-0.5 text-2xl font-semibold tracking-tight text-farm-900 tabular-nums">
                                        <AnimatedNumber value={card.value} loading={loading} prefix={card.prefix} />
                                    </p>
                                </div>
                            ))}
                        </div>

                        <Panel title="Farm location and fields">
                            <MapWidget farmId={farmId} />
                        </Panel>
                    </div>

                    <div className="lg:col-start-1 lg:row-start-2">
                        <Panel title="System status">
                            <dl className="space-y-3 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-500">System health</dt>
                                    <dd className="flex items-center gap-2 font-medium text-farm-700">
                                        <span className="h-2 w-2 rounded-full bg-farm-500" />
                                        Online
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-500">Signed in as</dt>
                                    <dd className="font-medium text-slate-800">{user?.role || 'Unknown'}</dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-500">Farm selected</dt>
                                    <dd className="font-medium text-slate-800">{farmId ? `Farm #${farmId}` : 'None'}</dd>
                                </div>
                            </dl>
                        </Panel>
                    </div>
                </div>

                <div className="mt-10" id="modules">
                    <h2 className="text-lg font-semibold text-farm-900">Modules</h2>

                    <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Module categories">
                        {['All', ...visibleGroups.map((group) => group.title)].map((tab) => {
                            const active = (tabGroup ? tabGroup.title : 'All') === tab;
                            return (
                                <button
                                    key={tab}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => setActiveTab(tab)}
                                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                                        active
                                            ? 'bg-farm-700 text-white'
                                            : 'bg-white text-slate-600 hover:text-farm-800 ' + softShadow
                                    }`}
                                >
                                    {tab}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                        {shownItems.map((action) => (
                            <button
                                key={action.path}
                                type="button"
                                onClick={() => navigate(action.path)}
                                className={`group flex flex-col items-center gap-3 rounded-2xl bg-white px-3 py-5 text-center transition hover:ring-2 hover:ring-farm-500/40 ${softShadow}`}
                            >
                                <span className="grid h-12 w-12 place-items-center rounded-full bg-farm-50 text-farm-700 transition group-hover:bg-farm-100">
                                    <Icon name={actionIcons[action.path] || 'leaf'} className="h-6 w-6" />
                                </span>
                                <span className="text-sm font-medium text-slate-700">{action.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
