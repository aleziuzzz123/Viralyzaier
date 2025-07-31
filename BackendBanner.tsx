import React from 'react';
import { WarningIcon } from './components/Icons';

const BackendBanner: React.FC = () => {
  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/30 text-yellow-200 p-3 text-sm flex items-center justify-center z-50 relative">
      <WarningIcon className="w-5 h-5 mr-3 flex-shrink-0" />
      <div>
        <strong className="font-semibold">Backend Not Configured:</strong>
        <span className="ml-2">Your app is using placeholder credentials. Please set <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> in your environment variables to fix login/data errors.</span>
      </div>
    </div>
  );
};

export default BackendBanner;