import React from 'react';
import { useUI } from '../hooks/useUI';

export default function NewChatModal() {
  const { closeNewChatModal } = useUI();
  return (
    <div className="modal active" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'grid', placeItems: 'center' }}>
      <div style={{ background: '#fff', padding: 16, borderRadius: 8, minWidth: 280 }}>
        <h3>Start New Chat</h3>
        <p>Stub new chat modal</p>
        <button onClick={closeNewChatModal}>Close</button>
      </div>
    </div>
  );
}


