# Group Polls Feature Plan

## Objectives
- Enable group chat participants to create polls, vote, and see aggregated results in real time.
- Ensure Firestore structure scales (limited reads/writes per poll).
- Provide a clear UX for creating, voting, and viewing poll details, including on mobile.

## Data Model

### Firestore
```
polls (collection)
  pollId
    chatId: string
    question: string
    options: [
      { id: string, text: string, voteCount: number, votes: [userId] }
    ]
    settings: {
      allowMultipleChoices: boolean
      anonymous: boolean
      allowAddOptions: boolean
      expiresAt: timestamp | null
    }
    totalVotes: number
    voters: [userId] // optional if using aggregated structure only
    createdBy: userId
    createdAt: timestamp
    updatedAt: timestamp
    isActive: boolean
```

> For large polls, consider moving `votes` to a subcollection to avoid hitting document size limits. For MVP we keep votes in document arrays and rely on Firestore limits (~1MB per document) with small participant counts.

### Messages
- Poll messages include:
  - `message.isPoll = true`
  - `message.pollId` to link back to poll document
  - Optional summary text for preview (`Poll: …`)

## UX Flow

1. **Creation**
   - Available only in group chats.
   - `PollCreatorModal` collects question, up to 10 options, toggles for multiple choice/anonymous, optional expiry.
   - On submit: create poll doc + send poll message.

2. **Display in Chat**
   - `MessageBubble` recognizes `isPoll`.
   - Render poll card with question, options, current vote counts, participation status.
   - Show total votes and whether user voted (unless anonymous).

3. **Voting**
   - Clicking an option calls `groupPollsService.votePoll`.
   - Support toggling vote off if multiple choice allowed (or provide “change vote” for single choice).
   - Update message state via real-time listener or poll subscription.

4. **Real-Time Updates**
   - Subscribe to poll document when message is visible (e.g. via `useEffect` in `MessageBubble`).
   - Update component state on snapshot.

5. **Poll Management**
   - Creator (or admins) can close poll (set `isActive=false`).
   - Optional: allow adding options mid-poll if `allowAddOptions` true.

## Firestore Rules
- Ensure only participants of the chat can read/write poll docs.
- Voting writes should only modify their own user ID entries.
- Creation requires membership in group chat.

## Components Touchpoints
- `PollCreatorModal.jsx` – finalize submit handling & validations.
- `MessageBubble.jsx` – poll card UI & voting interactions.
- `groupPollsService.js` – create, vote, subscribe helpers.
- `chatService.js` – ensure poll messages render properly & parse `isPoll`.
- `styles/main.css` – styling for poll cards and modal refinements.

## Testing
- Unit: poll creation validation, vote toggle logic.
- Integration: create poll, vote from multiple users, ensure state updates.
- Cross-browser: ensure inputs & buttons work on mobile Safari/Chrome.

_Last updated: 2025-11-08._

