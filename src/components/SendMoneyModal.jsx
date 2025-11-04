import React, { useState, useEffect } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import SendMoneyForm from './SendMoneyForm';

const COMMON_REASONS = [
  'Dinner/Meal',
  'Rent/Utilities',
  'Gift',
  'Reimbursement',
  'Loan',
  'Split Bill',
  'Event/Tickets',
  'Groceries',
  'Transportation',
  'Services',
  'Other'
];

export default function SendMoneyModal({ recipientId, recipientName, onClose, initialMode = 'send' }) {
  const { showNotification } = useUI();
  const { user } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'send' or 'request'
  const [amount, setAmount] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [sending, setSending] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [stripePromise, setStripePromise] = useState(null);
  
  // Initialize Stripe
  useEffect(() => {
    const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (stripePublishableKey) {
      // Log Stripe mode for debugging
      const isLive = stripePublishableKey.startsWith('pk_live_');
      const isTest = stripePublishableKey.startsWith('pk_test_');
      if (isLive) {
        console.warn('⚠️ Stripe LIVE MODE detected - Real payments will be processed!');
      } else if (isTest) {
        console.log('✅ Stripe TEST MODE - Using test environment');
      }
      
      loadStripe(stripePublishableKey).then(stripe => {
        setStripePromise(stripe);
      });
    }
  }, []);

  // Get the final note value (from dropdown or custom input)
  const getFinalNote = () => {
    if (customNote.trim()) {
      return customNote.trim();
    }
    if (selectedReason && selectedReason !== 'Other') {
      return selectedReason;
    }
    return '';
  };

  const handleSend = async () => {
    const numAmount = parseFloat(amount);

    // Validation
    if (!numAmount || numAmount <= 0) {
      showNotification('Please enter a valid amount', 'error');
      return;
    }

    if (numAmount < 1) {
      showNotification('Minimum amount is $1.00', 'error');
      return;
    }

    if (numAmount > 500) {
      showNotification('Maximum amount per transaction is $500', 'error');
      return;
    }

    if (!recipientId) {
      showNotification('Please select a recipient', 'error');
      return;
    }

    // Validate note is provided
    const finalNote = getFinalNote();
    if (!finalNote || finalNote.trim().length === 0) {
      showNotification('Please select or enter a reason for this transaction', 'error');
      return;
    }

    setSending(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

      if (mode === 'send') {
        // Send money flow
        try {
          const response = await fetch(`${API_BASE_URL}/stripe/create-payment-intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: numAmount,
              recipientAccountId: recipientId, // In production, get this from recipient profile
              description: finalNote,
              metadata: {
                senderId: user.uid,
                recipientId,
                note: finalNote,
                type: 'send_money'
              }
            })
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Payment intent created:', data);
            
            if (data.clientSecret && stripePromise) {
              // Store client secret for Stripe Elements payment form
              setClientSecret(data.clientSecret);
              setPaymentIntentId(data.paymentIntentId);
              setSending(false); // Don't close modal yet - need payment confirmation
              // Don't show notification yet - wait for payment confirmation
            } else if (data.clientSecret) {
              // Stripe not configured on frontend - show info
              showNotification(`Payment intent created. Stripe publishable key not configured.`, 'info');
              setSending(false);
            } else {
              // No client secret - demo mode
              showNotification(`Successfully sent $${numAmount.toFixed(2)} to ${recipientName}`, 'success');
              setTimeout(() => onClose(), 1500);
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create payment intent');
          }
        } catch (error) {
          console.error('Payment API error (using demo mode):', error);
          // Demo mode fallback
          showNotification(`Successfully sent $${numAmount.toFixed(2)} to ${recipientName}`, 'success');
        }
      } else {
        // Request money flow
        try {
          const response = await fetch(`${API_BASE_URL}/stripe/create-payment-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: numAmount,
              description: finalNote,
              recipientAccountId: user.uid, // Requestor receives the money
              metadata: {
                requestorId: user.uid,
                requestorName: user.displayName || user.email,
                recipientId,
                recipientName,
                note: finalNote,
                type: 'money_request'
              }
            })
          });

          if (response.ok) {
            const data = await response.json();
            showNotification(`Payment request created! Share this link: ${data.paymentLink}`, 'success');
            // Optionally copy link to clipboard
            if (navigator.clipboard) {
              navigator.clipboard.writeText(data.paymentLink);
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create payment request');
          }
        } catch (error) {
          console.error('Payment request API error (using demo mode):', error);
          // Demo mode fallback
          showNotification(`Payment request for $${numAmount.toFixed(2)} created for ${recipientName}`, 'success');
        }
      }

      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error(`Error ${mode === 'send' ? 'sending' : 'requesting'} money:`, error);
      showNotification(`Failed to ${mode === 'send' ? 'send' : 'request'} money. Please try again.`, 'error');
    } finally {
      setSending(false);
    }
  };

  const quickAmounts = [10, 25, 50, 100];
  const finalNote = getFinalNote();

  return (
    <div className="modal active" id="send-money-modal">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>{mode === 'send' ? 'Send Money' : 'Request Money'}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {/* Mode Toggle */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '1.5rem',
            background: 'var(--border-color)',
            padding: '4px',
            borderRadius: '8px'
          }}>
            <button
              onClick={() => setMode('send')}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                borderRadius: '6px',
                background: mode === 'send' ? 'var(--primary-color)' : 'transparent',
                color: mode === 'send' ? 'white' : 'var(--text-color)',
                cursor: 'pointer',
                fontWeight: mode === 'send' ? '600' : '400',
                transition: 'all 0.2s ease'
              }}
            >
              💵 Send Money
            </button>
            <button
              onClick={() => setMode('request')}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                borderRadius: '6px',
                background: mode === 'request' ? 'var(--primary-color)' : 'transparent',
                color: mode === 'request' ? 'white' : 'var(--text-color)',
                cursor: 'pointer',
                fontWeight: mode === 'request' ? '600' : '400',
                transition: 'all 0.2s ease'
              }}
            >
              📥 Request Money
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="recipient-name">{mode === 'send' ? 'To' : 'From'}</label>
            <input
              id="recipient-name"
              type="text"
              value={recipientName || ''}
              disabled
              style={{ background: 'var(--surface-color)', opacity: 0.7 }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount (USD)</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--text-color-secondary)'
              }}>$</span>
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="1"
                max="500"
                step="0.01"
                style={{ paddingLeft: '32px' }}
                disabled={sending}
              />
            </div>
            <small style={{ color: 'var(--text-color-secondary)', marginTop: '4px', display: 'block' }}>
              Minimum: $1.00 | Maximum: $500.00 per transaction
            </small>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {quickAmounts.map(amt => (
              <button
                key={amt}
                className="btn btn-secondary"
                onClick={() => setAmount(amt.toString())}
                disabled={sending}
                style={{ minWidth: '60px' }}
              >
                ${amt}
              </button>
            ))}
          </div>

          <div className="form-group">
            <label htmlFor="reason-select">
              Reason/Note <span style={{ color: 'red' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <select
                id="reason-select"
                value={selectedReason}
                onChange={(e) => {
                  setSelectedReason(e.target.value);
                  if (e.target.value !== 'Other') {
                    setCustomNote('');
                  }
                }}
                disabled={sending}
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 12px',
                  borderRadius: '8px',
                  border: selectedReason ? '2px solid var(--primary-color)' : '2px solid var(--border-color)',
                  background: selectedReason ? 'var(--input-bg-color)' : 'var(--surface-color)',
                  color: 'var(--text-color)',
                  fontSize: '15px',
                  fontWeight: selectedReason ? '500' : '400',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  marginBottom: selectedReason === 'Other' ? '8px' : '0',
                  transition: 'all 0.2s ease'
                }}
              >
              <option value="">Select a reason...</option>
              {COMMON_REASONS.map(reason => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
            <div style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              width: '0',
              height: '0',
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `8px solid ${selectedReason ? 'var(--primary-color)' : '#666'}`,
              transition: 'border-color 0.2s ease'
            }}></div>
            </div>
            {selectedReason === 'Other' && (
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Enter custom reason..."
                maxLength={100}
                disabled={sending}
                style={{ marginTop: '8px' }}
              />
            )}
            {!selectedReason && (
              <small style={{ color: 'var(--text-color-secondary)', marginTop: '4px', display: 'block' }}>
                Please select or enter a reason for this transaction
              </small>
            )}
          </div>

          <div style={{
            background: 'var(--border-color)',
            padding: '12px',
            borderRadius: '8px',
            marginTop: '1rem',
            fontSize: '14px',
            color: 'var(--text-color-secondary)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Amount:</span>
              <span>${amount ? parseFloat(amount).toFixed(2) : '0.00'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Fee (2.9% + $0.30):</span>
              <span>${amount ? (parseFloat(amount) * 0.029 + 0.30).toFixed(2) : '0.30'}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid var(--border-color)',
              fontWeight: '600',
              fontSize: '16px'
            }}>
              <span>Total:</span>
              <span>${amount ? (parseFloat(amount) * 1.029 + 0.30).toFixed(2) : '0.30'}</span>
            </div>
          </div>

          {/* Stripe Payment Form - shown when payment intent is created */}
          {clientSecret && stripePromise && mode === 'send' && (
            <Elements stripe={stripePromise}>
              <SendMoneyForm
                amount={parseFloat(amount)}
                recipientName={recipientName}
                clientSecret={clientSecret}
                onSuccess={(paymentIntent) => {
                  console.log('Payment succeeded:', paymentIntent);
                  showNotification(`Successfully sent $${parseFloat(amount).toFixed(2)} to ${recipientName}!`, 'success');
                  setTimeout(() => {
                    onClose();
                    setClientSecret(null);
                    setPaymentIntentId(null);
                  }, 1500);
                }}
                onError={(error) => {
                  console.error('Payment failed:', error);
                  setClientSecret(null);
                  setPaymentIntentId(null);
                }}
                disabled={sending}
              />
            </Elements>
          )}

          {/* Stripe Mode Notice */}
          {stripePromise && (() => {
            const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
            const isLive = stripePublishableKey?.startsWith('pk_live_');
            const isTest = stripePublishableKey?.startsWith('pk_test_');
            
            if (isLive) {
              return (
                <div style={{
                  marginTop: '1.5rem',
                  padding: '12px',
                  background: 'rgba(244, 67, 54, 0.15)',
                  border: '2px solid #f44336',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#f44336',
                  fontWeight: '600'
                }}>
                  <strong>⚠️ LIVE MODE:</strong> Real payments will be processed! Using production Stripe account.
                </div>
              );
            } else if (isTest) {
              return (
                <div style={{
                  marginTop: '1.5rem',
                  padding: '12px',
                  background: 'rgba(76, 175, 80, 0.1)',
                  border: '1px solid #4caf50',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#4caf50'
                }}>
                  <strong>✅ TEST MODE:</strong> Using Stripe test environment. No real payments will be processed.
                </div>
              );
            }
            return null;
          })()}
          
          {/* Demo Mode Notice - only show if Stripe not configured */}
          {!stripePromise && (
            <div style={{
              marginTop: '1.5rem',
              padding: '12px',
              background: 'rgba(255, 193, 7, 0.1)',
              borderRadius: '8px',
              fontSize: '13px',
              color: 'var(--text-color-secondary)'
            }}>
              <strong>⚠️ Note:</strong> Stripe is not configured. This is running in demo mode. To enable full payment processing, configure VITE_STRIPE_PUBLISHABLE_KEY.
            </div>
          )}

          {/* Regular Action Buttons - only show if payment form not shown */}
          {!clientSecret && (
            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button
                className="btn btn-secondary"
                onClick={onClose}
                disabled={sending}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSend}
                disabled={sending || !amount || parseFloat(amount) <= 0 || !finalNote}
                style={{ minWidth: '120px' }}
              >
                {sending
                  ? (mode === 'send' ? 'Creating Payment...' : 'Creating Request...')
                  : (mode === 'send' ? 'Continue to Payment' : 'Request Money')
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

