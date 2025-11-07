import React, { createContext, useState, useEffect } from 'react';

export const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [presenceStatus, setPresenceStatus] = useState({});
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [mutedChats, setMutedChats] = useState(() => {
    if (typeof window === 'undefined') {return [];}
    try {
      const stored = localStorage.getItem('echochat_muted_chats');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load muted chats from storage:', error);
      return [];
    }
  });

  const muteChat = (chatId) => {
    if (!chatId) {return;}
    setMutedChats((prev) => (prev.includes(chatId) ? prev : [...prev, chatId]));
  };

  const unmuteChat = (chatId) => {
    if (!chatId) {return;}
    setMutedChats((prev) => prev.filter((id) => id !== chatId));
  };

  const toggleMuteChat = (chatId) => {
    if (!chatId) {return;}
    setMutedChats((prev) => (prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]));
  };

  useEffect(() => {
    if (typeof window === 'undefined') {return;}
    try {
      localStorage.setItem('echochat_muted_chats', JSON.stringify(mutedChats));
    } catch (error) {
      console.warn('Failed to persist muted chats:', error);
    }
  }, [mutedChats]);

  const value = {
    messages,
    setMessages,
    typingUsers,
    setTypingUsers,
    presenceStatus,
    setPresenceStatus,
    chats,
    setChats,
    currentChatId,
    setCurrentChatId,
    mutedChats,
    muteChat,
    unmuteChat,
    toggleMuteChat,
    setMutedChats
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export default ChatContext;


