import React from 'react';
import { useUI } from '../hooks/useUI';

export default function NotificationToast() {
  const { notifications, removeNotification } = useUI();

  if (!notifications || notifications.length === 0) {
    return null;
  }

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success':
        return '#4caf50';
      case 'error':
        return '#f44336';
      case 'warning':
        return '#ff9800';
      case 'info':
      default:
        return '#2196f3';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      right: 20,
      top: 20,
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      maxWidth: '400px',
      pointerEvents: 'none'
    }}>
      {notifications.map(n => (
        <div
          key={n.id}
          style={{
            background: getNotificationColor(n.type),
            color: '#fff',
            padding: '12px 16px',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            minWidth: '250px',
            pointerEvents: 'auto',
            animation: 'slideInRight 0.3s ease-out'
          }}
        >
          <span style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>{n.message}</span>
          <button
            onClick={() => removeNotification(n.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: '1',
              opacity: 0.8
            }}
            onMouseEnter={(e) => e.target.style.opacity = '1'}
            onMouseLeave={(e) => e.target.style.opacity = '0.8'}
          >
            ×
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}




