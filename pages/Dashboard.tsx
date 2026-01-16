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
  const [realBalance, setRealBalance] = useState<number | null>(null);
  const [expiringData, setExpiringData] = useState<{ count: number, date: string } | null>(null);
  const [grantInfo, setGrantInfo] = useState<{ last: { days: number, date: string } | null, next: { days: number, date: string } | null }>(null);

  // Helper to calculate Yūkyū entitlement based on service months
  const getYukyuEntitlement = (months: number) => {
    if (months < 6) return 0;
    if (months < 18) return 10; // 0.5 year
    if (months < 30) return 11; // 1.5 year
    if (months < 42) return 12; // 2.5 year
    if (months < 54) return 14; // 3.5 year
    if (months < 66) return 16; // 4.5 year
    if (months < 78) return 18; // 5.5 year
    return 20; // 6.5+ years
  };

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        let currentProfile = null;
        if (!profileError && profileData) {
          setProfile(profileData);
          currentProfile = profileData;
        } else {
          // Create profile if not exists (simplistic approach for demo)
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .upsert({ id: user.id, full_name: user.email?.split('@')[0], role: 'employee' })
            .select()
            .single();
          if (!createError) {
            setProfile(newProfile);
            currentProfile = newProfile;
          }
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
        // Fetch real balance
        const { data: balanceData, error: balanceError } = await supabase
          .from('yukyu_balance_total')
          .select('total_days')
          .eq('user_id', user.id)
          .single();

        if (!balanceError && balanceData) {
          setRealBalance(Number(balanceData.total_days));
        }

        // Fetch expiring grants
        const today = new Date();
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(today.getMonth() + 3);

        const { data: grantsData, error: grantsError } = await supabase
          .from('yukyu_balance_by_grant')
          .select('remaining_days, expires_on')
          .eq('user_id', user.id)
          .gt('remaining_days', 0)
          .gt('expires_on', today.toISOString().split('T')[0]) // Only future expirations
          .lte('expires_on', threeMonthsFromNow.toISOString().split('T')[0]) // Within 3 months
          .order('expires_on', { ascending: true }); // Get soonest first

        if (!grantsError && grantsData && grantsData.length > 0) {
          // Sum up days for all grants expiring in this window
          const totalExpiring = grantsData.reduce((sum, g) => sum + Number(g.remaining_days), 0);
          // Use the soonest expiration date
          setExpiringData({
            count: totalExpiring,
            date: grantsData[0].expires_on
          });
        } else {
          setExpiringData(null);
        }

        // --- NEW: Calculate Next Grant & Fetch Last Grant ---
        if (currentProfile && currentProfile.hire_date) {
          const hireDate = new Date(currentProfile.hire_date);
          const now = new Date();
          let nextGrant = null;

          // Logic: Iterate 0.5, 1.5, 2.5... years from hire date to find first FUTURE date
          // Start from 6 months
          for (let m = 6; m <= 1200; m += 12) { // 100 years max loop safety
            const potentialGrantDate = new Date(hireDate);
            potentialGrantDate.setMonth(hireDate.getMonth() + m);

            if (potentialGrantDate > now) {
              // Found the next grant!
              nextGrant = {
                date: potentialGrantDate.toISOString().split('T')[0],
                days: getYukyuEntitlement(m)
              };
              break;
            }
          }

          // Fetch Last Actual Grant from DB
          const { data: lastGrantData } = await supabase
            .from('yukyu_grants')
            .select('days_granted, grant_date')
            .eq('user_id', user.id)
            .order('grant_date', { ascending: false })
            .limit(1)
            .single();

          setGrantInfo({
            last: lastGrantData ? { days: Number(lastGrantData.days_granted), date: lastGrantData.grant_date } : null,
            next: nextGrant
          });
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
  const balance = realBalance ?? 0;

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
        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path className="fill-none stroke-gray-200 stroke-[3]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
            <path
              className="fill-none stroke-[#1e293b] stroke-[3]"
              strokeDasharray={`${Math.min((balance / 40) * 100, 100)}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              style={{ strokeLinecap: 'round' }}
            ></path>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-5xl font-black text-[#131616] tracking-tighter leading-none">{balance}</span>
            <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{t('dashboard.daysLeft')}</span>
          </div>
        </div>

        {/* Added / Next Grant Info */}
        <div className="mt-6 bg-white py-3 px-5 rounded-2xl shadow-sm border border-gray-50 flex flex-col gap-1 w-full max-w-xs">
          {grantInfo?.last && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                <span className="font-bold text-gray-700">{t('dashboard.added')}</span>
              </div>
              <div className="font-mono text-gray-600">
                <span className="font-bold text-gray-900">{grantInfo.last.days} {t('common.days')}</span> {t('dashboard.on')} {new Date(grantInfo.last.date).toLocaleDateString(i18n.language)}
              </div>
            </div>
          )}
          {grantInfo?.next && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                <span className="font-bold text-gray-700">{t('dashboard.next')}</span>
              </div>
              <div className="font-mono text-gray-600">
                <span className="font-bold text-gray-900">{grantInfo.next.days} {t('common.days')}</span> {t('dashboard.on')} {new Date(grantInfo.next.date).toLocaleDateString(i18n.language)}
              </div>
            </div>
          )}
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

      {/* Expiring Alert - Dynamic Rendering */}
      {balance === 0 ? (
        <section className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="shrink-0 p-2 bg-white rounded-full text-gray-400 shadow-sm">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>info</span>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-bold text-[#131616]">{t('dashboard.emptyBalanceTitle')}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {t('dashboard.emptyBalanceMessage')}
              </p>
            </div>
          </div>
        </section>
      ) : expiringData ? (
        <section className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-red-50 border border-red-100">
            <div className="shrink-0 p-2 bg-white rounded-full text-accent-warning shadow-sm">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>hourglass_top</span>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-bold text-[#131616]">{t('dashboard.expiringSoon')}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                <Trans i18nKey="dashboard.expiringMessage" values={{ count: expiringData.count, date: new Date(expiringData.date).toLocaleDateString(i18n.language, { month: 'long', day: 'numeric' }) }}>
                  You have <span className="font-bold text-accent-warning">{expiringData.count} days</span> that will expire on {new Date(expiringData.date).toLocaleDateString()}. Plan ahead!
                </Trans>
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-green-50 border border-green-100">
            <div className="shrink-0 p-2 bg-white rounded-full text-green-500 shadow-sm">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>verified_user</span>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-bold text-[#131616]">{t('dashboard.safeBalance', 'Balance Safe')}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {t('dashboard.noExpiringSoon', 'Your leave balance is safe for the next 3 months.')}
              </p>
            </div>
          </div>
        </section>
      )}
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
              <div key={req.id} className="group flex flex-col bg-white rounded-2xl shadow-card border border-gray-100 transition-all hover:shadow-md overflow-hidden">
                <div
                  className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50`}
                  onClick={() => {
                    if (req.status === 'pending') {
                      navigate(`/request/${req.id}`);
                    } else {
                      navigate(`/request-details/${req.id}`);
                    }
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl font-bold leading-none ${req.status === 'approved' ? 'bg-green-50 text-green-600' :
                      req.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
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

                {/* Rejection Note */}
                {req.status === 'rejected' && req.note && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="bg-red-50/50 rounded-xl p-3 border border-red-100/50 flex gap-3">
                      <span className="material-symbols-outlined text-red-400 text-[18px]">info</span>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-[10px] uppercase font-bold text-red-600 tracking-wider">
                          {t('request.rejectionReason')}
                        </p>
                        <p className="text-sm text-red-800 font-medium">
                          {req.note}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;