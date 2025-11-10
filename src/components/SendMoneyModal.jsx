import React, { useState, useEffect } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import SendMoneyForm from './SendMoneyForm';
import { paymentService } from '../services/paymentService';

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

const ACCOUNT_READY_STATES = new Set(['ready', 'charges_only']);

const createInitialAccountState = () => ({
  id: null,
  status: 'idle',
  chargesEnabled: false,
  payoutsEnabled: false,
  error: null
});

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
  const [recipientAccount, setRecipientAccount] = useState(createInitialAccountState);
  const [selfAccount, setSelfAccount] = useState(createInitialAccountState);

  // Initialize Stripe
  useEffect(() => {
    const rawKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    const stripePublishableKey = rawKey?.trim();

    if (stripePublishableKey) {
      // Log Stripe mode for debugging
      const isLive = stripePublishableKey.startsWith('pk_live_');
      const isTest = stripePublishableKey.startsWith('pk_test_');
      if (isLive) {
        console.warn('⚠️ Stripe LIVE MODE detected - Real payments will be processed!');
      } else if (isTest) {
        console.log('✅ Stripe TEST MODE - Using test environment');
      }

      loadStripe(stripePublishableKey)
        .then((stripe) => {
          if (!stripe) {
            console.error('Failed to initialize Stripe.js. Publishable key may be invalid.');
            showNotification('Unable to initialize Stripe payments. Please verify the Stripe publishable key.', 'error');
            return;
          }
          setStripePromise(stripe);
        })
        .catch((error) => {
          console.error('Error loading Stripe.js:', error);
          showNotification('Failed to load Stripe payments. Please refresh and try again.', 'error');
        });
    }
  }, [showNotification]);

  useEffect(() => {
    let cancelled = false;

    const loadAccount = async (targetUserId, setAccountState, type) => {
      if (!targetUserId) {
        setAccountState({
          id: null,
          status: 'missing',
          chargesEnabled: false,
          payoutsEnabled: false,
          error: type === 'recipient'
            ? 'Recipient is unavailable.'
            : 'You must be signed in to manage payments.'
        });
        return;
      }

      setAccountState((prev) => ({
        ...prev,
        status: 'loading',
        error: null
      }));

      try {
        const data = await paymentService.getAccountStatus(targetUserId);
        if (cancelled) { return; }

        const chargesEnabled = !!data?.chargesEnabled;
        const payoutsEnabled = !!data?.payoutsEnabled;
        let status = 'missing';

        if (data?.accountId) {
          if (chargesEnabled && payoutsEnabled) {
            status = 'ready';
          } else if (chargesEnabled) {
            status = 'charges_only';
          } else {
            status = 'pending';
          }
        }

        setAccountState({
          id: data?.accountId || null,
          status,
          chargesEnabled,
          payoutsEnabled,
          error: !data?.accountId
            ? (type === 'recipient'
              ? 'This contact has not completed Stripe onboarding yet.'
              : 'Complete your Stripe onboarding to receive payments.')
            : null
        });
      } catch (error) {
        if (cancelled) { return; }
        const message = error?.message || 'Unable to load payment account.';
        const isNotFound = message.toLowerCase().includes('not found');
        setAccountState({
          id: null,
          status: isNotFound ? 'missing' : 'error',
          chargesEnabled: false,
          payoutsEnabled: false,
          error: isNotFound
            ? (type === 'recipient'
              ? 'This contact has not connected a payout account yet.'
              : 'Complete your Stripe onboarding to request payments.')
            : message
        });
      }
    };

    loadAccount(recipientId, setRecipientAccount, 'recipient');
    if (user?.uid) {
      loadAccount(user.uid, setSelfAccount, 'self');
    }

    return () => {
      cancelled = true;
    };
  }, [recipientId, user?.uid]);

  useEffect(() => {
    setClientSecret(null);
    setPaymentIntentId(null);
  }, [mode]);

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

    if (!user?.uid) {
      showNotification('You must be signed in to send or request money.', 'error');
      return;
    }

    // Validate note is provided
    const finalNote = getFinalNote();
    if (!finalNote || finalNote.trim().length === 0) {
      showNotification('Please select or enter a reason for this transaction', 'error');
      return;
    }

    const accountContext = mode === 'send' ? recipientAccount : selfAccount;
    const destinationAccountId = mode === 'send' ? recipientAccount.id : selfAccount.id;
    const loadingMessage = mode === 'send'
      ? 'Checking recipient payment account. Please wait a moment.'
      : 'Checking your connected Stripe account. Please wait a moment.';
    const onboardingMessage = mode === 'send'
      ? 'Recipient has not completed Stripe onboarding yet. Ask them to connect their payment account in Settings.'
      : 'Complete your Stripe onboarding in Settings before requesting money.';

    if (accountContext.status === 'loading') {
      showNotification(loadingMessage, 'info');
      return;
    }

    if (!destinationAccountId || !ACCOUNT_READY_STATES.has(accountContext.status)) {
      showNotification(onboardingMessage, 'error');
      return;
    }

    setSending(true);
    let shouldCloseModal = false;

    try {
      // Ensure API_BASE_URL doesn't have trailing /api to avoid double /api/api/
      const baseUrl = import.meta.env.VITE_API_BASE_URL
        || (import.meta.env.PROD ? 'https://echodynamo-app.vercel.app' : 'http://localhost:3001');
      const API_BASE_URL = baseUrl.endsWith('/api') ? baseUrl.replace(/\/api$/, '') : baseUrl;

      if (mode === 'send') {
        const response = await fetch(`${API_BASE_URL}/api/stripe/create-payment-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: numAmount,
            recipientAccountId: destinationAccountId,
            description: finalNote,
            metadata: {
              senderId: user.uid,
              recipientId,
              recipientAccountId: destinationAccountId,
              note: finalNote,
              type: 'send_money'
            }
          })
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          const errorMessage = data?.error || data?.message || 'Failed to create payment intent';
          throw new Error(errorMessage);
        }

        console.log('Payment intent created:', data);

        if (data?.message) {
          showNotification(
            data.message,
            data?.needsTransfer ? 'warning' : 'info'
          );
        }

        if (data?.clientSecret && stripePromise) {
          // Store client secret for Stripe Elements payment form
          setClientSecret(data.clientSecret);
          setPaymentIntentId(data.paymentIntentId);
        } else if (data?.clientSecret) {
          // Stripe not configured on frontend - show info
          showNotification('Payment intent created. Stripe publishable key not configured.', 'info');
          shouldCloseModal = true;
        } else {
          // No client secret - demo mode or backend handled payment
          showNotification(`Successfully sent $${numAmount.toFixed(2)} to ${recipientName}`, 'success');
          shouldCloseModal = true;
        }
      } else {
        const response = await fetch(`${API_BASE_URL}/stripe/create-payment-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: numAmount,
            description: finalNote,
            recipientAccountId: destinationAccountId,
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

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          const errorMessage = data?.error || data?.message || 'Failed to create payment request';
          throw new Error(errorMessage);
        }

        showNotification(
          `Payment request created! Share this link: ${data?.paymentLink || 'link unavailable'}`,
          data?.paymentLink ? 'success' : 'info'
        );

        if (navigator.clipboard && data?.paymentLink) {
          navigator.clipboard.writeText(data.paymentLink);
        }

        shouldCloseModal = true;
      }

      if (shouldCloseModal) {
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error(`Error ${mode === 'send' ? 'sending' : 'requesting'} money:`, error);
      showNotification(
        `Failed to ${mode === 'send' ? 'send' : 'request'} money. ${error?.message || 'Please try again.'}`,
        'error'
      );
    } finally {
      setSending(false);
    }
  };

  const quickAmounts = [10, 25, 50, 100];
  const finalNote = getFinalNote();
  const parsedAmount = parseFloat(amount);
  const isAmountValid = !Number.isNaN(parsedAmount) && parsedAmount > 0;
  const isAccountLoading = mode === 'send'
    ? recipientAccount.status === 'loading'
    : selfAccount.status === 'loading';
  const isAccountReady = mode === 'send'
    ? ACCOUNT_READY_STATES.has(recipientAccount.status)
    : ACCOUNT_READY_STATES.has(selfAccount.status);
  const isSubmitDisabled = sending
    || !isAmountValid
    || !finalNote
    || isAccountLoading
    || !isAccountReady;

  const renderAccountNotice = () => {
    const target = mode === 'send' ? recipientAccount : selfAccount;
    const subject = mode === 'send' ? 'Recipient' : 'Your';

    if (target.status === 'idle') {
      return null;
    }

    let background = 'rgba(255, 193, 7, 0.12)';
    let border = '1px solid rgba(255, 193, 7, 0.3)';
    let color = 'var(--text-color)';
    let message = target.error || '';
    let icon = 'ℹ️';
    let details = null;

    switch (target.status) {
      case 'loading':
        background = 'rgba(33, 150, 243, 0.12)';
        border = '1px solid rgba(33, 150, 243, 0.25)';
        icon = '⏳';
        message = `${subject === 'Recipient' ? 'Recipient' : 'Your'} payment account details are loading...`;
        break;
      case 'ready':
        background = 'rgba(76, 175, 80, 0.12)';
        border = '1px solid rgba(76, 175, 80, 0.25)';
        icon = '✅';
        message = `${subject === 'Recipient' ? 'Recipient has' : 'You have'} a fully active Stripe account.`;
        break;
      case 'charges_only':
        background = 'rgba(255, 193, 7, 0.18)';
        border = '1px solid rgba(255, 193, 7, 0.35)';
        icon = '⚠️';
        message = `${subject === 'Recipient' ? 'Recipient' : 'You'} can accept payments, but payouts are still pending. Funds will be held until onboarding is completed.`;
        break;
      case 'pending':
        background = 'rgba(244, 67, 54, 0.12)';
        border = '1px solid rgba(244, 67, 54, 0.3)';
        color = '#f44336';
        icon = '⛔️';
        message = `${subject === 'Recipient' ? 'Recipient' : 'You'} must finish Stripe onboarding before payments can be processed.`;
        details = target.error;
        break;
      case 'missing':
        background = 'rgba(244, 67, 54, 0.12)';
        border = '1px solid rgba(244, 67, 54, 0.3)';
        color = '#f44336';
        icon = '⛔️';
        message = target.error || `${subject === 'Recipient' ? 'Recipient has' : 'You have'} not connected a Stripe account yet.`;
        break;
      case 'error':
        background = 'rgba(244, 67, 54, 0.12)';
        border = '1px solid rgba(244, 67, 54, 0.3)';
        color = '#f44336';
        icon = '⚠️';
        message = 'Unable to verify Stripe account status right now.';
        details = target.error;
        break;
      default:
        break;
    }

    if (!message) {
      return null;
    }

    return (
      <div
        style={{
          marginTop: '1rem',
          padding: '12px',
          borderRadius: '8px',
          background,
          border,
          color,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <span style={{ fontSize: '18px' }}>{icon}</span>
          <span>{message}</span>
        </div>
        {details && (
          <div style={{ fontSize: '13px', opacity: 0.85 }}>
            {details}
          </div>
        )}
      </div>
    );
  };

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

          {renderAccountNotice()}

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
            <Elements
              stripe={stripePromise}
              options={{ clientSecret }}
              key={clientSecret}
            >
              <SendMoneyForm
                amount={isAmountValid ? parsedAmount : 0}
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
                disabled={isSubmitDisabled}
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

