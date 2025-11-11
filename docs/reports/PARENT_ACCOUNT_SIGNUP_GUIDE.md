# Parent Account Signup - How It Works

## 🎯 Overview

The app now has **three account types** during signup:
1. **Personal Account** - Regular users
2. **Business Account** - Business owners
3. **Parent Account** - Parents/Guardians who want to monitor children

---

## 📋 How Parent Identification Works

### Option 1: Parent Signs Up First (Recommended)

**Flow:**
1. Parent clicks "Sign Up"
2. Selects "Parent Account" type
3. Enters email, password, display name
4. Account created with `isParent: true` in Firestore
5. Parent can immediately link child accounts

**Benefits:**
- Parent account ready first
- Can link multiple children
- Full control from the start

### Option 2: Child Signs Up First

**Flow:**
1. Child signs up (as Personal account)
2. Child enters date of birth
3. If under 18, enters parent email
4. Parent receives verification code
5. Parent can:
   - Sign up as Parent account
   - Link to child's account using verification code

**Benefits:**
- Child can start using app immediately
- Parent can link later

---

## 🔧 Technical Implementation

### Signup Flow

**SignUpModal.jsx:**
- Added "Parent Account" option
- Three account types: Personal, Business, Parent
- Saves `accountType` to Firestore user document
- Sets `isParent: true` for parent accounts

### User Profile in Firestore

**Parent Account Structure:**
```javascript
{
  email: "parent@example.com",
  displayName: "Parent Name",
  accountType: "parent",
  isParent: true,
  isMinor: false,
  children: [] // Array of child user IDs
}
```

**Child Account Structure:**
```javascript
{
  email: "child@example.com",
  displayName: "Child Name",
  accountType: "personal",
  isMinor: true,
  parentId: "parent_user_id",
  parentEmail: "parent@example.com",
  parentVerified: true
}
```

---

## 🔗 Linking Parent to Child

### Method 1: Parent Links Child (After Child Signs Up)

**Flow:**
1. Parent logs into Parent account
2. Opens Settings → Parent Controls
3. Clicks "Link Child Account"
4. Enters child's email
5. Verification code sent to child
6. Parent enters code
7. Accounts linked

### Method 2: Child Provides Parent Email (During Signup)

**Flow:**
1. Child signs up
2. Enters date of birth
3. If under 18, enters parent email
4. Parent receives verification code
5. Parent can:
   - Sign up as Parent account
   - Verify code to link accounts

---

## 📱 Parent Dashboard Features

Once linked, parents can:
- ✅ View all child accounts
- ✅ Monitor child's contacts
- ✅ Approve/reject contact requests
- ✅ View messaging activity
- ✅ See safety alerts
- ✅ Remove contacts

---

## 🔐 Security Measures

1. **Verification Required:**
   - Parent must verify email
   - Child must provide verification code
   - Two-way verification

2. **Account Type Validation:**
   - Parent accounts can only link to minor accounts
   - Child accounts must be verified as minors
   - Prevents unauthorized linking

3. **Privacy Protection:**
   - Parent can only see linked children
   - Child must approve linking
   - Verification codes required

---

## 🎯 User Experience

### For Parents:

**Signup:**
1. Choose "Parent Account"
2. Enter email, password
3. Account created
4. Option to link child immediately

**Linking Child:**
1. Open Settings → Parent Controls
2. Click "Link Child Account"
3. Enter child's email
4. Enter verification code
5. Child account linked

**Monitoring:**
1. Open Parent Dashboard
2. Select child account
3. View activity, contacts, requests
4. Manage child's safety

### For Children:

**Signup:**
1. Choose "Personal Account"
2. Enter date of birth
3. If under 18, enter parent email
4. Parent receives code
5. Wait for parent approval

**After Parent Links:**
- Parent can see contacts
- Parent can approve/reject requests
- Contact-only mode mandatory
- Safety features enabled

---

## 📊 Database Structure

### Collections:

**users/{userId}:**
- `isParent: true` - Parent account
- `isMinor: true` - Minor account
- `children: [childId1, childId2]` - Parent's children
- `parentId: "parent_user_id"` - Child's parent
- `parentVerified: true` - Parent verified

**parentApprovals/{approvalId}:**
- `minorUserId` - Child's ID
- `contactUserId` - Contact to approve
- `parentId` - Parent's ID
- `status: "pending" | "approved" | "rejected"`

---

## ✅ Summary

**How Parent Identification Works:**

1. **During Signup:**
   - Parent selects "Parent Account" type
   - Account created with `isParent: true`
   - Can link children immediately

2. **After Signup:**
   - Parent can link child accounts via email
   - Verification code required
   - Two-way verification

3. **Automatic Detection:**
   - System checks `isParent` flag
   - Shows Parent Dashboard in Settings
   - Enables parent-specific features

**Result:**
- Clear parent identification
- Secure linking process
- Full parental control
- Safe for children


