import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const Profile: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { user, signOut, refreshProfile } = useAuth();
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [fullName, setFullName] = useState<string>('');
    const [hireDate, setHireDate] = useState<string | null>(null);

    // Name editing state
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState('');

    // Password changing state
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    useEffect(() => {
        if (user) {
            getProfile();
        }
    }, [user]);

    const getProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('avatar_url, full_name, hire_date')
                .eq('id', user!.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (data) {
                setAvatarUrl(data.avatar_url);
                setFullName(data.full_name);
                setHireDate(data.hire_date);
                setNewName(data.full_name || '');
            }
        } catch (error) {
            console.error('Error loading user data!', error);
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

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const publicUrl = data.publicUrl;

            const { error: updateError } = await supabase
                .from('user_profiles')
                .upsert({
                    id: user!.id,
                    avatar_url: publicUrl,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });

            if (updateError) {
                throw updateError;
            }

            setAvatarUrl(publicUrl);
        } catch (error: any) {
            alert(t('profile.uploadError', { error: error.message || error.error_description || JSON.stringify(error) }));
            console.error('Full error object:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleNameSave = async () => {
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ full_name: newName, updated_at: new Date().toISOString() })
                .eq('id', user!.id);

            if (error) throw error;

            setFullName(newName);
            setIsEditingName(false);
            await refreshProfile();
            alert(t('profile.nameUpdated'));
        } catch (error: any) {
            console.error('Error updating name:', error);
            alert('Error updating name: ' + error.message);
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            alert(t('profile.passwordUpdated'));
            setShowPasswordModal(false);
            setNewPassword('');
        } catch (error: any) {
            console.error('Error updating password:', error);
            alert(t('profile.passwordUpdateError', { error: error.message }));
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <div className="flex flex-col h-full bg-background-light relative">
            <header className="flex items-center px-6 pt-6 pb-2 justify-between sticky top-0 z-20 bg-background-light/90 backdrop-blur-md">
                <h2 className="text-xl font-extrabold tracking-tight text-center w-full">{t('profile.title')}</h2>
            </header>

            <main className="flex flex-col px-5 pt-4 gap-6 pb-12">
                <section className="flex flex-col items-center">
                    <div className="relative mb-5 group">
                        <div
                            className="w-32 h-32 rounded-full bg-cover bg-center shadow-soft ring-4 ring-white cursor-pointer relative overflow-hidden"
                            style={{ backgroundImage: `url("${avatarUrl || 'https://i.pravatar.cc/150?u=' + (user?.email || 'default')}")` }}
                            onClick={() => document.getElementById('avatar-upload')?.click()}
                        >
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                                <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 font-bold">edit</span>
                            </div>
                        </div>
                        <input
                            type="file"
                            id="avatar-upload"
                            accept="image/*"
                            className="hidden"
                            onChange={uploadAvatar}
                            disabled={uploading}
                        />
                        <div className="absolute bottom-1 right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-white"></div>
                        {uploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-full">
                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>

                    <div className="text-center space-y-1 w-full max-w-xs mx-auto">
                        {isEditingName ? (
                            <div className="flex flex-col gap-2 animate-fadeIn">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full text-center text-xl font-bold text-[#121517] bg-white border border-primary rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder={t('profile.enterNewName')}
                                    autoFocus
                                />
                                <div className="flex justify-center gap-2">
                                    <button
                                        onClick={() => { setIsEditingName(false); setNewName(fullName); }}
                                        className="text-xs font-semibold text-gray-500 hover:bg-gray-100 px-3 py-1 rounded-full transition-colors"
                                    >
                                        {t('profile.cancel')}
                                    </button>
                                    <button
                                        onClick={handleNameSave}
                                        className="text-xs font-semibold text-white bg-primary hover:bg-primary-dark px-3 py-1 rounded-full transition-colors shadow-sm"
                                    >
                                        {t('profile.save')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="group relative inline-block">
                                <h1 className="text-2xl font-bold text-[#121517] flex items-center justify-center gap-2">
                                    {fullName || user?.email?.split('@')[0] || 'Employee'}
                                    <button
                                        onClick={() => setIsEditingName(true)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-primary"
                                        title={t('profile.editName')}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                    </button>
                                </h1>
                            </div>
                        )}
                        <p className="text-[#687782] font-medium text-base">{t('profile.productManager')}</p>
                    </div>
                </section>

                <section className="space-y-3">
                    <div className="bg-white rounded-2xl p-5 shadow-soft border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('profile.employmentDetails')}</h3>
                        </div>
                        <div className="flex flex-col gap-5">
                            <div className="flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500">
                                        <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-600">{t('profile.hireDate')}</span>
                                </div>
                                <span className="text-sm font-bold text-[#121517]">
                                    {hireDate ? new Date(hireDate).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500">
                                        <span className="material-symbols-outlined text-[20px]">policy</span>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-600">{t('profile.currentPolicy')}</span>
                                </div>
                                <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">Standard (20 {t('common.days')})</span>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-2">
                    <h3 className="px-2 text-xs font-bold text-gray-400 uppercase tracking-widest">{t('profile.settings')}</h3>
                    <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
                        <button className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors border-b border-gray-50 group">
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-50 text-blue-500 p-2 rounded-lg">
                                    <span className="material-symbols-outlined text-[22px]">notifications</span>
                                </div>
                                <span className="text-base font-medium text-[#121517]">{t('profile.notifications')}</span>
                            </div>
                            <span className="material-symbols-outlined text-gray-300 text-[20px]">arrow_forward_ios</span>
                        </button>

                        <button
                            onClick={() => setShowPasswordModal(true)}
                            className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors border-b border-gray-50 group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="bg-indigo-50 text-indigo-500 p-2 rounded-lg">
                                    <span className="material-symbols-outlined text-[22px]">lock</span>
                                </div>
                                <span className="text-base font-medium text-[#121517]">{t('profile.changePassword')}</span>
                            </div>
                            <span className="material-symbols-outlined text-gray-300 text-[20px]">arrow_forward_ios</span>
                        </button>

                        <button className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 group">
                            <div className="flex items-center gap-4">
                                <div className="bg-teal-50 text-teal-500 p-2 rounded-lg">
                                    <span className="material-symbols-outlined text-[22px]">support_agent</span>
                                </div>
                                <span className="text-base font-medium text-[#121517]">{t('profile.helpSupport')}</span>
                            </div>
                            <span className="material-symbols-outlined text-gray-300 text-[20px]">arrow_forward_ios</span>
                        </button>
                    </div>
                </section>

                {/* Language Selector */}
                <section className="space-y-2">
                    <h3 className="px-2 text-xs font-bold text-gray-400 uppercase tracking-widest">{t('profile.language')}</h3>
                    <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden p-2 flex items-center gap-2">
                        <button
                            onClick={async () => {
                                i18n.changeLanguage('en');
                                await supabase.from('user_profiles').update({ language: 'en' }).eq('id', user?.id);
                                await refreshProfile();
                            }}
                            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${i18n.language.startsWith('en') ? 'bg-primary text-white shadow-md' : 'bg-transparent text-gray-500 hover:bg-gray-50'}`}
                        >
                            English
                        </button>
                        <button
                            onClick={async () => {
                                i18n.changeLanguage('pt');
                                await supabase.from('user_profiles').update({ language: 'pt' }).eq('id', user?.id);
                                await refreshProfile();
                            }}
                            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${i18n.language.startsWith('pt') ? 'bg-primary text-white shadow-md' : 'bg-transparent text-gray-500 hover:bg-gray-50'}`}
                        >
                            Português
                        </button>
                        <button
                            onClick={async () => {
                                i18n.changeLanguage('ja');
                                await supabase.from('user_profiles').update({ language: 'ja' }).eq('id', user?.id);
                                await refreshProfile();
                            }}
                            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${i18n.language.startsWith('ja') ? 'bg-primary text-white shadow-md' : 'bg-transparent text-gray-500 hover:bg-gray-50'}`}
                        >
                            日本語
                        </button>
                    </div>
                </section>

                <section className="pt-2">
                    <button
                        onClick={handleSignOut}
                        className="w-full group relative flex items-center justify-center gap-3 py-4 rounded-xl bg-white text-red-500 font-bold text-sm shadow-sm border border-red-100 overflow-hidden transition-all hover:shadow-md hover:border-red-200 active:scale-[0.98]"
                    >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        <span>{t('profile.logOut')}</span>
                    </button>
                    <p className="text-center text-[10px] text-gray-400 mt-6 tracking-wide font-medium">YUUKYU v2.4.0 (302)</p>
                </section>
            </main>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slideUp">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-slate-900">{t('profile.updatePassword')}</h3>
                                <button
                                    onClick={() => setShowPasswordModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <form onSubmit={handlePasswordUpdate} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700 ml-1">{t('profile.newPassword')}</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={passwordLoading}
                                    className="w-full h-12 mt-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg shadow-primary/25 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                >
                                    {passwordLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <span>{t('profile.save')}</span>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;