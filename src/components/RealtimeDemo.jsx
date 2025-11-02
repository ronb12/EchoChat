import React, { useState } from 'react';
import { useUI } from '../hooks/useUI';

function RealtimeDemo() {
  const { showNotification } = useUI();
  const [testMessage, setTestMessage] = useState('');

  const testNotification = (type) => {
    showNotification(`This is a ${type} notification!`, type);
  };

  const testTypingIndicator = () => {
    showNotification('Typing indicator would show here in a real chat', 'info');
  };

  const testPresenceStatus = () => {
    showNotification('Presence status would update here', 'success');
  };

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '20px', 
      left: '20px', 
      background: 'var(--surface-color)', 
      padding: '1rem', 
      borderRadius: '0.5rem',
      border: '1px solid var(--border-color)',
      zIndex: 1000
    }}>
      <h4 style={{ color: 'var(--text-color)', margin: '0 0 1rem 0' }}>Real-time Features Demo</h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button 
          onClick={() => testNotification('success')}
          style={{ padding: '0.5rem', background: 'var(--success-color)', color: 'white', border: 'none', borderRadius: '0.25rem' }}
        >
          Test Success Notification
        </button>
        
        <button 
          onClick={() => testNotification('error')}
          style={{ padding: '0.5rem', background: 'var(--error-color)', color: 'white', border: 'none', borderRadius: '0.25rem' }}
        >
          Test Error Notification
        </button>
        
        <button 
          onClick={() => testNotification('warning')}
          style={{ padding: '0.5rem', background: 'var(--warning-color)', color: 'white', border: 'none', borderRadius: '0.25rem' }}
        >
          Test Warning Notification
        </button>
        
        <button 
          onClick={testTypingIndicator}
          style={{ padding: '0.5rem', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '0.25rem' }}
        >
          Test Typing Indicator
        </button>
        
        <button 
          onClick={testPresenceStatus}
          style={{ padding: '0.5rem', background: 'var(--info-color)', color: 'white', border: 'none', borderRadius: '0.25rem' }}
        >
          Test Presence Status
        </button>
      </div>
    </div>
  );
}

export default RealtimeDemo;
