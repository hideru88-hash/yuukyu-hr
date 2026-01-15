import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import AuthCard from '../src/components/AuthCard';
import OTPInput from '../src/components/OTPInput';
import { useAuth } from '../contexts/AuthContext';

const Manager2FA: React.FC = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [timeLeft, setTimeLeft] = useState(60);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [otp, setOtp] = useState('');
    const [canResend, setCanResend] = useState(false);

    // Initial check and code sending
    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/manager/login');
            return;
        }

        // Auto-verify in DEV mode
        if (import.meta.env.DEV) {
            sessionStorage.setItem('is2FAVerified', 'true');
            navigate('/hr');
            return;
        }

        if (user) {
            sendVerificationCode(user.id);
        }
    }, [user, authLoading]);

    // Timer logic
    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [timeLeft]);

    const generateCode = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    };

    const sendVerificationCode = async (userId: string) => {
        try {
            const code = generateCode();
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

            // 1. Save to DB
            const { error } = await supabase
                .from('verification_codes')
                .insert({
                    user_id: userId,
                    code: code,
                    expires_at: expiresAt
                });

            if (error) throw error;

            console.log(`[DEV MODE] 2FA Code for ${userId}: ${code}`);

            // Here you would actually trigger an email (e.g., via Edge Function)
            // For now we simulate it
            console.log("📨 Email sent successfully (simulated)");

            // Reset timer
            setTimeLeft(60);
            setCanResend(false);
            setError(null);

        } catch (err: any) {
            console.error("Error sending code:", err);
            setError("Erro ao enviar código. Tente novamente.");
        }
    };

    const handleResend = () => {
        if (user && canResend) {
            sendVerificationCode(user.id);
        }
    };

    const handleVerify = async () => {
        if (otp.length !== 6) return;
        setVerifying(true);
        setError(null);

        try {
            // 1. Check against DB
            const { data, error } = await supabase
                .from('verification_codes')
                .select('*')
                .eq('user_id', user!.id)
                .eq('code', otp)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !data) {
                throw new Error("Código inválido ou expirado.");
            }

            // 2. Success! Mark in SessionStorage
            sessionStorage.setItem('is2FAVerified', 'true');

            // 3. Clean up used codes (optional, or rely on expiry)
            // await supabase.from('verification_codes').delete().eq('id', data.id);

            // 4. Redirect
            navigate('/hr');

        } catch (err: any) {
            console.error("Verification failed:", err);
            setError(err.message || "Falha na verificação.");
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="min-h-screen bg-background-light flex flex-col items-center justify-center p-6 relative">

            {/* Nav Back (Optional) */}
            <div className="absolute top-6 left-6 z-20">
                <button onClick={() => navigate('/manager/login')} className="flex items-center gap-2 text-primary font-bold hover:opacity-70 transition-opacity">
                    <span className="material-symbols-outlined">arrow_back</span>
                    <span>Voltar</span>
                </button>
            </div>

            <div className="w-full max-w-md z-10">
                <AuthCard
                    title="Verificação de Segurança"
                    icon="shield_lock"
                    subtitle="Insira o código de 6 dígitos enviado para o seu e-mail ou aplicativo autenticador."
                >
                    <div className="space-y-8">
                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm text-center font-medium rounded-xl border border-red-100">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-center py-2">
                            <OTPInput
                                length={6}
                                onComplete={(code) => setOtp(code)}
                                disabled={verifying}
                            />
                        </div>

                        <div className="flex flex-col items-center gap-4">
                            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                <span className="material-symbols-outlined text-[18px]">schedule</span>
                                <span>O código expira em <span className="font-bold text-[#193b5c]">{`00:${timeLeft.toString().padStart(2, '0')}`}</span></span>
                            </div>

                            <button
                                onClick={handleResend}
                                disabled={!canResend || verifying}
                                className={`text-sm font-bold transition-colors ${canResend ? 'text-primary hover:text-primary-dark cursor-pointer' : 'text-gray-300 cursor-not-allowed'}`}
                            >
                                Reenviar código
                            </button>
                        </div>

                        <div className="pt-2 space-y-4">
                            <button
                                onClick={handleVerify}
                                disabled={verifying || otp.length !== 6}
                                className="w-full h-14 rounded-xl bg-[#193b5c] hover:bg-[#152d49] active:scale-[0.98] transition-all duration-300 shadow-lg shadow-[#193b5c]/20 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {verifying ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <span className="text-white text-base font-bold">Confirmar e Entrar</span>
                                )}
                            </button>

                            <button className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-primary transition-colors text-sm font-medium">
                                <span className="material-symbols-outlined text-[18px]">grid_view</span>
                                <span>Usar outro método</span>
                            </button>
                        </div>
                    </div>
                </AuthCard>
                <p className="mt-8 text-center text-xs text-gray-400 font-medium">
                    Código não chegou? Verifique sua caixa de Spam.
                </p>
            </div>
        </div>
    );
};

export default Manager2FA;
