// Stripe Payment Form Component
import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useUI } from '../hooks/useUI';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: 'var(--text-color)',
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: 'var(--text-color-secondary)',
      },
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a',
    },
  },
  hidePostalCode: true,
};

export default function SendMoneyForm({
  amount,
  recipientName,
  clientSecret,
  onSuccess,
  onError,
  disabled
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { showNotification } = useUI();
  const [processing, setProcessing] = useState(false);
  const [cardError, setCardError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setCardError(null);

    const cardElement = elements.getElement(CardElement);

    try {
      // Confirm payment with card
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: recipientName || 'EchoDynamo User',
          },
        },
      });

      if (error) {
        setCardError(error.message);
        showNotification(`Payment failed: ${error.message}`, 'error');
        onError?.(error);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        showNotification(`Successfully sent $${amount.toFixed(2)}!`, 'success');
        onSuccess?.(paymentIntent);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setCardError(err.message || 'An error occurred during payment');
      showNotification('Payment failed. Please try again.', 'error');
      onError?.(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
      <div className="form-group">
        <label htmlFor="card-element">Card Information</label>
        <div style={{
          padding: '12px',
          border: cardError ? '2px solid #fa755a' : '2px solid var(--border-color)',
          borderRadius: '8px',
          background: 'var(--surface-color)',
          transition: 'border-color 0.2s ease'
        }}>
          <CardElement
            id="card-element"
            options={CARD_ELEMENT_OPTIONS}
            onChange={(e) => {
              setCardError(e.error ? e.error.message : null);
            }}
          />
        </div>
        {cardError && (
          <div style={{ color: '#fa755a', fontSize: '14px', marginTop: '8px' }}>
            {cardError}
          </div>
        )}
        <small style={{ color: 'var(--text-color-secondary)', marginTop: '4px', display: 'block' }}>
          Your card information is secure and encrypted
        </small>
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={!stripe || processing || disabled || !!cardError}
        style={{ width: '100%', marginTop: '1rem' }}
      >
        {processing ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
      </button>
    </form>
  );
}

