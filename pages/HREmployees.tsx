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
    work_days_per_week?: number;
}

const HREmployees: React.FC = () => {
    const { t } = useTranslation();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Edit State
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [editForm, setEditForm] = useState({ hire_date: '', work_days_per_week: 5 });
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            setLoading(true);

            // 1. Fetch profiles with new columns
            const { data: profiles, error: profileError } = await supabase
                .from('user_profiles')
                .select('id, full_name, department, avatar_url, role, leave_balance, hire_date, work_days_per_week')
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
                work_days_per_week: p.work_days_per_week ?? 5
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
            work_days_per_week: emp.work_days_per_week || 5
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
                    work_days_per_week: editForm.work_days_per_week
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
        if (!confirm('Run automated Yūkyū grant process now? This will check all employees and grant leaves if due.')) return;

        setProcessing(true);
        try {
            const { error } = await supabase.rpc('run_auto_yukyu_grants');
            if (error) throw error;
            alert('Auto-grant process completed successfully!');
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
        return matchesSearch && matchesStatus;
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
                        Rodar Concessão Agora
                    </button>
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
                        <div key={emp.id}
                            onClick={() => handleEditClick(emp)}
                            className="group relative bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex items-center gap-5">
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
                                    Saldo Yuukyu
                                </span>
                            </div>

                            <div className="ml-4 p-2 text-slate-300 group-hover:text-primary transition-colors">
                                <span className="material-symbols-outlined">edit</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Edit Modal */}
            {editingEmployee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">Editar Perfil</h3>
                            <button onClick={() => setEditingEmployee(null)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Colaborador</label>
                                <p className="text-slate-900 font-bold">{editingEmployee.full_name}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Data de Contratação (Hire Date)</label>
                                <input
                                    type="date"
                                    value={editForm.hire_date}
                                    onChange={(e) => setEditForm({ ...editForm, hire_date: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                                <p className="text-xs text-slate-400 mt-1">Fundamental para cálculo automático de férias.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Dias de Trabalho/Semana</label>
                                <input
                                    type="number"
                                    min="1" max="7"
                                    value={editForm.work_days_per_week}
                                    onChange={(e) => setEditForm({ ...editForm, work_days_per_week: parseInt(e.target.value) || 5 })}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setEditingEmployee(null)}
                                className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                disabled={processing}
                                className="px-6 py-2 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                            >
                                {processing ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HREmployees;
