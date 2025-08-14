/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean, error: Error | null }> {
  constructor(props: ErrorBoundaryProps) {
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
      const errorMessage = this.state.error?.message || '';
      const isConfigError = errorMessage.includes('required') || errorMessage.includes('API key') || errorMessage.includes('SUPABASE') || errorMessage.includes('VITE_') || errorMessage.includes('Cannot read properties of undefined') || errorMessage.includes('IMGLY');
      
      return (
        <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center p-4">
          <div className="text-center bg-gray-800 p-8 rounded-lg shadow-2xl border border-red-500/50 max-w-lg">
              <h1 className="text-2xl font-bold text-red-400">{isConfigError ? 'Configuration Error' : 'Application Error'}</h1>
              <p className="mt-3 text-gray-300">
                {isConfigError ? 'The application cannot start due to a missing or invalid configuration.' : 'An unexpected error occurred that prevented the application from starting.'}
              </p>
              <div className="mt-4 text-left bg-gray-900 p-4 rounded-md">
                <p className="text-sm text-gray-400 font-semibold">Error Details:</p>
                <p className="mt-4 text-sm text-red-300 font-mono bg-red-900/50 p-2 rounded">
                    {this.state.error?.message && `Message: ${this.state.error.message}`}
                </p>
                 <p className="text-xs text-gray-500 mt-3">
                    {isConfigError 
                        ? "Please check the configuration script in your `index.html` file. Ensure that all placeholder values (e.g., 'YOUR_GOOGLE_CLIENT_ID_HERE', or your IMG.LY license key) are replaced with your actual keys." 
                        : "Please check the browser console for more technical details and contact support if the issue persists."
                    }
                 </p>
              </div>
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