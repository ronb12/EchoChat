// Payment Service using Stripe Connect
// IMPORTANT: Secret keys must never be exposed in frontend code
// This service handles client-side operations; server-side API handles secret operations
import { resolveApiBaseUrl } from '../utils/apiBaseUrl';

class PaymentService {
  constructor() {
    // Stripe publishable key - from environment variable
    // In production, this should be: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    this.stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || null;
    this.stripePromise = null;
    const resolvedBase = resolveApiBaseUrl().replace(/\/$/, '');
    this.apiBaseUrl = `${resolvedBase}/api`;

    // Initialize Stripe if key is available
    if (this.stripePublishableKey) {
      import('@stripe/stripe-js').then(({ loadStripe }) => {
        this.stripePromise = loadStripe(this.stripePublishableKey);
      });
    }
  }

  // Get Stripe instance
  async getStripe() {
    if (!this.stripePublishableKey) {
      throw new Error('Stripe publishable key not configured');
    }
    if (!this.stripePromise) {
      const { loadStripe } = await import('@stripe/stripe-js');
      this.stripePromise = loadStripe(this.stripePublishableKey);
    }
    return this.stripePromise;
  }

  // Create or get Stripe Connect account for user
  // This should be called from backend API
  async createConnectAccount(userId, userEmail) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/stripe/create-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          email: userEmail
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create Stripe account');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating Stripe Connect account:', error);
      // Fallback for dev mode - return mock account ID
      if (import.meta.env.DEV) {
        return {
          accountId: `acct_mock_${userId}`,
          onboardingUrl: null,
          chargesEnabled: false
        };
      }
      throw error;
    }
  }

  // Get Stripe Connect account status
  async getAccountStatus(userId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/stripe/account-status/${userId}`);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage = (data && (data.error || data.message))
          ? data.error || data.message
          : `Failed to get account status (status ${response.status})`;
        const errorToThrow = new Error(errorMessage);
        errorToThrow.status = response.status;
        errorToThrow.details = data;
        throw errorToThrow;
      }

      return data;
    } catch (error) {
      console.error('Error getting account status:', error);
      // Fallback for dev mode
      if (import.meta.env.DEV) {
        return {
          accountId: `acct_mock_${userId}`,
          chargesEnabled: false,
          payoutsEnabled: false,
          requirements: {
            currentlyDue: [],
            eventuallyDue: []
          }
        };
      }
      throw error;
    }
  }

  // Create payment intent for sending money
  async createPaymentIntent(amount, recipientAccountId, metadata = {}) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/stripe/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          recipientAccountId,
          metadata
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create payment intent');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  // Confirm payment with payment method
  async confirmPayment(paymentIntentId, paymentMethodId) {
    try {
      const stripe = await this.getStripe();

      const { error, paymentIntent } = await stripe.confirmCardPayment(
        paymentIntentId,
        {
          payment_method: paymentMethodId
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      return paymentIntent;
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  }

  // Create payment method (card)
  async createPaymentMethod(cardElement, metadata = {}) {
    try {
      const stripe = await this.getStripe();

      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        metadata
      });

      if (error) {
        throw new Error(error.message);
      }

      return paymentMethod;
    } catch (error) {
      console.error('Error creating payment method:', error);
      throw error;
    }
  }

  // Transfer money to connected account (after payment is confirmed)
  // This is handled by backend API
  async transferToAccount(transferAmount, destinationAccountId, transferMetadata = {}) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/stripe/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(transferAmount * 100), // Convert to cents
          destination: destinationAccountId,
          metadata: transferMetadata
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to transfer money');
      }

      return await response.json();
    } catch (error) {
      console.error('Error transferring money:', error);
      throw error;
    }
  }

  // Send money (complete flow)
  async sendMoney(senderId, recipientId, recipientAccountId, amount, note = '', metadata = {}) {
    try {
      // Step 1: Create payment intent
      const paymentIntent = await this.createPaymentIntent(
        amount,
        recipientAccountId,
        {
          senderId,
          recipientId,
          note,
          ...metadata
        }
      );

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount / 100, // Convert back to dollars
        status: paymentIntent.status
      };
    } catch (error) {
      console.error('Error in sendMoney:', error);
      throw error;
    }
  }

  // Get transaction history
  async getTransactions(userId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/stripe/transactions/${userId}`);

      if (!response.ok) {
        throw new Error('Failed to get transactions');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting transactions:', error);
      // Fallback for dev mode
      if (import.meta.env.DEV) {
        return [];
      }
      throw error;
    }
  }

  // Calculate fees
  calculateFees(amount) {
    const platformFeePercent = 2.9; // Stripe standard fee
    const platformFeeFixed = 0.30;
    const fee = (amount * platformFeePercent / 100) + platformFeeFixed;
    const total = amount + fee;

    return {
      amount,
      fee: parseFloat(fee.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      feePercent: platformFeePercent,
      feeFixed: platformFeeFixed
    };
  }

  // Validate amount
  validateAmount(amount, min = 1.0, max = 500.0) {
    if (!amount || isNaN(amount) || amount <= 0) {
      return { valid: false, error: 'Please enter a valid amount' };
    }

    if (amount < min) {
      return { valid: false, error: `Minimum amount is $${min.toFixed(2)}` };
    }

    if (amount > max) {
      return { valid: false, error: `Maximum amount is $${max.toFixed(2)}` };
    }

    return { valid: true };
  }
}

export const paymentService = new PaymentService();
export default paymentService;


