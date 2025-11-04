import React, { useState } from 'react';
import { groupPollsService } from '../services/groupPollsService';
import { useUI } from '../hooks/useUI';

export default function PollCreatorModal({ chatId, userId, userName, onClose, onSuccess }) {
  const { showNotification } = useUI();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultipleChoices, setAllowMultipleChoices] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [creating, setCreating] = useState(false);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreate = async () => {
    if (!question.trim()) {
      showNotification('Please enter a poll question', 'error');
      return;
    }

    const validOptions = options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      showNotification('Poll must have at least 2 options', 'error');
      return;
    }

    if (validOptions.length > 10) {
      showNotification('Poll can have at most 10 options', 'error');
      return;
    }

    setCreating(true);
    try {
      await groupPollsService.createPoll(
        chatId,
        userId,
        userName,
        question.trim(),
        validOptions.map(opt => opt.trim()),
        {
          allowMultipleChoices,
          anonymous: isAnonymous
        }
      );
      onSuccess();
    } catch (error) {
      showNotification(`Error creating poll: ${error.message}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000
    }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--background-color)',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Create Poll</h2>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Poll Question
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What would you like to ask?"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              fontSize: '16px',
              background: 'var(--surface-color)',
              color: 'var(--text-color)'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Options ({options.filter(o => o.trim()).length} of {options.length})
          </label>
          {options.map((option, index) => (
            <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'var(--surface-color)',
                  color: 'var(--text-color)'
                }}
              />
              {options.length > 2 && (
                <button
                  onClick={() => removeOption(index)}
                  style={{
                    padding: '10px 16px',
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {options.length < 10 && (
            <button
              onClick={addOption}
              style={{
                padding: '8px 16px',
                background: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              + Add Option
            </button>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <input
              type="checkbox"
              checked={allowMultipleChoices}
              onChange={(e) => setAllowMultipleChoices(e.target.checked)}
            />
            <span>Allow multiple choices</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            <span>Anonymous poll</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={creating}
            style={{
              padding: '10px 20px',
              background: 'var(--border-color)',
              color: 'var(--text-color)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !question.trim() || options.filter(o => o.trim()).length < 2}
            style={{
              padding: '10px 20px',
              background: creating ? '#ccc' : 'var(--primary-color)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: creating ? 'not-allowed' : 'pointer'
            }}
          >
            {creating ? 'Creating...' : 'Create Poll'}
          </button>
        </div>
      </div>
    </div>
  );
}
