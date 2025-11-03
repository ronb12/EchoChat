import React, { useState } from 'react';
import { useChat } from '../hooks/useChat';

export default function MessageSearch() {
  const { messages } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results = messages.filter(msg =>
      msg.text?.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(results);
  };

  return (
    <div className="message-search">
      <div className="search-input-wrapper">
        <input
          type="text"
          className="search-input"
          placeholder="Search messages..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <span className="search-icon">🔍</span>
      </div>
      {searchResults.length > 0 && (
        <div className="search-results">
          <div className="results-header">
            <span>{searchResults.length} result(s) found</span>
          </div>
          <div className="results-list">
            {searchResults.map((message, idx) => (
              <div key={message.id || idx} className="search-result-item">
                <div className="result-sender">{message.senderName || 'Unknown'}</div>
                <div className="result-text">{message.text}</div>
                <div className="result-time">
                  {new Date(message.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

