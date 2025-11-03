import React, { createContext, useState } from 'react';

export const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [presenceStatus, setPresenceStatus] = useState({});
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);

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
    setCurrentChatId
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export default ChatContext;


