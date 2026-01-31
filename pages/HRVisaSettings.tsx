import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getVisaTypes, createVisaType, deleteVisaType } from '../src/services/hrService';

interface VisaType {
    id: string;
    name: string;
    label_pt: string;
    label_en: string;
    label_ja: string;
}

const HRVisaSettings: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const returnTo = searchParams.get('returnTo');
    const [visas, setVisas] = useState<VisaType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState<Omit<VisaType, 'id'>>({
        name: '',
        label_pt: '',
        label_en: '',
        label_ja: ''
    });
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchVisas();
    }, []);

    const fetchVisas = async () => {
        try {
            setLoading(true);
            const data = await getVisaTypes();
            setVisas(data);
        } catch (error) {
            console.error('Error fetching visas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = () => {
        setForm({
            name: '',
            label_pt: '',
            label_en: '',
            label_ja: ''
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            await createVisaType(form);
            setIsModalOpen(false);
            fetchVisas();
        } catch (error: any) {
            alert(t('employeeDetail.status.saveError') + ': ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('employeeDetail.visaSettings.deleteConfirm'))) return;
        try {
            await deleteVisaType(id);
            fetchVisas();
        } catch (error: any) {
            alert('Erro ao excluir: ' + error.message);
        }
    };

    return (
        <div className="p-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            if (returnTo) {
                                navigate(`/hr/team/${returnTo}?tab=documents`);
                            } else {
                                navigate(-1);
                            }
                        }}
                        className="size-12 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm text-slate-400 hover:text-primary hover:border-primary/30 transition-all"
                        title={t('common.back', 'Voltar')}
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('employeeDetail.visaSettings.title')}</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-bold">{t('employeeDetail.visaSettings.subtitle')}</p>
                    </div>
                </div>
                <button
                    onClick={handleOpenModal}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-black text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95 uppercase tracking-wider"
                >
                    <span className="material-symbols-outlined">add</span>
                    {t('employeeDetail.visaSettings.add')}
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                        <tr>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('employeeDetail.visaSettings.columns.id')}</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('employeeDetail.visaSettings.columns.pt')}</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('employeeDetail.visaSettings.columns.en')}</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('employeeDetail.visaSettings.columns.ja')}</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('employeeDetail.actions.edit')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-bold">{t('employeeDetail.visaSettings.loading')}</td>
                            </tr>
                        ) : visas.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-bold">{t('employeeDetail.visaSettings.empty')}</td>
                            </tr>
                        ) : (
                            visas.map((visa) => (
                                <tr key={visa.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-8 py-5">
                                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                            {visa.name}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 font-bold text-slate-700 dark:text-slate-300 text-sm">{visa.label_pt}</td>
                                    <td className="px-8 py-5 font-bold text-slate-500 dark:text-slate-400 text-sm">{visa.label_en}</td>
                                    <td className="px-8 py-5 font-bold text-slate-500 dark:text-slate-400 text-sm">{visa.label_ja}</td>
                                    <td className="px-8 py-5 text-right">
                                        <button
                                            onClick={() => handleDelete(visa.id)}
                                            className="size-10 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all flex items-center justify-center shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('employeeDetail.visaSettings.new')}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="size-10 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="p-10 space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-primary">{t('employeeDetail.visaSettings.fields.internal')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[22px] focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                                        placeholder="Ex: Spouse"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.visaSettings.fields.pt')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.label_pt}
                                        onChange={(e) => setForm({ ...form, label_pt: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[22px] focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                                        placeholder="Ex: Cônjuge de Japonês"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.visaSettings.fields.en')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.label_en}
                                        onChange={(e) => setForm({ ...form, label_en: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[22px] focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                                        placeholder="Ex: Spouse of Japanese National"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('employeeDetail.visaSettings.fields.ja')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.label_ja}
                                        onChange={(e) => setForm({ ...form, label_ja: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[22px] focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                                        placeholder="Ex: 日本人の配偶者"
                                    />
                                </div>
                            </div>
                            <div className="p-10 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-8 py-4 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-slate-700 dark:hover:text-white transition-colors"
                                >
                                    {t('employeeDetail.actions.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-10 py-4 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
                                >
                                    {processing ? t('employeeDetail.actions.saving') : t('employeeDetail.visaSettings.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HRVisaSettings;
