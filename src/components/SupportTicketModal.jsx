import React, { useState } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { feedbackService } from '../services/feedbackService';

export default function SupportTicketModal() {
  const { closeSupportTicketModal, showSupportTicketModal, showNotification } = useUI();
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('other');
  const [submitting, setSubmitting] = useState(false);

  if (!showSupportTicketModal) return null;

  const priorities = [
    { value: 'low', label: 'Low', color: '#4CAF50' },
    { value: 'medium', label: 'Medium', color: '#FF9800' },
    { value: 'high', label: 'High', color: '#F44336' },
    { value: 'urgent', label: 'Urgent', color: '#9C27B0' }
  ];

  const categories = [
    { value: 'bug', label: 'Bug Report' },
    { value: 'account', label: 'Account Issue' },
    { value: 'payment', label: 'Payment Issue' },
    { value: 'security', label: 'Security Concern' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!subject.trim()) {
      showNotification('Please enter a subject', 'warning');
      return;
    }

    if (!description.trim()) {
      showNotification('Please enter a description', 'warning');
      return;
    }

    if (!user) {
      showNotification('Please log in to submit a support ticket', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const result = await feedbackService.submitSupportTicket(
        user.uid,
        subject,
        description,
        priority,
        category
      );
      
      if (result.success) {
        showNotification(`Support ticket submitted! Ticket ID: ${result.ticketId?.substring(0, 8)}...`, 'success');
        setSubject('');
        setDescription('');
        setPriority('medium');
        setCategory('other');
        closeSupportTicketModal();
      } else {
        showNotification(result.error || 'Failed to submit support ticket', 'error');
      }
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      showNotification('Failed to submit support ticket. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal active" id="support-ticket-modal">
      <div className="modal-backdrop" onClick={closeSupportTicketModal}></div>
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Submit Support Ticket</h2>
          <button className="modal-close" onClick={closeSupportTicketModal}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="ticket-subject">
                Subject <span style={{ color: 'var(--error-color, #f44336)' }}>*</span>
              </label>
              <input
                id="ticket-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of the issue"
                required
                maxLength={100}
                disabled={submitting}
              />
              <small style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                {subject.length}/100 characters
              </small>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="ticket-category">Category</label>
                <select
                  id="ticket-category"
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
                <label htmlFor="ticket-priority">Priority</label>
                <select
                  id="ticket-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.95rem'
                  }}
                >
                  {priorities.map(pri => (
                    <option key={pri.value} value={pri.value}>
                      {pri.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="ticket-description">
                Description <span style={{ color: 'var(--error-color, #f44336)' }}>*</span>
              </label>
              <textarea
                id="ticket-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide detailed information about the issue. Include steps to reproduce if applicable..."
                rows={8}
                required
                maxLength={2000}
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
                {description.length}/2000 characters
              </small>
            </div>

            <div style={{ 
              padding: '1rem', 
              background: 'var(--surface-color, #f5f5f5)', 
              borderRadius: '8px',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)'
            }}>
              <strong>💡 Tips for faster resolution:</strong>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                <li>Include steps to reproduce the issue</li>
                <li>Mention when the issue started</li>
                <li>Include any error messages you see</li>
                <li>Specify your device/browser if relevant</li>
              </ul>
            </div>
          </div>
          <div className="modal-actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closeSupportTicketModal}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !subject.trim() || !description.trim()}
            >
              {submitting ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

