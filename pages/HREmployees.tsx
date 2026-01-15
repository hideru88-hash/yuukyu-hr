import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface Employee {
    id: string;
    full_name: string;
    department: string | null;
    avatar_url: string | null;
    role: string;
    leave_balance: number;
    status: 'active' | 'on_leave';
    hire_date?: string;
}

const HREmployees: React.FC = () => {
    const { t } = useTranslation();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            setLoading(true);

            // 1. Fetch profiles
            const { data: profiles, error: profileError } = await supabase
                .from('user_profiles')
                .select('id, full_name, department, avatar_url, role, leave_balance')
                .order('full_name');

            if (profileError) throw profileError;

            // 2. Fetch current leave requests to determine status
            const today = new Date().toISOString().split('T')[0];
            const { data: activeLeaves, error: leaveError } = await supabase
                .from('leave_requests')
                .select('user_id')
                .eq('status', 'approved')
                .lte('start_date', today)
                .gte('end_date', today);

            if (leaveError) throw leaveError;

            const onLeaveIds = new Set((activeLeaves || []).map(l => l.user_id));

            const mappedEmployees: Employee[] = profiles.map(p => ({
                id: p.id,
                full_name: p.full_name,
                department: p.department,
                avatar_url: p.avatar_url,
                role: p.role,
                status: (onLeaveIds.has(p.id) ? 'on_leave' : 'active') as 'active' | 'on_leave',
                leave_balance: p.leave_balance ?? 20
            }));

            setEmployees(mappedEmployees);
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.department?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && emp.status === 'active') ||
            (statusFilter === 'on_leave' && emp.status === 'on_leave');
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-8">
            {/* Search and Filters */}
            <div className="flex flex-col gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="flex-1 relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                        <input
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-0 rounded-2xl text-sm transition-all outline-none shadow-sm"
                            placeholder={t('hr.searchEmployeesPlaceholder') || 'Nome ou departamento...'}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-[#1e293b] text-white rounded-xl font-bold text-sm shadow-sm hover:bg-[#0f172a] transition-all shrink-0">
                        <span className="material-symbols-outlined text-[20px]">filter_list</span>
                        Filtros
                    </button>

                    <div className="relative">
                        <select
                            className="appearance-none pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 outline-none cursor-pointer hover:border-slate-300 transition-all shadow-sm min-w-[120px]"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Status</option>
                            <option value="active">Ativo</option>
                            <option value="on_leave">Em Férias</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">expand_more</span>
                    </div>

                    <div className="relative">
                        <select className="appearance-none pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 outline-none cursor-pointer hover:border-slate-300 transition-all shadow-sm min-w-[120px]">
                            <option>Saldo</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">expand_more</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#1e293b]">Colaboradores ({filteredEmployees.length})</h2>
                <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded text-primary focus:ring-primary h-4 w-4" />
                    <span className="text-sm font-bold text-slate-600">Ações em Massa</span>
                </div>
            </div>

            {/* Employee List */}
            <div className="flex flex-col gap-4">
                {loading ? (
                    <div className="text-center py-10 text-slate-400">Carregando colaboradores...</div>
                ) : filteredEmployees.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                        Nenhum colaborador encontrado.
                    </div>
                ) : (
                    filteredEmployees.map((emp) => (
                        <div key={emp.id} className="group relative bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex items-center gap-5">
                            <div className="relative shrink-0">
                                <div className="size-16 rounded-full bg-cover bg-center border-2 border-slate-50"
                                    style={{ backgroundImage: `url("${emp.avatar_url || 'https://i.pravatar.cc/150?u=' + emp.id}")` }}>
                                </div>
                            </div>

                            <div className="flex flex-col flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                    {emp.full_name || 'Anonymous'}
                                </h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                                    {emp.department || 'No department'}
                                </p>

                                <div className="mt-4 flex items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className={`size-2 rounded-full ${emp.status === 'active' ? 'bg-green-500' : 'bg-orange-400'}`}></div>
                                        <span className={`text-xs font-bold ${emp.status === 'active' ? 'text-green-600' : 'text-orange-600'}`}>
                                            {emp.status === 'active' ? 'Ativo' : 'Em Férias'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                        <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                                        <span className="text-xs font-bold">1 ano</span> {/* Mock data for tenure */}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                                    {emp.leave_balance.toFixed(1)}
                                </span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                    Saldo Yuukyu
                                </span>
                            </div>

                            <div className="ml-4 p-2 text-slate-300 group-hover:text-primary transition-colors">
                                <span className="material-symbols-outlined">chevron_right</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default HREmployees;
