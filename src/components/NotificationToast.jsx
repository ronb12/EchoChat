import React from 'react';
import { useUI } from '../hooks/useUI';

export default function NotificationToast() {
  const { notifications, removeNotification } = useUI();
  return (
    <div style={{ position: 'fixed', right: 12, bottom: 12, display: 'grid', gap: 8 }}>
      {notifications.map(n => (
        <div key={n.id} style={{ background: '#333', color: '#fff', padding: '8px 12px', borderRadius: 6 }}>
          {n.message}
          <button style={{ marginLeft: 8 }} onClick={() => removeNotification(n.id)}>×</button>
        </div>
      ))}
    </div>
  );
}


