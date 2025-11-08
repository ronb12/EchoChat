import React, { useState, useEffect } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { twoFactorService } from '../services/twoFactorService';
import { profileService } from '../services/profileService';
import { clearDisplayNameCache } from '../hooks/useDisplayName';
// import { getDisplayName, getRealName } from '../utils/userDisplayName';
const _getDisplayName = (user, profile = null) => {
  if (!user) {return 'User';}
  if (profile?.alias) {return profile.alias;}
  if (user.displayName) {return user.displayName;}
  if (user.email) {return user.email.split('@')[0];}
  return 'User';
};
const getRealName = (user, profile = null) => {
  if (!user) {return null;}
  if (profile?.realName) {return profile.realName;}
  return user.displayName || null;
};
import { businessService } from '../services/businessService';
import { biometricService } from '../services/biometricService';
import CashoutModal from './CashoutModal';

function SettingsModal() {
  const { closeSettingsModal, theme, toggleTheme, showNotification, showCashoutModal, openCashoutModal, closeCashoutModal, openParentDashboard, openLinkChildModal, openRatingModal, openFeatureRequestModal, openSupportTicketModal, openAdminDashboard } = useUI();
  const { user } = useAuth();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [show2FAForm, setShow2FAForm] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [alias, setAlias] = useState('');
  const [realName, setRealName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState(null);
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [externalAccounts, setExternalAccounts] = useState({ bankAccounts: [], debitCards: [] });
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricRegistered, setBiometricRegistered] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  // Business account state
  const [isBusinessAccount, setIsBusinessAccount] = useState(false);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [businessStatus, setBusinessStatus] = useState('open');
  const [autoReply, setAutoReply] = useState('');
  const [quickReplies, setQuickReplies] = useState([]);
  const [newQuickReply, setNewQuickReply] = useState({ text: '', shortcut: '' });
  const [businessHours, setBusinessHours] = useState({
    monday: { open: '09:00', close: '17:00', closed: false },
    tuesday: { open: '09:00', close: '17:00', closed: false },
    wednesday: { open: '09:00', close: '17:00', closed: false },
    thursday: { open: '09:00', close: '17:00', closed: false },
    friday: { open: '09:00', close: '17:00', closed: false },
    saturday: { open: '09:00', close: '17:00', closed: false },
    sunday: { open: '09:00', close: '17:00', closed: false }
  });

  // Ensure API_BASE_URL doesn't have trailing /api to avoid double /api/api/
  // In production, use VITE_API_BASE_URL, fallback to localhost only in development
  const isProduction = import.meta.env.PROD;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || (isProduction ? '' : 'http://localhost:3001');
  const API_BASE_URL = baseUrl.endsWith('/api') ? baseUrl.replace(/\/api$/, '') : baseUrl;

  // Warn if API URL not set in production
  if (isProduction && !import.meta.env.VITE_API_BASE_URL) {
    console.error('❌ CRITICAL: VITE_API_BASE_URL not set in production! API calls will fail.');
  }

  // Check if this is test business account for sample data fallback
  const isTestBusinessAccount = () => {
    if (!user) {return false;}
    return user.uid === 'test-business-1' ||
           user.email === 'business@echochat.com' ||
           user.uid?.includes('test-business');
  };

  // Check if business features should be enabled (active subscription or trialing)
  const hasActiveBusinessSubscription = () => {
    if (isTestBusinessAccount()) {
      return true;
    } // Test accounts always have access
    if (!subscription) {
      return false;
    }
    return subscription.status === 'active' || subscription.status === 'trialing';
  };

  // Check if business features are locked (payment failed or subscription cancelled)
  const isBusinessFeaturesLocked = () => {
    if (isTestBusinessAccount()) {
      return false;
    } // Test accounts never locked
    if (!subscription) {
      return true;
    } // No subscription = locked
    return subscription.status === 'past_due' ||
           subscription.status === 'unpaid' ||
           subscription.status === 'incomplete' ||
           subscription.status === 'incomplete_expired' ||
           subscription.status === 'canceled';
  };

  useEffect(() => {
    if (user) {
      // Check if business account
      const accountType = localStorage.getItem('echochat_account_type') || user.accountType;
      const isBusiness = accountType === 'business' || user.isBusinessAccount === true;
      setIsBusinessAccount(isBusiness);

      twoFactorService.is2FAEnabled(user.uid).then(setTwoFactorEnabled);
      loadProfile();
      loadStripeAccount();
      checkBiometricAvailability();

      if (isBusiness) {
        loadBusinessProfile();
        loadSubscription();
      }
    }
  }, [user]);

  // Listen for checkout success event to reload subscription
  useEffect(() => {
    const handleCheckoutSuccess = () => {
      if (isBusinessAccount && user) {
        loadSubscription();
      }
    };
    window.addEventListener('checkoutSuccess', handleCheckoutSuccess);

    return () => {
      window.removeEventListener('checkoutSuccess', handleCheckoutSuccess);
    };
  }, [isBusinessAccount, user]);

  const loadStripeAccount = async () => {
    if (!user) {return;}

    // For test business account, use sample data if API fails
    if (isTestBusinessAccount()) {
      // Set test account ID directly
      const testAccountId = 'test-business-1';
      setStripeAccountId(testAccountId);
      console.log('Test business account detected, using sample data');
      // Load sample data directly
      loadBalance(testAccountId);
      loadTransactions();
      loadPayouts();
      loadExternalAccounts();
      return;
    }

    try {
      // Get account status to retrieve accountId
      const response = await fetch(`${API_BASE_URL}/api/stripe/account-status/${user.uid}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Stripe account status:', data);
        setStripeAccountId(data.accountId);
        // Load balance, transactions, payouts, and external accounts if account exists
        if (data.accountId) {
          console.log('Loading balance for account:', data.accountId);
          loadBalance(data.accountId);
          loadTransactions();
          loadPayouts();
          loadExternalAccounts();
        } else {
          console.log('No accountId returned from account-status');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to load Stripe account status:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error loading Stripe account:', error);
      // If API fails and it's test business account, use sample data
      if (isTestBusinessAccount()) {
        console.log('API failed, using sample data for test business account');
        const testAccountId = 'test-business-1';
        setStripeAccountId(testAccountId);
        loadBalance(testAccountId);
        loadTransactions();
        loadPayouts();
        loadExternalAccounts();
      }
    }
  };

  const loadBalance = async (accountId) => {
    if (!accountId) {
      console.log('loadBalance: No accountId provided');
      return;
    }

    // For test business account, use sample data if API fails
    if (isTestBusinessAccount() && accountId === 'test-business-1') {
      const sampleBalance = {
        available: 1250.75,
        pending: 342.50,
        currency: 'usd',
        breakdown: {
          available: [{
            amount: 1250.75,
            currency: 'usd',
            sourceTypes: { card: 850.25, bank_account: 400.50 }
          }],
          pending: [{
            amount: 342.50,
            currency: 'usd',
            sourceTypes: { card: 342.50 }
          }]
        }
      };
      setBalance(sampleBalance);
      console.log('Using sample balance data for test business account');
      return;
    }

    try {
      setLoadingBalance(true);
      console.log('Fetching balance for accountId:', accountId);
      const response = await fetch(`${API_BASE_URL}/api/stripe/balance/${accountId}`);
      console.log('Balance response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Balance data received:', data);
        setBalance(data);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to load balance:', response.status, errorData);
        // Fallback to sample data for test account if API fails
        if (isTestBusinessAccount() && accountId === 'test-business-1') {
          const sampleBalance = {
            available: 1250.75,
            pending: 342.50,
            currency: 'usd'
          };
          setBalance(sampleBalance);
        }
      }
    } catch (error) {
      console.error('Error loading balance:', error);
      // Fallback to sample data for test account if API fails
      if (isTestBusinessAccount() && accountId === 'test-business-1') {
        const sampleBalance = {
          available: 1250.75,
          pending: 342.50,
          currency: 'usd'
        };
        setBalance(sampleBalance);
        console.log('Using sample balance data as fallback');
      }
    } finally {
      setLoadingBalance(false);
    }
  };

  const loadTransactions = async () => {
    if (!user || !stripeAccountId) {return;}

    // For test business account, use sample data if API fails
    if (isTestBusinessAccount() && stripeAccountId === 'test-business-1') {
      const sampleTransactions = [
        {
          id: 'txn_sample_001',
          amount: 125.50,
          currency: 'usd',
          type: 'charge',
          status: 'available',
          created: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Payment from customer - Order #1234',
          fee: 3.64,
          net: 121.86
        },
        {
          id: 'txn_sample_002',
          amount: 75.00,
          currency: 'usd',
          type: 'charge',
          status: 'available',
          created: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Payment from customer - Service fee',
          fee: 2.18,
          net: 72.82
        },
        {
          id: 'txn_sample_003',
          amount: 250.00,
          currency: 'usd',
          type: 'charge',
          status: 'available',
          created: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Payment from customer - Monthly subscription',
          fee: 7.25,
          net: 242.75
        },
        {
          id: 'txn_sample_004',
          amount: -50.00,
          currency: 'usd',
          type: 'payout',
          status: 'paid',
          created: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Payout to bank account',
          fee: 0.00,
          net: -50.00
        },
        {
          id: 'txn_sample_005',
          amount: 342.50,
          currency: 'usd',
          type: 'charge',
          status: 'pending',
          created: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Payment from customer - Invoice #5678',
          fee: 9.93,
          net: 332.57
        }
      ];
      setTransactions(sampleTransactions);
      console.log('Using sample transactions data for test business account');
      return;
    }

    try {
      setLoadingTransactions(true);
      const response = await fetch(`${API_BASE_URL}/api/stripe/transactions/${user.uid}?limit=10`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      } else {
        // Fallback to sample data for test account
        if (isTestBusinessAccount()) {
          const sampleTransactions = [
            {
              id: 'txn_sample_001',
              amount: 125.50,
              currency: 'usd',
              type: 'charge',
              status: 'available',
              created: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              description: 'Payment from customer - Order #1234',
              fee: 3.64,
              net: 121.86
            },
            {
              id: 'txn_sample_002',
              amount: 75.00,
              currency: 'usd',
              type: 'charge',
              status: 'available',
              created: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              description: 'Payment from customer - Service fee',
              fee: 2.18,
              net: 72.82
            }
          ];
          setTransactions(sampleTransactions);
        }
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      // Fallback to sample data for test account
      if (isTestBusinessAccount()) {
        const sampleTransactions = [
          {
            id: 'txn_sample_001',
            amount: 125.50,
            currency: 'usd',
            type: 'charge',
            status: 'available',
            created: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            description: 'Payment from customer - Order #1234',
            fee: 3.64,
            net: 121.86
          }
        ];
        setTransactions(sampleTransactions);
      }
    } finally {
      setLoadingTransactions(false);
    }
  };

  const loadPayouts = async () => {
    if (!stripeAccountId) {return;}

    // For test business account, use sample data if API fails
    if (isTestBusinessAccount() && stripeAccountId === 'test-business-1') {
      const samplePayouts = [
        {
          id: 'po_sample_001',
          amount: 200.00,
          currency: 'usd',
          status: 'paid',
          method: 'standard',
          arrivalDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          estimatedArrival: null,
          created: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          destination: 'ba_sample_001',
          failureCode: null,
          failureMessage: null,
          fee: 0.00
        },
        {
          id: 'po_sample_002',
          amount: 50.00,
          currency: 'usd',
          status: 'paid',
          method: 'instant',
          arrivalDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          estimatedArrival: null,
          created: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          destination: 'card_sample_001',
          failureCode: null,
          failureMessage: null,
          fee: 0.50
        },
        {
          id: 'po_sample_003',
          amount: 150.00,
          currency: 'usd',
          status: 'pending',
          method: 'standard',
          arrivalDate: null,
          estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          created: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          destination: 'ba_sample_001',
          failureCode: null,
          failureMessage: null,
          fee: 0.00
        }
      ];
      setPayouts(samplePayouts);
      console.log('Using sample payouts data for test business account');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe/payouts/${stripeAccountId}?limit=5`);
      if (response.ok) {
        const data = await response.json();
        setPayouts(data.payouts || []);
      } else {
        // Fallback to sample data for test account
        if (isTestBusinessAccount()) {
          const samplePayouts = [
            {
              id: 'po_sample_001',
              amount: 200.00,
              currency: 'usd',
              status: 'paid',
              method: 'standard',
              created: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              fee: 0.00
            }
          ];
          setPayouts(samplePayouts);
        }
      }
    } catch (error) {
      console.error('Error loading payouts:', error);
      // Fallback to sample data for test account
      if (isTestBusinessAccount()) {
        const samplePayouts = [
          {
            id: 'po_sample_001',
            amount: 200.00,
            currency: 'usd',
            status: 'paid',
            method: 'standard',
            created: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            fee: 0.00
          }
        ];
        setPayouts(samplePayouts);
      }
    }
  };

  const loadExternalAccounts = async () => {
    if (!stripeAccountId) {return;}

    // For test business account, use sample data if API fails
    if (isTestBusinessAccount() && stripeAccountId === 'test-business-1') {
      const sampleAccounts = {
        bankAccounts: [
          {
            id: 'ba_sample_001',
            bankName: 'Chase Bank',
            last4: '1234',
            accountHolderName: 'Test Business Account',
            accountHolderType: 'company',
            currency: 'usd',
            defaultForCurrency: true,
            status: 'verified',
            routingNumber: '****0210'
          }
        ],
        debitCards: [
          {
            id: 'card_sample_001',
            brand: 'visa',
            last4: '5678',
            expMonth: 12,
            expYear: 2025,
            defaultForCurrency: false,
            status: 'active'
          }
        ]
      };
      setExternalAccounts(sampleAccounts);
      console.log('Using sample external accounts data for test business account');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe/external-accounts/${stripeAccountId}`);
      if (response.ok) {
        const data = await response.json();
        setExternalAccounts(data);
      } else {
        // Fallback to sample data for test account
        if (isTestBusinessAccount()) {
          const sampleAccounts = {
            bankAccounts: [
              {
                id: 'ba_sample_001',
                bankName: 'Chase Bank',
                last4: '1234',
                defaultForCurrency: true,
                status: 'verified'
              }
            ],
            debitCards: [
              {
                id: 'card_sample_001',
                brand: 'visa',
                last4: '5678',
                defaultForCurrency: false,
                status: 'active'
              }
            ]
          };
          setExternalAccounts(sampleAccounts);
        }
      }
    } catch (error) {
      console.error('Error loading external accounts:', error);
      // Fallback to sample data for test account
      if (isTestBusinessAccount()) {
        const sampleAccounts = {
          bankAccounts: [
            {
              id: 'ba_sample_001',
              bankName: 'Chase Bank',
              last4: '1234',
              defaultForCurrency: true,
              status: 'verified'
            }
          ],
          debitCards: [
            {
              id: 'card_sample_001',
              brand: 'visa',
              last4: '5678',
              defaultForCurrency: false,
              status: 'active'
            }
          ]
        };
        setExternalAccounts(sampleAccounts);
      }
    }
  };

  const loadSubscription = async () => {
    if (!user || !isBusinessAccount) {return;}

    try {
      setLoadingSubscription(true);

      // For test business account, use sample data
      if (isTestBusinessAccount()) {
        setSubscription({
          subscriptionId: 'sub_test_001',
          status: 'trialing',
          trialEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          currentPeriodEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false,
          amount: 30.00,
          currency: 'usd',
          interval: 'month',
          isTestAccount: true
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/stripe/subscription/${user.uid}`);
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      } else if (response.status === 404) {
        // No subscription found - user needs to subscribe
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handleSubscribe = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!user) {
      console.error('No user found');
      showNotification('User not found. Please log in again.', 'error');
      return;
    }

    console.log('Subscribe button clicked', { userId: user.uid, email: user.email, stripeAccountId });

    try {
      showNotification('Redirecting to subscription checkout...', 'info');

      // For test business account
      if (isTestBusinessAccount()) {
        showNotification('Test account - subscription creation skipped. In production, this will redirect to Stripe checkout.', 'info');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          accountId: stripeAccountId
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          showNotification(data.message || 'Subscription checkout ready', 'info');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        showNotification(errorData.error || 'Failed to create checkout session', 'error');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      showNotification('Failed to create checkout session', 'error');
    }
  };

  const handleCancelSubscription = async (cancelImmediately = false) => {
    if (!user || !subscription) {return;}

    if (!confirm(cancelImmediately
      ? 'Are you sure you want to cancel your subscription immediately? You will lose access to business features right away.'
      : 'Are you sure you want to cancel your subscription? You will continue to have access until the end of your billing period.')) {
      return;
    }

    try {
      showNotification('Cancelling subscription...', 'info');

      // For test business account
      if (isTestBusinessAccount()) {
        showNotification('Test account - subscription cancelled (demo)', 'success');
        setSubscription({ ...subscription, status: 'canceled', cancelAtPeriodEnd: !cancelImmediately });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/stripe/cancel-subscription/${user.uid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelImmediately })
      });

      if (response.ok) {
        const data = await response.json();
        showNotification(
          cancelImmediately
            ? 'Subscription cancelled. You no longer have access to business features.'
            : 'Subscription will be cancelled at the end of your billing period.',
          'success'
        );
        loadSubscription(); // Reload subscription status
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        showNotification(errorData.error || 'Failed to cancel subscription', 'error');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      showNotification('Failed to cancel subscription', 'error');
    }
  };

  const loadProfile = async () => {
    if (!user) {return;}
    try {
      setLoading(true);
      const profile = await profileService.getUserProfile(user.uid);
      setAlias(profile.alias || '');
      setRealName(profile.realName || user.displayName || '');
    } catch (error) {
      // Error is already handled in profileService with fallback
      // Set defaults if needed
      setAlias('');
      setRealName(user.displayName || '');
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessProfile = async () => {
    if (!user) {return;}
    try {
      let profile = await businessService.getBusinessProfile(user.uid);

      if (!profile) {
        // Create default business profile
        profile = await businessService.createBusinessProfile(user.uid, {
          name: user.displayName || user.email || 'My Business',
          description: ''
        });
      }

      setBusinessProfile(profile);
      setBusinessName(profile.name || '');
      setBusinessStatus(profile.status || 'open');
      setAutoReply(profile.autoReply || '');
      setQuickReplies(profile.quickReplies || []);
      if (profile.businessHours) {
        setBusinessHours(profile.businessHours);
      }
    } catch (error) {
      console.error('Error loading business profile:', error);
      // Use localStorage fallback for demo
      const stored = localStorage.getItem(`business_${user.uid}`);
      if (stored) {
        const profile = JSON.parse(stored);
        setBusinessProfile(profile);
        setBusinessName(profile.name || '');
        setBusinessStatus(profile.status || 'open');
        setAutoReply(profile.autoReply || '');
        setQuickReplies(profile.quickReplies || []);
      }
    }
  };

  const handleSaveAlias = async () => {
    if (!user) {return;}
    try {
      setSaving(true);
      await profileService.updateProfile(user.uid, {
        alias: alias.trim() || null,
        realName: realName.trim() || user.displayName || null
      });

      clearDisplayNameCache();

      // Reload profile to reflect changes without full page reload
      await loadProfile();

      showNotification('Profile updated successfully!', 'success');
    } catch (error) {
      console.error('Error saving alias:', error);
      showNotification('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBusinessSettings = async () => {
    if (!user || !isBusinessAccount) {return;}
    try {
      setSaving(true);

      // Update business profile
      const updatedProfile = {
        name: businessName,
        status: businessStatus,
        autoReply: autoReply || null,
        quickReplies: quickReplies,
        businessHours: businessHours
      };

      await businessService.createBusinessProfile(user.uid, updatedProfile);

      // Save to localStorage for demo
      localStorage.setItem(`business_${user.uid}`, JSON.stringify({
        ...businessProfile,
        ...updatedProfile
      }));

      await loadBusinessProfile();
      showNotification('Business settings saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving business settings:', error);
      showNotification('Failed to save business settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuickReply = () => {
    if (!newQuickReply.text.trim()) {
      showNotification('Please enter a quick reply text', 'error');
      return;
    }

    const reply = {
      id: Date.now().toString(),
      text: newQuickReply.text,
      shortcut: newQuickReply.shortcut || `qr${quickReplies.length + 1}`,
      createdAt: new Date()
    };

    setQuickReplies([...quickReplies, reply]);
    setNewQuickReply({ text: '', shortcut: '' });
  };

  const handleDeleteQuickReply = (id) => {
    setQuickReplies(quickReplies.filter(r => r.id !== id));
  };

  const checkBiometricAvailability = async () => {
    if (!user) return;
    
    try {
      const available = await biometricService.isAvailable();
      setBiometricAvailable(available);
      
      if (available) {
        const registered = biometricService.isRegistered(user.uid);
        setBiometricRegistered(registered);
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setBiometricAvailable(false);
    }
  };

  const handleRegisterBiometric = async () => {
    if (!user) return;
    
    setBiometricLoading(true);
    try {
      const result = await biometricService.register(user.uid, user.email || user.displayName || 'User');
      
      if (result.success) {
        setBiometricRegistered(true);
        showNotification('Biometric authentication registered successfully!', 'success');
      } else {
        showNotification(result.error || 'Failed to register biometric authentication', 'error');
      }
    } catch (error) {
      console.error('Error registering biometric:', error);
      showNotification('Failed to register biometric authentication', 'error');
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleUnregisterBiometric = () => {
    if (!user) return;
    
    if (window.confirm('Are you sure you want to remove biometric authentication?')) {
      biometricService.unregister(user.uid);
      setBiometricRegistered(false);
      showNotification('Biometric authentication removed', 'success');
    }
  };

  const handleToggleDayClosed = (day) => {
    setBusinessHours({
      ...businessHours,
      [day]: {
        ...businessHours[day],
        closed: !businessHours[day].closed
      }
    });
  };

  return (
    <div className="modal active" id="settings-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={closeSettingsModal}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="settings-section">
            <h3>Profile & Privacy</h3>
            <div className="setting-item">
              <label htmlFor="alias-input">
                Display Alias <span style={{ color: 'var(--error-color, #f44336)' }}>*</span>
              </label>
              <input
                id="alias-input"
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Enter an alias to display instead of your real name"
                maxLength={50}
                required
                disabled={loading}
              />
              <small style={{ color: 'var(--text-color-secondary)', marginTop: '4px', display: 'block' }}>
                Use an alias for privacy. Your real name ({getRealName(user) || user?.displayName || 'Not set'}) is kept in your account but won't be shown to others.
              </small>
            </div>
            <div className="setting-item" style={{ marginTop: '1rem' }}>
              <label htmlFor="real-name-input">Real Name (Account)</label>
              <input
                id="real-name-input"
                type="text"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                placeholder="Your real name for account verification"
                disabled={loading}
              />
              <small style={{ color: 'var(--text-color-secondary)', marginTop: '4px', display: 'block' }}>
                This is your account name and will be used for verification purposes only.
              </small>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleSaveAlias}
              disabled={saving || loading}
              style={{ marginTop: '1rem' }}
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>

          <div className="settings-section">
            <h3>Appearance</h3>
            <div className="setting-item">
              <label htmlFor="theme-select">Theme</label>
              <select
                id="theme-select"
                value={theme}
                onChange={toggleTheme}
              >
                <option value="auto">Auto</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3>Notifications</h3>
            <div className="setting-item">
              <label htmlFor="notifications-toggle">Enable Notifications</label>
              <input type="checkbox" id="notifications-toggle" defaultChecked />
            </div>
          </div>

          <div className="settings-section">
            <h3>Privacy</h3>
            <div className="setting-item">
              <label htmlFor="read-receipts-toggle">Read Receipts</label>
              <input type="checkbox" id="read-receipts-toggle" defaultChecked />
            </div>
          </div>

          <div className="settings-section">
            <h3>Balance & Payments</h3>
            {stripeAccountId ? (
              <>
                {/* Balance Display */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%)',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  border: '1px solid rgba(76, 175, 80, 0.2)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>Available Balance:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {loadingBalance ? (
                        <span style={{ fontSize: '20px', color: 'var(--text-color-secondary)' }}>Loading...</span>
                      ) : balance ? (
                        <span style={{ fontSize: '24px', fontWeight: '700', color: '#4caf50' }}>
                          ${balance.available.toFixed(2)}
                        </span>
                      ) : (
                        <span style={{ fontSize: '20px', color: 'var(--text-color-secondary)' }}>$0.00</span>
                      )}
                      <button
                        onClick={() => loadBalance(stripeAccountId)}
                        disabled={loadingBalance}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: loadingBalance ? 'not-allowed' : 'pointer',
                          fontSize: '18px',
                          padding: '4px 8px',
                          color: 'var(--text-color-secondary)',
                          opacity: loadingBalance ? 0.5 : 1
                        }}
                        title="Refresh balance"
                      >
                        🔄
                      </button>
                    </div>
                  </div>
                  {balance && balance.pending > 0 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem',
                      color: 'var(--text-color-secondary)',
                      paddingTop: '8px',
                      borderTop: '1px solid rgba(76, 175, 80, 0.1)'
                    }}>
                      <span>Pending:</span>
                      <span style={{ fontWeight: '600' }}>${balance.pending.toFixed(2)}</span>
                    </div>
                  )}
                  {balance && balance.breakdown && (
                    <div style={{
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid rgba(76, 175, 80, 0.1)',
                      fontSize: '0.75rem',
                      color: 'var(--text-color-secondary)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total Balance:</span>
                        <span style={{ fontWeight: '600' }}>
                          ${((balance.available || 0) + (balance.pending || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Methods */}
                {externalAccounts && (externalAccounts.bankAccounts.length > 0 || externalAccounts.debitCards.length > 0) && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-color-secondary)', marginBottom: '8px', display: 'block' }}>
                      Payment Methods
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {externalAccounts.bankAccounts.map(account => (
                        <div key={account.id} style={{
                          padding: '10px',
                          background: 'var(--surface-color)',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>🏦 {account.bankName || 'Bank'} •••• {account.last4}</span>
                          {account.defaultForCurrency && (
                            <span style={{ fontSize: '0.75rem', color: '#4caf50' }}>Default</span>
                          )}
                        </div>
                      ))}
                      {externalAccounts.debitCards.map(card => (
                        <div key={card.id} style={{
                          padding: '10px',
                          background: 'var(--surface-color)',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>💳 {card.brand?.toUpperCase() || 'Card'} •••• {card.last4}</span>
                          {card.defaultForCurrency && (
                            <span style={{ fontSize: '0.75rem', color: '#4caf50' }}>Default</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                  <button
                    className="btn btn-primary"
                    onClick={openCashoutModal}
                    disabled={!balance || balance.available <= 0}
                    style={{ flex: 1 }}
                  >
                    💵 Cash Out
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      console.log('Manage button clicked', { stripeAccountId, isTestBusiness: isTestBusinessAccount() });

                      if (!stripeAccountId) {
                        showNotification('No payment account found', 'error');
                        return;
                      }

                      try {
                        // For test business account, show a message instead of redirecting
                        if (isTestBusinessAccount() && stripeAccountId === 'test-business-1') {
                          console.log('Showing test account notification');
                          showNotification('Manage account feature is available for real Stripe accounts. In production, this will open Stripe Connect account settings.', 'info');
                          console.log('Notification function called');
                          return;
                        }

                        showNotification('Opening Stripe account settings...', 'info');

                        const response = await fetch(`${API_BASE_URL}/api/stripe/create-account-link`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            accountId: stripeAccountId,
                            type: 'account_update'
                          })
                        });

                        if (response.ok) {
                          const data = await response.json();
                          if (data.isTestAccount) {
                            // Test account - show info message
                            showNotification(data.message || 'This is a test account. Real Stripe Connect account management is available for production accounts.', 'info');
                          } else if (data.url) {
                            // Open in new tab/window
                            window.open(data.url, '_blank', 'noopener,noreferrer');
                            showNotification('Stripe account settings opened in new tab', 'success');
                          } else {
                            showNotification('No URL returned from Stripe', 'error');
                          }
                        } else {
                          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                          console.error('Failed to create account link:', errorData);
                          showNotification(errorData.error || 'Failed to open account settings', 'error');
                        }
                      } catch (error) {
                        console.error('Error opening account settings:', error);
                        showNotification(`Failed to open account settings: ${error.message}. Please check your internet connection and ensure the backend server is running.`, 'error');
                      }
                    }}
                    style={{ flex: 1 }}
                    disabled={!stripeAccountId}
                    type="button"
                  >
                    ⚙️ Manage
                  </button>
                </div>

                {/* Transaction History Toggle */}
                <div style={{ marginBottom: '1rem' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowTransactionHistory(!showTransactionHistory);
                      if (!showTransactionHistory && transactions.length === 0) {
                        loadTransactions();
                        loadPayouts();
                      }
                    }}
                    style={{ width: '100%', fontSize: '0.9rem' }}
                  >
                    {showTransactionHistory ? '▼' : '▶'} Transaction History
                  </button>
                </div>

                {/* Transaction History */}
                {showTransactionHistory && (
                  <div style={{
                    background: 'var(--surface-color)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '1rem',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    {loadingTransactions ? (
                      <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-color-secondary)' }}>
                        Loading transactions...
                      </div>
                    ) : transactions.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-color-secondary)' }}>
                          Recent Transactions
                        </h4>
                        {transactions.map((txn) => (
                          <div key={txn.id} style={{
                            padding: '10px',
                            background: 'var(--border-color)',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div>
                              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                {txn.type === 'charge' ? '💰 Received' :
                                 txn.type === 'payment' ? '💸 Sent' :
                                 txn.type === 'transfer' ? '📤 Transfer' :
                                 txn.type === 'payout' ? '💵 Payout' : txn.type}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>
                                {txn.description || 'Transaction'}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)', marginTop: '4px' }}>
                                {new Date(txn.created).toLocaleDateString()} {new Date(txn.created).toLocaleTimeString()}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{
                                fontWeight: '700',
                                color: txn.amount > 0 ? '#4caf50' : '#f44336',
                                fontSize: '1rem'
                              }}>
                                {txn.amount > 0 ? '+' : ''}${Math.abs(txn.amount).toFixed(2)}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)' }}>
                                {txn.status}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-color-secondary)' }}>
                        No transactions yet
                      </div>
                    )}

                    {/* Payout History */}
                    {payouts.length > 0 && (
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-color-secondary)' }}>
                          Recent Payouts
                        </h4>
                        {payouts.map((payout) => (
                          <div key={payout.id} style={{
                            padding: '10px',
                            background: 'var(--border-color)',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px'
                          }}>
                            <div>
                              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                💵 Payout to {payout.method === 'standard' ? 'Bank' : 'Card'}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)' }}>
                                {new Date(payout.created).toLocaleDateString()}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: '700', color: '#f44336', fontSize: '1rem' }}>
                                -${payout.amount.toFixed(2)}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: payout.status === 'paid' ? '#4caf50' : 'var(--text-color-secondary)' }}>
                                {payout.status}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <small style={{ color: 'var(--text-color-secondary)', marginTop: '8px', display: 'block', fontSize: '0.85rem' }}>
                  💡 Withdraw funds to your bank account (2-7 days, free) or debit card (30 min, 1% fee)
                </small>
              </>
            ) : (
              <div style={{
                padding: '16px',
                background: 'var(--border-color)',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <p style={{ marginBottom: '12px', color: 'var(--text-color-secondary)' }}>
                  No payment account linked
                </p>
                <button
                  className="btn btn-secondary"
                  onClick={async () => {
                    try {
                      const response = await fetch(`${API_BASE_URL}/api/stripe/create-account`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          userId: user.uid,
                          email: user.email,
                          country: 'US',
                          accountType: isBusinessAccount ? 'business' : 'personal',
                          isBusinessAccount: isBusinessAccount
                        })
                      });
                      if (response.ok) {
                        const data = await response.json();
                        // For business accounts, redirect to checkout to collect payment method
                        if (isBusinessAccount && data.checkoutUrl) {
                          showNotification('Redirecting to checkout to start your 7-day free trial...', 'info');
                          window.location.href = data.checkoutUrl;
                        } else if (data.onboardingUrl) {
                          window.location.href = data.onboardingUrl;
                        } else {
                          showNotification('Account created. You can now send and receive money.', 'success');
                          loadStripeAccount();
                        }
                      }
                    } catch (error) {
                      showNotification('Failed to create account', 'error');
                    }
                  }}
                >
                  Set Up Payments
                </button>
              </div>
            )}
          </div>

          {/* Business Account Settings */}
          {isBusinessAccount && (
            <div className="settings-section">
              <h3>🏢 Business Settings</h3>

              {/* Subscription Status */}
              <div className="setting-item" style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <label style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', display: 'block' }}>
                  💳 Business Subscription
                </label>
                {loadingSubscription ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-color-secondary)' }}>
                    Loading subscription status...
                  </div>
                ) : subscription ? (
                  <div style={{
                    padding: '1rem',
                    background: subscription.status === 'active' || subscription.status === 'trialing'
                      ? 'rgba(76, 175, 80, 0.1)'
                      : 'rgba(244, 67, 54, 0.1)',
                    borderRadius: '8px',
                    border: `1px solid ${subscription.status === 'active' || subscription.status === 'trialing'
                      ? 'rgba(76, 175, 80, 0.3)'
                      : 'rgba(244, 67, 54, 0.3)'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                          ${subscription.amount?.toFixed(2) || '30.00'}/{subscription.interval || 'month'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-color-secondary)' }}>
                          Status: <span style={{
                            fontWeight: '600',
                            color: subscription.status === 'active' || subscription.status === 'trialing' ? '#4caf50' :
                                   subscription.status === 'past_due' || subscription.status === 'unpaid' || subscription.status === 'incomplete' ? '#f44336' : '#9e9e9e'
                          }}>
                            {subscription.status === 'trialing' ? 'Free Trial' :
                             subscription.status === 'active' ? 'Active' :
                             subscription.status === 'canceled' ? 'Cancelled' :
                             subscription.status === 'past_due' ? 'Past Due' :
                             subscription.status === 'unpaid' ? 'Unpaid' :
                             subscription.status === 'incomplete' ? 'Incomplete' :
                             subscription.status === 'incomplete_expired' ? 'Expired' :
                             subscription.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {subscription.status === 'trialing' && subscription.trialEnd && (
                      <div style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-color-secondary)',
                        marginBottom: '0.75rem',
                        padding: '0.75rem',
                        background: 'rgba(255, 193, 7, 0.1)',
                        borderRadius: '4px',
                        border: '1px solid rgba(255, 193, 7, 0.3)'
                      }}>
                        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                          ⏰ Free Trial Active
                        </div>
                        <div style={{ marginBottom: '0.5rem' }}>
                          Trial ends: {new Date(subscription.trialEnd).toLocaleDateString()} ({Math.ceil((new Date(subscription.trialEnd) - new Date()) / (1000 * 60 * 60 * 24))} days remaining)
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 193, 7, 0.2)' }}>
                          💡 <strong>Not planning to continue?</strong> Cancel anytime during your trial - you won't be charged. Just click "Cancel Subscription" below.
                        </div>
                      </div>
                    )}

                    {subscription.currentPeriodEnd && (subscription.status === 'active' || subscription.status === 'trialing') && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-color-secondary)', marginBottom: '0.75rem' }}>
                        Next billing date: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </div>
                    )}

                    {subscription.cancelAtPeriodEnd && (
                      <div style={{
                        fontSize: '0.85rem',
                        color: '#f44336',
                        marginBottom: '0.75rem',
                        padding: '0.5rem',
                        background: 'rgba(244, 67, 54, 0.1)',
                        borderRadius: '4px'
                      }}>
                        ⚠️ Subscription will be cancelled on {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'period end'}
                      </div>
                    )}

                    {/* Payment Failed / Past Due Status */}
                    {(subscription.status === 'past_due' || subscription.status === 'unpaid' || subscription.status === 'incomplete' || subscription.status === 'incomplete_expired') && (
                      <div style={{
                        fontSize: '0.85rem',
                        color: '#f44336',
                        marginBottom: '0.75rem',
                        padding: '0.75rem',
                        background: 'rgba(244, 67, 54, 0.15)',
                        borderRadius: '4px',
                        border: '1px solid rgba(244, 67, 54, 0.3)'
                      }}>
                        <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                          🔴 Payment Failed
                        </div>
                        <div style={{ marginBottom: '0.5rem' }}>
                          Your payment method was declined. Stripe attempted to charge your card multiple times but the payment failed.
                        </div>
                        <div style={{ marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                          <strong>What happens next:</strong>
                          <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0 }}>
                            <li>Your subscription is currently <strong>past due</strong></li>
                            <li>You may lose access to business features if payment isn't updated</li>
                            <li>Update your payment method to reactivate your subscription</li>
                          </ul>
                        </div>
                        <button
                          className="btn btn-primary"
                          onClick={async () => {
                            try {
                              showNotification('Opening payment settings...', 'info');

                              if (isTestBusinessAccount()) {
                                showNotification('Test account - payment update skipped. In production, this opens Stripe Customer Portal.', 'info');
                                return;
                              }

                              const response = await fetch(`${API_BASE_URL}/api/stripe/create-portal-session`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  userId: user.uid
                                })
                              });

                              if (response.ok) {
                                const data = await response.json();
                                if (data.url) {
                                  window.location.href = data.url;
                                } else {
                                  showNotification('Failed to open payment settings', 'error');
                                }
                              } else {
                                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                                showNotification(errorData.error || 'Failed to open payment settings', 'error');
                              }
                            } catch (error) {
                              console.error('Error opening portal:', error);
                              showNotification('Failed to open payment settings', 'error');
                            }
                          }}
                          style={{ width: '100%', fontSize: '0.9rem', fontWeight: '600' }}
                        >
                          Update Payment Method
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                      {(subscription.status === 'active' || subscription.status === 'trialing') && !subscription.cancelAtPeriodEnd && (
                        <>
                          <button
                            className="btn btn-secondary"
                            onClick={async () => {
                              try {
                                showNotification('Opening payment settings...', 'info');

                                if (isTestBusinessAccount()) {
                                  showNotification('Test account - payment settings skipped. In production, this opens Stripe Customer Portal.', 'info');
                                  return;
                                }

                                const response = await fetch(`${API_BASE_URL}/api/stripe/create-portal-session`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    userId: user.uid
                                  })
                                });

                                if (response.ok) {
                                  const data = await response.json();
                                  if (data.url) {
                                    window.location.href = data.url;
                                  } else {
                                    showNotification('Failed to open payment settings', 'error');
                                  }
                                } else {
                                  const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                                  showNotification(errorData.error || 'Failed to open payment settings', 'error');
                                }
                              } catch (error) {
                                console.error('Error opening portal:', error);
                                showNotification('Failed to open payment settings', 'error');
                              }
                            }}
                            style={{ flex: 1, fontSize: '0.9rem', minWidth: '140px' }}
                          >
                            Manage Payment
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              const message = subscription.status === 'trialing'
                                ? 'Are you sure you want to cancel your subscription? You can continue using business features until the trial ends, and you won\'t be charged. Business features will be locked after the trial ends.'
                                : 'Are you sure you want to cancel your subscription? You will continue to have access until the end of your billing period.';
                              if (confirm(message)) {
                                handleCancelSubscription(false);
                              }
                            }}
                            style={{ flex: 1, fontSize: '0.9rem', minWidth: '140px' }}
                          >
                            Cancel Subscription
                          </button>
                        </>
                      )}
                      {subscription.cancelAtPeriodEnd && (
                        <button
                          className="btn btn-primary"
                          onClick={async () => {
                            try {
                              // Reactivate subscription
                              if (isTestBusinessAccount()) {
                                setSubscription({ ...subscription, cancelAtPeriodEnd: false });
                                showNotification('Subscription reactivated (demo)', 'success');
                                return;
                              }
                              // In production, you'd call an API to reactivate
                              showNotification('Please contact support to reactivate your subscription', 'info');
                            } catch (error) {
                              showNotification('Failed to reactivate subscription', 'error');
                            }
                          }}
                          style={{ flex: 1, fontSize: '0.9rem' }}
                        >
                          Reactivate Subscription
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '1rem',
                    background: 'var(--surface-color)',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <p style={{ marginBottom: '1rem', color: 'var(--text-color-secondary)' }}>
                      No active subscription. Subscribe to access business features.
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={(e) => handleSubscribe(e)}
                      style={{ width: '100%' }}
                      type="button"
                    >
                      Subscribe - $30/month (7-day free trial)
                    </button>
                    <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-color-secondary)', fontSize: '0.85rem' }}>
                      Start your 7-day free trial today
                    </small>
                  </div>
                )}
              </div>

              {/* Feature Lock Warning */}
              {isBusinessFeaturesLocked() && (
                <div style={{
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  background: 'rgba(255, 193, 7, 0.15)',
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>🔒</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#f57c00' }}>
                      Business Features Locked
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-color-secondary)', marginBottom: '0.75rem' }}>
                      {subscription?.status === 'past_due' || subscription?.status === 'unpaid'
                        ? 'Your payment failed. Update your payment method to unlock business features.'
                        : subscription?.status === 'canceled'
                        ? 'Your subscription has been cancelled. Resubscribe to access business features.'
                        : 'Subscribe to access business features.'}
                    </div>
                    {subscription?.status === 'past_due' || subscription?.status === 'unpaid' ? (
                      <button
                        className="btn btn-primary"
                        onClick={async () => {
                          try {
                            showNotification('Opening payment settings...', 'info');
                            const response = await fetch(`${API_BASE_URL}/api/stripe/create-portal-session`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ userId: user.uid })
                            });
                            if (response.ok) {
                              const data = await response.json();
                              if (data.url) {window.location.href = data.url;}
                            }
                          } catch (error) {
                            showNotification('Failed to open payment settings', 'error');
                          }
                        }}
                        style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                      >
                        Update Payment Method
                      </button>
                    ) : subscription?.status === 'canceled' ? (
                      <button
                        className="btn btn-primary"
                        onClick={(e) => handleSubscribe(e)}
                        style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                      >
                        Resubscribe
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary"
                        onClick={(e) => handleSubscribe(e)}
                        style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                      >
                        Subscribe Now
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Business Name */}
              <div className="setting-item" style={{ marginBottom: '1rem', position: 'relative' }}>
                <label htmlFor="business-name">Business Name {!hasActiveBusinessSubscription() && <span style={{ color: '#9e9e9e' }}>🔒</span>}</label>
                <input
                  id="business-name"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Enter business name"
                  disabled={loading || !hasActiveBusinessSubscription()}
                  style={{
                    opacity: hasActiveBusinessSubscription() ? 1 : 0.6,
                    cursor: hasActiveBusinessSubscription() ? 'text' : 'not-allowed'
                  }}
                />
              </div>

              {/* Business Status */}
              <div className="setting-item" style={{ marginBottom: '1rem' }}>
                <label htmlFor="business-status">Business Status {!hasActiveBusinessSubscription() && <span style={{ color: '#9e9e9e' }}>🔒</span>}</label>
                <select
                  id="business-status"
                  value={businessStatus}
                  onChange={(e) => setBusinessStatus(e.target.value)}
                  disabled={loading || !hasActiveBusinessSubscription()}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    opacity: hasActiveBusinessSubscription() ? 1 : 0.6,
                    cursor: hasActiveBusinessSubscription() ? 'pointer' : 'not-allowed'
                  }}
                >
                  <option value="open">🟢 Open</option>
                  <option value="closed">🔴 Closed</option>
                  <option value="away">🟡 Away</option>
                </select>
              </div>

              {/* Auto-Reply */}
              <div className="setting-item" style={{ marginBottom: '1rem' }}>
                <label htmlFor="auto-reply">Auto-Reply Message {!hasActiveBusinessSubscription() && <span style={{ color: '#9e9e9e' }}>🔒</span>}</label>
                <textarea
                  id="auto-reply"
                  value={autoReply}
                  onChange={(e) => setAutoReply(e.target.value)}
                  placeholder="Message sent when business is closed or away"
                  rows={3}
                  disabled={loading || !hasActiveBusinessSubscription()}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    opacity: hasActiveBusinessSubscription() ? 1 : 0.6,
                    cursor: hasActiveBusinessSubscription() ? 'text' : 'not-allowed'
                  }}
                />
                <small style={{ color: 'var(--text-color-secondary)', marginTop: '4px', display: 'block' }}>
                  This message will be sent automatically when your business is closed or away.
                </small>
              </div>

              {/* Business Hours */}
              <div className="setting-item" style={{ marginBottom: '1rem' }}>
                <label>Business Hours {!hasActiveBusinessSubscription() && <span style={{ color: '#9e9e9e' }}>🔒</span>}</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                    <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--surface-color)', borderRadius: '6px' }}>
                      <input
                        type="checkbox"
                        checked={!businessHours[day]?.closed}
                        onChange={() => handleToggleDayClosed(day)}
                        disabled={!hasActiveBusinessSubscription()}
                        style={{
                          marginRight: '8px',
                          opacity: hasActiveBusinessSubscription() ? 1 : 0.6,
                          cursor: hasActiveBusinessSubscription() ? 'pointer' : 'not-allowed'
                        }}
                      />
                      <span style={{ minWidth: '80px', textTransform: 'capitalize', opacity: hasActiveBusinessSubscription() ? 1 : 0.6 }}>{day}</span>
                      {!businessHours[day]?.closed ? (
                        <>
                          <input
                            type="time"
                            value={businessHours[day]?.open || '09:00'}
                            onChange={(e) => setBusinessHours({
                              ...businessHours,
                              [day]: { ...businessHours[day], open: e.target.value, closed: false }
                            })}
                            disabled={!hasActiveBusinessSubscription()}
                            style={{
                              padding: '4px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              opacity: hasActiveBusinessSubscription() ? 1 : 0.6,
                              cursor: hasActiveBusinessSubscription() ? 'text' : 'not-allowed'
                            }}
                          />
                          <span style={{ opacity: hasActiveBusinessSubscription() ? 1 : 0.6 }}>to</span>
                          <input
                            type="time"
                            value={businessHours[day]?.close || '17:00'}
                            onChange={(e) => setBusinessHours({
                              ...businessHours,
                              [day]: { ...businessHours[day], close: e.target.value, closed: false }
                            })}
                            disabled={!hasActiveBusinessSubscription()}
                            style={{
                              padding: '4px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              opacity: hasActiveBusinessSubscription() ? 1 : 0.6,
                              cursor: hasActiveBusinessSubscription() ? 'text' : 'not-allowed'
                            }}
                          />
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-color-secondary)', opacity: hasActiveBusinessSubscription() ? 1 : 0.6 }}>Closed</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Replies */}
              <div className="setting-item" style={{ marginBottom: '1rem' }}>
                <label>Quick Reply Templates {!hasActiveBusinessSubscription() && <span style={{ color: '#9e9e9e' }}>🔒</span>}</label>
                <div style={{ marginTop: '0.5rem' }}>
                  {quickReplies.length > 0 && (
                    <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {quickReplies.map(reply => (
                        <div key={reply.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'var(--surface-color)', borderRadius: '6px' }}>
                          <span style={{ flex: 1, fontSize: '0.9rem' }}>{reply.text}</span>
                          {reply.shortcut && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)', background: 'var(--border-color)', padding: '2px 6px', borderRadius: '4px' }}>
                              /{reply.shortcut}
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteQuickReply(reply.id)}
                            style={{ background: 'transparent', border: 'none', color: '#f44336', cursor: 'pointer', padding: '4px 8px' }}
                            title="Delete"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      value={newQuickReply.text}
                      onChange={(e) => setNewQuickReply({ ...newQuickReply, text: e.target.value })}
                      placeholder="Quick reply text"
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                    />
                    <input
                      type="text"
                      value={newQuickReply.shortcut}
                      onChange={(e) => setNewQuickReply({ ...newQuickReply, shortcut: e.target.value })}
                      placeholder="Shortcut (optional)"
                      style={{ width: '100px', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                    />
                    <button
                      className="btn btn-secondary"
                      onClick={handleAddQuickReply}
                      style={{ padding: '0.5rem 1rem' }}
                    >
                      Add
                    </button>
                  </div>
                  <small style={{ color: 'var(--text-color-secondary)', display: 'block', marginTop: '4px' }}>
                    Quick replies can be used in chats for faster responses.
                  </small>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleSaveBusinessSettings}
                disabled={saving || loading || !hasActiveBusinessSubscription()}
                style={{
                  marginTop: '1rem',
                  width: '100%',
                  opacity: hasActiveBusinessSubscription() ? 1 : 0.6,
                  cursor: hasActiveBusinessSubscription() ? 'pointer' : 'not-allowed'
                }}
              >
                {saving ? 'Saving...' : hasActiveBusinessSubscription() ? 'Save Business Settings' : '🔒 Subscribe to Save Settings'}
              </button>

              {/* Business Analytics */}
              <div className="setting-item" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>📊 Business Analytics</h4>
                <div style={{
                  padding: '1rem',
                  background: 'var(--surface-color)',
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-color-secondary)', marginBottom: '1rem' }}>
                    View your business performance metrics and customer insights.
                  </p>
                  <button
                    className="btn btn-secondary"
                    onClick={async () => {
                      try {
                        setLoadingAnalytics(true);
                        const analyticsData = await businessService.getChatAnalytics(user.uid, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
                        setAnalytics(analyticsData);
                        showNotification(`Analytics loaded: ${analyticsData.totalMessages} messages, ${analyticsData.totalCustomers} customers`, 'success');
                      } catch (error) {
                        console.error('Error loading analytics:', error);
                        showNotification('Error loading analytics', 'error');
                      } finally {
                        setLoadingAnalytics(false);
                      }
                    }}
                    disabled={loading || loadingAnalytics}
                    style={{ width: '100%' }}
                  >
                    {loadingAnalytics ? 'Loading...' : 'View Analytics'}
                  </button>
                  <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-color-secondary)' }}>
                    {analytics ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span>Total Messages:</span>
                          <span style={{ fontWeight: '600', color: 'var(--primary-color)' }}>
                            {analytics.totalMessages.toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span>Total Customers:</span>
                          <span style={{ fontWeight: '600', color: 'var(--primary-color)' }}>
                            {analytics.totalCustomers}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span>Avg Response Time:</span>
                          <span style={{ fontWeight: '600', color: 'var(--primary-color)' }}>
                            {analytics.averageResponseTime.toFixed(1)} min
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span>Customer Satisfaction:</span>
                          <span style={{ fontWeight: '600', color: 'var(--primary-color)' }}>
                            {analytics.customerSatisfaction.toFixed(1)}/5.0
                          </span>
                        </div>
                        {analytics.breakdown && (
                          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: '600' }}>This Month:</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontSize: '0.75rem' }}>Messages Today:</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>{analytics.breakdown.messagesToday}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontSize: '0.75rem' }}>This Week:</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>{analytics.breakdown.messagesThisWeek}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontSize: '0.75rem' }}>New Customers:</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>{analytics.breakdown.newCustomers}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.75rem' }}>Returning:</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>{analytics.breakdown.returningCustomers}</span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span>Total Messages:</span>
                          <span style={{ fontWeight: '600' }}>Click "View Analytics" to load</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span>Total Customers:</span>
                          <span style={{ fontWeight: '600' }}>Click "View Analytics" to load</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span>Avg Response Time:</span>
                          <span style={{ fontWeight: '600' }}>Click "View Analytics" to load</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Customer Satisfaction:</span>
                          <span style={{ fontWeight: '600' }}>Click "View Analytics" to load</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="settings-section">
            <h3>🔒 Parent Controls</h3>
            <div className="setting-item">
              <label>Link Child Account</label>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-primary, #333)', marginBottom: '0.5rem' }}>
                Link your child's account to monitor and manage their activity
              </p>
              <button
                className="btn btn-primary"
                onClick={openLinkChildModal}
                style={{ marginTop: '0.5rem', marginRight: '0.5rem' }}
              >
                Link Child Account
              </button>
            </div>
            <div className="setting-item" style={{ marginTop: '1rem' }}>
              <label>Monitor Child's Activity</label>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)', marginBottom: '0.5rem' }}>
                View and manage your child's contacts, messages, and safety settings
              </p>
              <button
                className="btn btn-primary"
                onClick={openParentDashboard}
                style={{ marginTop: '0.5rem' }}
              >
                Open Parent Dashboard
              </button>
            </div>
          </div>

          <div className="settings-section">
            <h3>Security</h3>
            <div className="setting-item">
              <label htmlFor="two-factor-toggle">Two-Factor Authentication</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input
                  type="checkbox"
                  id="two-factor-toggle"
                  checked={twoFactorEnabled}
                  onChange={async (e) => {
                    if (e.target.checked) {
                      setShow2FAForm(true);
                    } else {
                      if (user && confirm('Are you sure you want to disable 2FA?')) {
                        await twoFactorService.disable2FA(user.uid);
                        setTwoFactorEnabled(false);
                      }
                    }
                  }}
                />
                <span>{twoFactorEnabled ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
            <div className="setting-item" style={{ marginTop: '1rem' }}>
              <label>Biometric Authentication (Touch ID / Face ID)</label>
              {biometricAvailable ? (
                <div style={{ marginTop: '0.5rem' }}>
                  {biometricRegistered ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--success-color, #4caf50)' }}>✓ Registered</span>
                      <button
                        className="btn btn-secondary"
                        onClick={handleUnregisterBiometric}
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={handleRegisterBiometric}
                      disabled={biometricLoading}
                      style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                    >
                      {biometricLoading ? 'Registering...' : 'Register Biometric'}
                    </button>
                  )}
                  <small style={{ display: 'block', color: 'var(--text-color-secondary)', marginTop: '0.5rem' }}>
                    Use your fingerprint or face to quickly unlock the app
                  </small>
                </div>
              ) : (
                <div style={{ marginTop: '0.5rem' }}>
                  <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.875rem' }}>
                    Biometric authentication is not available on this device
                  </span>
                </div>
              )}
              {show2FAForm && !twoFactorEnabled && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--surface-color)', borderRadius: '8px' }}>
                  <div className="form-group">
                    <label htmlFor="phone-number">Phone Number</label>
                    <input
                      id="phone-number"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1234567890"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="two-factor-code">Verification Code</label>
                    <input
                      id="two-factor-code"
                      type="text"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                    />
                    <button
                      className="btn btn-secondary"
                      style={{ marginTop: '0.5rem' }}
                      onClick={async () => {
                        if (user && phoneNumber) {
                          await twoFactorService.send2FACode(user.uid, phoneNumber, user.email);
                        }
                      }}
                    >
                      Send Code
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button
                      className="btn btn-primary"
                      onClick={async () => {
                        if (user && twoFactorCode) {
                          const result = await twoFactorService.verify2FACode(user.uid, twoFactorCode);
                          if (result.valid) {
                            setTwoFactorEnabled(true);
                            setShow2FAForm(false);
                            setTwoFactorCode('');
                            setPhoneNumber('');
                            alert('Two-factor authentication enabled!');
                          } else {
                            alert(result.error || 'Invalid code');
                          }
                        }
                      }}
                    >
                      Verify & Enable
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setShow2FAForm(false);
                        setTwoFactorCode('');
                        setPhoneNumber('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="settings-section">
            <h3>📝 Feedback & Support</h3>
            <div className="setting-item">
              <label>Rate EchoChat</label>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)', marginBottom: '0.5rem' }}>
                Share your experience and help us improve
              </p>
              <button
                className="btn btn-primary"
                onClick={openRatingModal}
                style={{ marginTop: '0.5rem', marginRight: '0.5rem' }}
              >
                ⭐ Rate App
              </button>
            </div>
            <div className="setting-item" style={{ marginTop: '1rem' }}>
              <label>Request a Feature</label>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)', marginBottom: '0.5rem' }}>
                Have an idea? Let us know what you'd like to see
              </p>
              <button
                className="btn btn-primary"
                onClick={openFeatureRequestModal}
                style={{ marginTop: '0.5rem', marginRight: '0.5rem' }}
              >
                💡 Request Feature
              </button>
            </div>
            <div className="setting-item" style={{ marginTop: '1rem' }}>
              <label>Report an Issue</label>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)', marginBottom: '0.5rem' }}>
                Found a bug or need help? Submit a support ticket
              </p>
              <button
                className="btn btn-primary"
                onClick={openSupportTicketModal}
                style={{ marginTop: '0.5rem', marginRight: '0.5rem' }}
              >
                🎫 Submit Ticket
              </button>
            </div>
            {(user?.email === 'ronellbradley@bradleyvs.com' || user?.isAdmin) && (
              <div className="setting-item" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                <label>🔐 Admin Dashboard</label>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-color-secondary)', marginBottom: '0.5rem' }}>
                  View all ratings, feature requests, and support tickets
                </p>
                <button
                  className="btn btn-primary"
                  onClick={openAdminDashboard}
                  style={{ marginTop: '0.5rem', background: 'var(--error-color, #f44336)' }}
                >
                  🔐 Open Admin Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cashout Modal */}
      {showCashoutModal && stripeAccountId && (
        <CashoutModal
          accountId={stripeAccountId}
          onClose={() => {
            closeCashoutModal();
            // Refresh balance and payouts after cashout
            if (stripeAccountId) {
              loadBalance(stripeAccountId);
              loadPayouts();
              loadTransactions();
            }
          }}
        />
      )}
    </div>
  );
}

export default SettingsModal;
