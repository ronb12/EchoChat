import React, { useState, useEffect } from 'react';
import { gifService } from '../services/gifService';

export default function GifPicker({ onSelectGif, onClose }) {
  const [gifs, setGifs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('trending'); // 'trending' or 'search'

  useEffect(() => {
    loadTrendingGifs();
  }, []);

  const loadTrendingGifs = async () => {
    setLoading(true);
    try {
      const trendingGifs = await gifService.getTrendingGifs();
      setGifs(trendingGifs);
      setActiveTab('trending');
    } catch (error) {
      console.error('Error loading trending GIFs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      loadTrendingGifs();
      return;
    }

    setLoading(true);
    setActiveTab('search');
    try {
      const searchResults = await gifService.searchGifs(query);
      setGifs(searchResults);
    } catch (error) {
      console.error('Error searching GIFs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGifSelect = (gif) => {
    onSelectGif(gif.url);
    if (onClose) onClose();
  };

  return (
    <div className="gif-picker" style={{
      position: 'absolute',
      bottom: '100%',
      left: 0,
      right: 0,
      background: 'var(--background-color)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      maxHeight: '400px',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000
    }}>
      {/* Search Bar */}
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
        <input
          type="text"
          placeholder="Search GIFs..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            const query = e.target.value.trim();
            if (query) {
              handleSearch(query);
            } else {
              loadTrendingGifs();
            }
          }}
          style={{
            width: '100%',
            padding: '0.5rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'var(--surface-color)',
            color: 'var(--text-primary)'
          }}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
        <button
          onClick={loadTrendingGifs}
          style={{
            flex: 1,
            padding: '0.75rem',
            border: 'none',
            background: activeTab === 'trending' ? 'var(--primary-color)' : 'transparent',
            color: activeTab === 'trending' ? '#fff' : 'var(--text-primary)',
            cursor: 'pointer'
          }}
        >
          Trending
        </button>
        <button
          onClick={() => setActiveTab('search')}
          style={{
            flex: 1,
            padding: '0.75rem',
            border: 'none',
            background: activeTab === 'search' ? 'var(--primary-color)' : 'transparent',
            color: activeTab === 'search' ? '#fff' : 'var(--text-primary)',
            cursor: 'pointer'
          }}
        >
          Search
        </button>
      </div>

      {/* GIF Grid */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '0.5rem'
      }}>
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>
            Loading GIFs...
          </div>
        ) : gifs.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>
            No GIFs found
          </div>
        ) : (
          gifs.map(gif => (
            <div
              key={gif.id}
              onClick={() => handleGifSelect(gif)}
              style={{
                cursor: 'pointer',
                borderRadius: '8px',
                overflow: 'hidden',
                aspectRatio: '1',
                background: 'var(--surface-color)'
              }}
            >
              <img
                src={gif.preview || gif.url}
                alt={gif.title || 'GIF'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                loading="lazy"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

