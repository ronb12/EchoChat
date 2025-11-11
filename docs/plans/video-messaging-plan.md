# Video Messaging Feature Plan

## Goals

1. Allow users to record short video clips directly in the chat composer (desktop + mobile browsers that support MediaRecorder).
2. Persist captured videos securely (respect current encrypted-at-rest model when enabled).
3. Render inline playback with controls inside message bubbles.
4. Keep UX consistent with existing voice message behavior (record, cancel, send flow).

## Feature Slices

### 1. Recording UI & Capture
- Add a camera toggle next to the microphone button.
- Use `navigator.mediaDevices.getUserMedia({ video: true, audio: true })`.
- Limit recording duration (e.g. 60s) and show preview thumbnail before sending.
- Allow retake or send.
- Handle permission errors gracefully.

### 2. Upload & Storage
- Reuse `chatService.sendMessage` pipeline; attach video blob (MIME `video/webm`).
- Extract metadata (duration, approximate dimensions if available).
- Encrypt metadata when encrypted storage flag is on (video bytes remain binary in Storage for now).
- Store in Firebase Storage under `chats/{chatId}/videos`.

### 3. Playback UI
- Update `MessageBubble` to render `<video>` player with controls.
- Show duration label similar to voice messages.
- Lazy-load video elements to keep initial load light (use `loading="lazy"` where supported).
- Make sure previews in `MediaGallery` show thumbnail or fallback icon.

## Security Considerations
- Storage rules: ensure only chat participants can read/write video files.
- Consider future step for client-side encryption of video blobs (large payload; defer to later phase).

## Testing Checklist
- Desktop Chrome & Safari recording.
- Mobile Safari/Chrome recording (if supported; otherwise show fallback message).
- Playback across browsers, including seeking.
- Interaction with service worker caching (ensure videos not cached indefinitely).

_Last updated: 2025-11-08._

