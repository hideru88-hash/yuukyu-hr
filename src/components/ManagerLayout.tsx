import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface ManagerLayoutProps {
    children: React.ReactNode;
}

const ManagerLayout: React.FC<ManagerLayoutProps> = ({ children }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { profile, signOut } = useAuth();

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
                    <NavItem icon="rule" label={t('hr.approvals')} path="/hr/approvals" badge={12} />
                    <NavItem icon="calendar_month" label={t('hr.calendar')} path="/hr/calendar" />
                    <NavItem icon="bar_chart" label={t('hr.reports')} path="/hr/reports" />
                    <NavItem icon="settings" label={t('hr.settings')} path="/hr/settings" />
                </nav>

                <div className="p-4 mt-auto">
                    <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3 border border-white/10">
                        <div className="size-10 rounded-full bg-cover bg-center border border-white/20"
                            style={{ backgroundImage: `url("${profile?.avatar_url || 'https://i.pravatar.cc/150?u=' + profile?.id}")` }}>
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold truncate">{profile?.full_name || 'User'}</p>
                            <p className="text-[10px] text-white/50 uppercase tracking-wider">{t('profile.productManager')}</p>
                        </div>
                        <button
                            onClick={() => signOut().then(() => navigate('/manager/login'))}
                            className="ml-auto text-white/50 hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">logout</span>
                        </button>
                    </div>
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
        </div>
    );
};

export default ManagerLayout;
