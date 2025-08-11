import React, { useState } from 'react';
import { CalendarIcon, XCircleIcon } from './Icons.tsx';
import { useAppContext } from '../contexts/AppContext.tsx';

const ScheduleModal: React.FC = () => {
    const { 
        isScheduleModalOpen, 
        closeScheduleModal, 
        projectToSchedule, 
        handleUpdateProject,
        addToast,
    } = useAppContext();
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const [scheduleDate, setScheduleDate] = useState(today);

    if (!isScheduleModalOpen || !projectToSchedule) return null;

    const handleSchedule = () => {
        if (!scheduleDate) {
            addToast("Please select a date.", 'error');
            return;
        }
        
        handleUpdateProject({ 
            id: projectToSchedule, 
            status: 'Scheduled', 
            scheduledDate: new Date(scheduleDate).toISOString() 
        });

        addToast("Project scheduled successfully!", 'success');
        closeScheduleModal();
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-up" 
            style={{ animationDuration: '0.3s' }}
            onClick={closeScheduleModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-modal-title"
        >
            <div 
                className="bg-gray-800 border border-indigo-500/50 rounded-2xl shadow-2xl w-full max-w-sm m-4 p-8 text-center transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={closeScheduleModal} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                    <XCircleIcon className="w-8 h-8"/>
                </button>
                
                <div className="mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-full w-fit mb-6">
                   <CalendarIcon className="w-10 h-10 text-white" />
                </div>
                
                <h2 id="schedule-modal-title" className="text-2xl font-bold text-white mb-3">Schedule Video</h2>
                <p className="text-gray-300 mb-6">Select a publication date for this project.</p>
                
                <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={today}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                />
                
                <button
                    onClick={handleSchedule}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all"
                >
                    Set Schedule
                </button>
            </div>
        </div>
    );
};

export default ScheduleModal;