import React from 'react';
import { Project } from '../types';
import { useAppContext } from '../contexts/AppContext';
import ImgLyEditor from './ImgLyEditor';

const FinalEditStep: React.FC<{
    project: Project;
}> = ({ project }) => {
    const { t } = useAppContext();

    // The script is essential for the editor to have assets like voiceovers
    if (!project.script) {
        return (
            <div className="flex flex-col items-center justify-center h-96 bg-gray-800/50 rounded-2xl">
                <h2 className="text-2xl font-bold text-white mb-3">{t('asset_studio.script_required_title')}</h2>
                <p className="text-gray-400 max-w-md mx-auto text-center">{t('asset_studio.script_required_subtitle')}</p>
            </div>
        );
    }
    
    return <ImgLyEditor />;
};

export default FinalEditStep;