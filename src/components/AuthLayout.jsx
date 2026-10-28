import { useEffect, useState } from 'react';
import FarmScene from './FarmScene.jsx';
import Icon from './Icon.jsx';
import { getSky } from './sky.js';

/**
 * Full-screen shell for the sign-in pages (login, forgot password, accept invitation...).
 * Same time-of-day sky and farm scene as the dashboard, with a white card in the middle.
 *
 * <AuthLayout title="Welcome back" subtitle="Sign in to continue">
 *   ...form...
 * </AuthLayout>
 */
export default function AuthLayout({ title, subtitle, children, footer }) {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(id);
    }, []);

    const sky = getSky(now);

    return (
        <main className={`relative flex min-h-screen flex-col bg-gradient-to-b ${sky.gradient} text-white`}>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/25" />
            <FarmScene sky={sky} />

            <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10">
                <div className="mb-6 flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-white/15 ring-1 ring-white/25">
                        <Icon name="leaf" className="h-6 w-6" />
                    </span>
                    <div className="leading-tight">
                        <p className="text-lg font-semibold">AgriCore</p>
                        <p className="text-xs text-white/70">Intelligence Core Dashboard</p>
                    </div>
                </div>

                <div className="w-full max-w-md rounded-3xl bg-white p-6 text-slate-800 shadow-[0_8px_40px_rgba(15,60,35,0.25)] sm:p-8">
                    <h1 className="text-2xl font-semibold tracking-tight text-farm-900">{title}</h1>
                    {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
                    <div className="mt-6">{children}</div>
                </div>

                {footer && <div className="mt-5 text-center text-sm text-white/80">{footer}</div>}
            </div>
        </main>
    );
}
