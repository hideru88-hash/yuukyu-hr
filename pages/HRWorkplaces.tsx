import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { clientService } from '../src/services/clientService';
import { rateService } from '../src/services/rateService';
import { ClientCompany, BillingRate } from '../types';

const HRWorkplaces: React.FC = () => {
    const { t } = useTranslation();
    const [clients, setClients] = useState<ClientCompany[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingClient, setEditingClient] = useState<ClientCompany | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState<Omit<ClientCompany, 'id' | 'created_at'>>({
        name: '',
        code: '',
        postal_code: '',
        address: '',
        contact_person: '',
        contact_title: '',
        email: '',
        phone: '',
        fax: '',
        work_type: '',
        billing_type: 'hourly',
        contract_url: '',
        status: 'active'
    });
    const [processing, setProcessing] = useState(false);
    const [isSearchingPostal, setIsSearchingPostal] = useState(false);

    // Billing Rate State
    const [billingRates, setBillingRates] = useState<BillingRate[]>([]);
    const [isRateModalOpen, setIsRateModalOpen] = useState(false);
    const [rateForm, setRateForm] = useState<Omit<BillingRate, 'id' | 'created_at' | 'client_company_id'>>({
        start_date: '',
        end_date: '',
        rate: 0,
        rate_type: 'hourly'
    });
    const [editingRate, setEditingRate] = useState<BillingRate | null>(null);
    const [selectedClientForRates, setSelectedClientForRates] = useState<ClientCompany | null>(null);

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

    const handlePostalSearch = async () => {
        if (!form.postal_code) return;
        setIsSearchingPostal(true);
        try {
            const { lookupAddressByPostalCode } = await import('../src/services/hrService');
            const address = await lookupAddressByPostalCode(form.postal_code);
            if (address) {
                setForm({ ...form, address: address });
            } else {
                alert(t('settings.addressNotFound', '住所が見つかりませんでした'));
            }
        } catch (error) {
            console.error('Error searching address:', error);
        } finally {
            setIsSearchingPostal(false);
        }
    };

    const handleOpenModal = (client?: ClientCompany) => {
        if (client) {
            setEditingClient(client);
            setForm({
                name: client.name,
                code: client.code || '',
                postal_code: client.postal_code || '',
                address: client.address || '',
                contact_person: client.contact_person || '',
                contact_title: client.contact_title || '',
                email: client.email || '',
                phone: client.phone || '',
                fax: client.fax || '',
                work_type: client.work_type || '',
                billing_type: client.billing_type || 'hourly',
                contract_url: client.contract_url || '',
                status: client.status || 'active'
            });
        } else {
            setEditingClient(null);
            setForm({
                name: '',
                code: '',
                postal_code: '',
                address: '',
                contact_person: '',
                contact_title: '',
                email: '',
                phone: '',
                fax: '',
                work_type: '',
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

    // Billing Rate Functions
    const fetchBillingRates = async (clientId: string) => {
        try {
            const data = await rateService.getBillingRates(clientId);
            setBillingRates(data);
        } catch (error) {
            console.error('Error fetching billing rates:', error);
        }
    };

    const handleOpenRatesPanel = (client: ClientCompany) => {
        setSelectedClientForRates(client);
        fetchBillingRates(client.id);
    };

    const handleCloseRatesPanel = () => {
        setSelectedClientForRates(null);
        setBillingRates([]);
    };

    const handleOpenRateModal = (rate?: BillingRate) => {
        if (rate) {
            setEditingRate(rate);
            setRateForm({
                start_date: rate.start_date,
                end_date: rate.end_date || '',
                rate: rate.rate,
                rate_type: rate.rate_type
            });
        } else {
            setEditingRate(null);
            setRateForm({
                start_date: '',
                end_date: '',
                rate: 0,
                rate_type: 'hourly'
            });
        }
        setIsRateModalOpen(true);
    };

    const handleSaveRate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClientForRates) return;
        setProcessing(true);
        try {
            if (editingRate) {
                await rateService.updateBillingRate(editingRate.id, rateForm);
            } else {
                await rateService.createBillingRate({
                    ...rateForm,
                    client_company_id: selectedClientForRates.id,
                    end_date: rateForm.end_date || undefined
                });
            }
            setIsRateModalOpen(false);
            fetchBillingRates(selectedClientForRates.id);
        } catch (error: any) {
            console.error('Error saving rate:', error);
            alert('Error: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteRate = async (id: string) => {
        if (!confirm(t('employeeDetail.rates.deleteConfirm'))) return;
        if (!selectedClientForRates) return;
        try {
            await rateService.deleteBillingRate(id);
            fetchBillingRates(selectedClientForRates.id);
        } catch (error: any) {
            alert('Error: ' + error.message);
        }
    };

    const isCurrentRate = (rate: BillingRate) => {
        const today = new Date().toISOString().split('T')[0];
        return rate.start_date <= today && (!rate.end_date || rate.end_date >= today);
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
                                                onClick={() => handleOpenRatesPanel(client)}
                                                className="p-2 text-slate-400 hover:text-amber-500 transition-colors"
                                                title={t('employeeDetail.rates.billingTitle')}
                                            >
                                                <span className="material-symbols-outlined">payments</span>
                                            </button>
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

            {/* Inline Edit Form (not modal) */}
            {isModalOpen && (
                <div className="mt-8 animate-in fade-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 space-y-8">
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary">apartment</span>
                            </div>
                            <div className="flex-1">
                                <h2 className="font-bold text-lg text-slate-900 dark:text-white">
                                    {editingClient ? t('employeeDetail.workplace.editTitle', '派遣先会社情報を編集') : t('employeeDetail.workplace.newTitle', '新しい派遣先会社を追加')}
                                </h2>
                                <p className="text-sm text-slate-400">{t('employeeDetail.workplace.formSubtitle', '派遣先会社の基本情報を入力してください。')}</p>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Company Name */}
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('employeeDetail.workplace.name', '派遣先会社名')}</label>
                                <input
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                    placeholder={t('employeeDetail.workplace.placeholders.name', '例: 株式会社〇〇')}
                                />
                            </div>

                            {/* Code */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('employeeDetail.workplace.code', '会社コード')}</label>
                                <input
                                    type="text"
                                    value={form.code}
                                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                    placeholder={t('employeeDetail.workplace.placeholders.code', 'ABC-001')}
                                />
                            </div>

                            {/* Status */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('employeeDetail.workplace.status', 'ステータス')}</label>
                                <select
                                    value={form.status}
                                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white appearance-none"
                                >
                                    <option value="active">{t('employeeDetail.workplace.active', '稼働中')}</option>
                                    <option value="suspended">{t('employeeDetail.workplace.suspended', '停止中')}</option>
                                </select>
                            </div>

                            {/* Contact Person */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('employeeDetail.workplace.contact', '派遣先責任者')}</label>
                                <input
                                    type="text"
                                    value={form.contact_person}
                                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                    placeholder={t('employeeDetail.workplace.placeholders.contact', '例: 山田太郎')}
                                />
                            </div>

                            {/* Contact Title */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('employeeDetail.workplace.contactTitle', '役職')}</label>
                                <input
                                    type="text"
                                    value={form.contact_title}
                                    onChange={(e) => setForm({ ...form, contact_title: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                    placeholder={t('employeeDetail.workplace.placeholders.contactTitle', '例: 部長')}
                                />
                            </div>

                            {/* Postal Code */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('employeeDetail.workplace.postalCode', '郵便番号')}</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={form.postal_code}
                                        onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                                        className="flex-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                        placeholder="123-4567"
                                    />
                                    <button
                                        type="button"
                                        onClick={handlePostalSearch}
                                        disabled={isSearchingPostal || !form.postal_code}
                                        className="px-4 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                    >
                                        {isSearchingPostal ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <span className="material-symbols-outlined text-lg">search</span>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Work Type */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('employeeDetail.workplace.workType', '業種')}</label>
                                <input
                                    type="text"
                                    value={form.work_type}
                                    onChange={(e) => setForm({ ...form, work_type: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                    placeholder={t('employeeDetail.workplace.placeholders.workType', '例: 製造業')}
                                />
                            </div>

                            {/* Address */}
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('employeeDetail.workplace.address', '住所')}</label>
                                <input
                                    type="text"
                                    value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                    placeholder={t('employeeDetail.workplace.placeholders.address', '例: 愛知県名古屋市中区〇〇町1-2-3')}
                                />
                            </div>

                            {/* Phone */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('employeeDetail.workplace.phone', '電話番号')}</label>
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                    placeholder="052-123-4567"
                                />
                            </div>

                            {/* FAX */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('employeeDetail.workplace.fax', 'FAX番号')}</label>
                                <input
                                    type="tel"
                                    value={form.fax}
                                    onChange={(e) => setForm({ ...form, fax: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                    placeholder="052-123-4568"
                                />
                            </div>

                            {/* Email */}
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('employeeDetail.workplace.email', 'メールアドレス')}</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                    placeholder={t('employeeDetail.workplace.placeholders.email', 'info@example.com')}
                                />
                            </div>

                            {/* Billing Type */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('employeeDetail.workplace.billingType', '請求タイプ')}</label>
                                <select
                                    value={form.billing_type}
                                    onChange={(e) => setForm({ ...form, billing_type: e.target.value as any })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white appearance-none"
                                >
                                    <option value="hourly">{t('employeeDetail.workplace.hourly', '時給')}</option>
                                    <option value="daily">{t('employeeDetail.workplace.daily', '日給')}</option>
                                    <option value="monthly">{t('employeeDetail.workplace.monthly', '月給')}</option>
                                </select>
                            </div>

                            {/* Contract URL */}
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('employeeDetail.workplace.contract', '契約書URL')}</label>
                                <input
                                    type="text"
                                    value={form.contract_url}
                                    onChange={(e) => setForm({ ...form, contract_url: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                    placeholder={t('employeeDetail.workplace.placeholders.contractUrl', 'https://...')}
                                />
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                {t('employeeDetail.actions.cancel', 'キャンセル')}
                            </button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center gap-2"
                            >
                                {processing ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[20px]">save</span>
                                        <span>{t('employeeDetail.actions.save', '保存')}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Billing Rates Panel */}
            {selectedClientForRates && (
                <div className="fixed inset-0 z-40 flex">
                    <div className="flex-1 bg-black/30" onClick={handleCloseRatesPanel}></div>
                    <div className="w-full max-w-lg bg-white dark:bg-slate-800 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('employeeDetail.rates.billingTitle')}</h3>
                                <p className="text-sm text-slate-500">{selectedClientForRates.name}</p>
                            </div>
                            <button onClick={handleCloseRatesPanel} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <p className="text-sm text-slate-500">{t('employeeDetail.rates.billingSubtitle')}</p>
                                <button
                                    onClick={() => handleOpenRateModal()}
                                    className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-dark transition-all"
                                >
                                    <span className="material-symbols-outlined text-lg">add</span>
                                    {t('employeeDetail.rates.addRate')}
                                </button>
                            </div>

                            {billingRates.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <span className="material-symbols-outlined text-4xl mb-2">payments</span>
                                    <p>{t('employeeDetail.rates.noRates')}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {billingRates.map((rate) => (
                                        <div key={rate.id} className={`p-4 rounded-xl border ${isCurrentRate(rate) ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700' : 'border-slate-200 dark:border-slate-700'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-2xl font-black text-slate-900 dark:text-white">¥{rate.rate.toLocaleString()}</span>
                                                        <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-400">
                                                            {t(`employeeDetail.rates.${rate.rate_type}`)}
                                                        </span>
                                                        {isCurrentRate(rate) && (
                                                            <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/50 rounded-full text-green-700 dark:text-green-400 font-bold">
                                                                {t('employeeDetail.rates.current')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-slate-500 mt-1">
                                                        {rate.start_date} ~ {rate.end_date || '∞'}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleOpenRateModal(rate)} className="p-1.5 text-slate-400 hover:text-primary">
                                                        <span className="material-symbols-outlined text-lg">edit</span>
                                                    </button>
                                                    <button onClick={() => handleDeleteRate(rate.id)} className="p-1.5 text-slate-400 hover:text-red-500">
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Rate Modal */}
            {isRateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {editingRate ? t('employeeDetail.rates.editRate') : t('employeeDetail.rates.addRate')}
                            </h3>
                            <button onClick={() => setIsRateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSaveRate}>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('employeeDetail.rates.startDate')}</label>
                                        <input
                                            type="date"
                                            required
                                            value={rateForm.start_date}
                                            onChange={(e) => setRateForm({ ...rateForm, start_date: e.target.value })}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:border-primary outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('employeeDetail.rates.endDate')}</label>
                                        <input
                                            type="date"
                                            value={rateForm.end_date}
                                            onChange={(e) => setRateForm({ ...rateForm, end_date: e.target.value })}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:border-primary outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('employeeDetail.rates.rate')} (¥)</label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            value={rateForm.rate}
                                            onChange={(e) => setRateForm({ ...rateForm, rate: Number(e.target.value) })}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:border-primary outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('employeeDetail.rates.rateType')}</label>
                                        <select
                                            value={rateForm.rate_type}
                                            onChange={(e) => setRateForm({ ...rateForm, rate_type: e.target.value as any })}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:border-primary outline-none transition-all appearance-none"
                                        >
                                            <option value="hourly">{t('employeeDetail.rates.hourly')}</option>
                                            <option value="daily">{t('employeeDetail.rates.daily')}</option>
                                            <option value="monthly">{t('employeeDetail.rates.monthly')}</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsRateModalOpen(false)}
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
