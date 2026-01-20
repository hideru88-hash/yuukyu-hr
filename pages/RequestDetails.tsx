import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const RequestDetails: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [request, setRequest] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id && user) {
            fetchRequest();
        }
    }, [id, user]);

    const fetchRequest = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('leave_requests')
                .select('*, user_profiles(full_name)')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (data.user_id !== user!.id) {
                // Security check
                navigate('/dashboard');
                return;
            }
            setRequest(data);
        } catch (error) {
            console.error('Error fetching request:', error);
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background-light">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (!request) return null;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-700';
            case 'rejected': return 'bg-red-100 text-red-700';
            default: return 'bg-yellow-100 text-yellow-700'; // pending
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved': return 'check_circle';
            case 'rejected': return 'cancel';
            default: return 'pending';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            {/* Header */}
            <header className="flex items-center justify-between px-6 pt-8 pb-4 bg-white shadow-sm z-10">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/5 transition-colors"
                >
                    <span className="material-symbols-outlined text-[#131616]" style={{ fontSize: '24px' }}>arrow_back</span>
                </button>
                <h1 className="text-[#131616] text-lg font-bold tracking-tight">{t('requestDetails.title', 'Request Details')} #{request.id.slice(0, 8)}</h1>
                <div className="h-10 w-10"></div>
            </header>

            <main className="flex-1 p-6 space-y-6 max-w-md mx-auto w-full">
                {/* Status Hero */}
                <div className="flex flex-col items-center justify-center py-8">
                    <div className={`h-24 w-24 rounded-full flex items-center justify-center mb-4 shadow-sm ${request.status === 'approved' ? 'bg-[#198754]' :
                            request.status === 'rejected' ? 'bg-red-500' :
                                'bg-yellow-100'
                        }`}>
                        <span className={`material-symbols-outlined text-5xl ${request.status === 'approved' || request.status === 'rejected' ? 'text-white' : 'text-yellow-700'
                            }`}>
                            {request.status === 'approved' ? 'check' :
                                request.status === 'rejected' ? 'close' :
                                    'pending'}
                        </span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 capitalize">
                        {String(t(`status.${request.status}`, request.status))}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        {request.status === 'approved' ? t('requestDetails.approvedMessage', 'Your leave is confirmed') :
                            request.status === 'rejected' ? t('requestDetails.rejectedMessage', 'Your request was rejected') :
                                t('requestDetails.pendingMessage', 'Waiting for approval')}
                    </p>
                </div>

                {/* Main Details Card */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 text-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                <span className="material-symbols-outlined">beach_access</span>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-bold">{t('request.absenceType')}</p>
                                <p className="font-bold text-gray-900 text-base">{String(t(`request.${request.type?.toLowerCase()}`, request.type))}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400 uppercase font-bold uppercase">{t('common.total')}</p>
                            <p className="font-bold text-blue-600 text-lg">{request.days} {t('common.days')}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100">
                        <div>
                            <p className="text-xs text-gray-400 mb-1">{t('request.start')}</p>
                            <div className="flex items-center gap-2 text-gray-900 font-semibold">
                                <span className="material-symbols-outlined text-gray-400 text-sm">calendar_today</span>
                                {formatDate(request.start_date)}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-1">{t('request.end')}</p>
                            <div className="flex items-center gap-2 text-gray-900 font-semibold">
                                <span className="material-symbols-outlined text-gray-400 text-sm">event</span>
                                {formatDate(request.end_date)}
                            </div>
                        </div>
                    </div>

                    {request.reason && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <p className="text-xs text-gray-400 mb-2">{t('request.reason')}</p>
                            <p className="text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-xl">
                                {request.reason}
                            </p>
                        </div>
                    )}

                    {/* Manager Note (Reject Reason) */}
                    {request.status === 'rejected' && request.note && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <p className="text-xs text-red-400 mb-2 font-bold">{t('request.rejectionReason')}</p>
                            <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex gap-3">
                                <span className="material-symbols-outlined text-red-500 mt-0.5" style={{ fontSize: '18px' }}>error</span>
                                <p className="text-red-800 leading-relaxed text-sm">
                                    {request.note}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Timeline */}
                <div className="py-2">
                    <h3 className="font-bold text-gray-900 mb-4">{t('requestDetails.timeline', 'Timeline')}</h3>
                    <div className="relative pl-4 space-y-8 border-l-2 border-gray-200 ml-3">
                        {/* Created At */}
                        <div className="relative">
                            <div className="absolute -left-[21px] bg-blue-500 h-3 w-3 rounded-full border-2 border-white ring-2 ring-blue-100"></div>
                            <p className="font-bold text-gray-900 text-sm">{t('requestDetails.requestSent', 'Request Sent')}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(request.created_at)}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                                    {t('common.by')} {t('common.you', 'You')}
                                </span>
                            </div>
                        </div>

                        {/* Status Change */}
                        {request.status !== 'pending' && (
                            <div className="relative">
                                <div className={`absolute -left-[27px] flex items-center justify-center h-6 w-6 rounded-full border-2 border-white ring-2 ${request.status === 'approved' ? 'bg-green-500 ring-green-100' : 'bg-red-500 ring-red-100'}`}>
                                    <span className="material-symbols-outlined text-white text-[14px] font-bold">
                                        {request.status === 'approved' ? 'check' : 'close'}
                                    </span>
                                </div>
                                <p className="font-bold text-gray-900 text-sm">
                                    {request.status === 'approved' ? t('requestDetails.approvedByManager', 'Approved by Manager') : t('requestDetails.rejectedByManager', 'Rejected by Manager')}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(request.updated_at)}</p>
                            </div>
                        )}

                        {/* Pending State */}
                        {request.status === 'pending' && (
                            <div className="relative">
                                <div className="absolute -left-[21px] bg-gray-300 h-3 w-3 rounded-full border-2 border-white"></div>
                                <p className="font-bold text-gray-400 text-sm italic">{t('requestDetails.waitingForAction', 'Waiting for review...')}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <button
                    disabled={true}
                    className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-600 font-bold py-3 rounded-2xl opacity-60 cursor-not-allowed"
                >
                    <span className="material-symbols-outlined">download</span>
                    {t('requestDetails.downloadPdf', 'Download Receipt (PDF)')}
                </button>

                <div className="text-center pt-4">
                    <button className="text-gray-400 text-xs hover:text-gray-600 hover:underline">
                        {t('requestDetails.reportError', 'Report an error or cancel')}
                    </button>
                </div>
            </main>
        </div>
    );
};

export default RequestDetails;
