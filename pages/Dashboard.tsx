import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation, Trans } from 'react-i18next';

const Dashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!profileError && profileData) {
          setProfile(profileData);
        } else {
          // Create profile if not exists (simplistic approach for demo)
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .upsert({ id: user.id, full_name: user.email?.split('@')[0], leave_balance: 20 })
            .select()
            .single();
          if (!createError) setProfile(newProfile);
        }

        // Fetch requests
        const { data: requestData, error: requestError } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('start_date', { ascending: true })
          .limit(5);

        if (!requestError && requestData) {
          setRequests(requestData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const fullName = profile?.full_name || user?.email?.split('@')[0] || 'Employee';
  const balance = profile?.leave_balance ?? 20;

  return (
    <div className="px-6 pt-8 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between pb-2">
        <div className="flex flex-col">
          <p className="text-sm font-medium text-gray-500">{new Date().toLocaleDateString(i18n.language, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          <h1 className="text-2xl font-bold text-[#131616] tracking-tight">{t('dashboard.goodMorning')}, {fullName}</h1>
        </div>
        <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm transition-transform active:scale-95">
          <span className="material-symbols-outlined text-gray-600" style={{ fontSize: '20px' }}>notifications</span>
          <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-accent-warning ring-2 ring-white"></span>
        </button>
      </header>

      {/* Hero Stats Circle */}
      <section className="mt-6 mb-8 flex flex-col items-center justify-center relative">
        <div className="relative w-64 h-64 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path className="fill-none stroke-gray-200 stroke-[2.5]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
            <path
              className="fill-none stroke-primary stroke-[2.5]"
              strokeDasharray={`${(balance / 20) * 100}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              style={{ strokeLinecap: 'round' }}
            ></path>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-6xl font-bold text-[#131616] tracking-tighter leading-none">{balance}</span>
            <span className="text-sm font-medium text-gray-500 mt-1 uppercase tracking-wider">{t('dashboard.daysLeft')}</span>
          </div>
        </div>
        <div className="mt-[-1rem] bg-white py-2 px-6 rounded-full shadow-card border border-gray-100 flex items-center gap-2 z-10">
          <span className="h-2 w-2 rounded-full bg-gray-300"></span>
          <p className="text-sm font-semibold text-gray-600">{t('dashboard.totalAllowance')}: <span className="text-[#131616]">20 {t('common.days')}</span></p>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="mb-8 grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/request')}
          className="flex flex-col items-start gap-3 p-4 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 active:opacity-90 transition-all group"
        >
          <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
            <span className="material-symbols-outlined">add_circle</span>
          </div>
          <div className="text-left">
            <p className="font-bold text-lg leading-tight whitespace-pre-line">{t('dashboard.requestTimeOff')}</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/calendar')}
          className="flex flex-col items-start gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-soft text-[#131616] active:bg-gray-50 transition-all group"
        >
          <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
            <span className="material-symbols-outlined text-gray-600">calendar_month</span>
          </div>
          <div className="text-left">
            <p className="font-bold text-lg leading-tight whitespace-pre-line">{t('dashboard.teamCalendar')}</p>
          </div>
        </button>
      </section>

      {/* Expiring Alert */}
      <section className="mb-8">
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-red-50 border border-red-100">
          <div className="shrink-0 p-2 bg-white rounded-full text-accent-warning shadow-sm">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>hourglass_top</span>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-bold text-[#131616]">{t('dashboard.expiringSoon')}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              <Trans i18nKey="dashboard.expiringMessage" values={{ count: 3, date: new Date(new Date().getFullYear(), 2, 31).toLocaleDateString(i18n.language, { month: 'long', day: 'numeric' }) }}>
                You have <span className="font-bold text-accent-warning">3 days</span> that will expire on March 31st. Plan ahead!
              </Trans>
            </p>
          </div>
        </div>
      </section>

      {/* Upcoming Plans */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#131616]">{t('dashboard.upcomingPlans')}</h2>
          <button className="text-primary font-bold text-sm">{t('dashboard.seeAll')}</button>
        </div>
        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="text-center py-4 text-gray-400">{t('dashboard.loading')}</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-4 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">{t('dashboard.noPlans')}</div>
          ) : (
            requests.map((req) => (
              <div
                key={req.id}
                className={`group flex items-center justify-between p-4 bg-white rounded-2xl shadow-card border border-gray-100 transition-all hover:shadow-md ${req.status === 'pending' ? 'cursor-pointer hover:border-primary/50' : ''}`}
                onClick={() => {
                  if (req.status === 'pending') {
                    navigate(`/request/${req.id}`);
                  }
                }}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl font-bold leading-none ${req.status === 'approved' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                    <span className="text-xs uppercase font-semibold opacity-70">{new Date(req.start_date).toLocaleDateString(i18n.language, { month: 'short' })}</span>
                    <span className="text-lg">{new Date(req.start_date).getDate()}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#131616]">{req.reason || t(`request.${req.type.toLowerCase()}`)}</h3>
                    <p className="text-sm text-gray-500">{req.days} {t('common.days')} • {t(`request.${req.type.toLowerCase()}`)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${req.status === 'approved'
                    ? 'bg-green-50 text-green-700 border-green-100'
                    : req.status === 'rejected'
                      ? 'bg-red-50 text-red-700 border-red-100'
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                    {t(`request.status.${req.status}`)}
                  </span>
                  {req.status === 'pending' && (
                    <button
                      className="h-8 w-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:text-primary hover:border-primary transition-colors"
                      title={t('request.editRequest')}
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;