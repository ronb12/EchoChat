# Message Forwarding Feature Plan

## Goals
- Allow users to forward an existing message to another chat (direct or group).
- Preserve original sender attribution within the forwarded message bubble.
- Avoid creating duplicate storage entries for attachments when possible; reuse URLs/metadata.
- Keep the UX consistent with platform conventions (WhatsApp, iMessage).

## UX Flow
1. **Initiation**
   - Context menu `➡️ Forward` or long-press on mobile.
   - Optionally support multi-select (MVP: single message at a time).

2. **Chat Selection**
   - Modal listing user’s chats (search/filter).
   - For group chats, show participant count and muted status.
   - Allow forwarding to multiple chats? (MVP: single chat).

3. **Optional Annotation**
   - Provide optional text input to add a comment before forwarding (out of scope for MVP).

4. **Delivery**
   - New message appears in target chat with metadata:
     - `forwarded: true`
     - `originalMessageId`
     - `originalSenderId`, `originalSenderName`
     - `originalChatId`
     - `forwardedAt`

## Data Model
- `messages` documents:
  ```json
  {
    "forwarded": true,
    "originalMessageId": "msg123",
    "originalChatId": "chatABC",
    "originalSenderId": "user1",
    "originalSenderName": "Alice",
    "forwardedBy": "user2",
    "forwardedByName": "Bob",
    "forwardedAt": 1700000000000
  }
  ```
- For attachments (audio/video/images/files), reuse existing URLs and metadata.

## UI Changes
- `MessageBubble`: display “Forwarded” badge and original sender name.
- New `ForwardModal` for choosing destination chat.
- `ChatArea` handling to open modal and send forwarded message through `chatService.forwardMessage`.

## Service Updates
- `chatService.forwardMessage(fromChatId, messageId, toChatId, userId)` should:
  - Fetch original message (from cache or Firestore).
  - Strip sensitive fields (e.g., read receipts).
  - Create new message payload with forwarded metadata and reuse attachments.
  - Call `firestoreService.sendMessage`.

## Firestore Rules
- Ensure only participants of target chat can write new messages.
- No additional rule changes needed if reusing `sendMessage`.

## Edge Cases
- Original message deleted? Show placeholder “Message unavailable”.
- Attachments revoked? Handle gracefully (render fallback).
- Chat selection modal should prevent forwarding to same chat (optional).

## Testing
- Unit: `forwardMessage` logic (metadata, attachments).
- Integration: Forward text, image, voice, video messages; verify UI.
- Ensure forwarded badges render on both sender/recipient sides.

_Last updated: 2025-11-08._

