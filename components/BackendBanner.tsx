import React from 'react';
import { WarningIcon } from './Icons.tsx';
import { useAppContext } from '../contexts/AppContext.tsx';

const BackendBanner: React.FC = () => {
  const { t } = useAppContext();
  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/30 text-yellow-200 text-center p-3 text-sm flex items-center justify-center z-20">
      <WarningIcon className="w-5 h-5 mr-3" />
      <strong>{t('api_key_banner.message')}</strong>
    </div>
  );
};

export default BackendBanner;
