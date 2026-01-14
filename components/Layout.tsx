import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  // Hide bottom nav on login page
  const showNav = location.pathname !== '/';

  const NavItem = ({ icon, label, path, filled = false }: { icon: string, label: string, path: string, filled?: boolean }) => {
    const isActive = location.pathname === path;
    return (
      <button
        onClick={() => navigate(path)}
        className={`flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <span
          className="material-symbols-outlined transition-transform active:scale-90"
          style={{ fontVariationSettings: filled || isActive ? "'FILL' 1" : "'FILL' 0" }}
        >
          {icon}
        </span>
        <span className="text-[10px] font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden max-w-md bg-background-light shadow-2xl">
      <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {children}
      </main>

      {showNav && (
        <nav className="absolute bottom-0 w-full bg-white border-t border-gray-100 pb-6 pt-3 px-6 z-20">
          <div className="flex justify-between items-center">
            <NavItem icon="dashboard" label={t('nav.home')} path="/dashboard" filled />
            <NavItem icon="calendar_month" label={t('nav.calendar')} path="/calendar" />
            <NavItem icon="add_circle" label={t('nav.request')} path="/request" />
            <NavItem icon="bar_chart" label={t('nav.reports')} path="/reports" />
            <NavItem icon="person" label={t('nav.profile')} path="/profile" />
          </div>
        </nav>
      )}
    </div>
  );
};

export default Layout;