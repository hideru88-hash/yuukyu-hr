import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LeaveRequestWithProfile {
    id: string;
    user_id: string;
    type: string;
    start_date: string;
    end_date: string;
    days: number;
    reason: string;
    status: string;
    created_at: string;
    // Joined profile data
    profiles: {
        full_name: string;
        avatar_url: string;
        department: string;
    };
}

const HRDashboard: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [requests, setRequests] = useState<LeaveRequestWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        pending: 0,
        onLeave: 0,
        balanceUsed: 65 // Hardcoded for now based on design, or calculate later
    });

    useEffect(() => {
        if (!user) return;
        fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch pending requests with profiles
            const { data, error } = await supabase
                .from('leave_requests')
                .select(`
                    *,
                    profiles (full_name, avatar_url, department)
                `)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRequests(data as any || []);

            // 2. Fetch stats (On Leave Today)
            const today = new Date().toISOString().split('T')[0];
            const { count: onLeaveCount, error: countError } = await supabase
                .from('leave_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'approved')
                .lte('start_date', today)
                .gte('end_date', today);

            if (!countError) {
                setStats(s => ({ ...s, pending: data?.length || 0, onLeave: onLeaveCount || 0 }));
            }

        } catch (error) {
            console.error('Error fetching HR data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, action: 'approved' | 'rejected') => {
        try {
            const { error } = await supabase
                .from('leave_requests')
                .update({ status: action })
                .eq('id', id);

            if (error) throw error;

            // Remove from list
            setRequests(prev => prev.filter(req => req.id !== id));
            setStats(s => ({ ...s, pending: s.pending - 1 }));
            alert(action === 'approved' ? t('hr.approvedSuccess') : t('hr.rejectedSuccess'));
        } catch (error: any) {
            console.error('Error updating status:', error);
            alert('Error: ' + error.message);
        }
    };

    const formatDateRange = (start: string, end: string) => {
        const s = new Date(start);
        const e = new Date(end);
        // Format: Oct 12 - Oct 20
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        const sStr = s.toLocaleDateString(i18n.language, options);
        const eStr = e.toLocaleDateString(i18n.language, options);

        if (start.split('T')[0] === end.split('T')[0]) {
            return `${sStr}`; // Same day
        }
        return `${sStr} - ${eStr}`;
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header / Stats Section */}
            <div className="bg-white p-5 pb-0">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-cover bg-center border border-gray-200" style={{ backgroundImage: 'url(https://i.pravatar.cc/150?u=hr)' }}></div>
                        <div>
                            <h1 className="text-lg font-bold text-[#131616]">{t('hr.panel')}</h1>
                            <p className="text-xs text-gray-400">Yuukyu Inc.</p>
                        </div>
                    </div>
                    <button className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 relative">
                        <span className="material-symbols-outlined">notifications</span>
                        <div className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-red-400 border border-white"></div>
                    </button>
                </div>

                <div className="relative mb-6">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">search</span>
                    <input
                        type="text"
                        placeholder={t('hr.searchPlaceholder')}
                        className="w-full h-12 rounded-xl border border-gray-200 pl-10 pr-4 bg-white text-sm focus:outline-none focus:border-primary/50"
                    />
                </div>

                {/* Dark Blue Card */}
                <div className="relative overflow-hidden rounded-2xl bg-[#1A365D] p-5 text-white shadow-lg shadow-blue-900/20 mb-6">
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-200 mb-1">{t('hr.pendingApprovals')}</p>
                            <h2 className="text-4xl font-bold">{stats.pending}</h2>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                            <span className="material-symbols-outlined text-white">pending_actions</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
                            <span className="material-symbols-outlined">flight_takeoff</span>
                        </div>
                        <h3 className="text-2xl font-bold text-[#131616] mb-0.5">{stats.onLeave}</h3>
                        <p className="text-xs text-gray-400">{t('hr.onLeaveToday')}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="h-10 w-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mb-3">
                            <span className="material-symbols-outlined">pie_chart</span>
                        </div>
                        <h3 className="text-2xl font-bold text-[#131616] mb-0.5">{stats.balanceUsed}%</h3>
                        <p className="text-xs text-gray-400">{t('hr.balanceUsed')}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-[#131616]">{t('hr.priorityApprovals')}</h2>
                    <button className="text-sm font-bold text-primary">{t('dashboard.seeAll')}</button>
                </div>
            </div>

            {/* List */}
            <div className="px-5 flex flex-col gap-4">
                {loading ? (
                    <div className="text-center py-10 text-gray-400">{t('dashboard.loading')}</div>
                ) : requests.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                        No pending requests
                    </div>
                ) : (
                    requests.map((req) => (
                        <div key={req.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    {req.profiles.avatar_url ? (
                                        <div className="h-12 w-12 rounded-full bg-cover bg-center border border-gray-100" style={{ backgroundImage: `url(${req.profiles.avatar_url})` }}></div>
                                    ) : (
                                        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-lg">
                                            {req.profiles.full_name?.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-bold text-[#131616]">{req.profiles.full_name || 'Unknown User'}</h3>
                                        <p className="text-xs text-gray-400">{t(`request.${req.type.toLowerCase()}`)}</p>
                                    </div>
                                </div>
                                <span className="bg-orange-50 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase">High Priority</span>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 mb-4">
                                <span className="material-symbols-outlined text-gray-400">calendar_today</span>
                                <div className="text-sm font-medium text-gray-600">
                                    {formatDateRange(req.start_date, req.end_date)}
                                    <span className="mx-2">•</span>
                                    {req.days} {t('common.days')}
                                </div>
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
