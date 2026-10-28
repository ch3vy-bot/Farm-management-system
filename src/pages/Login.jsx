import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout.jsx';
import { inputClass } from '../components/ModuleUI.jsx';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        setError('');
        setIsLoading(true);

        try {
            const result = await login(email, password);
            if (result && result.success) {
                navigate('/dashboard');
            } else {
                setError(result?.message || 'Invalid credentials. Please try again.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout title="Welcome back" subtitle="Sign in to manage your farm.">
            {error && (
                <p role="alert" className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
                    {error}
                </p>
            )}
            {location.state?.message && (
                <p role="status" className="mb-4 rounded-2xl bg-farm-100 px-4 py-3 text-sm text-farm-800">
                    {location.state.message}
                </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                    <span className="text-sm font-medium text-farm-900">Email address</span>
                    <input
                        type="email"
                        autoComplete="username"
                        className={inputClass}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </label>

                <label className="block">
                    <span className="text-sm font-medium text-farm-900">Password</span>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            className={`${inputClass} pr-11`}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className="absolute inset-y-0 right-0 mt-1 flex items-center rounded-r-xl px-3 text-slate-400 transition hover:text-farm-700"
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243-4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </label>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-full bg-farm-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-farm-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
            </form>

            <Link
                className="mt-5 block text-center text-sm font-medium text-farm-700 hover:text-farm-900 hover:underline"
                to="/forgot-password"
            >
                Forgot your password?
            </Link>
        </AuthLayout>
    );
};

export default Login;
