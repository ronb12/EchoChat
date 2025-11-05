import React, { useState, useEffect } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';

export default function CashoutModal({ accountId, onClose }) {
  const { showNotification } = useUI();
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [externalAccounts, setExternalAccounts] = useState({ bankAccounts: [], debitCards: [] });
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [instantPayout, setInstantPayout] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [payoutHistory, setPayoutHistory] = useState([]);

  // Ensure API_BASE_URL doesn't have trailing /api to avoid double /api/api/
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  const API_BASE_URL = baseUrl.endsWith('/api') ? baseUrl.replace(/\/api$/, '') : baseUrl;

  useEffect(() => {
    if (accountId) {
      loadBalance();
      loadExternalAccounts();
      loadPayoutHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const loadBalance = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe/balance/${accountId}`);
      if (response.ok) {
        const data = await response.json();
        setBalance(data);
      }
    } catch (error) {
      console.error('Error loading balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExternalAccounts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe/external-accounts/${accountId}`);
      if (response.ok) {
        const data = await response.json();
        setExternalAccounts(data);
        // Auto-select default account if available
        const defaultBank = data.bankAccounts.find(ba => ba.defaultForCurrency);
        const defaultCard = data.debitCards.find(c => c.defaultForCurrency);
        if (defaultBank) {
          setSelectedAccount({ type: 'bank', ...defaultBank });
        } else if (defaultCard) {
          setSelectedAccount({ type: 'card', ...defaultCard });
        }
      }
    } catch (error) {
      console.error('Error loading external accounts:', error);
    }
  };

  const loadPayoutHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe/payouts/${accountId}?limit=5`);
      if (response.ok) {
        const data = await response.json();
        setPayoutHistory(data.payouts || []);
      }
    } catch (error) {
      console.error('Error loading payout history:', error);
    }
  };

  const handleAddAccount = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe/create-account-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: accountId,
          type: 'account_update'
        })
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url; // Redirect to Stripe onboarding
      } else {
        showNotification('Failed to open account setup', 'error');
      }
    } catch (error) {
      console.error('Error adding account:', error);
      showNotification('Failed to add account', 'error');
    }
  };

  const handleCashout = async () => {
    const numAmount = parseFloat(amount);

    // Validation
    if (!numAmount || numAmount <= 0) {
      showNotification('Please enter a valid amount', 'error');
      return;
    }

    if (numAmount < 0.50) {
      showNotification('Minimum cashout amount is $0.50', 'error');
      return;
    }

    if (!selectedAccount) {
      showNotification('Please select a bank account or debit card', 'error');
      return;
    }

    if (balance && numAmount > balance.available) {
      showNotification(`Insufficient balance. Available: $${balance.available.toFixed(2)}`, 'error');
      return;
    }

    if (instantPayout && selectedAccount.type === 'bank') {
      showNotification('Instant payouts are only available for debit cards', 'error');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/stripe/create-payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: accountId,
          amount: numAmount,
          destination: selectedAccount.id,
          instant: instantPayout && selectedAccount.type === 'card',
          metadata: {
            userId: user?.uid,
            method: instantPayout ? 'instant' : 'standard'
          }
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const method = instantPayout ? 'Instant' : 'Standard';
        const arrival = data.estimatedArrival
          ? `Estimated arrival: ${new Date(data.estimatedArrival).toLocaleDateString()}`
          : instantPayout
            ? 'Arrives within 30 minutes'
            : 'Arrives in 2-7 business days';

        showNotification(`${method} payout of $${numAmount.toFixed(2)} initiated! ${arrival}`, 'success');

        // Reload balance and history
        loadBalance();
        loadPayoutHistory();
        setAmount('');

        // Close after delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        showNotification(data.error || 'Failed to process cashout', 'error');
      }
    } catch (error) {
      console.error('Error processing cashout:', error);
      showNotification('Failed to process cashout. Please try again.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="modal active" id="cashout-modal">
        <div className="modal-backdrop" onClick={onClose}></div>
        <div className="modal-content" style={{ maxWidth: '500px' }}>
          <div className="modal-header">
            <h2>Cash Out</h2>
            <button className="modal-close" onClick={onClose}>&times;</button>
          </div>
          <div className="modal-body" style={{ textAlign: 'center', padding: '2rem' }}>
            <div>Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  const allAccounts = [
    ...externalAccounts.bankAccounts.map(ba => ({ type: 'bank', ...ba })),
    ...externalAccounts.debitCards.map(card => ({ type: 'card', ...card }))
  ];

  return (
    <div className="modal active" id="cashout-modal">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Cash Out</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {/* Balance Display */}
          {balance && (
            <div style={{
              background: 'var(--border-color)',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-color-secondary)' }}>Available Balance:</span>
                <span style={{ fontSize: '24px', fontWeight: '600', color: '#4caf50' }}>
                  ${balance.available.toFixed(2)}
                </span>
              </div>
              {balance.pending > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-color-secondary)' }}>
                  <span>Pending:</span>
                  <span>${balance.pending.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Amount Input */}
          <div className="form-group">
            <label htmlFor="cashout-amount">Amount to Cash Out (USD)</label>
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
                id="cashout-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0.50"
                max={balance?.available || 9999}
                step="0.01"
                style={{ paddingLeft: '32px' }}
                disabled={processing}
              />
            </div>
            <small style={{ color: 'var(--text-color-secondary)', marginTop: '4px', display: 'block' }}>
              Minimum: $0.50
              {balance && ` | Maximum: $${balance.available.toFixed(2)}`}
            </small>
          </div>

          {/* Quick Amount Buttons */}
          {balance && balance.available > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {[25, 50, 100, balance.available].filter(amt => amt <= balance.available).map(amt => (
                <button
                  key={amt}
                  className="btn btn-secondary"
                  onClick={() => setAmount(Math.min(amt, balance.available).toFixed(2))}
                  disabled={processing}
                  style={{ minWidth: '60px' }}
                >
                  ${amt === balance.available ? 'All' : amt}
                </button>
              ))}
            </div>
          )}

          {/* External Accounts */}
          <div className="form-group">
            <label>Payout Method</label>
            {allAccounts.length === 0 ? (
              <div style={{
                padding: '20px',
                background: 'var(--border-color)',
                borderRadius: '8px',
                textAlign: 'center',
                marginBottom: '1rem'
              }}>
                <p style={{ marginBottom: '1rem', color: 'var(--text-color-secondary)' }}>
                  No bank account or debit card linked
                </p>
                <button
                  className="btn btn-primary"
                  onClick={handleAddAccount}
                  disabled={processing}
                >
                  Add Bank Account or Debit Card
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
                {allAccounts.map(account => (
                  <button
                    key={account.id}
                    onClick={() => {
                      setSelectedAccount(account);
                      setInstantPayout(account.type === 'card'); // Auto-enable instant for cards
                    }}
                    style={{
                      padding: '12px',
                      border: `2px solid ${selectedAccount?.id === account.id ? '#4caf50' : 'var(--border-color)'}`,
                      borderRadius: '8px',
                      background: selectedAccount?.id === account.id ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    disabled={processing}
                  >
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {account.type === 'bank'
                          ? `🏦 ${account.bankName || 'Bank'} •••• ${account.last4}`
                          : `💳 ${account.brand?.toUpperCase() || 'Card'} •••• ${account.last4}`}
                        {account.defaultForCurrency && (
                          <span style={{ fontSize: '12px', color: '#4caf50', marginLeft: '8px' }}>(Default)</span>
                        )}
                      </div>
                      {account.type === 'bank' ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-color-secondary)' }}>
                          {account.accountHolderName} • Standard payout (2-7 days)
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: 'var(--text-color-secondary)' }}>
                          Instant payout available (30 min, 1% fee)
                        </div>
                      )}
                    </div>
                    {selectedAccount?.id === account.id && (
                      <span style={{ color: '#4caf50', fontSize: '20px' }}>✓</span>
                    )}
                  </button>
                ))}
                <button
                  className="btn btn-secondary"
                  onClick={handleAddAccount}
                  disabled={processing}
                  style={{ marginTop: '8px' }}
                >
                  + Add Another Account
                </button>
              </div>
            )}
          </div>

          {/* Instant Payout Option (for debit cards) */}
          {selectedAccount && selectedAccount.type === 'card' && (
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={instantPayout}
                  onChange={(e) => setInstantPayout(e.target.checked)}
                  disabled={processing}
                />
                <span>⚡ Instant Payout (arrives in ~30 minutes)</span>
              </label>
              {instantPayout && (
                <small style={{ color: 'var(--text-color-secondary)', marginTop: '4px', display: 'block', marginLeft: '24px' }}>
                  1% fee applies (${amount ? (parseFloat(amount) * 0.01).toFixed(2) : '0.00'})
                </small>
              )}
            </div>
          )}

          {/* Fee Calculation */}
          {amount && parseFloat(amount) > 0 && (
            <div style={{
              background: 'var(--border-color)',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '14px',
              color: 'var(--text-color-secondary)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Amount:</span>
                <span>${parseFloat(amount).toFixed(2)}</span>
              </div>
              {instantPayout && selectedAccount?.type === 'card' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Instant Payout Fee (1%):</span>
                  <span>-${(parseFloat(amount) * 0.01).toFixed(2)}</span>
                </div>
              )}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-color)',
                fontWeight: '600',
                fontSize: '16px'
              }}>
                <span>You&apos;ll Receive:</span>
                <span>${instantPayout && selectedAccount?.type === 'card'
                  ? (parseFloat(amount) * 0.99).toFixed(2)
                  : parseFloat(amount).toFixed(2)}</span>
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px' }}>
                {instantPayout && selectedAccount?.type === 'card'
                  ? 'Arrives within 30 minutes'
                  : 'Arrives in 2-7 business days'}
              </div>
            </div>
          )}

          {/* Recent Payouts */}
          {payoutHistory.length > 0 && (
            <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-color-secondary)' }}>
                Recent Payouts
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                {payoutHistory.slice(0, 3).map(payout => (
                  <div key={payout.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px',
                    background: 'var(--border-color)',
                    borderRadius: '4px'
                  }}>
                    <span>
                      ${payout.amount.toFixed(2)} - {payout.status}
                    </span>
                    <span style={{ color: 'var(--text-color-secondary)' }}>
                      {new Date(payout.created).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
            <button
              className="btn btn-secondary"
              onClick={onClose}
              disabled={processing}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCashout}
              disabled={processing || !amount || parseFloat(amount) <= 0 || !selectedAccount}
              style={{ minWidth: '120px' }}
            >
              {processing ? 'Processing...' : 'Cash Out'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

