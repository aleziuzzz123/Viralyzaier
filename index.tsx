/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { translations } from './translations';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, { hasError: boolean, error: Error | null }> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Basic language detection from browser, default to English.
      const lang = navigator.language.split('-')[0] as keyof typeof translations;
      const t = translations[lang] || translations.en;
      
      let title = t['app.error.title'];
      let description = t['app.error.description'];
      let errorListItems = [];

      const requiredKeys = [
        { key: 'VITE_API_KEY', purpose: 'for Core AI features (Gemini)' },
        { key: 'VITE_SUPABASE_URL', purpose: 'for Backend & Database' },
        { key: 'VITE_SUPABASE_ANON_KEY', purpose: 'for Backend & Database' },
        { key: 'VITE_ELEVENLABS_API_KEY', purpose: 'for AI Voice Generation' },
        { key: 'VITE_RUNWAYML_API_KEY', purpose: 'for AI Video Generation' },
        { key: 'VITE_GOOGLE_CLIENT_ID', purpose: 'for YouTube API Connection' },
      ];

      // Vite exposes env variables on import.meta.env
      const envVars = (import.meta as any).env;

      const missingKeys = requiredKeys.filter(item => !envVars[item.key]);

      if (missingKeys.length > 0) {
        title = "Environment Not Configured";
        description = "The application cannot start because one or more required environment variables are missing in your Vercel/hosting setup.";
        errorListItems = missingKeys.map(item => <li key={item.key}><code>{item.key}</code> ({item.purpose})</li>);
      } else {
        // Generic error if no keys are missing but an error still occurred
        errorListItems = [
          <li key="generic">An unexpected error occurred. Check the console for details.</li>
        ];
      }


      return (
        <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center p-4">
          <div className="text-center bg-gray-800 p-8 rounded-lg shadow-2xl border border-red-500/50 max-w-lg">
              <h1 className="text-2xl font-bold text-red-400">{title}</h1>
              <p className="mt-3 text-gray-300">
                {description}
              </p>
              <div className="mt-4 text-left bg-gray-900 p-4 rounded-md">
                <p className="text-sm text-gray-400 font-semibold">{t['app.error.cause']}</p>
                <ul className="list-disc list-inside text-sm text-gray-400 mt-2 space-y-1">
                  {errorListItems}
                </ul>
                <p className="text-xs text-gray-500 mt-3">{t['app.error.solution']}</p>
              </div>
              <p className="mt-4 text-sm text-red-300 font-mono bg-red-900/50 p-2 rounded">
                {t['app.error.message']} {this.state.error?.message}
              </p>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}