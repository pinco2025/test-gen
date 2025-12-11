import React, { useState } from 'react';
import './Notification.css';

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface NotificationProps {
  notifications: NotificationItem[];
  removeNotification: (id: string) => void;
}

const Notification: React.FC<NotificationProps> = ({ notifications, removeNotification }) => {
  return (
    <div className="notification-container">
      {notifications.map((note) => (
        <div
          key={note.id}
          className={`notification-item ${note.type}`}
        >
          <div className="notification-icon">
            {note.type === 'success' && <span className="material-symbols-outlined">check_circle</span>}
            {note.type === 'error' && <span className="material-symbols-outlined">error</span>}
            {note.type === 'warning' && <span className="material-symbols-outlined">warning</span>}
            {note.type === 'info' && <span className="material-symbols-outlined">info</span>}
          </div>
          <div className="notification-message">{note.message}</div>
          <button className="notification-close" onClick={() => removeNotification(note.id)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      ))}
    </div>
  );
};

export const useNotification = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string, duration = 3000) => {
    const id = Math.random().toString(36).substring(7);
    const newNote = { id, type, message, duration };
    setNotifications((prev) => [...prev, newNote]);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((note) => note.id !== id));
  };

  return { notifications, addNotification, removeNotification };
};

export default Notification;
