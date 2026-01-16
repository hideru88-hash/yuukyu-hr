import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../src/hooks/useNotifications';
import {
    getHrMetrics,
    getPriorityApprovals,
    approveLeaveRequest,
    rejectLeaveRequest,
    getUpcomingAbsences,
    PendingRequest,
    HrMetrics
} from '../src/services/hrService';

const HRDashboard: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { notifications } = useNotifications();

    const [requests, setRequests] = useState<PendingRequest[]>([]);
    const [metrics, setMetrics] = useState<HrMetrics>({ pendingCount: 0, onLeaveToday: 0, balanceUsedPercent: 0 });
    const [upcomingAbsences, setUpcomingAbsences] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [metricsData, requestsData, upcomingData] = await Promise.all([
                getHrMetrics(),
                getPriorityApprovals(5),
                getUpcomingAbsences(5)
            ]);
            setMetrics(metricsData);
            setRequests(requestsData);
            setUpcomingAbsences(upcomingData);
        } catch (error) {
            console.error('Error fetching HR data:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleAction = async (id: string, action: 'approved' | 'rejected') => {
        if (!user) return;
        setProcessingId(id);

        try {
            if (action === 'approved') {
                // Use the new FIFO Yukyu Rule
                const { approveLeaveWithYukyuRule } = await import('../src/services/yukyuRule');
                await approveLeaveWithYukyuRule(id, user.id);
            } else {
                const reason = window.prompt(t('hr.rejectReasonPrompt') || 'Reason for rejection (optional):');
                if (reason === null) {
                    setProcessingId(null);
                    return; // Looked like cancel
                }
                await rejectLeaveRequest(id, reason || undefined);
            }

            // Refresh data
            fetchData();
        } catch (error: any) {
            console.error('Error updating status:', error);
            alert('Error: ' + (error.message || 'Unknown error'));
        } finally {
            setProcessingId(null);
        }
    };

    const getTypeColor = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('annual')) return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
        if (t.includes('sick')) return 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
        if (t.includes('remote') || t.includes('home')) return 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400';
        if (t.includes('other')) return 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
        return 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    };

    const formatDateShort = (date: string) => {
        return new Date(date).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
    };

    const getRelativeTime = (date: string) => {
        const now = new Date();
        const past = new Date(date);
        const diffMs = now.getTime() - past.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return t('common.justNow', 'Just now');
        if (diffMins < 60) return t('common.minutesAgo', { count: diffMins, defaultValue: '{{count}} minutes ago' });
        if (diffHours < 24) return t('common.hoursAgo', { count: diffHours, defaultValue: '{{count}} hours ago' });
        return t('common.daysAgo', { count: diffDays, defaultValue: '{{count}} days ago' });
    };

    return (
        <div className="max-w-7xl mx-auto p-8 space-y-8 animate-in fade-in duration-500">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:border-primary transition-all duration-300">
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('hr.pendingApprovals')}</p>
                        <h3 className="text-3xl font-bold mt-1">{metrics.pendingCount}</h3>
                        <p className={`text-xs font-semibold mt-2 flex items-center gap-1 ${metrics.pendingCount > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                            <span className="material-symbols-outlined text-[14px]">{metrics.pendingCount > 0 ? 'priority_high' : 'check_circle'}</span>
                            {metrics.pendingCount > 0 ? t('hr.requiresAction', { count: metrics.pendingCount }) : t('hr.allClear')}
                        </p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl text-orange-600 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-[32px]">pending_actions</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:border-primary transition-all duration-300">
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('hr.onLeaveToday')}</p>
                        <h3 className="text-3xl font-bold mt-1">{String(metrics.onLeaveToday).padStart(2, '0')}</h3>
                        <p className="text-xs text-blue-500 font-semibold mt-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">flight_takeoff</span>
                            {t('hr.outOfOffice')}
                        </p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-[32px]">groups</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:border-primary transition-all duration-300">
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('hr.balanceUsed')}</p>
                        <h3 className="text-3xl font-bold mt-1">{metrics.balanceUsedPercent}%</h3>
                        <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                            <div className="bg-purple-500 h-full transition-all duration-700" style={{ width: `${metrics.balanceUsedPercent}%` }}></div>
                        </div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl text-purple-600 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-[32px]">pie_chart</span>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Approvals Queue */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <h2 className="text-lg font-bold">{t('hr.approvalsQueue')}</h2>
                        <button
                            onClick={() => navigate('/hr/approvals')}
                            className="text-sm font-semibold text-primary dark:text-blue-400 hover:underline"
                        >
                            {t('hr.viewAll')}
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500 font-bold font-sans">
                                <tr>
                                    <th className="px-6 py-4">{t('hr.employee')}</th>
                                    <th className="px-6 py-4">{t('hr.leaveType')}</th>
                                    <th className="px-6 py-4">{t('hr.dates')}</th>
                                    <th className="px-6 py-4 text-right">{t('hr.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400">{t('hr.loading')}</td>
                                    </tr>
                                ) : requests.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400">{t('hr.noPendingRequests')}</td>
                                    </tr>
                                ) : (
                                    requests.map((req) => (
                                        <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-10 rounded-full bg-cover bg-center bg-slate-100"
                                                        style={{ backgroundImage: `url("${req.user_profiles?.avatar_url || 'https://i.pravatar.cc/150?u=' + req.user_id}")` }}>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold">{req.user_profiles?.full_name || 'Unknown'}</p>
                                                        <p className="text-[11px] text-slate-500">{req.user_profiles?.department || 'Staff'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getTypeColor(req.type)}`}>
                                                    {req.type?.toLowerCase() === 'other' && req.reason
                                                        ? req.reason
                                                        : t(`request.${req.type?.toLowerCase()}`)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-sans">
                                                    <p className="font-medium">{formatDateShort(req.start_date)} - {formatDateShort(req.end_date)}</p>
                                                    <p className="text-[11px] text-slate-500">{req.days} business days</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleAction(req.id, 'rejected')}
                                                        disabled={processingId === req.id}
                                                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {t('hr.reject')}
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(req.id, 'approved')}
                                                        disabled={processingId === req.id}
                                                        className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90 transition-all shadow-md shadow-primary/10 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                                    >
                                                        {processingId === req.id ? (
                                                            <>
                                                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                                <span>...</span>
                                                            </>
                                                        ) : (
                                                            t('hr.approve')
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column: Insights */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                        <h2 className="text-lg font-bold mb-6">{t('hr.quickInsights')}</h2>
                        <div className="space-y-6">
                            {/* Upcoming Absences */}
                            <div>
                                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">{t('hr.upcomingAbsences')}</h4>
                                <div className="space-y-4">
                                    {upcomingAbsences.length === 0 ? (
                                        <p className="text-xs text-slate-400">{t('hr.noUpcomingAbsences')}</p>
                                    ) : (
                                        upcomingAbsences.map((abs, idx) => (
                                            <div key={idx} className="flex items-center gap-4 group">
                                                <div className="size-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700">
                                                    <span className="text-[10px] font-bold text-primary uppercase">
                                                        {new Date(abs.start_date).toLocaleDateString(i18n.language, { month: 'short' })}
                                                    </span>
                                                    <span className="text-sm font-bold">
                                                        {new Date(abs.start_date).getDate()}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{abs.user_profiles?.full_name}</p>
                                                    <p className="text-xs text-slate-500">{t('hr.businessDays', { count: abs.days })} • {t(`request.${abs.type?.toLowerCase()}`)}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="h-[1px] bg-slate-100 dark:bg-slate-800"></div>

                            {/* Recent Activity */}
                            <div>
                                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">{t('hr.recentActivity')}</h4>
                                <div className="space-y-4">
                                    {notifications.slice(0, 3).map((notif) => (
                                        <div key={notif.id} className="flex gap-3">
                                            <div className={`size-2 rounded-full mt-1.5 shrink-0 ${notif.kind === 'request_created' ? 'bg-blue-500' :
                                                notif.kind === 'request_approved' ? 'bg-green-500' : 'bg-red-500'
                                                }`}></div>
                                            <div>
                                                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                                                    <span className="font-bold text-slate-900 dark:text-slate-200">
                                                        {['request_created', 'request_approved', 'request_rejected'].includes(notif.kind)
                                                            ? t(`notifications.${notif.kind}.title`)
                                                            : notif.title}
                                                    </span>
                                                    <br />
                                                    {(() => {
                                                        if (notif.kind === 'request_created') {
                                                            // Try to extract name from English body "Name submitted a leave request."
                                                            const match = notif.body.match(/^(.*?) submitted a leave/);
                                                            const name = match ? match[1] : 'An employee';
                                                            return t('notifications.request_created.body', { name });
                                                        }
                                                        if (['request_approved', 'request_rejected'].includes(notif.kind)) {
                                                            return t(`notifications.${notif.kind}.body`);
                                                        }
                                                        return notif.body;
                                                    })()}
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{getRelativeTime(notif.created_at)}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {notifications.length === 0 && (
                                        <p className="text-xs text-slate-400">{t('hr.noRecentActivity')}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Team Calendar Card */}
                    <div className="bg-primary p-6 rounded-2xl text-white shadow-lg shadow-primary/20 group cursor-pointer hover:bg-primary/95 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold">{t('hr.teamCalendarCard')}</h3>
                            <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">calendar_today</span>
                        </div>
                        <p className="text-sm text-white/70 mb-4 leading-relaxed">
                            {t('hr.teamCalendarDesc')}
                        </p>
                        <button
                            onClick={() => navigate('/hr/calendar')}
                            className="w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-colors border border-white/10"
                        >
                            {t('hr.openFullCalendar')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HRDashboard;
