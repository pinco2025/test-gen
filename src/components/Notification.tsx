import React, { useState } from 'react';
import './Notification.css';

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
  position?: 'top-right' | 'top-center' | 'center';
}

interface NotificationProps {
  notifications: NotificationItem[];
  removeNotification: (id: string) => void;
}

const Notification: React.FC<NotificationProps> = ({ notifications, removeNotification }) => {
  // Group notifications by position
  const topRightNotes = notifications.filter(n => !n.position || n.position === 'top-right');
  const topCenterNotes = notifications.filter(n => n.position === 'top-center');
  const centerNotes = notifications.filter(n => n.position === 'center');

  const renderList = (notes: NotificationItem[], positionClass: string) => (
    <div className={`notification-container ${positionClass}`}>
      {notes.map((note) => (
        <div
          key={note.id}
          className={`notification-item ${note.type} ${positionClass}`}
          role="alert"
        >
          <div className="notification-icon-wrapper">
            {/* Using standard material symbols but styled better */}
            {note.type === 'success' && <span className="material-symbols-outlined">check_circle</span>}
            {note.type === 'error' && <span className="material-symbols-outlined">error</span>}
            {note.type === 'warning' && <span className="material-symbols-outlined">warning</span>}
            {note.type === 'info' && <span className="material-symbols-outlined">info</span>}
          </div>
          <div className="notification-content">
            <div className="notification-message">{note.message}</div>
          </div>
          <button className="notification-close" onClick={() => removeNotification(note.id)}>
            <span className="material-symbols-outlined">close</span>
          </button>

          {/* Progress bar for auto-dismiss items */}
          {note.duration && note.duration > 0 && (
            <div className="notification-progress" style={{ animationDuration: `${note.duration}ms` }} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <>
      {topRightNotes.length > 0 && renderList(topRightNotes, 'top-right')}
      {topCenterNotes.length > 0 && renderList(topCenterNotes, 'top-center')}
      {centerNotes.length > 0 && renderList(centerNotes, 'center')}
    </>
  );
};

export const useNotification = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = (
    type: 'success' | 'error' | 'info' | 'warning',
    message: string,
    duration = 3000,
    position?: 'top-right' | 'top-center' | 'center'
  ) => {
    const id = Math.random().toString(36).substring(7);
    // Default position based on type? Or just passed arg.
    // Let's stick to passed arg or default top-right.
    // If it's a critical error, maybe default to center? keeping it simple for now.

    // For center notifications (modal-like), maybe longer default duration?
    if (position === 'center' && duration === 3000) {
      duration = 5000;
    }

    const newNote = { id, type, message, duration, position };
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
