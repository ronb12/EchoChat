# Stripe Connect Cashout Feature

## How Cashouts Work with Stripe Connect

### Overview

When users receive money through EchoChat, the funds are stored in their **Stripe Connect Express account balance**. Users can then **cash out** (withdraw) these funds to their:

1. **Bank Account** - Standard payout (2-7 business days, free)
2. **Debit Card** - Instant payout (~30 minutes, 1% fee)

### How It Works

#### 1. **Money Flow**
```
Sender → Payment Intent → Transfer → Recipient's Stripe Balance
                                                      ↓
                                        (Available for Cashout)
                                                      ↓
                                    External Account (Bank/Card)
```

#### 2. **Stripe Connect Express Accounts**

- Each user has a **connected Express account**
- Money received goes to the account's **balance**
- Users must **link external accounts** (bank/card) to cash out
- Payouts can be **automatic** (daily rolling) or **manual** (user-initiated)

#### 3. **External Accounts**

**Bank Accounts:**
- Linked through Stripe onboarding
- Standard payouts: **Free**, arrives in **2-7 business days**
- Can be set as default for currency

**Debit Cards:**
- Linked during onboarding or separately
- Instant payouts: **1% fee**, arrives in **~30 minutes**
- Eligibility depends on transaction history

### Implementation Details

#### Backend Endpoints

**Get Balance:**
```bash
GET /api/stripe/balance/:accountId
```
Returns available and pending balance.

**Get External Accounts:**
```bash
GET /api/stripe/external-accounts/:accountId
```
Returns linked bank accounts and debit cards.

**Create Account Link (Add Account):**
```bash
POST /api/stripe/create-account-link
Body: { accountId, type: 'account_update' }
```
Returns URL to Stripe onboarding to add bank/card.

**Create Payout (Cashout):**
```bash
POST /api/stripe/create-payout
Body: {
  accountId,
  amount,
  destination, // External account ID
  instant: false // true for instant to debit card
}
```
Creates payout to linked account.

**Get Payout History:**
```bash
GET /api/stripe/payouts/:accountId
```
Returns payout history for account.

#### Frontend Component

`CashoutModal.jsx` provides:
- ✅ Balance display (available + pending)
- ✅ External account selection
- ✅ Add new account button
- ✅ Instant vs standard payout option
- ✅ Fee calculation display
- ✅ Payout history

### User Flow

1. **Receive Money**
   - Money appears in Stripe balance
   - Balance shown in cashout modal

2. **Add Payment Method** (if first time)
   - Click "Add Bank Account or Debit Card"
   - Redirected to Stripe onboarding
   - Complete verification
   - Return to app

3. **Cash Out**
   - Open cashout modal
   - Select amount
   - Choose bank account or debit card
   - Select instant (cards) or standard (banks)
   - Confirm payout

4. **Receive Funds**
   - **Instant**: Arrives in ~30 minutes (debit card)
   - **Standard**: Arrives in 2-7 days (bank account)

### Payout Schedule

By default, Stripe Connect Express accounts have:
- **Automatic payouts**: Daily rolling basis
- **Manual payouts**: User-initiated (via our API)

You can configure payout schedules in Stripe Dashboard or via API.

### Fees

**Standard Payout (Bank Account):**
- ✅ **Free** - No fees

**Instant Payout (Debit Card):**
- 💰 **1% fee** - Applied to payout amount
- Example: $100 payout = $99 received (1% = $1 fee)

### Limits

**Instant Payouts:**
- Minimum: $0.50
- Maximum: $9,999 per transaction
- Limit: 10 transactions per day
- Eligibility: Based on account history

**Standard Payouts:**
- Minimum: $1.00 (varies by country)
- Maximum: Varies by account type
- No daily limit

### Security & Verification

Stripe requires:
- ✅ **Identity verification** (for accounts)
- ✅ **Bank account verification** (micro-deposits or instant)
- ✅ **KYC compliance** (Know Your Customer)
- ✅ **Anti-fraud checks**

All handled through Stripe's onboarding flow.

### Testing

**Test Bank Accounts:**
```
Routing: 110000000
Account: 000123456789
```

**Test Debit Cards:**
- Use standard test card: `4242 4242 4242 4242`
- Instant payouts work with verified test cards

**Test Payouts:**
```bash
# Create payout
curl -X POST http://localhost:3001/api/stripe/create-payout \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acct_xxxxx",
    "amount": 10.00,
    "destination": "ba_xxxxx",
    "instant": false
  }'
```

### Webhook Events

Monitor these events:
- `payout.paid` - Payout completed
- `payout.failed` - Payout failed
- `payout.canceled` - Payout canceled
- `account.external_account.created` - New bank/card added

### Common Issues

**No Balance:**
- Funds may still be pending
- Check `pending` amount in balance response

**Payout Failed:**
- Invalid account details
- Insufficient verification
- Account restrictions
- Check `failure_code` in payout response

**Instant Payout Unavailable:**
- Account may not be eligible
- Requires transaction history
- Only available for debit cards

### Best Practices

1. **Show Clear Fees**: Always display instant payout fees
2. **Balance Updates**: Refresh balance after transactions
3. **Error Handling**: Show clear messages for failures
4. **Verification Status**: Check if accounts are verified
5. **Payout Limits**: Warn users about daily limits

### Next Steps

1. ✅ Add cashout button to UI (balance display)
2. ✅ Implement CashoutModal component
3. ✅ Add balance endpoint
4. ✅ Add external accounts management
5. ✅ Add payout creation endpoint
6. ⏳ Test with Stripe test accounts
7. ⏳ Handle webhook events
8. ⏳ Add payout notifications

---

**All backend endpoints are implemented and ready to use!**



