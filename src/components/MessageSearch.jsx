import React, { useState, useEffect } from 'react';

function MessageSearch({ messages, onSelectMessage }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const filtered = messages.filter(msg => 
      msg.content?.toLowerCase().includes(searchTerm.toLowerCase()) &&
      msg.deleted !== true
    );
    setResults(filtered);
  }, [searchTerm, messages]);

  const handleResultClick = (message) => {
    onSelectMessage?.(message);
  };

  return (
    <div className="message-search">
      <input
        type="text"
        className="search-input"
        placeholder="Search messages..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      
      {isSearching && (
        <div className="search-results">
          {results.length > 0 ? (
            results.map(msg => (
              <div 
                key={msg.id} 
                className="search-result-item"
                onClick={() => handleResultClick(msg)}
              >
                <div className="search-result-content">{msg.content}</div>
                <div className="search-result-time">
                  {msg.timestamp?.toLocaleDateString()}
                </div>
              </div>
            ))
          ) : (
            <div className="search-no-results">No results found</div>
          )}
        </div>
      )}
    </div>
  );
}

export default MessageSearch;


