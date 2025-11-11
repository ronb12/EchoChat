# How Calls and Texts Work in EchoChat

## 📞 How Calls Work

### When a User Initiates a Call:

1. **User clicks call button** (video or voice icon in chat header)
2. **CallModal opens** - Full-screen modal appears
3. **What shows up:**
   - **Black background** (full screen)
   - **Remote video** (large, fills most of screen) OR microphone icon (for voice calls)
   - **"Connecting..." or "Calling..." message** (while connecting)
   - **Local video** (small preview in corner, video calls only)
   - **Call controls** (bottom of screen):
     - Mute/Unmute button
     - Video on/off button (video calls)
     - Screen share button (video calls)
     - End call button
   - **Call duration timer** (when connected)

### When a User Receives a Call:

1. **Incoming call notification** (needs to be implemented with signaling server)
2. **CallModal opens** with "Incoming call" state
3. **What shows up:**
   - **Caller's name/avatar**
   - **"Incoming call" message**
   - **Answer button** (green)
   - **Reject button** (red)

### Call Flow:

```
User clicks call button
    ↓
CallModal opens (full screen)
    ↓
Request camera/microphone permission
    ↓
Show "Connecting..." message
    ↓
Establish WebRTC connection
    ↓
Show remote video (or microphone icon)
    ↓
Show call controls (mute, video, end call)
    ↓
Display call duration timer
```

### Visual Layout:

```
┌─────────────────────────────────┐
│                                 │
│     [Remote Video/Icon]         │
│     (Large, center)              │
│                                 │
│     [Connecting...]             │
│                                 │
│  [Local Video Preview]          │
│  (Small, corner)                │
│                                 │
│  ┌─────────────────────────┐   │
│  │ [Mute] [Video] [End]    │   │
│  │  00:15 (duration)       │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

---

## 💬 How Texts/Messages Work

### When a User Sends a Message:

1. **User types in input field** (bottom of chat)
2. **Press Enter or click Send button**
3. **Message appears immediately:**
   - **Message bubble** (blue, right side - sent messages)
   - **Message text** (decrypted if encrypted)
   - **Timestamp** (e.g., "2:30 PM")
   - **Status indicators**:
     - ✓ (sent)
     - ✓✓ (delivered)
     - ✓✓ (read - blue checkmarks)

### When a User Receives a Message:

1. **Message appears in chat:**
   - **Message bubble** (white/gray, left side - received messages)
   - **Sender name** (top of bubble, group chats)
   - **Message text** (automatically decrypted)
   - **Timestamp** (e.g., "2:30 PM")
   - **Avatar** (left side of bubble)

2. **Real-time updates:**
   - Message appears instantly (Firestore real-time subscription)
   - Typing indicator shows when other user is typing
   - Read receipts update automatically

### Message Flow:

```
User types message
    ↓
Press Enter/Send
    ↓
Message encrypted (if encryption enabled)
    ↓
Message saved to Firestore
    ↓
Message appears in chat (sent bubble, blue)
    ↓
Real-time sync to recipient
    ↓
Recipient sees message (received bubble, white)
    ↓
Read receipt updates automatically
```

### Visual Layout:

```
┌─────────────────────────────────┐
│ Chat Header                      │
├─────────────────────────────────┤
│                                 │
│  [Avatar] Message text          │ ← Received (left, white)
│           2:30 PM                │
│                                 │
│            Message text    [✓✓] │ ← Sent (right, blue)
│            2:31 PM               │
│                                 │
│  [Avatar] Another message       │
│           2:32 PM                │
│                                 │
├─────────────────────────────────┤
│ [Type a message...]        [📎] │ ← Input field
│ [😊] [📤]                       │
└─────────────────────────────────┘
```

---

## 🎨 Visual Details

### Calls:

**Video Call:**
- Full-screen black background
- Remote video: Large, fills screen
- Local video: Small preview (bottom-right corner)
- Controls: Bottom center (mute, video toggle, end call)
- Timer: Shows call duration (top center)

**Voice Call:**
- Full-screen black background
- Microphone icon: Large, center
- Controls: Bottom center (mute, end call)
- Timer: Shows call duration (top center)

### Messages:

**Sent Messages:**
- Blue bubble (#0084ff)
- Right-aligned
- White text
- Timestamp + status (✓, ✓✓)
- No avatar (since it's your message)

**Received Messages:**
- White/gray bubble (#ffffff)
- Left-aligned
- Dark text (#111b21)
- Timestamp only
- Avatar on left side

---

## 🔧 Technical Implementation

### Calls:

**File: `src/components/CallModal.jsx`**
- Opens full-screen modal
- Uses `callService` for WebRTC
- Handles video/audio streams
- Shows connection status

**File: `src/services/callService.js`**
- Manages WebRTC peer connections
- Handles camera/microphone access
- Manages call state
- Handles screen sharing

### Messages:

**File: `src/components/MessageBubble.jsx`**
- Renders individual messages
- Handles encryption/decryption
- Shows message metadata (time, status)
- Handles reactions, editing, deletion

**File: `src/components/ChatArea.jsx`**
- Displays message list
- Handles message input
- Manages real-time updates
- Shows typing indicators

**File: `src/services/chatService.js`**
- Sends/receives messages
- Encrypts messages on send
- Decrypts messages on receive
- Manages Firestore sync

---

## 📱 User Experience

### Starting a Call:

1. User is in a chat
2. Clicks video/voice icon in header
3. Browser asks for camera/microphone permission
4. CallModal opens with "Connecting..." message
5. Once connected, shows video/audio
6. Call controls appear at bottom

### Sending a Message:

1. User types in input field
2. Message appears in chat as user types (optimistic update)
3. Message is encrypted and saved
4. Status shows ✓ (sent)
5. Status updates to ✓✓ (delivered)
6. Status updates to ✓✓ (read - blue)

### Receiving a Message:

1. Message appears in chat (real-time)
2. Message bubble slides in (animation)
3. Message is automatically decrypted
4. Read receipt sent automatically (after 1 second of viewing)
5. Typing indicator shows when sender is typing

---

## 🎯 Current Status

### ✅ Working:

- **Calls**: CallModal opens, WebRTC connection established
- **Messages**: Real-time display, encryption, decryption
- **Visual**: Message bubbles, timestamps, status indicators
- **Real-time**: Firestore sync, typing indicators

### ⚠️ Needs Implementation:

- **Incoming call notifications**: Need signaling server for WebRTC
- **Call routing**: Need backend to handle call offers/answers
- **Push notifications**: For calls when app is closed
- **Message notifications**: For new messages (partially implemented)

---

## 🔄 Real-time Updates

### Messages:

- **Firestore Listener**: Subscribes to chat messages
- **Automatic Updates**: Messages appear instantly
- **Typing Indicators**: Real-time typing status
- **Read Receipts**: Automatic read status updates

### Calls:

- **WebRTC Events**: Connection state changes
- **Stream Updates**: Video/audio stream updates
- **Call Status**: Connecting, connected, disconnected

---

## 📋 Summary

**Calls:**
- Full-screen modal with video/audio
- Call controls at bottom
- Connection status shown
- Call duration timer

**Messages:**
- Message bubbles (blue for sent, white for received)
- Timestamps and status indicators
- Real-time updates
- Automatic encryption/decryption

Both features work in real-time and provide a modern messaging/calling experience!


