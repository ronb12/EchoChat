# Per-Chat Encryption Rollout Plan

## Goals

1. Encrypt all chat message payloads and attachments **at rest** using strong, modern primitives.
2. Maintain backwards compatibility with existing Firestore data during the rollout.
3. Preserve full functionality (search, read receipts, business tooling) while giving us a clear migration path to full end-to-end encryption later.

## Scope (Phase 1)

- Symmetric encryption for message text, sticker payloads, and metadata that contains user-generated content.
- Symmetric encryption for any binary payloads stored in Firebase Storage (attachments, audio, video, etc.).
- Controlled feature flag so we can opt specific chats/users into encrypted storage before enabling globally.
- Documentation updates that accurately describe the security posture.

## Non-Goals (Phase 1)

- Full end-to-end key exchange and perfect forward secrecy (scheduled for later phases).
- UI changes for device verification or security status.
- Back-migrating historical messages (optional; a future cleanup step).

## Architecture Overview

### Key Handling

- Generate a **per-chat 256-bit key** with libsodium when the chat is created.
- Store the key alongside chat metadata so that authenticated participants can retrieve it.
- Cache keys client-side in-memory only for active sessions (cleared on logout).

### Encryption Primitives

- Use **libsodium-wrappers** (preferred) or **Google Tink** for the crypto implementation.
- Algorithm: `XChaCha20-Poly1305` (libsodium) or `AES-256-GCM` (Tink).  
- Every message gets a unique nonce/IV; store it alongside ciphertext.

### Data Model Changes

| Field            | Before                         | After (encrypted)                                          |
|------------------|--------------------------------|------------------------------------------------------------|
| `text`           | `"hello world"`                | `{ v: 1, alg: "xchacha20", iv: "...", ct: "...", ad: ...}` |
| `sticker`        | `"😀"`                         | Encrypted object                                           |
| `attachmentUrl`  | Public HTTPS URL + metadata    | Encrypted bytes, signed download URL + key blob            |
| `searchIndex`    | (not used yet)                 | (optional) decrypt on demand                               |

### Firestore Rules Impact

- Rules continue to validate participant membership. No change needed for encrypted payloads.
- Ensure size limits account for ciphertext overhead (~16–32 bytes).  
- Tighten reads to block non-participants even for metadata.

## Rollout Steps

1. **Feature flag:** `VITE_ENCRYPTION_ENABLED=true` (or Remote Config) gates rollout.
2. **Crypto helpers:** add `encryptionService.encryptPayload(chatId, buffer)` and `decryptPayload`.
3. **Message write path:** encrypt text/sticker before calling `firestoreService.sendMessage`.
4. **Message read path:** decrypt after `subscribeToMessages` emits.
5. **Attachments:** intercept uploads via `storageService.uploadEncrypted` and return signed URL + metadata for client decrypt.
6. **Telemetry/logging:** add counters for encrypted vs. plain messages during rollout.
7. **Docs:** update README + security page; inform users that data is encrypted at rest.

## Testing Strategy

- Unit tests: encrypt/decrypt round trips, tamper detection (alter IV or ciphertext).
- Integration tests: create chat, send message, ensure stored document contains ciphertext only.
- Migration tests: disable feature flag and confirm app can still read legacy plaintext.
- Puppeteer smoke tests: existing scenarios should continue to pass with encrypted payloads.

## Future Phases

1. **Per-user key pairs** and envelope encryption (client-side share/unlock chat keys).  
2. **Full E2E** using Signal or MLS protocols.  
3. **Device verification UI** and key transparency.

--- 

_Last updated: 2025-11-08_.

