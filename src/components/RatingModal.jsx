import React, { useState } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { feedbackService } from '../services/feedbackService';

export default function RatingModal() {
  const { closeRatingModal, showRatingModal, showNotification } = useUI();
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!showRatingModal) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      showNotification('Please select a rating', 'warning');
      return;
    }

    if (!user) {
      showNotification('Please log in to submit a rating', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const result = await feedbackService.submitRating(user.uid, rating, comment);
      
      if (result.success) {
        showNotification('Thank you for your rating!', 'success');
        setRating(0);
        setComment('');
        closeRatingModal();
      } else {
        showNotification(result.error || 'Failed to submit rating', 'error');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      showNotification('Failed to submit rating. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal active" id="rating-modal">
      <div className="modal-backdrop" onClick={closeRatingModal}></div>
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Rate EchoChat</h2>
          <button className="modal-close" onClick={closeRatingModal}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
                How would you rate your experience with EchoChat?
              </p>
              
              {/* Star Rating */}
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: '0.5rem',
                  fontSize: '2.5rem',
                  cursor: 'pointer'
                }}
                onMouseLeave={() => setHoveredRating(0)}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    style={{
                      color: (hoveredRating >= star || rating >= star) 
                        ? '#FFD700' 
                        : '#ccc',
                      transition: 'color 0.2s',
                      userSelect: 'none'
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>
              
              {rating > 0 && (
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                  {rating === 5 && 'Excellent! 🎉'}
                  {rating === 4 && 'Great! 😊'}
                  {rating === 3 && 'Good 👍'}
                  {rating === 2 && 'Fair 👌'}
                  {rating === 1 && 'Poor 😔'}
                </p>
              )}
            </div>

            {/* Comment */}
            <div className="form-group">
              <label htmlFor="rating-comment">
                Tell us more (optional)
              </label>
              <textarea
                id="rating-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts about EchoChat..."
                rows={4}
                maxLength={500}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontFamily: 'inherit',
                  fontSize: '0.95rem',
                  resize: 'vertical'
                }}
              />
              <small style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                {comment.length}/500 characters
              </small>
            </div>
          </div>
          <div className="modal-actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closeRatingModal}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={rating === 0 || submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

