
import React, { useState } from 'react';
import { signInWithPassword, signUp, sendPasswordResetEmail } from '../services/supabaseService';
import { SparklesIcon, XCircleIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
    const { t } = useAppContext();
    type ModalMode = 'login' | 'signup' | 'forgotPassword';
    const [mode, setMode] = useState<ModalMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        if (!email || !password) {
            setError(t('login.error_both_fields'));
            return;
        }
        setIsLoading(true);
        try {
            await signInWithPassword(email, password);
            handleClose();
        } catch (err: any) {
            setError(err?.message || t('login.error_invalid_credentials'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        if (!email || !password) {
            setError(t('login.error_both_fields'));
            return;
        }
        setIsLoading(true);
        try {
            await signUp(email, password);
            setMessage(t('login.success_signup'));
        } catch (err: any) {
            setError(err?.message || t('login.error_signup_failed'));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        if (!email) {
            setError(t('login.error_email_missing'));
            return;
        }
        setIsLoading(true);
        try {
            await sendPasswordResetEmail(email);
            setMessage(t('login.success_reset'));
        } catch (err: any) {
            setError(err?.message || t('login.error_reset_failed'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setEmail('');
        setPassword('');
        setIsLoading(false);
        setError('');
        setMessage('');
        setMode('login');
        onClose();
    };

    const switchMode = (newMode: ModalMode) => {
        setError('');
        setMessage('');
        setMode(newMode);
    };
    
    if (!isOpen) return null;

    const renderContent = () => {
        if (mode === 'signup') {
            return (
                <>
                    <h2 id="login-modal-title" className="text-2xl font-bold text-white mb-3">{t('login.signup_title')}</h2>
                    <p className="text-gray-300 mb-6">{t('login.signup_subtitle')}</p>
                    <form onSubmit={handleSignUp} className="flex flex-col gap-4">
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('login.email_placeholder')} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('login.signup_password_placeholder')} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                        <button type="submit" disabled={isLoading} className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all disabled:bg-gray-600 disabled:cursor-wait">
                            {isLoading ? t('login.creating_account') : t('login.signup_button')}
                        </button>
                    </form>
                    <p className="text-sm text-gray-400 mt-4">
                        {t('login.have_account')} <button onClick={() => switchMode('login')} className="font-semibold text-indigo-400 hover:underline">{t('login.button')}</button>
                    </p>
                </>
            );
        }

        if (mode === 'forgotPassword') {
             return (
                <>
                    <h2 id="login-modal-title" className="text-2xl font-bold text-white mb-3">{t('login.reset_password_title')}</h2>
                    <p className="text-gray-300 mb-6">{t('login.reset_password_subtitle')}</p>
                    <form onSubmit={handlePasswordReset} className="flex flex-col gap-4">
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('login.email_placeholder')} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                        <button type="submit" disabled={isLoading} className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all disabled:bg-gray-600 disabled:cursor-wait">
                            {isLoading ? t('login.sending') : t('login.reset_password_button')}
                        </button>
                    </form>
                    <p className="text-sm text-gray-400 mt-4">
                        {t('login.remember_password')} <button onClick={() => switchMode('login')} className="font-semibold text-indigo-400 hover:underline">{t('login.button')}</button>
                    </p>
                </>
            );
        }

        return ( // Default to login
            <>
                <h2 id="login-modal-title" className="text-2xl font-bold text-white mb-3">{t('login.welcome')}</h2>
                <p className="text-gray-300 mb-6">{t('login.welcome_subtitle')}</p>
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('login.email_placeholder')} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('login.password_placeholder')} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                    <button type="submit" disabled={isLoading} className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all disabled:bg-gray-600 disabled:cursor-wait">
                        {isLoading ? t('login.loading') : t('login.button')}
                    </button>
                </form>
                 <div className="text-sm text-gray-400 mt-4 flex justify-between">
                    <button onClick={() => switchMode('forgotPassword')} className="font-semibold text-indigo-400 hover:underline">{t('login.forgot_password')}</button>
                    <button onClick={() => switchMode('signup')} className="font-semibold text-indigo-400 hover:underline">{t('login.no_account')}</button>
                </div>
            </>
        );
    };

    return (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center animate-fade-in-up" style={{ animationDuration: '0.3s' }} onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
            <div className="bg-gray-800 border border-indigo-500/50 rounded-2xl shadow-2xl w-full max-w-md m-4 p-8 text-center transform transition-all relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                    <XCircleIcon className="w-8 h-8"/>
                </button>
                <div className="mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-full w-fit mb-6">
                    <SparklesIcon className="w-10 h-10 text-white" />
                </div>
                {renderContent()}
                {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
                {message && <p className="text-green-400 mt-4 text-sm">{message}</p>}
            </div>
        </div>
    );
};

export default LoginModal;
