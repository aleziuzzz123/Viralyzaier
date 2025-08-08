import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../services/supabaseClient';

export const AuthPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#1A0F3C] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md mx-auto">
                <div className="text-center mb-8">
                    <img src="images/dashboard-logo.png" alt="Vid Script Hub Logo" className="h-10 w-auto mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-white">Welcome to Vid Script Hub</h1>
                    <p className="text-purple-300">Sign up or sign in to continue.</p>
                </div>
                <div className="bg-[#2A1A5E] p-8 rounded-xl border border-[#4A3F7A]">
                     <Auth
                        supabaseClient={supabase}
                        appearance={{ 
                            theme: ThemeSupa,
                            variables: {
                                default: {
                                    colors: {
                                        brand: '#DAFF00',
                                        brandAccent: '#a8c400',
                                        brandButtonText: '#1A0F3C',
                                        defaultButtonBackground: '#1A0F3C',
                                        defaultButtonBackgroundHover: '#4A3F7A',
                                        defaultButtonBorder: '#4A3F7A',
                                        defaultButtonText: '#F0F0F0',
                                        inputBackground: '#1A0F3C',
                                        inputBorder: '#4A3F7A',
                                        inputBorderHover: '#DAFF00',
                                        inputBorderFocus: '#DAFF00',
                                        inputText: '#F0F0F0',
                                        inputLabelText: '#a78bfa',
                                        inputPlaceholder: '#6b7280',
                                        messageText: '#F0F0F0',
                                        messageTextDanger: '#fca5a5',
                                        anchorTextColor: '#a78bfa',
                                        anchorTextHoverColor: '#DAFF00',
                                    },
                                    space: {
                                        buttonPadding: '12px 15px',
                                        inputPadding: '12px 15px',
                                        labelBottomMargin: '8px'
                                    },
                                    radii: {
                                        borderRadiusButton: '8px',
                                        inputBorderRadius: '8px'
                                    }
                                }
                            }
                        }}
                        providers={['google']}
                        theme="dark"
                        localization={{
                            variables: {
                                sign_up: {
                                    email_label: 'Email address',
                                    password_label: 'Create a Password',
                                    button_label: 'Sign up',
                                    social_provider_text: 'Sign up with {{provider}}',
                                    link_text: 'Already have an account? Sign in',
                                },
                                sign_in: {
                                    email_label: 'Email address',
                                    password_label: 'Your Password',
                                    button_label: 'Sign in',
                                    social_provider_text: 'Sign in with {{provider}}',
                                    link_text: "Don't have an account? Sign up",
                                },
                            },
                        }}
                    />
                </div>
            </div>
        </div>
    );
};