import React from 'react';
import { Project } from '../types.ts';
import { useAppContext } from '../contexts/AppContext.tsx';

interface AssetStudioProps {
    project: Project;
}

const AssetStudio: React.FC<AssetStudioProps> = ({ project }) => {
    const { t } = useAppContext();

    if (!project.script) {
        return (
            <div className="text-center py-16 px-6 bg-gray-800/50 rounded-2xl">
                <h2 className="text-2xl font-bold text-white mb-3">{t('asset_studio.script_required_title')}</h2>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">{t('asset_studio.script_required_subtitle')}</p>
            </div>
        );
    }

    return (
        <div className="p-4 bg-gray-800 rounded-lg">
            <h2 className="text-xl font-bold text-white">Asset Studio</h2>
            <p className="text-gray-400 mt-2">This is a placeholder for the Asset Studio component. The main logic is now in FinalEditStep.tsx.</p>
        </div>
    );
};

export default AssetStudio;
