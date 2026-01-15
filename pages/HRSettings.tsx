import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const HRSettings: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { profile, user, refreshProfile } = useAuth();

    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
    const [language, setLanguage] = useState(profile?.language || i18n.language.split('-')[0] || 'en');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setAvatarUrl(profile.avatar_url || '');
            setLanguage(profile.language || i18n.language.split('-')[0] || 'en');
        }
    }, [profile, i18n.language]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);

        try {
            // Try to update both, but be ready for it to fail if language column is missing
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    full_name: fullName,
                    language: language,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user?.id);

            if (error) {
                console.warn('Could not update language in DB (column might be missing), falling back to localStorage');
                // Fallback: update only full_name
                await supabase
                    .from('user_profiles')
                    .update({
                        full_name: fullName,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user?.id);
            }

            // i18n changeLanguage will persist to localStorage regardless of DB
            if (language !== i18n.language) {
                i18n.changeLanguage(language);
            }

            // Refresh global context profile
            await refreshProfile();

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error: any) {
            console.error('Error updating profile:', error);
            alert('Error updating profile: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error(t('profile.selectImage'));
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user!.id}/${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const publicUrl = data.publicUrl;

            const { error: updateError } = await supabase
                .from('user_profiles')
                .update({
                    avatar_url: publicUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user!.id);

            if (updateError) throw updateError;

            setAvatarUrl(publicUrl);
        } catch (error: any) {
            alert(t('profile.uploadError', { error: error.message }));
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8 animate-in fade-in duration-500">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('profile.title')}</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">{t('profile.settingsSubtitle')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Avatar */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center">
                        <div className="relative group">
                            <div
                                className="size-32 rounded-3xl bg-cover bg-center shadow-lg border-4 border-slate-50 dark:border-slate-800 relative overflow-hidden"
                                style={{ backgroundImage: `url("${avatarUrl || 'https://i.pravatar.cc/150?u=' + user?.id}")` }}
                            >
                                <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                    onClick={() => document.getElementById('avatar-input')?.click()}>
                                    <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                                </div>
                            </div>
                            <input
                                id="avatar-input"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={uploadAvatar}
                                disabled={uploading}
                            />
                            {uploading && (
                                <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 rounded-3xl flex items-center justify-center">
                                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                        <h3 className="mt-4 font-bold text-lg">{fullName || 'User'}</h3>
                        <p className="text-sm text-slate-500 uppercase tracking-wider font-medium">{t('profile.productManager')}</p>
                    </div>

                    <div className="bg-primary p-6 rounded-2xl text-white shadow-lg shadow-primary/20">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined">security</span>
                            <h4 className="font-bold">{t('profile.securityTitle')}</h4>
                        </div>
                        <p className="text-sm text-white/70 mb-4">{t('profile.securitySubtitle')}</p>
                        <button className="w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-colors border border-white/10">
                            {t('profile.changePassword')}
                        </button>
                    </div>
                </div>

                {/* Right Column: Form */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('profile.fullName')}</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                    placeholder="Ex: Fernando Hideru"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('profile.language')}</label>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                >
                                    <option value="en">English (US)</option>
                                    <option value="pt">Português (Brasil)</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">{t('profile.corporateEmail')}</label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border-transparent text-slate-500 cursor-not-allowed outline-none"
                            />
                        </div>

                        <div className="pt-4 flex items-center justify-between">
                            {success && (
                                <div className="flex items-center gap-2 text-green-500 font-bold animate-in fade-in slide-in-from-left-4">
                                    <span className="material-symbols-outlined">check_circle</span>
                                    <span>{t('profile.profileUpdated')}</span>
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
                                        <span>{t('profile.save')}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default HRSettings;
