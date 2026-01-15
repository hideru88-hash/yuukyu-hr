import React, { ReactNode } from 'react';

interface AuthCardProps {
    title: string;
    subtitle?: string;
    icon?: string;
    children: ReactNode;
}

const AuthCard: React.FC<AuthCardProps> = ({ title, subtitle, icon, children }) => {
    return (
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
            <div className="p-8 flex flex-col items-center">
                {icon && (
                    <div className="mb-6 w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center text-primary shadow-sm border border-primary/10">
                        <span className="material-symbols-outlined text-[40px]">{icon}</span>
                    </div>
                )}

                <h2 className="text-2xl font-bold text-[#1e4067] tracking-tight text-center mb-2">{title}</h2>

                {subtitle && (
                    <p className="text-gray-500 text-center mb-8 px-4 font-medium leading-relaxed">
                        {subtitle}
                    </p>
                )}

                <div className="w-full">
                    {children}
                </div>
            </div>

            <div className="bg-gray-50/50 p-4 border-t border-gray-100 flex items-center justify-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                <span>Ambiente Criptografado</span>
            </div>
        </div>
    );
};

export default AuthCard;
