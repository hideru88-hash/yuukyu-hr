import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getEmployeeDetail, updateEmployeeDetail, getVisaTypes } from '../src/services/hrService';
import { clientService } from '../src/services/clientService';
import { rateService } from '../src/services/rateService';
import { ClientCompany, SalaryRate } from '../types';

type TabType = 'personal' | 'contract' | 'documents' | 'benefits' | 'history';

const EmployeeDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { t, i18n } = useTranslation();

    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [clients, setClients] = useState<ClientCompany[]>([]);
    const [visaTypes, setVisaTypes] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('personal');
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [isBasicInfoModalOpen, setIsBasicInfoModalOpen] = useState(false);
    const [isSearchingPostal, setIsSearchingPostal] = useState(false);

    // Salary Rate State
    const [salaryRates, setSalaryRates] = useState<SalaryRate[]>([]);
    const [isSalaryRateModalOpen, setIsSalaryRateModalOpen] = useState(false);
    const [salaryRateForm, setSalaryRateForm] = useState<Omit<SalaryRate, 'id' | 'created_at' | 'user_id'>>({
        start_date: '',
        end_date: '',
        rate: 0,
        rate_type: 'hourly'
    });
    const [editingSalaryRate, setEditingSalaryRate] = useState<SalaryRate | null>(null);
    const [salaryRateProcessing, setSalaryRateProcessing] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        // Identity
        full_name: '',
        employee_code: '',
        avatar_url: '',

        // Basic / Personal
        birth_date: '',
        gender: '',
        source_company: '',

        // Employment Info
        client_id: '',
        department: '',
        employment_type: 'regular',
        is_team_lead: false,
        hire_date: '',
        contract_end_date: '',

        // Contact
        postal_code: '',
        address_line1: '',
        address_line2: '',
        phone: '',
        email: '',

        // Banking
        bank_name: '',
        bank_branch: '',
        bank_account_number: '',
        bank_account_holder: '',

        // Foreign Documents
        passport_name: '',
        nationality: '',
        passport_number: '',
        visa_status: '',
        visa_expiry: '',
        zairyu_card_number: '',
        zairyu_card_expiry: '',

        // Insurance / Benefits
        pension_number: '',
        unemployment_number: '',
        has_transport_allowance: false,
        has_housing_allowance: false,
        has_leadership_bonus: false,
    });

    useEffect(() => {
        if (id) {
            fetchData();
        }
        // Check for tab parameter in URL
        const tabParam = searchParams.get('tab');
        if (tabParam && ['personal', 'contract', 'documents', 'benefits', 'history'].includes(tabParam)) {
            setActiveTab(tabParam as TabType);
        }
    }, [id, searchParams]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [empData, clientsData, visasData] = await Promise.all([
                getEmployeeDetail(id!),
                clientService.getClients(),
                getVisaTypes()
            ]);

            setEmployee(empData);
            setClients(clientsData);
            setVisaTypes(visasData);

            setFormData({
                full_name: empData.full_name || '',
                employee_code: empData.employee_code || '',
                avatar_url: empData.avatar_url || '',
                birth_date: empData.birth_date || '',
                gender: empData.gender || '',
                source_company: empData.source_company || '',
                client_id: empData.client_id || '',
                department: empData.department || '',
                employment_type: empData.employment_type || 'regular',
                is_team_lead: empData.is_team_lead || false,
                hire_date: empData.hire_date || '',
                contract_end_date: empData.contract_end_date || '',
                postal_code: empData.postal_code || '',
                address_line1: empData.address_line1 || '',
                address_line2: empData.address_line2 || '',
                phone: empData.phone || '',
                email: empData.email || '',
                bank_name: empData.bank_name || '',
                bank_branch: empData.bank_branch || '',
                bank_account_number: empData.bank_account_number || '',
                bank_account_holder: empData.bank_account_holder || '',
                passport_name: empData.passport_name || '',
                nationality: empData.nationality || '',
                passport_number: empData.passport_number || '',
                visa_status: empData.visa_status || '',
                visa_expiry: empData.visa_expiry || '',
                zairyu_card_number: empData.zairyu_card_number || '',
                zairyu_card_expiry: empData.zairyu_card_expiry || '',
                pension_number: empData.pension_number || '',
                unemployment_number: empData.unemployment_number || '',
                has_transport_allowance: empData.has_transport_allowance || false,
                has_housing_allowance: empData.has_housing_allowance || false,
                has_leadership_bonus: empData.has_leadership_bonus || false,
            });
        } catch (error) {
            console.error('Error fetching employee detail:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!id) return;
        setSaving(true);
        try {
            // Prepare payload - convert empty strings to null for specific database types
            const payload = {
                ...formData,
                full_name: formData.full_name?.trim() || '',
                employee_code: formData.employee_code?.trim() || null,
                email: formData.email?.trim() || null,
                client_id: formData.client_id || null,
                birth_date: formData.birth_date || null,
                contract_end_date: formData.contract_end_date || null,
                visa_expiry: formData.visa_expiry || null,
                zairyu_card_expiry: formData.zairyu_card_expiry || null,
                zairyu_card_number: formData.zairyu_card_number?.trim() || null,
                hire_date: formData.hire_date || null
            };

            await updateEmployeeDetail(id, payload);
            alert(t('employeeDetail.status.success'));
            navigate('/hr/team');
        } catch (error: any) {
            console.error('Error updating employee:', error);
            if (error.code === '23505' || error.message?.includes('duplicate key')) {
                alert(t('employeeDetail.status.duplicateID'));
            } else {
                alert(t('employeeDetail.status.saveError') + ': ' + (error.message || error.details || JSON.stringify(error)));
            }
        } finally {
            setSaving(false);
        }
    };

    const handlePostalSearch = async () => {
        if (!formData.postal_code) return;
        setIsSearchingPostal(true);
        try {
            const { lookupAddressByPostalCode } = await import('../src/services/hrService');
            const address = await lookupAddressByPostalCode(formData.postal_code);
            if (address) {
                setFormData({ ...formData, address_line1: address });
            } else {
                alert(t('employeeDetail.actions.addressNotFound'));
            }
        } catch (error) {
            console.error('Error searching address:', error);
        } finally {
            setIsSearchingPostal(false);
        }
    };

    // Salary Rate Functions
    const fetchSalaryRates = async () => {
        if (!id) return;
        try {
            const data = await rateService.getSalaryRates(id);
            setSalaryRates(data);
        } catch (error) {
            console.error('Error fetching salary rates:', error);
        }
    };

    useEffect(() => {
        if (id) {
            fetchSalaryRates();
        }
    }, [id]);

    const handleOpenSalaryRateModal = (rate?: SalaryRate) => {
        if (rate) {
            setEditingSalaryRate(rate);
            setSalaryRateForm({
                start_date: rate.start_date,
                end_date: rate.end_date || '',
                rate: rate.rate,
                rate_type: rate.rate_type
            });
        } else {
            setEditingSalaryRate(null);
            setSalaryRateForm({
                start_date: '',
                end_date: '',
                rate: 0,
                rate_type: 'hourly'
            });
        }
        setIsSalaryRateModalOpen(true);
    };

    const handleSaveSalaryRate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        setSalaryRateProcessing(true);
        try {
            if (editingSalaryRate) {
                await rateService.updateSalaryRate(editingSalaryRate.id, salaryRateForm);
            } else {
                await rateService.createSalaryRate({
                    ...salaryRateForm,
                    user_id: id,
                    end_date: salaryRateForm.end_date || undefined
                });
            }
            setIsSalaryRateModalOpen(false);
            fetchSalaryRates();
        } catch (error: any) {
            console.error('Error saving salary rate:', error);
            alert('Error: ' + error.message);
        } finally {
            setSalaryRateProcessing(false);
        }
    };

    const handleDeleteSalaryRate = async (rateId: string) => {
        if (!confirm(t('employeeDetail.rates.deleteConfirm'))) return;
        try {
            await rateService.deleteSalaryRate(rateId);
            fetchSalaryRates();
        } catch (error: any) {
            alert('Error: ' + error.message);
        }
    };

    const isCurrentSalaryRate = (rate: SalaryRate) => {
        const today = new Date().toISOString().split('T')[0];
        return rate.start_date <= today && (!rate.end_date || rate.end_date >= today);
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="bg-[#f2f5f8] min-h-screen font-display">
            {/* Top Toolbar */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex items-center justify-between">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <button onClick={() => navigate('/hr/team')} className="hover:text-primary transition-colors">{t('hr.team')}</button>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-600">{t('employeeDetail.detailedProfile')}</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t('employeeDetail.title')}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/hr/team')}
                        className="px-6 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                    >
                        {t('employeeDetail.cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-2 bg-primary text-white font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                    >
                        {saving ? (
                            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <span className="material-symbols-outlined text-[20px]">save</span>
                        )}
                        {t('employeeDetail.saveChanges')}
                    </button>
                </div>
            </div>

            <main className="p-8 max-w-[1400px] mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* Left Column: Fixed Profile Info */}
                    <div className="lg:col-span-3 space-y-6 lg:sticky lg:top-28">
                        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden text-center p-8">
                            <div className="size-32 mx-auto rounded-full border-[6px] border-[#f2f5f8] bg-cover bg-center shadow-md relative mb-6"
                                style={{ backgroundImage: `url("${formData.avatar_url || 'https://i.pravatar.cc/150?u=' + id}")` }}>
                                <div className="absolute bottom-1 right-2 size-6 bg-green-500 border-4 border-white rounded-full"></div>
                                <button
                                    onClick={() => setIsBasicInfoModalOpen(true)}
                                    className="absolute -top-2 -right-2 size-8 bg-white border border-slate-100 rounded-full shadow-md flex items-center justify-center text-slate-400 hover:text-primary transition-all"
                                >
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                            </div>

                            <h2 className="text-2xl font-black text-slate-900 mb-1">{formData.full_name}</h2>
                            <p className="text-xs font-bold text-slate-500 mb-6">
                                ID: {formData.employee_code || '---'} • {clients.find(c => c.id === formData.client_id)?.name || t('employeeDetail.workplace.empty')}
                            </p>

                            <div className="flex flex-wrap justify-center gap-2 mb-8">
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                    {formData.employment_type === 'regular' ? t('personal.regularEmployee') :
                                        formData.employment_type === 'temporary' ? t('personal.temporaryEmployee') :
                                            formData.employment_type === 'part-time' ? t('personal.partTimeEmployee') :
                                                '---'}
                                </span>
                                {formData.is_team_lead && (
                                    <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                        {t('employeeDetail.fields.isTeamLead')}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all">
                                    <span className="material-symbols-outlined text-[18px]">badge</span>
                                    {t('employeeDetail.actions.badge')}
                                </button>
                                <button className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all">
                                    <span className="material-symbols-outlined text-[18px]">history</span>
                                    {t('employeeDetail.actions.password')}
                                </button>
                            </div>
                        </div>

                        {/* Contact Info (Compact) */}
                        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-6 space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-black text-slate-900">{t('employeeDetail.sections.contactInfo')}</h3>
                                <button
                                    onClick={() => setIsContactModalOpen(true)}
                                    className="text-primary text-[10px] font-black uppercase tracking-wider hover:underline"
                                >
                                    {t('employeeDetail.actions.edit')}
                                </button>
                            </div>

                            <div className="space-y-5">
                                <div className="flex gap-3">
                                    <span className="material-symbols-outlined text-slate-300 text-[20px]">location_on</span>
                                    <div className="text-[11px] leading-tight">
                                        <p className="font-black text-slate-400 uppercase tracking-tighter mb-1">{t('employeeDetail.fields.mainAddress')}</p>
                                        <p className="font-bold text-slate-700">
                                            {formData.postal_code}<br />
                                            {formData.address_line1}<br />
                                            {formData.address_line2}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <span className="material-symbols-outlined text-slate-300 text-[20px]">smartphone</span>
                                    <div className="text-[11px] leading-tight">
                                        <p className="font-black text-slate-400 uppercase tracking-tighter mb-1">{t('employeeDetail.fields.phone')}</p>
                                        <p className="font-bold text-primary text-sm">{formData.phone}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <span className="material-symbols-outlined text-slate-300 text-[20px]">mail</span>
                                    <div className="text-[11px] leading-tight">
                                        <p className="font-black text-slate-400 uppercase tracking-tighter mb-1">{t('employeeDetail.fields.email')}</p>
                                        <p className="font-bold text-slate-700">{formData.email || t('employeeDetail.status.noValue', 'N/A')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Salary Rate History Section */}
                        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-black text-slate-900">{t('employeeDetail.rates.salaryTitle')}</h3>
                                <button
                                    onClick={() => handleOpenSalaryRateModal()}
                                    className="text-primary text-[10px] font-black uppercase tracking-wider hover:underline flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[14px]">add</span>
                                    {t('employeeDetail.rates.addRate')}
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400">{t('employeeDetail.rates.salarySubtitle')}</p>

                            {salaryRates.length === 0 ? (
                                <div className="text-center py-6 text-slate-400">
                                    <span className="material-symbols-outlined text-3xl mb-1">payments</span>
                                    <p className="text-xs">{t('employeeDetail.rates.noRates')}</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {salaryRates.map((rate) => (
                                        <div key={rate.id} className={`p-3 rounded-xl border ${isCurrentSalaryRate(rate) ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : 'border-slate-100'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg font-black text-slate-900">¥{rate.rate.toLocaleString()}</span>
                                                        <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 rounded-full text-slate-500">
                                                            {t(`employeeDetail.rates.${rate.rate_type}`)}
                                                        </span>
                                                        {isCurrentSalaryRate(rate) && (
                                                            <span className="text-[9px] px-1.5 py-0.5 bg-green-100 rounded-full text-green-700 font-bold">
                                                                {t('employeeDetail.rates.current')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                                        {rate.start_date} ~ {rate.end_date || '∞'}
                                                    </div>
                                                </div>
                                                <div className="flex gap-0.5">
                                                    <button onClick={() => handleOpenSalaryRateModal(rate)} className="p-1 text-slate-300 hover:text-primary">
                                                        <span className="material-symbols-outlined text-[16px]">edit</span>
                                                    </button>
                                                    <button onClick={() => handleDeleteSalaryRate(rate.id)} className="p-1 text-slate-300 hover:text-red-500">
                                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick Actions Sidebar */}
                        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('employeeDetail.sections.extraActions')}</h3>
                            </div>
                            <div className="divide-y divide-slate-50">
                                <button className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">print</span>
                                        <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{t('employeeDetail.actions.print')}</span>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors text-[20px]">chevron_right</span>
                                </button>
                                <button className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">attach_file</span>
                                        <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{t('employeeDetail.actions.attach')}</span>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors text-[20px]">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Tabbed Content */}
                    <div className="lg:col-span-9 space-y-8">

                        {/* Tab Bar */}
                        <div className="flex items-center gap-8 border-b border-slate-200 overflow-x-auto no-scrollbar scroll-smooth">
                            {[
                                { id: 'personal', label: t('employeeDetail.tabs.personal') },
                                { id: 'contract', label: t('employeeDetail.tabs.contract') },
                                { id: 'documents', label: t('employeeDetail.tabs.documents') },
                                { id: 'benefits', label: t('employeeDetail.tabs.benefits') },
                                { id: 'history', label: t('employeeDetail.tabs.history') }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as TabType)}
                                    className={`pb-4 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-4
                                        ${activeTab === tab.id
                                            ? 'text-primary border-primary'
                                            : 'text-slate-400 border-transparent hover:text-slate-600'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

                            {activeTab === 'personal' && (
                                <>
                                    {/* Dados Básicos Section */}
                                    <section className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 space-y-10 relative overflow-hidden">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                                            <h3 className="text-xl font-black text-slate-900">{t('employeeDetail.sections.basic')}</h3>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.fields.birthDate')}</label>
                                                <div className="relative group">
                                                    <input
                                                        type="date"
                                                        value={formData.birth_date}
                                                        onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-[20px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-slate-700"
                                                    />
                                                    <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">calendar_today</span>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.fields.gender')}</label>
                                                <select
                                                    value={formData.gender}
                                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-[20px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-slate-700 appearance-none"
                                                >
                                                    <option value="">{t('employeeDetail.status.select')}</option>
                                                    <option value="Male">{t('personal.male') || 'Male'}</option>
                                                    <option value="Female">{t('personal.female') || 'Female'}</option>
                                                    <option value="Other">{t('personal.other') || 'Other'}</option>
                                                </select>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.fields.workplace')}</label>
                                                <select
                                                    value={formData.client_id}
                                                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-[20px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-slate-700 appearance-none shadow-sm"
                                                >
                                                    <option value="">{t('employeeDetail.status.select')}</option>
                                                    {clients.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Dados Bancários Section */}
                                    <section className="bg-slate-50/50 rounded-[40px] border border-slate-100 p-10 space-y-10">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-slate-400">account_balance</span>
                                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('employeeDetail.sections.banking')}</h3>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t('employeeDetail.fields.bankName')}</label>
                                                <input
                                                    type="text" value={formData.bank_name}
                                                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                                    className="w-full px-6 py-4 bg-white border border-slate-200 rounded-[18px] outline-none font-bold text-slate-700 shadow-sm" placeholder={t('employeeDetail.placeholders.bankCode')}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t('employeeDetail.fields.bankBranch')}</label>
                                                <input
                                                    type="text" value={formData.bank_branch}
                                                    onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
                                                    className="w-full px-6 py-4 bg-white border border-slate-200 rounded-[18px] outline-none font-bold text-slate-700 shadow-sm" placeholder={t('employeeDetail.placeholders.bankBranch')}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t('employeeDetail.fields.bankAccountNumber')}</label>
                                                <input
                                                    type="text" value={formData.bank_account_number}
                                                    onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                                                    className="w-full px-6 py-4 bg-white border border-slate-200 rounded-[18px] outline-none font-bold text-slate-700 shadow-sm" placeholder={t('employeeDetail.placeholders.bankAccount')}
                                                />
                                            </div>
                                            <div className="space-y-2 md:col-span-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{t('employeeDetail.fields.bankAccountHolder')}</label>
                                                <input
                                                    type="text" value={formData.bank_account_holder}
                                                    onChange={(e) => setFormData({ ...formData, bank_account_holder: e.target.value })}
                                                    className="w-full px-6 py-4 bg-white border border-slate-200 rounded-[18px] outline-none font-bold text-slate-700 shadow-sm" placeholder={t('employeeDetail.placeholders.bankHolder')}
                                                />
                                            </div>
                                        </div>
                                    </section>
                                </>
                            )}

                            {activeTab === 'contract' && (
                                <section className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 space-y-10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                                            <h3 className="text-xl font-black text-slate-900">{t('employeeDetail.sections.contract')}</h3>
                                        </div>
                                        <span className="px-4 py-1.5 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-green-100">{t('employeeDetail.status.activeContract')}</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.fields.hireDate')}</label>
                                            <input type="date" value={formData.hire_date} onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] font-bold text-slate-700" />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.fields.contractEndDate')}</label>
                                            <input type="date" value={formData.contract_end_date} onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] font-bold text-slate-700" />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.fields.employmentType')}</label>
                                            <select value={formData.employment_type} onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] font-bold text-slate-700">
                                                <option value="regular">{t('personal.regularEmployee') || 'Regular'}</option>
                                                <option value="temporary">{t('personal.temporaryEmployee') || 'Temporary'}</option>
                                                <option value="part-time">{t('personal.partTimeEmployee') || 'Part-time'}</option>
                                            </select>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.fields.isTeamLead')}</label>
                                            <div className="flex items-center gap-3 h-[60px] px-5">
                                                <input type="checkbox" checked={formData.is_team_lead} onChange={(e) => setFormData({ ...formData, is_team_lead: e.target.checked })}
                                                    className="size-6 text-primary rounded ring-offset-2" />
                                                <span className="font-bold text-slate-700">{t('employeeDetail.fields.isTeamLead')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {activeTab === 'documents' && (
                                <section className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 space-y-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                                        <h3 className="text-xl font-black text-slate-900">{t('employeeDetail.sections.documents')}</h3>
                                    </div>

                                    <div className="space-y-8">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.fields.passportName')}</label>
                                            <input type="text" value={formData.passport_name} onChange={(e) => setFormData({ ...formData, passport_name: e.target.value })}
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[22px] font-bold text-slate-700 mt-2" placeholder={t('employeeDetail.placeholders.passportName')} />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.fields.nationality')}</label>
                                                <input type="text" value={formData.nationality} onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] font-bold text-slate-700" placeholder={t('employeeDetail.placeholders.nationality')} />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.fields.passportNumber')}</label>
                                                <input type="text" value={formData.passport_number} onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] font-bold text-slate-700" placeholder={t('employeeDetail.placeholders.passportNumber')} />
                                            </div>
                                        </div>

                                        <div className="p-10 bg-blue-50/30 rounded-[32px] border border-blue-100/50 flex flex-col md:flex-row gap-8 items-end">
                                            <div className="flex-1 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">{t('employeeDetail.fields.visaStatus')}</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/hr/visas?returnTo=${id}`)}
                                                        className="text-[9px] font-black text-primary uppercase tracking-wider hover:underline flex items-center gap-0.5"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">add</span>
                                                        {t('employeeDetail.actions.addVisaType', 'Adicionar Tipo')}
                                                    </button>
                                                </div>
                                                <select value={formData.visa_status} onChange={(e) => setFormData({ ...formData, visa_status: e.target.value })}
                                                    className="w-full px-6 py-4 bg-white border border-blue-100 rounded-[20px] font-bold text-slate-700 outline-none">
                                                    <option value="">{t('employeeDetail.status.selectVisa')}</option>
                                                    {visaTypes.map(visa => (
                                                        <option key={visa.id} value={visa.name}>
                                                            {i18n.language === 'ja' ? visa.label_ja :
                                                                i18n.language.startsWith('pt') ? visa.label_pt :
                                                                    visa.label_en}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="w-full md:w-[240px] space-y-4">
                                                <div className="flex justify-between items-center ml-1">
                                                    <label className="text-[10px] font-black text-primary uppercase tracking-widest">{t('employeeDetail.fields.visaExpiry')}</label>
                                                </div>
                                                <div className="flex items-center gap-4 px-6 py-4 bg-white border border-blue-100 rounded-[20px]">
                                                    <input type="date" value={formData.visa_expiry} onChange={(e) => setFormData({ ...formData, visa_expiry: e.target.value })}
                                                        className="bg-transparent border-none outline-none font-black text-slate-800 text-lg w-full" />
                                                    <span className="material-symbols-outlined text-primary bg-blue-50 p-1 rounded-lg">verified_user</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.fields.zairyuCardNumber')}</label>
                                                <input type="text" value={formData.zairyu_card_number} onChange={(e) => setFormData({ ...formData, zairyu_card_number: e.target.value })}
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] font-bold text-slate-700 uppercase" placeholder="AB12345678CD" />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.fields.zairyuCardExpiry')}</label>
                                                <div className="relative group">
                                                    <input type="date" value={formData.zairyu_card_expiry} onChange={(e) => setFormData({ ...formData, zairyu_card_expiry: e.target.value })}
                                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] font-bold text-slate-700" />
                                                    <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">event</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {activeTab === 'benefits' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <section className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 space-y-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                                            <h3 className="text-xl font-black text-slate-900">{t('employeeDetail.sections.benefits')}</h3>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{t('employeeDetail.fields.pensionNumber')}</label>
                                                <input type="text" value={formData.pension_number} onChange={(e) => setFormData({ ...formData, pension_number: e.target.value })}
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] font-bold text-slate-700" placeholder={t('employeeDetail.fields.pensionNumber')} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{t('employeeDetail.fields.unemploymentNumber')}</label>
                                                <input type="text" value={formData.unemployment_number} onChange={(e) => setFormData({ ...formData, unemployment_number: e.target.value })}
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] font-bold text-slate-700" placeholder={t('employeeDetail.fields.unemploymentNumber')} />
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-slate-50">
                                            {[
                                                { id: 'has_transport_allowance', label: t('employeeDetail.fields.transportAllowance'), sub: t('personal.transportSub') },
                                                { id: 'has_housing_allowance', label: t('employeeDetail.fields.housingAllowance'), sub: t('personal.housingSub') },
                                                { id: 'has_leadership_bonus', label: t('employeeDetail.fields.leadershipBonus'), sub: t('personal.leadershipSub') }
                                            ].map(item => (
                                                <label key={item.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={(formData as any)[item.id]}
                                                        onChange={(e) => setFormData({ ...formData, [item.id]: e.target.checked })}
                                                        className="size-6 text-primary rounded border-slate-300 ring-offset-4"
                                                    />
                                                    <div>
                                                        <p className="font-black text-slate-700 text-xs">{item.label}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold">{item.sub}</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </section>

                                    {/* Mocked History/Log for Visual Completeness */}
                                    <section className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 space-y-8">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xl font-black text-slate-900">{t('employeeDetail.sections.workHistory')}</h3>
                                            <button className="text-primary font-bold text-xs flex items-center gap-1">+ {t('employeeDetail.actions.new')}</button>
                                        </div>

                                        <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                                            <div className="relative">
                                                <div className="absolute -left-[27px] size-3 bg-primary rounded-full ring-4 ring-[#f2f5f8] z-10"></div>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-black text-slate-900 text-sm">Gerente de Vendas - Tokyo HQ</h4>
                                                        <p className="text-[10px] text-slate-400 font-bold">Desde 2022/04/01</p>
                                                        <p className="text-[10px] text-slate-500 mt-2">Promoção para liderança de equipe regional.</p>
                                                    </div>
                                                    <span className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded text-[9px] font-black uppercase">{t('employeeDetail.status.current')}</span>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <div className="absolute -left-[27px] size-3 bg-slate-300 rounded-full ring-4 ring-[#f2f5f8] z-10"></div>
                                                <div>
                                                    <h4 className="font-black text-slate-600 text-sm">Representante Comercial - Osaka</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold">2020/04/01 - 2022/03/31</p>
                                                    <p className="text-[10px] text-slate-500 mt-1">Entrada na empresa.</p>
                                                </div>
                                            </div>
                                        </div>

                                        <button className="w-full text-center py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors">
                                            {t('employeeDetail.actions.viewHistory')}
                                        </button>
                                    </section>
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <section className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 text-center py-20">
                                    <span className="material-symbols-outlined text-slate-200 text-6xl mb-4">timeline</span>
                                    <h3 className="text-xl font-black text-slate-400">{t('employeeDetail.status.comingSoon')}</h3>
                                    <p className="text-slate-400 font-bold max-w-xs mx-auto mt-2">{t('employeeDetail.status.historyDesc')}</p>
                                </section>
                            )}
                        </div>

                    </div>
                </div>
            </main>
            {/* Contact Modal */}
            {isContactModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('employeeDetail.sections.contactInfo')}</h3>
                            <button onClick={() => setIsContactModalOpen(false)} className="size-10 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.fields.postalCode')}</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={formData.postal_code}
                                            onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                                            className="flex-1 px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[22px] focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                                            placeholder="000-0000"
                                        />
                                        <button
                                            type="button"
                                            onClick={handlePostalSearch}
                                            disabled={isSearchingPostal || !formData.postal_code}
                                            className="px-6 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[22px] text-[10px] font-black uppercase text-primary hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-all flex items-center gap-2"
                                        >
                                            {isSearchingPostal ? (
                                                <div className="size-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                            ) : (
                                                <span className="material-symbols-outlined text-[18px]">search</span>
                                            )}
                                            {isSearchingPostal ? t('employeeDetail.actions.searching') : t('employeeDetail.actions.searchAddress')}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.fields.address1')}</label>
                                    <input
                                        type="text"
                                        value={formData.address_line1}
                                        onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[22px] focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                                        placeholder={t('employeeDetail.placeholders.address1')}
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.fields.address2')}</label>
                                    <input
                                        type="text"
                                        value={formData.address_line2}
                                        onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[22px] focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                                        placeholder={t('employeeDetail.placeholders.address2')}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.fields.phone')}</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[22px] focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                                        placeholder="000-0000-0000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.fields.email')}</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[22px] focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                                        placeholder={t('employeeDetail.placeholders.email')}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-10 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setIsContactModalOpen(false)}
                                className="px-8 py-4 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-slate-700 dark:hover:text-white transition-colors"
                            >
                                {t('employeeDetail.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsContactModalOpen(false)}
                                className="px-10 py-4 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95"
                            >
                                {t('employeeDetail.actions.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Basic Info Modal */}
            {isBasicInfoModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('employeeDetail.sections.basicInfo')}</h3>
                            <button onClick={() => setIsBasicInfoModalOpen(false)} className="size-10 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.fields.fullName')}</label>
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[22px] focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.fields.employeeCode')}</label>
                                    <input
                                        type="text"
                                        value={formData.employee_code}
                                        onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[22px] focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.fields.workplace')}</label>
                                    <select
                                        value={formData.client_id}
                                        onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[22px] focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold appearance-none"
                                    >
                                        <option value="">{t('employeeDetail.status.select')}</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.fields.employmentType')}</label>
                                    <select
                                        value={formData.employment_type}
                                        onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[22px] focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold appearance-none"
                                    >
                                        <option value="regular">{t('personal.regularEmployee') || 'Regular'}</option>
                                        <option value="temporary">{t('personal.temporaryEmployee') || 'Temporary'}</option>
                                        <option value="part-time">{t('personal.partTimeEmployee') || 'Part-time'}</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="p-10 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setIsBasicInfoModalOpen(false)}
                                className="px-8 py-4 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-slate-700 dark:hover:text-white transition-colors"
                            >
                                {t('employeeDetail.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsBasicInfoModalOpen(false)}
                                className="px-10 py-4 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95"
                            >
                                {t('employeeDetail.actions.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Salary Rate Modal */}
            {isSalaryRateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {editingSalaryRate ? t('employeeDetail.rates.editRate') : t('employeeDetail.rates.addRate')}
                            </h3>
                            <button onClick={() => setIsSalaryRateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSaveSalaryRate}>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('employeeDetail.rates.startDate')}</label>
                                        <input
                                            type="date"
                                            required
                                            value={salaryRateForm.start_date}
                                            onChange={(e) => setSalaryRateForm({ ...salaryRateForm, start_date: e.target.value })}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:border-primary outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('employeeDetail.rates.endDate')}</label>
                                        <input
                                            type="date"
                                            value={salaryRateForm.end_date}
                                            onChange={(e) => setSalaryRateForm({ ...salaryRateForm, end_date: e.target.value })}
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
                                            value={salaryRateForm.rate}
                                            onChange={(e) => setSalaryRateForm({ ...salaryRateForm, rate: Number(e.target.value) })}
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:border-primary outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('employeeDetail.rates.rateType')}</label>
                                        <select
                                            value={salaryRateForm.rate_type}
                                            onChange={(e) => setSalaryRateForm({ ...salaryRateForm, rate_type: e.target.value as any })}
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
                                    onClick={() => setIsSalaryRateModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    {t('employeeDetail.actions.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={salaryRateProcessing}
                                    className="px-6 py-2 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                                >
                                    {salaryRateProcessing ? t('employeeDetail.actions.saving') : t('employeeDetail.actions.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeDetail;
