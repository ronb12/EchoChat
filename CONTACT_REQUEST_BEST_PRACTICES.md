# Contact Request Best Practices - Based on Top Messaging Apps

## How Top Apps Handle Contact Requests

### 1. **WhatsApp/Telegram Approach**
- **Primary Identifier**: Phone number or username (stable, doesn't change)
- **No explicit requests**: If you have the identifier, you can message
- **Contact sync**: Contacts are synced from device

### 2. **Discord/Facebook Messenger Approach**
- **Friend Requests**: Explicit request/accept flow
- **Stable identifiers**: Username or email used for matching
- **Dual storage**: Request stored with both sender and receiver identifiers
- **Real-time updates**: Immediate notifications when requests arrive

### 3. **Key Patterns to Implement**

#### Pattern 1: Use Stable Identifiers
- Store **email** or **username** in the request document (not just UID)
- Query by email/username when possible
- UID should match, but email is the fallback

#### Pattern 2: Dual Lookup Strategy
- When querying, check BOTH:
  1. `toUserId == currentUser.uid` (primary)
  2. `toUserEmail == currentUser.email` (fallback)
- This handles cases where UID might not match

#### Pattern 3: Request Document Structure
```javascript
{
  fromUserId: "uid1",
  fromUserEmail: "user1@example.com",  // ADD THIS
  toUserId: "uid2",
  toUserEmail: "user2@example.com",    // ADD THIS
  status: "pending",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### Pattern 4: Query Strategy
```javascript
// Query with OR condition (if Firestore supports it)
// OR query both and merge results
const query1 = where('toUserId', '==', userId);
const query2 = where('toUserEmail', '==', userEmail);
// Merge results
```

#### Pattern 5: Verification on Send
- When sending request, verify the `toUserId` matches the receiver's Firebase Auth UID
- Store both UID and email for redundancy
- Log mismatches for debugging

## Implementation Plan

1. **Update Request Document Structure** - Add email fields
2. **Update Query Logic** - Query by both UID and email
3. **Add Verification** - Check UID matches before sending
4. **Improve Error Handling** - Better logging and user feedback

