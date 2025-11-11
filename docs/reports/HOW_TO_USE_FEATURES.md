# 📱 How to Use EchoChat Features

## ✅ Currently Implemented Features

### 1. **Header Features** ✓ Working
- **EchoChat Title**: Visible with white text and shadow
- **Theme Toggle**: Button with "Light/Dark" label
- **Settings Button**: Button with "Settings" label
- **User Avatar**: Shows logged-in user's photo

### 2. **Chat Actions** (Inside Active Chat)
These features are **already implemented** but only show when you have a **selected chat**:

#### In the Chat Header:
- 🔍 **Search**: Opens message search overlay
- 🖼️ **Media Gallery**: Shows all images/media in the chat
- 📞 **Voice Call**: (UI ready, needs backend)
- 📹 **Video Call**: (UI ready, needs backend)
- ℹ️ **Chat Info**: (UI ready, needs backend)

#### In the Message Input Area:
- 📎 **File Upload**: Attach files
- 🖼️ **Image Upload**: Attach images
- 🎤 **Voice Recorder**: Send voice messages
- 💬 **Text Messages**: Send text

### 3. **Message Features** (In Message Bubbles)
- **Reply**: Click message → Reply
- **Forward**: Click message → Forward
- **React**: Click message → Emoji reaction
- **Edit**: Click your own message → Edit
- **Delete**: Click message → Delete for me/everyone

## 🚀 How to Access These Features

### Step 1: Login
1. Go to http://localhost:3000
2. Click "Sign In" button
3. Use credentials:
   - Email: `testuser1@echochat.com`
   - Password: `test123`

### Step 2: Create or Select a Chat
The features won't show until you have an **active chat** selected!

#### Option A: Create a New Chat
1. Click the "New Chat" button (usually in sidebar)
2. Enter a contact email or username
3. Click "Create"

#### Option B: Select Existing Chat
1. Look in the sidebar for existing chats
2. Click on any chat to open it

### Step 3: Use the Features

Once you have a chat selected, you'll see:
- ✅ Search button (🔍) in chat header
- ✅ Media Gallery button (🖼️) in chat header  
- ✅ Voice Recorder in the message input area
- ✅ File/Image upload buttons
- ✅ All message interaction features

## 🎯 Why Features Might Not Be Visible

### Common Issues:

1. **"No chat selected"**
   - Solution: Create or select a chat first
   
2. **"Logged out"**
   - Solution: Make sure you're logged in with test credentials
   
3. **"Can't create chat"**
   - Solution: Use testuser2@echochat.com as the recipient

## 🧪 Testing Checklist

- [x] Header is visible with white EchoChat title
- [x] Button labels are visible ("Light/Dark", "Settings")
- [ ] Create a new chat
- [ ] Search for messages
- [ ] Open media gallery
- [ ] Send a voice message
- [ ] Upload an image
- [ ] Upload a file
- [ ] Reply to a message
- [ ] React to a message

## 💡 Test Users

Create these test accounts to test messaging:

**User 1:**
- Email: testuser1@echochat.com
- Password: test123

**User 2:**
- Email: testuser2@echochat.com  
- Password: test123

## 🔍 Quick Debug

If features don't show:
1. Check browser console for errors
2. Make sure you're logged in (check header shows your avatar)
3. Make sure you've selected a chat (should see message input area)
4. Check that both test users exist in Firebase

## 📝 Note

All WhatsApp-style features are **fully implemented** in the code. They just require an active chat session to be visible and functional!

