import React, { useState } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { feedbackService } from '../services/feedbackService';

export default function FeatureRequestModal() {
  const { closeFeatureRequestModal, showFeatureRequestModal, showNotification } = useUI();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);

  if (!showFeatureRequestModal) return null;

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'messaging', label: 'Messaging' },
    { value: 'security', label: 'Security & Privacy' },
    { value: 'ui', label: 'User Interface' },
    { value: 'performance', label: 'Performance' },
    { value: 'integration', label: 'Integrations' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      showNotification('Please enter a title', 'warning');
      return;
    }

    if (!description.trim()) {
      showNotification('Please enter a description', 'warning');
      return;
    }

    if (!user) {
      showNotification('Please log in to submit a feature request', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const result = await feedbackService.submitFeatureRequest(
        user.uid,
        title,
        description,
        category
      );
      
      if (result.success) {
        showNotification('Feature request submitted! Thank you for your feedback.', 'success');
        setTitle('');
        setDescription('');
        setCategory('general');
        closeFeatureRequestModal();
      } else {
        showNotification(result.error || 'Failed to submit feature request', 'error');
      }
    } catch (error) {
      console.error('Error submitting feature request:', error);
      showNotification('Failed to submit feature request. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal active" id="feature-request-modal">
      <div className="modal-backdrop" onClick={closeFeatureRequestModal}></div>
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Request a Feature</h2>
          <button className="modal-close" onClick={closeFeatureRequestModal}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="feature-title">
                Feature Title <span style={{ color: 'var(--error-color, #f44336)' }}>*</span>
              </label>
              <input
                id="feature-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Add dark mode toggle"
                required
                maxLength={100}
                disabled={submitting}
              />
              <small style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                {title.length}/100 characters
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="feature-category">Category</label>
              <select
                id="feature-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.95rem'
                }}
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="feature-description">
                Description <span style={{ color: 'var(--error-color, #f44336)' }}>*</span>
              </label>
              <textarea
                id="feature-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the feature you'd like to see. Be as detailed as possible..."
                rows={6}
                required
                maxLength={1000}
                disabled={submitting}
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
                {description.length}/1000 characters
              </small>
            </div>
          </div>
          <div className="modal-actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closeFeatureRequestModal}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !title.trim() || !description.trim()}
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

