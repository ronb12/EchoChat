import React, { useState } from 'react';

function MediaGallery({ messages, isOpen, onClose }) {
  const mediaMessages = messages.filter(m => 
    m.type === 'image' || m.type === 'video' || m.type === 'file'
  );

  const [selectedMedia, setSelectedMedia] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen) return null;

  const openMedia = (index) => {
    setSelectedMedia(mediaMessages[index]);
    setCurrentIndex(index);
  };

  const nextMedia = () => {
    if (currentIndex < mediaMessages.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedMedia(mediaMessages[currentIndex + 1]);
    }
  };

  const prevMedia = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedMedia(mediaMessages[currentIndex - 1]);
    }
  };

  return (
    <div className={`media-gallery ${isOpen ? 'open' : ''}`}>
      <div className="media-gallery-backdrop" onClick={onClose} />
      <div className="media-gallery-content">
        <button className="media-gallery-close" onClick={onClose}>×</button>
        
        {!selectedMedia ? (
          <div className="media-gallery-grid">
            <div className="media-grid-header">
              <h3>Media</h3>
              <span>{mediaMessages.length} items</span>
            </div>
            <div className="media-grid">
              {mediaMessages.map((msg, index) => (
                <div 
                  key={msg.id} 
                  className="media-grid-item"
                  onClick={() => openMedia(index)}
                >
                  {msg.type === 'image' && msg.metadata?.downloadURL ? (
                    <img src={msg.metadata.downloadURL} alt="" />
                  ) : (
                    <div className="media-grid-placeholder">📄</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="media-viewer">
            <button className="media-nav-btn prev" onClick={prevMedia}>‹</button>
            {selectedMedia.type === 'image' && (
              <img src={selectedMedia.metadata?.downloadURL} alt="" />
            )}
            {selectedMedia.type === 'file' && (
              <div className="media-document">
                📄 {selectedMedia.metadata?.fileName || 'File'}
              </div>
            )}
            <button className="media-nav-btn next" onClick={nextMedia}>›</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MediaGallery;


