import React from 'react';

export default function MediaGallery({ messages, onClose }) {
  const mediaMessages = messages?.filter(msg =>
    msg.decryptedImage || msg.image || msg.decryptedVideo || msg.video || msg.file
  ) || [];

  return (
    <div className="modal active" id="media-gallery">
      <div className="modal-content gallery-content">
        <div className="modal-header">
          <h2>Media Gallery</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {mediaMessages.length === 0 ? (
            <div className="empty-state">
              <p>No media files found</p>
            </div>
          ) : (
            <div className="media-grid">
              {mediaMessages.map((message, idx) => (
                <div key={message.id || idx} className="media-item">
                  {(message.decryptedImage || message.image) ? (
                    <img
                      src={message.decryptedImage || message.image}
                      alt={message.imageName || 'Media'}
                      className="gallery-image"
                    />
                  ) : (message.decryptedVideo || message.video) ? (
                    <video
                      src={message.decryptedVideo || message.video}
                      controls
                      playsInline
                      className="gallery-video"
                    />
                  ) : message.file ? (
                    <div className="file-preview">
                      <div className="file-icon">📄</div>
                      <div className="file-name">{message.file.name}</div>
                      <div className="file-size">
                        {(message.file.size / 1024).toFixed(2)} KB
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



