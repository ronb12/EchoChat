# Message Pinning & Scheduling Plan

## Goals
1. Allow users to pin important messages within a chat, surfacing them via UI affordances.
2. Support scheduled sending: compose a message now, deliver at a chosen time.
3. Keep behavior consistent across direct and group chats with Firestore as the source of truth.

## Message Pinning

### UX
- **Pin action:** context menu entry `📌 Pin`. Only un-deleted messages can be pinned.
- **Pinned indicator:** message bubble shows “Pinned” tag (already partially implemented).
- **Pinned list:** optional panel accessible via chat header (MVP can stop at highlighting the message and storing metadata).

### Data Model
- `messages/{messageId}`:
  - `pinned: boolean`
  - `pinnedAt: timestamp`
  - `pinnedBy: userId`
- Chat metadata: track latest pinned message or count if needed (future).

### Flow
1. User selects “Pin”.
2. Frontend calls `chatService.pinMessage` which updates Firestore via `firestoreService`.
3. Real-time listeners reflect pinned state; UI badge appears.

### Permissions
- Any participant may pin/unpin in MVP; later we can restrict to admins in groups.
- Firestore rules must allow participants to update `pinned`, `pinnedAt`, `pinnedBy` fields.

## Message Scheduling

### UX
- “Send later” option in composer (e.g., clock icon beside send button).
- Modal to pick date/time (within a reasonable future window).
- Scheduled messages appear in UI with status (e.g., “Scheduled for …”). Allow cancellation/edit.

- On scheduled time, message auto-sends via client timer (MVP) or Cloud Function (future).

### Data Model
- `messages/{messageId}`:
  - `scheduled: true`
  - `scheduleTime: timestamp`
  - `createdAt: timestamp`
  - `deliveredAt: timestamp | null`

### Flow (client-driven MVP)
1. User enters message, chooses schedule time.
2. Store in local `scheduledMessages` map and Firestore (optional). For MVP we can rely on client to send at scheduled time while online.
3. `chatService` periodically checks `scheduledMessages` and sends once `Date.now() >= scheduleTime`.
4. Firestore rules ensure only owner can send/cancel.

### Future Enhancement
- Offload scheduling to backend (Cloud Functions) for reliability when client offline.

## Testing
- Pin/unpin same message, ensures UI updates for both participants.
- Scheduled text while staying online; confirm auto-send.
- Edge cases: schedule in the past (send immediately), pinned message gets deleted (remove pin state).

_Last updated: 2025-11-08._

