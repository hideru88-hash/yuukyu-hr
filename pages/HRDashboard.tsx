import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../src/hooks/useProfile';
import { useNotifications } from '../src/hooks/useNotifications';
import {
    getHrMetrics,
    getPriorityApprovals,
    searchEmployees,
    approveLeaveRequest,
    rejectLeaveRequest,
    PendingRequest,
    HrMetrics,
    EmployeeSearchResult
} from '../src/services/hrService';

const HRDashboard: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { profile } = useProfile();
    const { unreadCount } = useNotifications();

    const [requests, setRequests] = useState<PendingRequest[]>([]);
    const [metrics, setMetrics] = useState<HrMetrics>({ pendingCount: 0, onLeaveToday: 0, balanceUsedPercent: 0 });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<EmployeeSearchResult[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [metricsData, requestsData] = await Promise.all([
                getHrMetrics(),
                getPriorityApprovals(10)
            ]);
            setMetrics(metricsData);
            setRequests(requestsData);
        } catch (error) {
            console.error('Error fetching HR data:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Debounced search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const { data } = await searchEmployees(searchQuery);
                setSearchResults(data);
                setShowSearchResults(true);
            } catch (error) {
                console.error('Error searching employees:', error);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleAction = async (id: string, action: 'approved' | 'rejected') => {
        try {
            if (action === 'approved') {
                await approveLeaveRequest(id);
            } else {
                const reason = window.prompt(t('hr.rejectReasonPrompt') || 'Reason for rejection (optional):');
                await rejectLeaveRequest(id, reason || undefined);
            }

            // Remove from list and update metrics
            setRequests(prev => prev.filter(req => req.id !== id));
            setMetrics(prev => ({ ...prev, pendingCount: Math.max(0, prev.pendingCount - 1) }));
            alert(action === 'approved' ? t('hr.approvedSuccess') : t('hr.rejectedSuccess'));
        } catch (error: any) {
            console.error('Error updating status:', error);
            alert('Error: ' + error.message);
        }
    };

    const formatDateRange = (start: string, end: string) => {
        const s = new Date(start);
        const e = new Date(end);
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        const sStr = s.toLocaleDateString(i18n.language, options);
        const eStr = e.toLocaleDateString(i18n.language, options);

        if (start.split('T')[0] === end.split('T')[0]) {
            return sStr;
        }
        return `${sStr} - ${eStr}`;
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header / Stats Section */}
            <div className="bg-white p-5 pb-0">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div
                            className="h-10 w-10 rounded-full bg-cover bg-center border border-gray-200"
                            style={{ backgroundImage: profile?.avatar_url ? `url(${profile.avatar_url})` : 'url(https://i.pravatar.cc/150?u=hr)' }}
                        ></div>
                        <div>
                            <h1 className="text-lg font-bold text-[#131616]">{t('hr.panel')}</h1>
                            <p className="text-xs text-gray-400">Yuukyu Inc.</p>
                        </div>
                    </div>
                    <button className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 relative">
                        <span className="material-symbols-outlined">notifications</span>
                        {unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 border-2 border-white flex items-center justify-center">
                                <span className="text-white text-[10px] font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>
                            </div>
                        )}
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">search</span>
                    <input
                        type="text"
                        placeholder={t('hr.searchPlaceholder')}
                        className="w-full h-12 rounded-xl border border-gray-200 pl-10 pr-4 bg-white text-sm focus:outline-none focus:border-primary/50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => searchQuery && setShowSearchResults(true)}
                        onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                    />
                    {/* Search Results Dropdown */}
                    {showSearchResults && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-lg z-20 max-h-64 overflow-y-auto">
                            {searchResults.map((emp) => (
                                <div key={emp.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                                    <div
                                        className="h-8 w-8 rounded-full bg-gray-100 bg-cover bg-center"
                                        style={{ backgroundImage: emp.avatar_url ? `url(${emp.avatar_url})` : 'none' }}
                                    >
                                        {!emp.avatar_url && (
                                            <div className="h-full w-full flex items-center justify-center text-gray-500 font-bold text-sm">
                                                {emp.full_name?.charAt(0) || '?'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-[#131616]">{emp.full_name}</p>
                                        <p className="text-xs text-gray-400">{emp.department || 'No department'}</p>
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 uppercase">{emp.role}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Dark Blue Card - Pending Approvals */}
                <div className="relative overflow-hidden rounded-2xl bg-[#1A365D] p-5 text-white shadow-lg shadow-blue-900/20 mb-6">
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-200 mb-1">{t('hr.pendingApprovals')}</p>
                            <h2 className="text-4xl font-bold">{metrics.pendingCount}</h2>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                            <span className="material-symbols-outlined text-white">pending_actions</span>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
                            <span className="material-symbols-outlined">flight_takeoff</span>
                        </div>
                        <h3 className="text-2xl font-bold text-[#131616] mb-0.5">{metrics.onLeaveToday}</h3>
                        <p className="text-xs text-gray-400">{t('hr.onLeaveToday')}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="h-10 w-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mb-3">
                            <span className="material-symbols-outlined">pie_chart</span>
                        </div>
                        <h3 className="text-2xl font-bold text-[#131616] mb-0.5">{metrics.balanceUsedPercent}%</h3>
                        <p className="text-xs text-gray-400">{t('hr.balanceUsed')}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-[#131616]">{t('hr.priorityApprovals')}</h2>
                    <button
                        onClick={() => navigate('/hr/approvals')}
                        className="text-sm font-bold text-primary"
                    >
                        {t('dashboard.seeAll')}
                    </button>
                </div>
            </div>

            {/* Request List */}
            <div className="px-5 flex flex-col gap-4">
                {loading ? (
                    <div className="text-center py-10 text-gray-400">{t('dashboard.loading')}</div>
                ) : requests.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                        {t('hr.noPendingRequests') || 'No pending requests'}
                    </div>
                ) : (
                    requests.map((req) => (
                        <div key={req.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    {req.profiles?.avatar_url ? (
                                        <div className="h-12 w-12 rounded-full bg-cover bg-center border border-gray-100" style={{ backgroundImage: `url(${req.profiles.avatar_url})` }}></div>
                                    ) : (
                                        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-lg">
                                            {req.profiles?.full_name?.charAt(0) || '?'}
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-bold text-[#131616]">{req.profiles?.full_name || 'Unknown User'}</h3>
                                        <p className="text-xs text-gray-400">{t(`request.${req.type?.toLowerCase() || 'vacation'}`)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {req.priority === 'high' && (
                                        <span className="bg-orange-50 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                                            {t('hr.highPriority') || 'High Priority'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 mb-4">
                                <span className="material-symbols-outlined text-gray-400">calendar_today</span>
                                <div className="text-sm font-medium text-gray-600 flex-1">
                                    {formatDateRange(req.start_date, req.end_date)}
                                    <span className="mx-2">•</span>
                                    {req.days} {t('common.days')}
                                </div>
                                {/* Attachment indicator */}
                                {req.attachments_count && req.attachments_count > 0 && (
                                    <div className="flex items-center gap-1 text-green-600">
                                        <span className="material-symbols-outlined text-[16px]">attach_file</span>
                                        <span className="text-xs font-bold">{t('hr.medicalCertAttached') || 'Medical Cert.'}</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleAction(req.id, 'rejected')}
                                    className="h-10 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    {t('hr.reject')}
                                </button>
                                <button
                                    onClick={() => handleAction(req.id, 'approved')}
                                    className="h-10 rounded-xl bg-[#1A365D] text-sm font-bold text-white hover:bg-blue-900 transition-colors flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">check</span>
                                    {t('hr.approve')}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default HRDashboard;
