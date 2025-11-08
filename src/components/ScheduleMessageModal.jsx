import React, { useEffect, useState, useMemo } from 'react';

function toLocalInputValue(timestamp) {
  const baseDate = timestamp ? new Date(timestamp) : new Date();
  baseDate.setSeconds(0, 0);
  const offset = baseDate.getTimezoneOffset() * 60000;
  return new Date(baseDate.getTime() - offset).toISOString().slice(0, 16);
}

export default function ScheduleMessageModal({
  isOpen,
  defaultValue,
  minTimestamp,
  onClose,
  onConfirm,
  isSubmitting = false
}) {
  const [dateTimeValue, setDateTimeValue] = useState('');
  const [error, setError] = useState('');

  const minimumValue = useMemo(() => {
    const effectiveMin = minTimestamp && Number.isFinite(minTimestamp)
      ? minTimestamp
      : Date.now() + 15 * 60 * 1000;
    return toLocalInputValue(effectiveMin);
  }, [minTimestamp]);

  useEffect(() => {
    if (!isOpen) {return;}
    const initialValue = defaultValue || minimumValue;
    setDateTimeValue(initialValue);
    setError('');
  }, [isOpen, defaultValue, minimumValue]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!dateTimeValue) {
      setError('Please choose a date and time.');
      return;
    }
    const scheduledDate = new Date(dateTimeValue);
    if (Number.isNaN(scheduledDate.getTime())) {
      setError('The selected date is invalid.');
      return;
    }
    const currentMin = minTimestamp || Date.now() + 15000;
    if (scheduledDate.getTime() < currentMin) {
      setError('Please choose a time in the future.');
      return;
    }
    onConfirm(scheduledDate.getTime());
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 4000
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-modal-title"
        style={{
          background: 'var(--background-color)',
          borderRadius: '16px',
          padding: '24px',
          width: '90%',
          maxWidth: '420px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
        }}
      >
        <h2
          id="schedule-modal-title"
          style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 600 }}
        >
          Schedule Message
        </h2>
        <p style={{ margin: '0 0 20px', color: 'var(--text-color-secondary)', fontSize: '14px' }}>
          Pick a future time and we’ll send it automatically.
        </p>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="schedule-datetime"
            style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}
          >
            Delivery time
          </label>
          <input
            id="schedule-datetime"
            type="datetime-local"
            value={dateTimeValue}
            onChange={(e) => {
              setDateTimeValue(e.target.value);
              setError('');
            }}
            min={minimumValue}
            required
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              fontSize: '15px',
              background: 'var(--surface-color)',
              color: 'var(--text-color)',
              marginBottom: '12px'
            }}
          />

          {error && (
            <div style={{ color: '#f44336', marginBottom: '12px', fontSize: '13px' }} role="alert">
              {error}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '12px'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-color-secondary)',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                background: 'var(--primary-color)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '14px',
                cursor: 'pointer',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              {isSubmitting ? 'Scheduling…' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

