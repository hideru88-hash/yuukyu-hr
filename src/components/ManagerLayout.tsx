import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';

interface ManagerLayoutProps {
    children: React.ReactNode;
}

const ManagerLayout: React.FC<ManagerLayoutProps> = ({ children }) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { profile, signOut, user, refreshProfile } = useAuth();

    // Profile Popover State
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
    const [language, setLanguage] = useState(profile?.language || i18n.language.split('-')[0] || 'en');
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileUploading, setProfileUploading] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState(false);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setAvatarUrl(profile.avatar_url || '');
            setLanguage(profile.language || i18n.language.split('-')[0] || 'en');
        }
    }, [profile, i18n.language]);

    const handleProfileSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileSuccess(false);

        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    full_name: fullName,
                    language: language,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user?.id);

            if (error) {
                await supabase
                    .from('user_profiles')
                    .update({
                        full_name: fullName,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user?.id);
            }

            if (language !== i18n.language) {
                i18n.changeLanguage(language);
            }

            await refreshProfile();
            setProfileSuccess(true);
            setTimeout(() => {
                setProfileSuccess(false);
                setIsProfileOpen(false);
            }, 1500);
        } catch (error: any) {
            console.error('Error updating profile:', error);
            alert('Error: ' + error.message);
        } finally {
            setProfileLoading(false);
        }
    };

    const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setProfileUploading(true);
            if (!event.target.files || event.target.files.length === 0) return;

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user!.id}/${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);

            await supabase
                .from('user_profiles')
                .update({
                    avatar_url: data.publicUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user!.id);

            setAvatarUrl(data.publicUrl);
            await refreshProfile();
        } catch (error: any) {
            alert('Upload error: ' + error.message);
        } finally {
            setProfileUploading(false);
        }
    };

    const NavItem = ({ icon, label, path, badge }: { icon: string, label: string, path: string, badge?: number }) => {
        const isActive = location.pathname === path || (path !== '/hr' && location.pathname.startsWith(path));
        return (
            <button
                onClick={() => navigate(path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium group
                    ${isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
            >
                <span className="material-symbols-outlined">{icon}</span>
                <span className="flex-1 text-left">{label}</span>
                {badge !== undefined && (
                    <span className="bg-red-500 text-[10px] px-2 py-0.5 rounded-full text-white">
                        {badge}
                    </span>
                )}
            </button>
        );
    };

    return (
        <div className="h-screen flex overflow-hidden bg-background-light dark:bg-background-dark font-display">
            {/* Sidebar */}
            <aside className="w-64 bg-primary text-white flex flex-col shrink-0">
                <div className="p-6 flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                        <span className="material-symbols-outlined text-white">holiday_village</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight">Yuukyu Web</span>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1">
                    <NavItem icon="dashboard" label={t('hr.overview')} path="/hr" />
                    <NavItem icon="groups" label={t('hr.team')} path="/hr/team" />
                    <NavItem icon="apartment" label={t('hr.workplaces')} path="/hr/workplaces" />
                    <NavItem icon="verified_user" label={t('hr.visas')} path="/hr/visas" />
                    <NavItem icon="rule" label={t('hr.approvals')} path="/hr/approvals" badge={12} />
                    <NavItem icon="calendar_month" label={t('hr.calendar')} path="/hr/calendar" />
                    <NavItem icon="bar_chart" label={t('hr.reports')} path="/hr/reports" />
                    <NavItem icon="settings" label={t('hr.settings')} path="/hr/settings" />
                </nav>

                <div className="p-4 mt-auto">
                    <button
                        onClick={() => setIsProfileOpen(true)}
                        className="w-full bg-white/5 rounded-2xl p-4 flex items-center gap-3 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <div className="size-10 rounded-full bg-cover bg-center border border-white/20"
                            style={{ backgroundImage: `url("${profile?.avatar_url || 'https://i.pravatar.cc/150?u=' + profile?.id}")` }}>
                        </div>
                        <div className="overflow-hidden text-left">
                            <p className="text-sm font-bold truncate">{profile?.full_name || 'User'}</p>
                            <p className="text-[10px] text-white/50 uppercase tracking-wider">{t('profile.productManager')}</p>
                        </div>
                        <span className="material-symbols-outlined ml-auto text-white/50 text-sm">settings</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark">
                <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0">
                    <div className="flex-1 max-w-xl">
                        <div className="relative group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                            <input
                                className="w-full pl-12 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-0 rounded-xl text-sm transition-all outline-none"
                                placeholder={t('hr.searchPlaceholder')}
                                type="text"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="size-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
                            <span className="material-symbols-outlined">notifications</span>
                            <span className="absolute top-2 right-2 size-2 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                        </button>
                        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 mx-2"></div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('hr.managerPanel')}</span>
                            <button className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 transition-colors">
                                <span className="material-symbols-outlined">help_outline</span>
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto no-scrollbar">
                    {children}
                </main>
            </div>

            {/* Profile Modal */}
            {isProfileOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('profile.title')}</h3>
                            <button onClick={() => setIsProfileOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleProfileSave}>
                            <div className="p-6 space-y-6">
                                {/* Avatar Section */}
                                <div className="flex flex-col items-center">
                                    <div className="relative group">
                                        <div
                                            className="size-24 rounded-2xl bg-cover bg-center shadow-lg border-4 border-slate-100 dark:border-slate-800 relative overflow-hidden"
                                            style={{ backgroundImage: `url("${avatarUrl || 'https://i.pravatar.cc/150?u=' + user?.id}")` }}
                                        >
                                            <div
                                                className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                                onClick={() => document.getElementById('profile-avatar-input')?.click()}
                                            >
                                                <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                                            </div>
                                        </div>
                                        <input
                                            id="profile-avatar-input"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={uploadAvatar}
                                            disabled={profileUploading}
                                        />
                                        {profileUploading && (
                                            <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 rounded-2xl flex items-center justify-center">
                                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="mt-2 font-bold text-sm">{fullName || 'User'}</p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{t('profile.productManager')}</p>
                                </div>

                                {/* Form Fields */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 ml-1">{t('profile.fullName')}</label>
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 ml-1">{t('profile.language')}</label>
                                        <select
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value)}
                                            className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                                        >
                                            <option value="en">English (US)</option>
                                            <option value="pt">Português (Brasil)</option>
                                            <option value="ja">日本語 (Japanese)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 ml-1">{t('profile.corporateEmail')}</label>
                                    <input
                                        type="email"
                                        value={user?.email || ''}
                                        disabled
                                        className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed outline-none text-sm"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => signOut().then(() => navigate('/manager/login'))}
                                    className="px-4 py-2 text-red-500 font-bold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">logout</span>
                                    {t('profile.logOut')}
                                </button>
                                <div className="flex gap-3">
                                    {profileSuccess && (
                                        <span className="text-green-500 flex items-center gap-1 text-sm font-bold animate-in fade-in">
                                            <span className="material-symbols-outlined text-sm">check_circle</span>
                                            {t('profile.profileUpdated')}
                                        </span>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={profileLoading}
                                        className="px-6 py-2 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {profileLoading ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-sm">save</span>
                                                {t('profile.save')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagerLayout;
