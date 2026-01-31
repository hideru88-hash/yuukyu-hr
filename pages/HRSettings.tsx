import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';

const HRSettings: React.FC = () => {
    const { t } = useTranslation();

    // Company Settings State
    const [companySettings, setCompanySettings] = useState({
        company_name: '',
        postal_code: '',
        address: '',
        phone: '',
        fax: '',
        email: '',
        representative: '',
        representative_title: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [isSearchingPostal, setIsSearchingPostal] = useState(false);

    useEffect(() => {
        fetchCompanySettings();
    }, []);

    const fetchCompanySettings = async () => {
        try {
            const { data, error } = await supabase
                .from('company_settings')
                .select('*')
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching settings:', error);
            }
            if (data) {
                setCompanySettings({
                    company_name: data.company_name || '',
                    postal_code: data.postal_code || '',
                    address: data.address || '',
                    phone: data.phone || '',
                    fax: data.fax || '',
                    email: data.email || '',
                    representative: data.representative || '',
                    representative_title: data.representative_title || ''
                });
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handlePostalSearch = async () => {
        if (!companySettings.postal_code) return;
        setIsSearchingPostal(true);
        try {
            const { lookupAddressByPostalCode } = await import('../src/services/hrService');
            const address = await lookupAddressByPostalCode(companySettings.postal_code);
            if (address) {
                setCompanySettings({ ...companySettings, address: address });
            } else {
                alert(t('settings.addressNotFound', '住所が見つかりませんでした'));
            }
        } catch (error) {
            console.error('Error searching address:', error);
        } finally {
            setIsSearchingPostal(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);

        try {
            // Check if settings exist
            const { data: existing } = await supabase
                .from('company_settings')
                .select('id')
                .single();

            if (existing) {
                // Update existing
                await supabase
                    .from('company_settings')
                    .update({
                        ...companySettings,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
            } else {
                // Insert new
                await supabase
                    .from('company_settings')
                    .insert({
                        ...companySettings,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error: any) {
            console.error('Error saving settings:', error);
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8 animate-in fade-in duration-500">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('settings.title', '設定')}</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">{t('settings.subtitle', '会社の基本情報を設定します。')}</p>
            </div>

            {/* Company Settings Section */}
            <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 space-y-8">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary">apartment</span>
                    </div>
                    <div>
                        <h2 className="font-bold text-lg text-slate-900 dark:text-white">{t('settings.companyInfo', '派遣元会社情報')}</h2>
                        <p className="text-sm text-slate-400">{t('settings.companyInfoSubtitle', '自社の基本情報を入力してください。')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Company Name */}
                    <div className="md:col-span-2 space-y-2">
                        <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('settings.companyName', '派遣元会社名')}</label>
                        <input
                            type="text"
                            value={companySettings.company_name}
                            onChange={(e) => setCompanySettings({ ...companySettings, company_name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                            placeholder="例: 株式会社東海理機"
                        />
                    </div>

                    {/* Representative */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('settings.representative', '派遣元責任者')}</label>
                        <input
                            type="text"
                            value={companySettings.representative}
                            onChange={(e) => setCompanySettings({ ...companySettings, representative: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                            placeholder="例: 山田太郎"
                        />
                    </div>

                    {/* Representative Title */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('settings.representativeTitle', '役職')}</label>
                        <input
                            type="text"
                            value={companySettings.representative_title}
                            onChange={(e) => setCompanySettings({ ...companySettings, representative_title: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                            placeholder="例: 代表取締役"
                        />
                    </div>

                    {/* Postal Code */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('settings.postalCode', '郵便番号')}</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={companySettings.postal_code}
                                onChange={(e) => setCompanySettings({ ...companySettings, postal_code: e.target.value })}
                                className="flex-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                placeholder="123-4567"
                            />
                            <button
                                type="button"
                                onClick={handlePostalSearch}
                                disabled={isSearchingPostal}
                                className="px-4 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-bold text-sm text-slate-600 dark:text-slate-300 disabled:opacity-50"
                            >
                                {isSearchingPostal ? (
                                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <span className="material-symbols-outlined text-sm">search</span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="md:col-span-2 space-y-2">
                        <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('settings.address', '住所')}</label>
                        <input
                            type="text"
                            value={companySettings.address}
                            onChange={(e) => setCompanySettings({ ...companySettings, address: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                            placeholder="例: 愛知県名古屋市中区〇〇町1-2-3"
                        />
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('settings.phone', '電話番号')}</label>
                        <input
                            type="tel"
                            value={companySettings.phone}
                            onChange={(e) => setCompanySettings({ ...companySettings, phone: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                            placeholder="052-123-4567"
                        />
                    </div>

                    {/* FAX */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('settings.fax', 'FAX番号')}</label>
                        <input
                            type="tel"
                            value={companySettings.fax}
                            onChange={(e) => setCompanySettings({ ...companySettings, fax: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                            placeholder="052-123-4568"
                        />
                    </div>

                    {/* Email */}
                    <div className="md:col-span-2 space-y-2">
                        <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('settings.email', 'メールアドレス')}</label>
                        <input
                            type="email"
                            value={companySettings.email}
                            onChange={(e) => setCompanySettings({ ...companySettings, email: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                            placeholder="info@example.com"
                        />
                    </div>
                </div>

                {/* Save Button */}
                <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                    {success && (
                        <div className="flex items-center gap-2 text-green-500 font-bold animate-in fade-in slide-in-from-left-4">
                            <span className="material-symbols-outlined">check_circle</span>
                            <span>{t('settings.saved', '保存しました')}</span>
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="ml-auto px-8 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center gap-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[20px]">save</span>
                                <span>{t('settings.save', '保存')}</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default HRSettings;
