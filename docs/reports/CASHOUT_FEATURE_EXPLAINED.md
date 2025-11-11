# Cashout Feature - How It Works with Stripe Connect

## ✅ Feature Implemented

Users can now **cash out** (withdraw) money received in EchoChat to their bank account or debit card!

## How Stripe Connect Cashouts Work

### 1. Money Flow Diagram

```
User Receives Money
      ↓
Payment Intent Created
      ↓
Transfer to Connected Account
      ↓
Funds in Stripe Balance
      ↓
User Initiates Cashout
      ↓
Payout Created
      ↓
Funds Sent to External Account
      ↓
Bank Account: 2-7 days (FREE)
Debit Card: ~30 minutes (1% fee)
```

### 2. Stripe Connect Express Accounts

Each user has a **Stripe Connect Express account**:
- Receives money into account **balance**
- Can link **external accounts** (bank/debit card)
- Can create **payouts** to withdraw funds

### 3. External Accounts

**Bank Accounts:**
- Linked via Stripe onboarding flow
- Standard payouts: **FREE**, arrives in **2-7 business days**
- Verified through micro-deposits or instant verification

**Debit Cards:**
- Linked during onboarding or separately
- Instant payouts: **1% fee**, arrives in **~30 minutes**
- Eligibility based on account history

### 4. Payout Methods

**Standard Payout (Bank Account):**
- ✅ Free
- ⏱️ 2-7 business days
- 💰 No fees
- 📋 Perfect for larger amounts

**Instant Payout (Debit Card):**
- 💰 1% fee
- ⚡ ~30 minutes
- 🎯 Great for urgent needs
- ⚠️ Limit: 10 per day, $0.50 - $9,999

## Implementation Details

### Backend Endpoints Added

1. **GET `/api/stripe/balance/:accountId`**
   - Returns available and pending balance
   - Shows breakdown by currency

2. **GET `/api/stripe/external-accounts/:accountId`**
   - Lists linked bank accounts and debit cards
   - Shows account details (last4, bank name, etc.)

3. **POST `/api/stripe/create-account-link`**
   - Creates Stripe onboarding link
   - Allows users to add bank/card

4. **POST `/api/stripe/create-payout`**
   - Creates payout to external account
   - Supports instant (debit cards) or standard (bank accounts)
   - Validates balance before payout

5. **GET `/api/stripe/payouts/:accountId`**
   - Returns payout history
   - Shows status, dates, fees

6. **GET `/api/stripe/payout-schedule/:accountId`**
   - Returns payout schedule settings
   - Shows automatic vs manual payouts

### Frontend Component

**CashoutModal.jsx** includes:
- ✅ Balance display (available + pending)
- ✅ External account selection
- ✅ Add new account button
- ✅ Instant vs standard payout toggle
- ✅ Fee calculation
- ✅ Payout history
- ✅ Amount input with quick buttons

### Access Points

**Settings Modal:**
- Shows balance at top of "Balance & Payments" section
- "Cash Out" button opens CashoutModal
- "Set Up Payments" if no account exists

## User Experience Flow

### First Time Setup:

1. User receives money → Funds in Stripe balance
2. User opens Settings → Sees "Set Up Payments"
3. Clicks button → Redirected to Stripe onboarding
4. Completes verification:
   - Identity verification
   - Bank account or debit card linking
   - Tax information (if required)
5. Returns to app → Account ready

### Cashout Process:

1. **Open Settings** → See balance
2. **Click "Cash Out"** → CashoutModal opens
3. **Select amount** → Enter or use quick buttons
4. **Choose payout method:**
   - Bank account (standard, free)
   - Debit card (instant, 1% fee)
5. **Review fees** → See what you'll receive
6. **Confirm payout** → Payout created
7. **Wait for funds:**
   - Instant: ~30 minutes
   - Standard: 2-7 business days

## Fees & Limits

### Standard Payout (Bank)
- **Fee:** $0.00 ✅
- **Speed:** 2-7 business days
- **Minimum:** $1.00
- **Maximum:** Based on balance

### Instant Payout (Debit Card)
- **Fee:** 1% of amount
- **Speed:** ~30 minutes
- **Minimum:** $0.50
- **Maximum:** $9,999 per transaction
- **Daily Limit:** 10 transactions

### Example Calculations

**$100 Standard Payout:**
- Fee: $0.00
- You Receive: $100.00
- Arrival: 2-7 business days

**$100 Instant Payout:**
- Fee: $1.00 (1%)
- You Receive: $99.00
- Arrival: ~30 minutes

## Security & Verification

Stripe handles all security:
- ✅ **KYC (Know Your Customer)** verification
- ✅ **Bank account verification** (micro-deposits or instant)
- ✅ **Identity verification** (SSN, ID documents)
- ✅ **Anti-fraud** checks
- ✅ **Compliance** with financial regulations

## Automatic vs Manual Payouts

**Automatic (Default):**
- Stripe automatically pays out balance daily
- Rolling basis (daily schedule)
- No action needed from user

**Manual (Via App):**
- User initiates payout through CashoutModal
- Can choose instant or standard
- More control over timing

## Testing

### Test Bank Account (Stripe):
```
Routing Number: 110000000
Account Number: 000123456789
```

### Test Debit Card:
- Use test card: `4242 4242 4242 4242`
- Instant payouts work with verified cards

### Test Payout:
```bash
# Create payout via API
curl -X POST http://localhost:3001/api/stripe/create-payout \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acct_xxxxx",
    "amount": 10.00,
    "destination": "ba_xxxxx",
    "instant": false
  }'
```

## Webhook Events

Monitor these for payout status:
- `payout.paid` - Payout completed successfully
- `payout.failed` - Payout failed (check `failure_code`)
- `payout.canceled` - Payout was canceled
- `account.external_account.created` - New bank/card added

## Error Handling

**Common Issues:**
- **Insufficient balance** → Show available amount
- **No external accounts** → Prompt to add account
- **Payout failed** → Show failure reason
- **Instant unavailable** → Suggest standard payout

## Benefits

✅ **User-Friendly:** Simple cashout process
✅ **Flexible:** Choose instant or standard
✅ **Secure:** Stripe handles all verification
✅ **Transparent:** Clear fee display
✅ **Fast:** Instant option for urgent needs
✅ **Free Option:** Standard payouts are free

---

**All code is implemented and ready!** Users can now cash out funds to their bank accounts or debit cards through the Settings modal.



