import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Login: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [fullName, setFullName] = React.useState('');
    const [isSignUp, setIsSignUp] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Import dynamically or assume global/import from lib
            const { supabase } = await import('../lib/supabaseClient');

            let result;
            if (isSignUp) {
                result = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        }
                    }
                });
            } else {
                result = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
            }

            if (result.error) throw result.error;

            if (isSignUp && !result.data.session) {
                // Supabase doesn't return a session if email confirmation is required OR if user already exists
                // We check if it's an existing user by looking at the user object metadata or just providing a more helpful message
                if (result.data.user?.identities?.length === 0) {
                    setError(t('login.emailExists') || 'This email is already registered. Please try logging in.');
                } else {
                    alert(t('login.checkEmail'));
                }
            } else {
                navigate('/dashboard');
            }

        } catch (err: any) {
            console.error('Auth error:', err);
            setError(err.message || 'Failed to authenticate');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background-light relative overflow-hidden">
            {/* Decorative subtle background gradient */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none"></div>

            <div className="flex flex-col items-center justify-center flex-1 px-8 py-8 w-full z-10">
                {/* Logo */}
                <div className="flex flex-col items-center gap-6 mb-12 w-full">
                    <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-white border border-gray-100 shadow-xl overflow-hidden">
                        <div className="absolute inset-0 bg-primary/10"></div>
                        <span className="material-symbols-outlined text-primary text-5xl">spa</span>
                    </div>
                    <div className="flex flex-col items-center text-center space-y-2">
                        <h1 className="text-slate-900 text-3xl font-extrabold tracking-tight">{t('login.welcome')}</h1>
                        <p className="text-slate-500 text-base font-medium">{t('login.subtitle')}</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="w-full space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}
                    {isSignUp && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-slate-900 text-sm font-semibold pl-4">{t('login.fullName')}</label>
                            <input
                                className="w-full h-14 pl-5 pr-4 rounded-full bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                                placeholder="Kenji Sato"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required={isSignUp}
                            />
                        </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-slate-900 text-sm font-semibold pl-4">{t('login.email')}</label>
                        <input
                            className="w-full h-14 pl-5 pr-4 rounded-full bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                            placeholder="kenji@yuukyu.com"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-slate-900 text-sm font-semibold pl-4">{t('login.password')}</label>
                        <div className="relative flex w-full rounded-full bg-white border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary transition-all duration-200">
                            <input
                                className="flex-1 h-14 pl-5 pr-2 bg-transparent border-none text-slate-900 focus:ring-0 outline-none"
                                placeholder="••••••••"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="flex items-center justify-center px-4 text-slate-400 hover:text-primary transition-colors"
                            >
                                <span className="material-symbols-outlined text-2xl">
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {!isSignUp && (
                        <div className="flex justify-end px-2">
                            <button type="button" className="text-sm font-medium text-slate-500 hover:text-primary underline decoration-slate-500/30 underline-offset-4 transition-colors">
                                {t('login.forgotPassword')}
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-14 rounded-full bg-primary hover:bg-primary-dark active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary/25 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="text-white">{t('login.loading')}</span>
                        ) : (
                            <>
                                <span className="text-white text-lg font-bold tracking-wide">{isSignUp ? t('login.signUp') : t('login.signIn')}</span>
                                <span className="material-symbols-outlined text-white group-hover:translate-x-1 transition-transform">arrow_forward</span>
                            </>
                        )}
                    </button>

                    <div className="text-center">
                        <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-primary hover:underline">
                            {isSignUp ? t('login.hasAccount') : t('login.noAccount')}
                        </button>
                    </div>
                </form>

                <div className="w-full flex flex-col items-center mt-8 gap-6">
                    <div className="relative w-full flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <span className="relative bg-background-light px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Or log in with
                        </span>
                    </div>
                    <button type="button" className="flex items-center justify-center w-16 h-16 rounded-full bg-white border border-slate-200 hover:border-primary hover:bg-primary/5 transition-all duration-300 group shadow-sm">
                        <span className="material-symbols-outlined text-4xl text-slate-400 group-hover:text-primary transition-colors">face</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;