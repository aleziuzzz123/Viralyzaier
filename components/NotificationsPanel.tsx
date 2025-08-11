

import React, { useRef, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext.tsx';
import { Notification } from '../types.ts';
import { SparklesIcon } from './Icons.tsx';

interface NotificationsPanelProps {
    onClose: () => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ onClose }) => {
    const { notifications, markNotificationAsRead, markAllNotificationsAsRead, setActiveProjectId, t } = useAppContext();
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);
    
    const handleNotificationClick = (notificationId: string, projectId?: string | null) => {
        markNotificationAsRead(notificationId);
        if (projectId) {
            setActiveProjectId(projectId);
        }
        onClose();
    };
    
    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div 
            ref={panelRef}
            className="absolute top-14 right-0 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl animate-fade-in-up z-30" 
            style={{animationDuration: '0.2s'}}
        >
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="font-bold text-white">{t('notifications.title')}</h3>
                {unreadCount > 0 && (
                    <button 
                        onClick={markAllNotificationsAsRead}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                    >
                        {t('notifications.mark_all_read')}
                    </button>
                )}
            </div>
            
            <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                    <ul className="divide-y divide-gray-700">
                        {notifications.map((n: Notification) => (
                            <li key={n.id}>
                                <button 
                                    onClick={() => handleNotificationClick(n.id, n.project_id)}
                                    className={`w-full text-left p-4 transition-colors ${!n.is_read ? 'bg-indigo-900/30 text-white font-semibold' : 'text-gray-400 hover:bg-gray-700/50'}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <SparklesIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${!n.is_read ? 'text-indigo-400' : 'text-gray-500'}`} />
                                        <p className="text-sm">{n.message}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 text-right mt-2">
                                        {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </p>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        <p>{t('notifications.empty')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPanel;