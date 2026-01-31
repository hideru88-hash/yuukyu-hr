import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { clientService } from '../src/services/clientService';
import { ClientCompany } from '../types';

const HRWorkplaces: React.FC = () => {
    const { t } = useTranslation();
    const [clients, setClients] = useState<ClientCompany[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingClient, setEditingClient] = useState<ClientCompany | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState<Omit<ClientCompany, 'id' | 'created_at'>>({
        name: '',
        code: '',
        address: '',
        contact_person: '',
        email: '',
        phone: '',
        work_type: '',
        amount_per_employee: 0,
        billing_type: 'hourly',
        contract_url: '',
        status: 'active'
    });
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const data = await clientService.getClients();
            setClients(data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (client?: ClientCompany) => {
        if (client) {
            setEditingClient(client);
            setForm({
                name: client.name,
                code: client.code || '',
                address: client.address || '',
                contact_person: client.contact_person || '',
                email: client.email || '',
                phone: client.phone || '',
                work_type: client.work_type || '',
                amount_per_employee: client.amount_per_employee || 0,
                billing_type: client.billing_type || 'hourly',
                contract_url: client.contract_url || '',
                status: client.status || 'active'
            });
        } else {
            setEditingClient(null);
            setForm({
                name: '',
                code: '',
                address: '',
                contact_person: '',
                email: '',
                phone: '',
                work_type: '',
                amount_per_employee: 0,
                billing_type: 'hourly',
                contract_url: '',
                status: 'active'
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            if (editingClient) {
                await clientService.updateClient(editingClient.id, form);
            } else {
                await clientService.createClient(form);
            }
            setIsModalOpen(false);
            fetchClients();
        } catch (error: any) {
            console.error('Error saving client:', error);
            if (error.code === '23505' || error.message?.includes('duplicate key')) {
                alert(t('employeeDetail.status.duplicateCompanyCode'));
            } else {
                alert(t('employeeDetail.status.saveError') + ': ' + (error.message || JSON.stringify(error)));
            }
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('employeeDetail.workplace.deleteConfirm'))) return;
        try {
            await clientService.deleteClient(id);
            fetchClients();
        } catch (error: any) {
            alert('Erro ao excluir: ' + error.message);
        }
    };

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('employeeDetail.workplace.title')}</h1>
                    <p className="text-slate-500 dark:text-slate-400">{t('employeeDetail.workplace.subtitle')}</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
                >
                    <span className="material-symbols-outlined">add</span>
                    {t('employeeDetail.workplace.add')}
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('employeeDetail.workplace.columns.name')}</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('employeeDetail.workplace.columns.code')}</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('employeeDetail.workplace.columns.contact')}</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('employeeDetail.workplace.workType')}</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('employeeDetail.workplace.status')}</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">{t('employeeDetail.workplace.columns.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-slate-400">{t('employeeDetail.workplace.loading')}</td>
                            </tr>
                        ) : clients.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-slate-400">{t('employeeDetail.workplace.empty')}</td>
                            </tr>
                        ) : (
                            clients.map((client) => (
                                <tr key={client.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900 dark:text-white">{client.name}</div>
                                        <div className="text-xs text-slate-500 truncate max-w-xs">{client.address}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                        {client.code || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                        {client.contact_person || '-'}
                                        {client.email && <div className="text-[10px] text-slate-400">{client.email}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                        {client.work_type || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${client.status === 'active'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                            {client.status === 'active' ? t('employeeDetail.workplace.active') : t('employeeDetail.workplace.suspended')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleOpenModal(client)}
                                                className="p-2 text-slate-400 hover:text-primary transition-colors"
                                            >
                                                <span className="material-symbols-outlined">edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(client.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {editingClient ? t('employeeDetail.actions.edit') || 'Editar Empresa' : t('employeeDetail.actions.new') || 'Nova Empresa'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('employeeDetail.workplace.name')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:border-primary outline-none transition-all"
                                        placeholder={t('employeeDetail.workplace.placeholders.name')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('employeeDetail.workplace.code')}</label>
                                    <input
                                        type="text"
                                        value={form.code}
                                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:border-primary outline-none transition-all"
                                        placeholder={t('employeeDetail.workplace.placeholders.code')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('employeeDetail.workplace.contact')}</label>
                                    <input
                                        type="text"
                                        value={form.contact_person}
                                        onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:border-primary outline-none transition-all"
                                        placeholder={t('employeeDetail.workplace.placeholders.contact')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('employeeDetail.workplace.address')}</label>
                                    <textarea
                                        value={form.address}
                                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:border-primary outline-none transition-all h-20 resize-none"
                                        placeholder={t('employeeDetail.workplace.placeholders.address')}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('employeeDetail.workplace.email')}</label>
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:border-primary outline-none transition-all"
                                            placeholder={t('employeeDetail.workplace.placeholders.email')}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('employeeDetail.workplace.phone')}</label>
                                        <input
                                            type="text"
                                            value={form.phone}
                                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:border-primary outline-none transition-all"
                                            placeholder={t('employeeDetail.workplace.placeholders.phone')}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('employeeDetail.workplace.workType')}</label>
                                        <input
                                            type="text"
                                            value={form.work_type}
                                            onChange={(e) => setForm({ ...form, work_type: e.target.value })}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:border-primary outline-none transition-all"
                                            placeholder={t('employeeDetail.workplace.placeholders.workType')}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('employeeDetail.workplace.status')}</label>
                                        <select
                                            value={form.status}
                                            onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:border-primary outline-none transition-all appearance-none"
                                        >
                                            <option value="active">{t('employeeDetail.workplace.active')}</option>
                                            <option value="suspended">{t('employeeDetail.workplace.suspended')}</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('employeeDetail.workplace.amountPerEmployee')}</label>
                                        <input
                                            type="number"
                                            value={form.amount_per_employee}
                                            onChange={(e) => setForm({ ...form, amount_per_employee: Number(e.target.value) })}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:border-primary outline-none transition-all"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('employeeDetail.workplace.billingType')}</label>
                                        <select
                                            value={form.billing_type}
                                            onChange={(e) => setForm({ ...form, billing_type: e.target.value as any })}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:border-primary outline-none transition-all appearance-none"
                                        >
                                            <option value="hourly">{t('employeeDetail.workplace.hourly')}</option>
                                            <option value="daily">{t('employeeDetail.workplace.daily')}</option>
                                            <option value="monthly">{t('employeeDetail.workplace.monthly')}</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('employeeDetail.workplace.contract')}</label>
                                    <input
                                        type="text"
                                        value={form.contract_url}
                                        onChange={(e) => setForm({ ...form, contract_url: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:border-primary outline-none transition-all"
                                        placeholder={t('employeeDetail.workplace.placeholders.contractUrl')}
                                    />
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    {t('employeeDetail.actions.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-6 py-2 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                                >
                                    {processing ? t('employeeDetail.actions.saving') : t('employeeDetail.actions.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HRWorkplaces;
