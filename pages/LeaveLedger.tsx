import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface LeaveLedgerEntry {
    id: string;
    type: string;
    start_date: string;
    end_date: string;
    days: number;
    status: string;
    created_at: string;
    used_date: string; // Effectively the start date for sorting
    remaining_balance: number; // Calculated field
}

interface Grant {
    id: string;
    days_granted: number;
    grant_date: string;
    expires_on: string;
    valid_from: string;
    valid_until: string;
    is_active: boolean;
}

interface LeaveLedgerProps {
    userId?: string;
}

const LeaveLedger: React.FC<LeaveLedgerProps> = ({ userId: propUserId }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { userId: paramUserId } = useParams<{ userId: string }>();
    const { user } = useAuth();

    // Determine target User ID: Prop -> Param -> Current Auth User
    const userId = propUserId || paramUserId || user?.id;

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [ledger, setLedger] = useState<LeaveLedgerEntry[]>([]);
    const [grants, setGrants] = useState<Grant[]>([]);

    // Summary Stats
    const [totalGranted, setTotalGranted] = useState(0);
    const [totalUsed, setTotalUsed] = useState(0);
    const [currentBalance, setCurrentBalance] = useState(0);
    const [carriedOver, setCarriedOver] = useState(0);
    const [newGrant, setNewGrant] = useState(0);
    const [expiringDays, setExpiringDays] = useState(0);
    const [expiryDate, setExpiryDate] = useState<string | null>(null);

    useEffect(() => {
        if (userId) {
            fetchData();
        }
    }, [userId]);

    const fetchData = async () => {
        if (!userId) return;

        try {
            setLoading(true);

            // 1. Fetch Profile
            const { data: profileData, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) throw profileError;
            setProfile(profileData);

            // 2. Fetch Grants
            const { data: grantsData, error: grantsError } = await supabase
                .from('yukyu_grants')
                .select('*')
                .eq('user_id', userId)
                .order('grant_date', { ascending: true }); // Oldest first for FIFO

            if (grantsError) throw grantsError;

            const grantsList = grantsData || [];
            const grantedSum = grantsList.reduce((acc, curr) => acc + Number(curr.days_granted), 0);
            setTotalGranted(grantedSum);

            // 3. Fetch Approved Requests (Usage)
            const { data: requestsData, error: requestsError } = await supabase
                .from('leave_requests')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'approved')
                .order('start_date', { ascending: true });

            if (requestsError) throw requestsError;
            const requests = requestsData || [];

            // --- FIFO Calculation for Current Balance Components ---
            // We simulate usage against grants to see what's left in each grant bucket.
            let tempGrants = grantsList.map(g => ({ ...g, remaining: Number(g.days_granted) }));
            let totalUsedCount = 0;
            let usedThisYear = 0;
            const currentYear = new Date().getFullYear();

            requests.forEach(req => {
                let reqDays = Number(req.days);
                totalUsedCount += reqDays;

                if (new Date(req.start_date).getFullYear() === currentYear) {
                    usedThisYear += reqDays;
                }

                // Deduct from grants FIFO
                for (let i = 0; i < tempGrants.length; i++) {
                    if (reqDays <= 0) break;

                    const grant = tempGrants[i];
                    if (grant.remaining > 0) {
                        const deduct = Math.min(grant.remaining, reqDays);
                        grant.remaining -= deduct;
                        reqDays -= deduct;
                    }
                }
            });

            // Calculate Components based on Remaining in Grants
            // "New Grant" = The MOST RECENT grant's remaining balance
            // "Carried Over" = Sum of remaining balance of ALL OTHER grants

            let newGrantBalance = 0;
            let carriedOverBalance = 0;
            let nextExpiryDays = 0;
            let nextExpiryDate = null;

            if (tempGrants.length > 0) {
                // Assume the last grant in the list is the "New Grant" (current cycle)
                const lastGrant = tempGrants[tempGrants.length - 1];
                newGrantBalance = lastGrant.remaining;

                // Sum all others
                for (let i = 0; i < tempGrants.length - 1; i++) {
                    carriedOverBalance += tempGrants[i].remaining;
                }

                // Find the first grant (oldest) that still has balance > 0 for expiry info
                const oldestActive = tempGrants.find(g => g.remaining > 0);
                if (oldestActive) {
                    nextExpiryDays = oldestActive.remaining;
                    nextExpiryDate = oldestActive.expires_on;
                }
            }

            setTotalUsed(usedThisYear);
            setNewGrant(newGrantBalance);
            setCarriedOver(carriedOverBalance);
            setExpiringDays(nextExpiryDays);
            setExpiryDate(nextExpiryDate);

            const realCurrentBalance = newGrantBalance + carriedOverBalance;
            setCurrentBalance(realCurrentBalance);

            // --- Ledger History Calculation ---
            // For the history table, we want to show the Running Balance *after* each transaction.
            // Running Balance = (Total Granted up to that date) - (Total Used up to that date)
            // This is a Simplistic Running Balance.

            let runningUsed = 0;
            let runningGranted = 0;
            let grantIndex = 0;

            // We need to merge Grants and Requests into a single chronological timeline for a true "Ledger"
            // But the UI requests a "Leave History" table which usually just lists Requests.

            const ledgerData = requests.map(req => {
                runningUsed += Number(req.days);

                // Find total granted up to this request's date
                while (grantIndex < grantsList.length && new Date(grantsList[grantIndex].grant_date) <= new Date(req.start_date)) {
                    runningGranted += Number(grantsList[grantIndex].days_granted);
                    grantIndex++;
                }

                // Ensure we include any grants that happened BEFORE this request 
                // Iterate accurately
                const grantsBeforeThis = grantsList.filter(g => new Date(g.grant_date) <= new Date(req.start_date));
                const grantedUpToNow = grantsBeforeThis.reduce((acc, g) => acc + Number(g.days_granted), 0);

                return {
                    id: req.id,
                    type: req.type,
                    start_date: req.start_date,
                    end_date: req.end_date,
                    days: Number(req.days),
                    status: req.status,
                    created_at: req.created_at,
                    used_date: req.start_date,
                    remaining_balance: grantedUpToNow - runningUsed
                };
            });

            setLedger(ledgerData.reverse());

        } catch (error) {
            console.error('Error fetching ledger data:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateServiceLength = (hireDate: string) => {
        if (!hireDate) return 'N/A';
        const start = new Date(hireDate);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const years = Math.floor(diffDays / 365);
        const months = Math.floor((diffDays % 365) / 30);

        return `${years}${t('common.yearsShort', 'y')} ${months}${t('common.monthsShort', 'm')}`;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <h1 className="text-xl font-bold text-gray-800">{t('ledger.title', 'Leave Ledger')}</h1>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
                        <span className="text-xs font-bold text-gray-500">FY 2026</span>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
                {/* Employee Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-primary p-6 text-white flex justify-between items-center">
                        <div>
                            <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">{t('ledger.employee', 'EMPLOYEE')}</p>
                            <h2 className="text-2xl font-bold">{profile?.full_name}</h2>
                        </div>
                        <div className="text-right">
                            <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">{t('ledger.code', 'CODE')}</p>
                            <p className="text-xl font-mono">{userId?.slice(0, 4) || '0000'}</p>
                        </div>
                    </div>
                    <div className="p-6 grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase mb-1">{t('ledger.department', 'Department')}</p>
                            <p className="font-semibold text-gray-800">{profile?.department || 'General'}</p>
                            <p className="text-xs text-gray-400 mt-0.5">Head Office</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase mb-1">{t('ledger.hireDate', 'Hire Date')}</p>
                            <p className="font-semibold text-gray-800">{profile?.hire_date || 'N/A'}</p>
                        </div>
                        <div className="border-t border-gray-100 pt-4 col-span-2 flex justify-between">
                            <div>
                                <p className="text-xs text-gray-400 font-bold uppercase mb-1">{t('ledger.serviceLength', 'Service Length')}</p>
                                <p className="text-blue-600 font-bold">{calculateServiceLength(profile?.hire_date)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Current Balance */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t('ledger.currentBalance', 'CURRENT BALANCE')}</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                            <p className="text-xs text-gray-500 mb-1">{t('ledger.carriedOver', 'Carried Over')}</p>
                            <p className="text-3xl font-bold text-gray-800">{carriedOver.toFixed(1)}</p>
                            <p className="text-xs text-gray-400">{t('common.days')}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border-b-4 border-green-500 shadow-sm text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
                            <p className="text-xs text-gray-500 mb-1">{t('ledger.newGrant', 'New Grant')}</p>
                            <p className="text-3xl font-bold text-green-600">{newGrant.toFixed(1)}</p>
                            <p className="text-xs text-green-600/60">{t('common.days')}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm text-center">
                            <p className="text-xs text-blue-500 mb-1 font-bold">{t('ledger.total', 'Total')}</p>
                            <p className="text-3xl font-bold text-blue-600">{Math.max(0, currentBalance).toFixed(1)}</p>
                            <p className="text-xs text-blue-400">{t('common.days')}</p>
                        </div>
                    </div>
                </div>

                {/* Legacy "Efficiency Insight" Replaced by "Balance Details" (Blue Card) */}
                <div className="bg-[#1e40af] rounded-2xl shadow-lg p-6 text-white relative overflow-hidden text-center">
                    <p className="text-blue-200 font-bold text-sm uppercase tracking-wider mb-2">{t('ledger.availableBalance', 'Available Balance')}</p>
                    <div className="flex items-baseline justify-center gap-2 mb-4">
                        <span className="text-6xl font-bold tracking-tight">{Math.max(0, currentBalance).toFixed(1)}</span>
                        <span className="text-xl text-blue-200 font-medium">{t('common.days')}</span>
                    </div>

                    {expiryDate && expiringDays > 0 && (
                        <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
                            <span className="font-bold text-white text-lg">{expiringDays.toFixed(1)} {t('common.days').toLowerCase()}</span>
                            <span className="text-blue-200 text-sm">
                                {t('ledger.validUntil', 'valid until')} {new Date(expiryDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </span>
                        </div>
                    )}
                </div>

                {/* Leave History */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky left-0">
                        <h3 className="font-bold text-gray-800">{t('ledger.leaveHistory', 'LEAVE HISTORY')}</h3>
                        <button className="text-blue-600 text-sm font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">filter_list</span>
                            {t('ledger.filter', 'Filter')}
                        </button>
                    </div>

                    <table className="w-full">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{t('ledger.colType', 'Type')}</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{t('ledger.colPeriod', 'Period')}</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{t('ledger.colUsed', 'Used')}</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-purple-600 uppercase tracking-wider whitespace-nowrap bg-purple-50/50">{t('ledger.colRemain', 'Remain')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {ledger.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400 text-sm">
                                        {t('ledger.noHistory', 'No leave history found for this period.')}
                                    </td>
                                </tr>
                            ) : (
                                ledger.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold
                                        ${entry.type.toLowerCase() === 'vacation' ? 'bg-red-100 text-red-700' :
                                                    entry.type.toLowerCase() === 'sick' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-700'}`}>
                                                {t(`request.${entry.type.toLowerCase()}`, entry.type)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600 font-bold font-mono">
                                            {new Date(entry.start_date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-800 font-bold font-mono text-right">
                                            {entry.days.toFixed(1)}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-purple-700 font-bold font-mono text-right bg-purple-50/50">
                                            {Math.max(0, entry.remaining_balance).toFixed(1)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot className="bg-gray-50">
                            <tr>
                                <td colSpan={2} className="px-4 py-4 text-sm font-bold text-gray-500 text-right">
                                    {t('ledger.thisYearUsed', 'This Year Used:')}
                                </td>
                                <td className="px-4 py-4 text-sm font-bold text-gray-900 text-right">
                                    {totalUsed.toFixed(1)} {t('common.days')}
                                </td>
                                <td className="px-4 py-4"></td>
                            </tr>
                            <tr>
                                <td colSpan={2} className="px-4 py-2 pb-4 text-sm font-bold text-gray-500 text-right text-blue-600">
                                    {t('ledger.finalBalance', 'Final Balance:')}
                                </td>
                                <td colSpan={2} className="px-4 py-2 pb-4 text-right">
                                    <span className="text-lg font-bold text-blue-600">
                                        {Math.max(0, currentBalance).toFixed(1)} {t('common.days')}
                                    </span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Efficiency Insight */}
                <div className="bg-blue-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
                    <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 rounded-l-full transform translate-x-12"></div>

                    <p className="text-blue-100 font-bold text-sm mb-2">{t('ledger.efficiencyInsight', 'Efficiency Insight')}</p>
                    <div className="flex items-end gap-2 mb-4">
                        <span className="text-5xl font-bold">
                            {totalGranted > 0 ? Math.round((totalUsed / totalGranted) * 100) : 0}%
                        </span>
                        <span className="text-blue-100 text-sm mb-2 opacity-80">{t('ledger.utilizationDesc', 'of granted leave utilized')}</span>
                    </div>

                    <div className="w-full bg-black/20 rounded-full h-2 mb-2">
                        <div
                            className="bg-white h-2 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min(100, totalGranted > 0 ? (totalUsed / totalGranted) * 100 : 0)}%` }}
                        ></div>
                    </div>
                </div>

            </main>

            {/* FAB */}
            <div className="fixed bottom-6 right-6">
                <button className="h-14 w-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95">
                    <span className="material-symbols-outlined text-2xl">add</span>
                </button>
            </div>

        </div>
    );
};

export default LeaveLedger;
