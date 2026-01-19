import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import AuthCard from '../src/components/AuthCard';
import { useTranslation, Trans } from 'react-i18next';

const ManagerLogin: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Authenticate with Supabase
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("Authentication failed");

            // 2. Check Role (only managers or hr_admin allowd)
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', authData.user.id)
                .single();

            if (profileError) throw profileError;

            // Allow 'manager' AND 'hr_admin' as they are technically managers in this context
            if (profile.role !== 'manager' && profile.role !== 'hr_admin') {
                await supabase.auth.signOut();
                throw new Error(t('managerLogin.unauthorizedError'));
            }

            // 3. Redirect to 2FA
            navigate('/manager/verify-2fa');

        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || t('managerLogin.loginFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background-light flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-400/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
            </div>

            {/* Language Selector */}
            <div className="absolute top-6 right-6 z-20">
                <div className="relative group">
                    <select
                        value={i18n.language.split('-')[0]}
                        onChange={(e) => i18n.changeLanguage(e.target.value)}
                        className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl py-2 pl-3 pr-8 text-sm font-semibold text-[#193b5c] focus:outline-none focus:ring-2 focus:ring-[#193b5c]/20 appearance-none cursor-pointer hover:bg-white transition-all shadow-sm"
                    >
                        <option value="en">🇺🇸 English</option>
                        <option value="pt">🇧🇷 Português</option>
                        <option value="ja">🇯🇵 日本語</option>
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <span className="material-symbols-outlined text-[18px]">expand_more</span>
                    </div>
                </div>
            </div>

            <div className="mb-8 z-10 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                    <span className="material-symbols-outlined text-[#193b5c] text-4xl">domain</span>
                </div>
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold text-[#193b5c] tracking-tight">Yuukyu</h1>
                    <div className="mt-1 px-3 py-1 bg-[#193b5c]/10 rounded-full inline-block">
                        <p className="text-[#193b5c] text-[10px] font-bold uppercase tracking-widest">{t('managerLogin.portalLabel')}</p>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-md z-10">
                <AuthCard title={t('managerLogin.title')} subtitle={t('managerLogin.subtitle')}>
                    <form onSubmit={handleLogin} className="space-y-5">
                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 flex items-start gap-3">
                                <span className="material-symbols-outlined text-[20px] mt-0.5">error</span>
                                <span className="flex-1">{error}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[#193b5c] text-sm font-bold ml-1">{t('managerLogin.emailLabel')}</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors material-symbols-outlined">mail</span>
                                <input
                                    className="w-full h-12 pl-12 pr-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
                                    placeholder="nome@empresa.com.br"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[#193b5c] text-sm font-bold">{t('managerLogin.passwordLabel')}</label>
                                <button type="button" className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors">{t('managerLogin.forgotPassword')}</button>
                            </div>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors material-symbols-outlined">lock</span>
                                <input
                                    className="w-full h-12 pl-12 pr-12 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
                                    placeholder="••••••••"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors flex items-center justify-center p-1"
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-3">
                            <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">verified_user</span>
                            <p className="text-xs text-primary/80 leading-relaxed font-medium">
                                <Trans i18nKey="managerLogin.2faWarning" components={{ bold: <span className="font-bold" /> }} />
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 mt-2 rounded-xl bg-[#193b5c] hover:bg-[#152d49] active:scale-[0.98] transition-all duration-300 shadow-lg shadow-[#193b5c]/20 flex items-center justify-center gap-3 group disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span className="text-white text-base font-bold">{t('managerLogin.submitButton')}</span>
                                    <span className="material-symbols-outlined text-white text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </form>
                </AuthCard>

                <p className="mt-8 text-center text-xs text-gray-400 font-medium">
                    {t('managerLogin.copyright')}<br />{t('managerLogin.restrictedAccess')}
                </p>
            </div>
        </div>
    );
};

export default ManagerLogin;
