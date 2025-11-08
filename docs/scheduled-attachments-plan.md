# Scheduled Attachment Support Plan

## Goals
1. Allow scheduled messages to include attachments (images, files, audio, video).
2. Preserve encryption and upload handling consistent with immediate sends.
3. Ensure queue entries survive reloads with metadata needed to deliver attachments later.
4. Provide user feedback in the scheduled tray (file name/type, size badges).

## Constraints & Considerations
- Existing `chatService.sendMessage` handles encryption + uploads via `firestoreService`. Scheduled flow must reuse this path when the message is delivered.
- Large blobs cannot be serialized into localStorage; we must upload immediately and store references (URLs, metadata, encryption keys).
- Need to guard against revoked storage tokens or expired URLs—preferably store bucket path + metadata so the re-send step can fetch a fresh download URL.
- UI presently blocks scheduling when files are attached; this needs to be relaxed after the backend changes are ready.

## Proposed Approach
1. **Early Upload:** When scheduling with attachments:
   - Upload files immediately (similar to direct send).
   - Store metadata in `scheduled.originalPayload`:
     - `storagePath`, `downloadURL`, `fileName`, `fileSize`, `fileType`.
     - For encrypted payloads, store the encrypted data or encryption key reference.
2. **Queue Entry Shape:** Extend `buildScheduledPlaceholder` to include an `attachments` array capturing the above metadata. Sanitize placeholder message so the UI can render a preview (e.g. “Photo • 1.2MB”).
3. **Delivery Time:** When `checkScheduledMessages` sends the message, pass the attachments metadata to `sendMessage` so it skips re-upload (flag such as `preUploaded: true`).
4. **UI Updates:**
   - Allow scheduling when files selected.
   - Show attachment badges in the scheduled tray and message placeholder.
5. **Error Handling:**
   - If upload fails during scheduling, surface notification and abort scheduling.
   - On delivery, if `sendMessage` throws (e.g. URL expired), reschedule for +60s and notify user (reusing existing retry logic).

## Testing
- Schedule message with image/file/audio; reload app -> ensure tray still shows entry with attachment info.
- Cancel scheduled message with attachment -> ensure storage cleanup (optional stretch goal).
- Send now & automatic send both deliver attachments correctly.

_Last updated: 2025-11-08._

