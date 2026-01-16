import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const RequestLeave: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [selectedType, setSelectedType] = useState('Vacation');
    const [loading, setLoading] = useState(false);
    const [isHourly, setIsHourly] = useState(false);
    const [formData, setFormData] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '17:00',
        reason: '',
    });

    const [balance, setBalance] = useState<number>(0);
    const [pendingDays, setPendingDays] = useState<number>(0);
    const [isBalanceLoading, setIsBalanceLoading] = useState(true);

    useEffect(() => {
        if (id && user) {
            fetchRequest();
        }
        if (user) {
            fetchBalance();
        }
    }, [id, user]);

    const fetchBalance = async () => {
        try {
            setIsBalanceLoading(true);
            // 1. Get total authorized balance (Grants - Apporoved Usage)
            const { data: balanceData } = await supabase
                .from('yukyu_balance_total')
                .select('total_days')
                .eq('user_id', user!.id)
                .single();

            const total = Number(balanceData?.total_days ?? 0);
            setBalance(total);

            // 2. Get pending usage (Pending Requests that haven't deducted from balance yet)
            // Note: If we are editing an existing pending request, we shouldn't count it double against itself
            let query = supabase
                .from('leave_requests')
                .select('days')
                .eq('user_id', user!.id)
                .eq('status', 'pending');

            if (id) {
                query = query.neq('id', id);
            }

            const { data: pendingData } = await query;
            const pending = pendingData?.reduce((acc, curr) => acc + Number(curr.days), 0) ?? 0;
            setPendingDays(pending);

        } catch (error) {
            console.error('Error fetching balance:', error);
        } finally {
            setIsBalanceLoading(false);
        }
    };

    const fetchRequest = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('leave_requests')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (data) {
                if (data.user_id !== user!.id) {
                    navigate('/dashboard');
                    return;
                }

                const start = new Date(data.start_date);
                const end = new Date(data.end_date);

                // Check if days is decimal to infer hourly
                const isDecimal = data.days % 1 !== 0;
                // Also check if hours are non-zero (for legacy compatibility or if user selected specific hours)
                const hasTimeComponent = (start.getHours() !== 0 || start.getMinutes() !== 0) || (end.getHours() !== 0 || end.getMinutes() !== 0);

                // Helper to format date as YYYY-MM-DD in local time
                const toLocalISOString = (date: Date) => {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };

                if (isDecimal || hasTimeComponent) {
                    setIsHourly(true);
                    setFormData({
                        startDate: toLocalISOString(start),
                        endDate: toLocalISOString(start),
                        startTime: start.toTimeString().slice(0, 5),
                        endTime: end.toTimeString().slice(0, 5),
                        reason: data.reason || ''
                    });
                } else {
                    setIsHourly(false);
                    // For full days, we might want to be careful if end date is midnight of next day,
                    // but usually it's set as same day or different day.
                    setFormData({
                        startDate: toLocalISOString(start),
                        endDate: toLocalISOString(end),
                        startTime: '09:00',
                        endTime: '17:00',
                        reason: data.reason || ''
                    });
                }

                setSelectedType(data.type || 'Vacation');
            }
        } catch (error) {
            console.error('Error fetching request:', error);
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const calculateDuration = () => {
        if (isHourly) {
            const start = parseInt(formData.startTime.split(':')[0]) + parseInt(formData.startTime.split(':')[1]) / 60;
            const end = parseInt(formData.endTime.split(':')[0]) + parseInt(formData.endTime.split(':')[1]) / 60;
            const hours = Math.max(0, end - start);
            const days = hours / 8; // Assuming 8 hour work day
            return { days, hours };
        } else {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            return { days: diffDays, hours: diffDays * 8 };
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(t('request.deleteConfirmation'))) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('leave_requests')
                .delete()
                .eq('id', id);

            if (error) throw error;

            alert(t('request.deleteSuccess'));
            navigate('/dashboard');
        } catch (error: any) {
            console.error('Error deleting request:', error);
            alert(`${t('request.deleteError')}: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const duration = calculateDuration();

            // --- BALANCE VALIDATION ---
            if (selectedType === 'Vacation') {
                const effectiveBalance = balance - pendingDays;
                if (duration.days > effectiveBalance) {
                    alert(`${t('validation.insufficientBalance') || 'Saldo insuficiente.'} (Available: ${effectiveBalance.toFixed(1)} days)`);
                    setLoading(false);
                    return;
                }
            }

            // Construct full ISO strings for consistency in comparison
            const startDateFull = formData.startDate + (isHourly ? ` ${formData.startTime}` : '');
            const endDateFull = (isHourly ? formData.startDate : formData.endDate) + (isHourly ? ` ${formData.endTime}` : '');

            const checkOverlap = async () => {
                let query = supabase
                    .from('leave_requests')
                    .select('id')
                    .eq('user_id', user.id)
                    .neq('status', 'rejected') // Ignore rejected requests
                    .lte('start_date', endDateFull) // Existing start must be BEFORE or ON new end
                    .gte('end_date', startDateFull); // Existing end must be AFTER or ON new start

                if (id) {
                    query = query.neq('id', id); // Exclude current request if editing
                }

                const { data: overlaps, error } = await query;
                if (error) throw error;
                return overlaps && overlaps.length > 0;
            };

            const hasOverlap = await checkOverlap();
            if (hasOverlap) {
                alert(t('request.overlapError') || "You already have a leave request for this period.");
                setLoading(false);
                return;
            }

            const payload = {
                user_id: user.id,
                type: selectedType,
                start_date: startDateFull,
                end_date: endDateFull,
                days: duration.days,
                hours: 0, // Using days-based consumption for now
                reason: formData.reason,
                status: 'pending'
            };

            let error;

            if (id) {
                const { error: updateError } = await supabase
                    .from('leave_requests')
                    .update(payload)
                    .eq('id', id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('leave_requests')
                    .insert(payload);
                error = insertError;
            }

            if (error) throw error;

            if (id) {
                alert(t('request.updateSuccess'));
            }
            navigate('/dashboard');
        } catch (error: any) {
            console.error('Error submitting request:', error);
            alert(`${t('request.submitError')}: ${error.message || error.details || JSON.stringify(error)}`);
        } finally {
            setLoading(false);
        }
    };

    const duration = calculateDuration();

    return (
        <div className="flex flex-col h-full bg-background-light">
            {/* Header */}
            <header className="flex items-center justify-between px-6 pt-12 pb-4 bg-background-light sticky top-0 z-10 backdrop-blur-md bg-opacity-90">
                <button
                    onClick={() => navigate(-1)}
                    className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/5 transition-colors"
                >
                    <span className="material-symbols-outlined text-[#131616]" style={{ fontSize: '24px' }}>arrow_back_ios_new</span>
                </button>
                <h1 className="text-[#131616] text-lg font-bold tracking-tight">{id ? t('request.editRequest') : t('request.title')}</h1>
                <div className="h-10 w-10"></div>
            </header>

            <div className="flex-1 px-6 pb-8">
                {/* Balance Card */}
                <div className="mb-8 relative overflow-hidden rounded-3xl bg-primary text-white shadow-soft group">
                    <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl transition-all duration-700 group-hover:bg-white/20"></div>
                    <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-black/10 blur-xl"></div>
                    <div className="relative z-10 p-6 flex flex-col items-center justify-center gap-1">
                        <span className="text-white/80 text-sm font-medium tracking-wide uppercase">{t('request.availableBalance')}</span>
                        <div className="flex items-baseline gap-1">
                            {isBalanceLoading ? (
                                <span className="text-2xl font-bold opacity-50">...</span>
                            ) : (
                                <span className="text-5xl font-extrabold tracking-tight">{balance}</span>
                            )}
                            <span className="text-xl font-medium text-white/90">{t('common.days')}</span>
                        </div>
                        {pendingDays > 0 && (
                            <div className="mt-2 text-white/70 text-xs font-bold bg-white/10 px-2 py-1 rounded-lg">
                                -{pendingDays} {t('status.pending')}
                            </div>
                        )}
                        <div className="mt-4 flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                            <span className="material-symbols-outlined text-[14px]">history</span>
                            {t('request.validUntil', { date: 'Dec 2024' })}
                        </div>
                    </div>
                </div>

                {/* Form Section */}
                <div className="flex flex-col gap-8">
                    {/* Leave Type */}
                    <div className="space-y-3">
                        <h2 className="text-[#131616] text-sm font-bold uppercase tracking-wider opacity-70 px-1">{t('request.absenceType')}</h2>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'Vacation', label: t('request.vacation'), icon: 'wb_sunny' },
                                { id: 'Sick', label: t('request.sick'), icon: 'contrast' },
                                { id: 'Personal', label: t('request.personal'), icon: 'schedule' },
                                { id: 'Other', label: t('request.other'), icon: 'more_horiz' }
                            ].map((type) => (
                                <label key={type.id} className="cursor-pointer group relative">
                                    <input
                                        type="radio"
                                        name="leave_type"
                                        value={type.id}
                                        className="peer sr-only"
                                        checked={selectedType === type.id}
                                        onChange={() => setSelectedType(type.id)}
                                    />
                                    <div className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-3 transition-all duration-300 ${selectedType === type.id ? 'border-primary bg-primary/5 shadow-inner-soft' : 'border-gray-200 bg-white hover:border-primary/50'}`}>
                                        <span className={`material-symbols-outlined transition-colors ${selectedType === type.id ? 'text-primary' : 'text-gray-400'}`}>{type.icon}</span>
                                        <span className={`text-xs font-bold transition-colors ${selectedType === type.id ? 'text-primary' : 'text-gray-500'}`}>{type.label}</span>
                                    </div>
                                    {selectedType === type.id && (
                                        <div className="absolute -right-1 -top-1 h-4 w-4 flex items-center justify-center rounded-full bg-primary text-white shadow-sm">
                                            <span className="material-symbols-outlined text-[10px]">check</span>
                                        </div>
                                    )}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Duration Type Toggle */}
                    <div className="space-y-3">
                        <h2 className="text-[#131616] text-sm font-bold uppercase tracking-wider opacity-70 px-1">{t('request.durationType')}</h2>
                        <div className="bg-gray-100 p-1 rounded-xl flex relative">
                            <div
                                className={`absolute inset-y-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ${isHourly ? 'translate-x-[calc(100%+4px)]' : 'translate-x-1'}`}
                            ></div>
                            <button
                                onClick={() => setIsHourly(false)}
                                className={`flex-1 relative z-10 py-2 text-sm font-bold transition-colors ${!isHourly ? 'text-[#131616]' : 'text-gray-500'}`}
                            >
                                {t('request.fullDay')}
                            </button>
                            <button
                                onClick={() => setIsHourly(true)}
                                className={`flex-1 relative z-10 py-2 text-sm font-bold transition-colors ${isHourly ? 'text-[#131616]' : 'text-gray-500'}`}
                            >
                                {t('request.hourly')}
                            </button>
                        </div>
                    </div>

                    {/* Date/Time Pickers */}
                    <div className="space-y-3">
                        <h2 className="text-[#131616] text-sm font-bold uppercase tracking-wider opacity-70 px-1">{t('request.period')}</h2>
                        <div className="relative flex flex-col rounded-3xl bg-white p-1 shadow-sm border border-gray-100">
                            {/* Start Input */}
                            <div className="relative z-10 flex items-center gap-4 p-3 rounded-2xl transition-colors group">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                                    <span className="material-symbols-outlined text-[20px]">flight_takeoff</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-medium text-gray-500">{t('request.start')}</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            className="text-base font-bold text-gray-900 w-full outline-none"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        />
                                        {isHourly && (
                                            <input
                                                type="time"
                                                className="text-base font-bold text-gray-900 w-32 outline-none border-l pl-2 border-gray-200"
                                                value={formData.startTime}
                                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mx-14 h-px bg-gray-100"></div>

                            {/* End Input */}
                            <div className="relative z-10 flex items-center gap-4 p-3 rounded-2xl transition-colors group">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                                    <span className="material-symbols-outlined text-[20px]">flight_land</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-medium text-gray-500">{t('request.end')}</p>
                                    <div className="flex gap-2">
                                        {!isHourly ? (
                                            <input
                                                type="date"
                                                className="text-base font-bold text-gray-900 w-full outline-none"
                                                value={formData.endDate}
                                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            />
                                        ) : (
                                            <input
                                                type="time"
                                                className="text-base font-bold text-gray-900 w-full outline-none"
                                                value={formData.endTime}
                                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {isHourly && (
                            <p className="text-center text-sm font-medium text-primary">
                                {t('request.totalHours', { hours: duration.hours.toFixed(1), days: duration.days.toFixed(2) })}
                            </p>
                        )}
                    </div>

                    {/* Reason */}
                    <div className="space-y-3">
                        <h2 className="text-[#131616] text-sm font-bold uppercase tracking-wider opacity-70 px-1">{t('request.reason')}</h2>
                        <div className="relative">
                            <textarea
                                className="w-full resize-none rounded-2xl border-0 bg-white p-4 text-base text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:leading-6 transition-shadow"
                                placeholder={t('request.notePlaceholder')}
                                rows={3}
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            ></textarea>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-primary px-6 py-4 transition-all duration-300 hover:bg-primary-dark hover:shadow-lg active:scale-[0.98] disabled:opacity-70"
                        >
                            {loading ? (
                                <span className="text-white">{t('request.sending')}</span>
                            ) : (
                                <>
                                    <span className="relative z-10 text-lg font-bold text-white">{id ? t('request.updateRequest') : t('request.sendRequest')}</span>
                                    <span className="relative z-10 material-symbols-outlined text-white transition-transform group-hover:translate-x-1">send</span>
                                </>
                            )}
                        </button>

                        {id && (
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-4 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-colors disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined">delete</span>
                                {t('request.deleteRequest')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RequestLeave;