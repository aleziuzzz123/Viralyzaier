

import React, { useRef, useEffect, useContext } from 'react';
import type { Notification } from '../types.ts';
import { formatDistanceToNow } from 'date-fns';
import { DataContext } from '../context/DataContext.tsx';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onMarkAllAsRead: () => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  isOpen,
  onClose,
  onMarkAllAsRead,
}) => {
  const { state: { notifications } } = useContext(DataContext);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 mt-3 w-80 bg-[#2A1A5E] rounded-xl border border-[#4A3F7A] shadow-2xl shadow-black/50 z-50 overflow-hidden"
    >
      <div className="p-4 border-b border-[#4A3F7A]/50 flex justify-between items-center">
        <h3 className="font-bold text-white">Notifications</h3>
        {notifications.some(n => !n.read) && (
             <button 
                onClick={onMarkAllAsRead}
                className="text-xs text-[#DAFF00]/80 hover:text-[#DAFF00] underline"
            >
                Mark all as read
            </button>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 border-b border-[#4A3F7A]/30 flex items-start gap-3 transition-colors duration-200 ${!notification.read ? 'bg-[#1A0F3C]/30' : ''}`}
            >
              {!notification.read && (
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
              )}
              <div className="flex-grow">
                <p className={`text-sm ${notification.read ? 'text-purple-200/80' : 'text-white'}`}>
                  {notification.message}
                </p>
                <p className="text-xs text-purple-300/60 mt-1">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <i className="fa-regular fa-bell-slash text-3xl text-purple-300/50 mb-3"></i>
            <p className="text-sm text-purple-200">You have no new notifications.</p>
          </div>
        )}
      </div>
    </div>
  );
};
