import React from 'react';
import { BarChart, Bar, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { useNavigate } from 'react-router-dom';

const Reports: React.FC = () => {
    const navigate = useNavigate();
    
    // Mock Data for Charts
    const monthlyData = [
        { name: 'Jan', value: 35 },
        { name: 'Feb', value: 55 },
        { name: 'Mar', value: 85 },
        { name: 'Apr', value: 45 },
        { name: 'May', value: 60 },
        { name: 'Jun', value: 25 },
    ];

    const pieData = [
        { name: 'Vacation', value: 60, color: '#1d385e' }, // Primary
        { name: 'Sick', value: 25, color: '#269CDE' }, // Secondary
        { name: 'Half Day', value: 15, color: '#4CAF50' }, // Success
    ];

  return (
    <div className="bg-background-light min-h-screen relative pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background-light/95 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors text-secondary"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold text-secondary tracking-tight">Reports & Stats</h1>
          <button className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors text-secondary">
            <span className="material-symbols-outlined">filter_list</span>
          </button>
        </div>
      </header>

      <main className="px-4 pt-4">
        {/* Filter Toggle */}
        <div className="mb-6">
          <div className="flex p-1 bg-white rounded-xl shadow-sm border border-gray-100">
             {['Month', 'Quarter', 'Year'].map((p, i) => (
                 <button key={p} className={`flex-1 py-2 text-center text-sm font-semibold rounded-lg transition-all ${i === 0 ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
                    {p}
                 </button>
             ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-subtle border border-gray-100">
            <div className="text-xs font-medium text-gray-500 mb-1">Total Requests</div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-secondary">124</span>
              <span className="text-xs font-bold text-accent-success mb-1 flex items-center">
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span> 12%
              </span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-subtle border border-gray-100">
            <div className="text-xs font-medium text-gray-500 mb-1">Avg. Balance</div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-secondary">14</span>
              <span className="text-xs text-gray-400 mb-1 font-medium">days</span>
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <section className="mb-6 bg-white p-5 rounded-xl shadow-subtle border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-secondary">Monthly Trends</h2>
            <button className="text-secondary/60 hover:text-secondary">
              <span className="material-symbols-outlined text-xl">more_horiz</span>
            </button>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {monthlyData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 2 ? '#1d385e' : '#e0f2f2'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-between px-2 mt-2">
                {monthlyData.map((d) => (
                    <span key={d.name} className="text-xs font-medium text-gray-400">{d.name}</span>
                ))}
            </div>
          </div>
        </section>

        {/* Pie Chart */}
        <section className="mb-6 bg-white p-5 rounded-xl shadow-subtle border border-gray-100">
            <h2 className="text-lg font-bold text-secondary mb-6">Leave Distribution</h2>
            <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="relative h-40 w-40 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={60}
                                paddingAngle={5}
                                dataKey="value"
                                cornerRadius={4}
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs text-gray-400 font-medium">Total</span>
                        <span className="text-xl font-bold text-secondary">100%</span>
                    </div>
                </div>
                <div className="flex flex-col gap-3 w-full">
                    {pieData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                                <span className="text-sm font-semibold text-secondary">{item.name}</span>
                            </div>
                            <span className="text-sm font-bold text-gray-500">{item.value}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Insights */}
        <section>
          <h2 className="text-lg font-bold text-secondary mb-4 px-1">Dept. Insights</h2>
          <div className="flex flex-col gap-3">
             <div className="bg-white p-4 rounded-xl shadow-subtle border-l-4 border-l-accent-warning border-t border-r border-b border-gray-100 flex gap-4 items-start">
                <div className="p-2 rounded-full bg-accent-warning/10 shrink-0">
                    <span className="material-symbols-outlined text-accent-warning text-xl">warning</span>
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-secondary text-base">Engineering</h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent-warning bg-accent-warning/10 px-2 py-0.5 rounded-full">Action Req</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        High unused balance. 8 employees have &gt;20 days accrued.
                    </p>
                </div>
             </div>
          </div>
        </section>
      </main>
      
      {/* Floating Action */}
      <div className="fixed bottom-24 right-6 z-40">
        <button className="group flex items-center gap-2 bg-primary hover:bg-[#152a48] text-white px-5 py-4 rounded-full shadow-float transition-all active:scale-95">
            <span className="material-symbols-outlined">download</span>
            <span className="font-bold text-base">Export</span>
        </button>
      </div>
    </div>
  );
};

export default Reports;