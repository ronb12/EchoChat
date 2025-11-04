import React, { useState, useEffect } from 'react';
import { useRealtimeMessages, useTypingIndicator } from '../hooks/useRealtime';
import { chatService } from '../services/chatService';

export default function RealtimeDemo() {
  const chatId = 'demo';
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  useRealtimeMessages(chatId);
  const { typingUsers } = useTypingIndicator(chatId);

  useEffect(() => {
    // Simulate connection status
    const timer = setTimeout(() => {
      setConnectionStatus('connected');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const sendTestMessage = async () => {
    await chatService.sendMessage(chatId, {
      text: `Test message at ${new Date().toLocaleTimeString()}`,
      senderId: 'demo-user',
      senderName: 'Demo User'
    });
  };

  return (
    <div className="realtime-demo">
      <div className="demo-header">
        <h3>Realtime Demo</h3>
        <div className={`status-indicator ${connectionStatus}`}>
          <span className="status-dot"></span>
          {connectionStatus}
        </div>
      </div>
      <div className="demo-content">
        <div className="demo-section">
          <h4>Connection Status</h4>
          <p>Status: <strong>{connectionStatus}</strong></p>
        </div>
        <div className="demo-section">
          <h4>Typing Indicators</h4>
          {Object.keys(typingUsers).length > 0 ? (
            <p>{Object.values(typingUsers)[0]?.displayName || 'Someone'} is typing...</p>
          ) : (
            <p>No one is typing</p>
          )}
        </div>
        <div className="demo-actions">
          <button className="btn btn-primary" onClick={sendTestMessage}>
            Send Test Message
          </button>
        </div>
      </div>
    </div>
  );
}



