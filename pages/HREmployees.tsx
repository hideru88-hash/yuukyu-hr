import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { clientService } from '../src/services/clientService';
import { ClientCompany } from '../types';

interface Employee {
    id: string;
    full_name: string;
    department: string | null;
    avatar_url: string | null;
    role: string;
    leave_balance: number;
    status: 'active' | 'on_leave';
    hire_date?: string;
    work_days_per_week?: number;
    client_id?: string;
    client_name?: string;
    employee_code?: string;
}

const HREmployees: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [clientFilter, setClientFilter] = useState('all');
    const [clients, setClients] = useState<ClientCompany[]>([]);

    // Edit State
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [editForm, setEditForm] = useState({ hire_date: '', work_days_per_week: 5, client_id: '' });
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            setLoading(true);

            // 0. Fetch Clients
            const clientsData = await clientService.getClients();
            setClients(clientsData);

            // 1. Fetch profiles with new columns
            const { data: profiles, error: profileError } = await supabase
                .from('user_profiles')
                .select('id, full_name, department, avatar_url, role, leave_balance, hire_date, work_days_per_week, client_id, employee_code, client_companies(name)')
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

            // 3. Fetch Yukyu Balances
            const { data: balances, error: balanceError } = await supabase
                .from('yukyu_balance_total')
                .select('user_id, total_days');

            if (balanceError) throw balanceError;

            const balanceMap = new Map((balances || []).map(b => [b.user_id, b.total_days]));
            const onLeaveIds = new Set((activeLeaves || []).map(l => l.user_id));

            const mappedEmployees: Employee[] = profiles.map(p => ({
                id: p.id,
                full_name: p.full_name,
                department: p.department,
                avatar_url: p.avatar_url,
                role: p.role,
                status: (onLeaveIds.has(p.id) ? 'on_leave' : 'active') as 'active' | 'on_leave',
                leave_balance: balanceMap.get(p.id) ?? 0,
                hire_date: p.hire_date,
                work_days_per_week: p.work_days_per_week ?? 5,
                client_id: p.client_id,
                client_name: (p.client_companies as any)?.name,
                employee_code: p.employee_code
            }));

            setEmployees(mappedEmployees);
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (emp: Employee) => {
        setEditingEmployee(emp);
        setEditForm({
            hire_date: emp.hire_date || '',
            work_days_per_week: emp.work_days_per_week || 5,
            client_id: emp.client_id || ''
        });
    };

    const handleSaveProfile = async () => {
        if (!editingEmployee) return;
        setProcessing(true);
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    hire_date: editForm.hire_date || null,
                    work_days_per_week: editForm.work_days_per_week,
                    client_id: editForm.client_id || null
                })
                .eq('id', editingEmployee.id);

            if (error) throw error;

            alert('Profile updated successfully!');
            setEditingEmployee(null);
            fetchEmployees();
        } catch (error: any) {
            console.error('Error updating profile:', error);
            alert('Error: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleRunAutoGrant = async () => {
        if (!confirm(t('employeeDetail.employees.grantConfirm'))) return;

        setProcessing(true);
        try {
            const { error } = await supabase.rpc('run_auto_yukyu_grants');
            if (error) throw error;
            alert(t('employeeDetail.employees.grantSuccess'));
            fetchEmployees(); // Refresh balances
        } catch (error: any) {
            console.error('Error running auto-grant:', error);
            alert('Error: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.department?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && emp.status === 'active') ||
            (statusFilter === 'on_leave' && emp.status === 'on_leave');
        const matchesClient = clientFilter === 'all' || emp.client_id === clientFilter;
        return matchesSearch && matchesStatus && matchesClient;
    });

    return (
        <div className="p-8 relative">
            {/* Search and Filters */}
            <div className="flex flex-col gap-6 mb-8">
                <div className="flex items-center justify-between">
                    <div className="flex-1 max-w-md relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                        <input
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-0 rounded-2xl text-sm transition-all outline-none shadow-sm"
                            placeholder={t('hr.searchEmployeesPlaceholder') || 'Nome ou departamento...'}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleRunAutoGrant}
                        disabled={processing}
                        className="flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined">autorenew</span>
                        {t('employeeDetail.employees.runGrant')}
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-[#1e293b] text-white rounded-xl font-bold text-sm shadow-sm hover:bg-[#0f172a] transition-all shrink-0">
                        <span className="material-symbols-outlined text-[20px]">filter_list</span>
                        {t('employeeDetail.employees.filters')}
                    </button>

                    <div className="relative">
                        <select
                            className="appearance-none pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 outline-none cursor-pointer hover:border-slate-300 transition-all shadow-sm min-w-[120px]"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">{t('employeeDetail.employees.statusAll')}</option>
                            <option value="active">{t('employeeDetail.employees.active')}</option>
                            <option value="on_leave">{t('employeeDetail.employees.onLeave')}</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">expand_more</span>
                    </div>

                    <div className="relative">
                        <select
                            className="appearance-none pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 outline-none cursor-pointer hover:border-slate-300 transition-all shadow-sm min-w-[160px]"
                            value={clientFilter}
                            onChange={(e) => setClientFilter(e.target.value)}
                        >
                            <option value="all">{t('employeeDetail.employees.allCompanies')}</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">expand_more</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#1e293b]">{t('employeeDetail.employees.title', { count: filteredEmployees.length })}</h2>
                <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded text-primary focus:ring-primary h-4 w-4" />
                    <span className="text-sm font-bold text-slate-600">{t('employeeDetail.employees.bulkActions')}</span>
                </div>
            </div>

            {/* Employee List */}
            <div className="flex flex-col gap-4">
                {loading ? (
                    <div className="text-center py-10 text-slate-400">{t('employeeDetail.employees.loading')}</div>
                ) : filteredEmployees.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                        {t('employeeDetail.employees.empty')}
                    </div>
                ) : (
                    filteredEmployees.map((emp) => (
                        <div key={emp.id}
                            onClick={() => navigate(`/hr/team/${emp.id}`)}
                            className="group relative bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex items-center gap-5">
                            <div className="relative shrink-0">
                                <div className="size-16 rounded-full bg-cover bg-center border-2 border-slate-50"
                                    style={{ backgroundImage: `url("${emp.avatar_url || 'https://i.pravatar.cc/150?u=' + emp.id}")` }}>
                                </div>
                            </div>

                            <div className="flex flex-col flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                    {emp.full_name || 'Anonymous'} <span className="text-slate-400 font-medium text-xs">#{emp.employee_code}</span>
                                </h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                                    {emp.client_name || emp.department || t('employeeDetail.employees.noCompany')}
                                </p>

                                <div className="mt-4 flex items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className={`size-2 rounded-full ${emp.status === 'active' ? 'bg-green-500' : 'bg-orange-400'}`}></div>
                                        <span className={`text-xs font-bold ${emp.status === 'active' ? 'text-green-600' : 'text-orange-600'}`}>
                                            {emp.status === 'active' ? t('employeeDetail.employees.active') : t('employeeDetail.employees.onLeave')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                        <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                                        <span className="text-xs font-bold">
                                            {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString() : 'Set Hire Date'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                                    {emp.leave_balance.toFixed(1)}
                                </span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                    {t('employeeDetail.employees.balanceLabel')}
                                </span>
                            </div>

                            <div className="ml-4 flex items-center gap-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/reports/ledger/${emp.id}`);
                                    }}
                                    className="p-2 text-slate-300 hover:text-blue-600 transition-colors"
                                    title={t('ledger.title', 'View Ledger')}
                                >
                                    <span className="material-symbols-outlined">receipt_long</span>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/hr/team/${emp.id}`);
                                    }}
                                    className="p-2 text-slate-300 group-hover:text-primary transition-colors"
                                >
                                    <span className="material-symbols-outlined">edit</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal removed in favor of detailed profile page */}
        </div>
    );
};

export default HREmployees;
