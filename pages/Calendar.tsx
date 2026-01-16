import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const Calendar: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [leaves, setLeaves] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<any>({});
    const [loading, setLoading] = useState(true);

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    useEffect(() => {
        fetchData();
    }, [currentDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Get start and end of current month view (including padding)
            // For simplicity, let's fetch all approved leaves that overlap with this month
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

            // Fetch approved leaves
            const { data: leavesData, error: leavesError } = await supabase
                .from('leave_requests')
                .select('*')
                .eq('status', 'approved')
                .gte('end_date', startOfMonth.toISOString())
                .lte('start_date', endOfMonth.toISOString());

            if (leavesError) throw leavesError;

            if (leavesData) {
                setLeaves(leavesData);

                // Fetch profiles for these users
                const userIds = Array.from(new Set(leavesData.map(l => l.user_id)));
                if (userIds.length > 0) {
                    const { data: profilesData, error: profilesError } = await supabase
                        .from('user_profiles')
                        .select('id, full_name, avatar_url') // Assuming these fields exist
                        .in('id', userIds);

                    if (profilesError) throw profilesError;

                    if (profilesData) {
                        const profilesMap: any = {};
                        profilesData.forEach(p => {
                            profilesMap[p.id] = p;
                        });
                        setProfiles(profilesMap);
                    }
                }
            }

        } catch (error) {
            console.error('Error fetching calendar data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calendar generation logic
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday

        const days = [];
        // Empty slots
        for (let i = 0; i < firstDayOfWeek; i++) {
            days.push(null);
        }
        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    const days = getDaysInMonth(currentDate);

    // Generate localized weekdays
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(2023, 0, i + 1); // Jan 1 2023 was a Sunday
        return d.toLocaleDateString(i18n.language, { weekday: 'short' });
    });

    // Helper to check if a user is away on a specific date
    const getLeavesForDate = (date: Date) => {
        if (!date) return [];
        return leaves.filter(leave => {
            const start = new Date(leave.start_date);
            const end = new Date(leave.end_date);
            // Local date comparison to avoid timezone issues
            const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const localStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
            const localEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());

            return checkDate >= localStart && checkDate <= localEnd;
        });
    };

    const selectedLeaves = getLeavesForDate(selectedDate);

    return (
        <div className="pb-8 bg-background-light min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-background-light/95 backdrop-blur-md border-b border-black/5">
                <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/5 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[#131616]" style={{ fontSize: '24px' }}>arrow_back_ios_new</span>
                        </button>
                        <h1 className="text-xl font-bold tracking-tight text-[#131616]">{t('calendar.title')}</h1>
                    </div>
                </div>
            </header>

            {/* Calendar Grid */}
            <div className="px-4 py-6">
                <div className="bg-white rounded-2xl p-4 shadow-sm shadow-gray-200/50 border border-black/5">
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={prevMonth}
                            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chevron_left</span>
                        </button>
                        <h2 className="text-lg font-bold text-[#131616] capitalize">
                            {currentDate.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
                        </h2>
                        <button
                            onClick={nextMonth}
                            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chevron_right</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-y-2 mb-2">
                        {weekDays.map(d => (
                            <div key={d} className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider py-2">{d}</div>
                        ))}

                        {days.map((date, idx) => {
                            if (!date) return <div key={`empty-${idx}`} className="aspect-square"></div>;

                            const dayLeaves = getLeavesForDate(date);
                            const hasLeaves = dayLeaves.length > 0;

                            // Check if this date corresponds to the currently selected date
                            const isSelected = selectedDate.toDateString() === date.toDateString();
                            const isToday = new Date().toDateString() === date.toDateString();

                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedDate(date)}
                                    className={`aspect-square relative flex flex-col items-center justify-start pt-2 rounded-xl transition-all 
                                        ${isSelected ? 'bg-primary text-white shadow-md scale-105 z-10' :
                                            isToday ? 'bg-primary/5 border border-primary/20' : 'hover:bg-gray-50'}`}
                                >
                                    <span className={`text-sm font-medium ${isSelected ? 'text-white' : isToday ? 'text-primary font-bold' : 'text-[#131616]'}`}>
                                        {date.getDate()}
                                    </span>
                                    {hasLeaves && (
                                        <div className="mt-1 flex gap-0.5 justify-center flex-wrap px-1">
                                            {dayLeaves.slice(0, 3).map((leave, i) => {
                                                const baseColor = leave.type === 'Vacation' ? 'bg-primary' : leave.type === 'Sick' ? 'bg-orange-400' : 'bg-purple-400';
                                                // If selected, we need to make dots visible against primary bg (white usually)
                                                // But usually standard colors are fine or white. Let's use white if selected for contrast?
                                                // Actually primary on primary is bad. 
                                                // If selected (bg-primary), dots should be white or distinct.
                                                const dotColor = isSelected ? 'bg-white' : baseColor;

                                                return <div key={i} className={`h-1.5 w-1.5 rounded-full ${dotColor}`} title={profiles[leave.user_id]?.full_name}></div>
                                            })}
                                            {dayLeaves.length > 3 && <div className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white/50' : 'bg-gray-300'}`}></div>}
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    <div className="flex items-center justify-center gap-4 mt-2 border-t border-gray-100 pt-3">
                        <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wide">{t('request.vacation')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-orange-400"></div>
                            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wide">{t('request.sick')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-purple-400"></div>
                            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wide">{t('request.personal')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Daily Breakdown */}
            <div className="px-5">
                <div className="flex items-center justify-between pb-4">
                    <h3 className="text-[#131616] text-lg font-bold leading-tight tracking-tight">
                        {t('calendar.whoIsAway')} ({selectedLeaves.length})
                    </h3>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {selectedDate.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
                    </span>
                </div>

                <div className="flex flex-col gap-3">
                    {loading ? (
                        <div className="text-center py-4 text-gray-400">{t('dashboard.loading')}</div>
                    ) : selectedLeaves.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                            {t('calendar.noAbsences')}
                        </div>
                    ) : (
                        selectedLeaves.map((leave, idx) => {
                            const profile = profiles[leave.user_id] || { full_name: 'Unknown' };
                            // If user is selected ("Others" type might be missing color in original code?)
                            // Original code had vacation/sick/personal mapped.
                            // Let's add 'Other' mapping if needed, or fallback.
                            // Leave types are 'Vacation', 'Sick', 'Personal', 'Other'.

                            const isVacation = leave.type === 'Vacation';
                            const isSick = leave.type === 'Sick';

                            let color = 'purple-400';
                            let icon = 'person';
                            let bgColor = 'bg-purple-400';

                            if (isVacation) {
                                color = 'primary';
                                icon = 'flight';
                                bgColor = 'bg-primary';
                            } else if (isSick) {
                                color = 'orange-400';
                                icon = 'medication';
                                bgColor = 'bg-orange-400';
                            }
                            // Personal/Other default to purple

                            return (
                                <div key={idx} className="group relative flex items-center gap-4 bg-white p-4 rounded-xl border border-black/5 shadow-sm transition-all hover:shadow-md">
                                    <div className="relative">
                                        {profile.avatar_url ? (
                                            <div
                                                className="bg-center bg-no-repeat bg-cover rounded-full h-12 w-12 border-2 border-white shadow-sm"
                                                style={{ backgroundImage: `url(${profile.avatar_url})` }}
                                            ></div>
                                        ) : (
                                            <div className="bg-gray-100 flex items-center justify-center rounded-full h-12 w-12 border-2 border-white shadow-sm text-gray-400 font-bold text-lg">
                                                {profile.full_name?.charAt(0) || '?'}
                                            </div>
                                        )}
                                        <div className={`absolute -bottom-1 -right-1 ${bgColor} text-white rounded-full p-0.5 border-2 border-white`}>
                                            <span className="material-symbols-outlined block" style={{ fontSize: '14px' }}>{icon}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <p className="text-[#131616] text-base font-bold truncate">{profile.full_name}</p>
                                            <span className={`bg-${color}/10 text-${color} text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide`}>{t(`request.${leave.type.toLowerCase()}`)}</span>
                                        </div>
                                        <p className="text-gray-500 text-sm font-medium truncate">
                                            {leave.days} {t('common.days')}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default Calendar;