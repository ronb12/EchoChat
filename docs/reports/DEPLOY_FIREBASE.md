# Deploy Firebase Rules & Indexes

## Quick Deploy Commands

### Deploy Everything
```bash
npm run deploy:rules
```

This will deploy:
- Firestore Security Rules
- Firestore Indexes  
- Storage Rules

### Or Deploy Individually

```bash
# Firestore Rules
firebase deploy --only firestore:rules

# Firestore Indexes
firebase deploy --only firestore:indexes

# Storage Rules
firebase deploy --only storage

# All Firebase services
firebase deploy
```

## First Time Setup

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login**
   ```bash
   firebase login
   ```

3. **Initialize Firebase** (if not already done)
   ```bash
   firebase init
   ```
   Select:
   - ✅ Firestore
   - ✅ Storage
   - ✅ Hosting (optional)

4. **Deploy Rules & Indexes**
   ```bash
   npm run deploy:rules
   ```

## Verification

After deploying, verify in Firebase Console:
1. **Firestore Rules**: Console → Firestore Database → Rules tab
2. **Firestore Indexes**: Console → Firestore Database → Indexes tab
3. **Storage Rules**: Console → Storage → Rules tab

## Important Notes

- Indexes may take several minutes to build after deployment
- Test mode rules should NEVER be used in production
- Always test rules with authenticated users before production deployment



