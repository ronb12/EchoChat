import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../hooks/useAuth';
import { useUI } from '../hooks/useUI';
import { useRealtimeMessages, useTypingIndicator } from '../hooks/useRealtime';
import { useDisplayName } from '../hooks/useDisplayName';
import { chatService } from '../services/chatService';
import { validationService } from '../services/validationService';
import { stickersService } from '../services/stickersService';
import { videoMessageService } from '../services/videoMessageService';
import MessageBubble from './MessageBubble';
import MessageSearch from './MessageSearch';
import GifPicker from './GifPicker';
import SendMoneyModal from './SendMoneyModal';
import QuickReplyModal from './QuickReplyModal';
import PollCreatorModal from './PollCreatorModal';
import { EMOJI_LIST } from '../data/emojis';

export default function ChatArea() {
  const { messages, currentChatId, setCurrentChatId, chats } = useChat();
  const { user, signOut, setUser } = useAuth();
  const myDisplayName = useDisplayName(user?.uid, user?.displayName || user?.email || 'You');

  // Get current chat details
  const currentChat = chats.find(chat => chat.id === currentChatId);
  const participants = Array.isArray(currentChat?.participants) ? currentChat.participants : [];
  const otherParticipantId = participants.find((participantId) => participantId && participantId !== user?.uid);
  const baseChatName = currentChat
    ? (currentChat.alias || currentChat.displayName || currentChat.name || (currentChat.type === 'group' ? 'Group Chat' : 'Chat'))
    : 'Select a chat';
  const otherParticipantName = useDisplayName(
    currentChat?.type === 'group' ? null : otherParticipantId,
    baseChatName
  );
  const currentChatDisplayName = currentChat?.type === 'group'
    ? (currentChat?.name || baseChatName)
    : otherParticipantName || baseChatName;
  const currentChatContactName = currentChat?.type === 'group'
    ? (currentChat?.name || 'Group')
    : otherParticipantName || 'Contact';
  const { openNewChatModal, openCallModal, toggleSidebar, openSettingsModal, openGroupChatModal, openMediaGallery, openStatusModal, showNotification } = useUI();
  const [messageText, setMessageText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSendMoneyModal, setShowSendMoneyModal] = useState(false);
  const [showRequestMoneyModal, setShowRequestMoneyModal] = useState(false);
  const [showQuickReplyModal, setShowQuickReplyModal] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [isBusinessAccount, setIsBusinessAccount] = useState(false);
  const [availableStickers, setAvailableStickers] = useState([]);
  const [stickerPacks, setStickerPacks] = useState([]);
  const [selectedPack, setSelectedPack] = useState('all');
  const [recentStickers, setRecentStickers] = useState([]);
  const [stickerSearchQuery, setStickerSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [recordingError, setRecordingError] = useState('');
  const [isSendingVoice, setIsSendingVoice] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoRecordingDurationMs, setVideoRecordingDurationMs] = useState(0);
  const [videoRecordingError, setVideoRecordingError] = useState('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [videoPreviewBlob, setVideoPreviewBlob] = useState(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const moreMenuRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingStreamRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const shouldSendRecordingRef = useRef(false);
  const recordingStartTimeRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const videoRecordingTimerRef = useRef(null);
  const videoRecordingStartRef = useRef(null);
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(currentChatId);
  const typingUserEntries = Object.values(typingUsers || {});
  const firstTypingUser =
    typingUserEntries.find(entry => entry?.userId && entry.userId !== user?.uid) ||
    typingUserEntries[0] ||
    null;
  const typingDisplayName = useDisplayName(
    firstTypingUser?.userId && firstTypingUser.userId !== user?.uid ? firstTypingUser.userId : null,
    firstTypingUser?.displayName || 'Someone'
  );

  // Track mobile state
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check if business account
  useEffect(() => {
    if (user) {
      const accountType = localStorage.getItem('echochat_account_type') || user.accountType;
      const isBusiness = accountType === 'business' || user.isBusinessAccount === true;
      setIsBusinessAccount(isBusiness);
    }
  }, [user]);

  // Update recording timer
  useEffect(() => {
    if (isRecordingVoice) {
      recordingStartTimeRef.current = Date.now();
      setRecordingDurationMs(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDurationMs(Date.now() - (recordingStartTimeRef.current || Date.now()));
      }, 200);
      return () => {
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    recordingStartTimeRef.current = null;
    setRecordingDurationMs(0);
    return () => {};
  }, [isRecordingVoice]);

  // Update video recording timer
  useEffect(() => {
    if (isRecordingVideo) {
      videoRecordingStartRef.current = Date.now();
      setVideoRecordingDurationMs(0);
      videoRecordingTimerRef.current = setInterval(() => {
        setVideoRecordingDurationMs(Date.now() - (videoRecordingStartRef.current || Date.now()));
      }, 250);
      return () => {
        if (videoRecordingTimerRef.current) {
          clearInterval(videoRecordingTimerRef.current);
          videoRecordingTimerRef.current = null;
        }
      };
    }

    if (videoRecordingTimerRef.current) {
      clearInterval(videoRecordingTimerRef.current);
      videoRecordingTimerRef.current = null;
    }
    videoRecordingStartRef.current = null;
    setVideoRecordingDurationMs(0);
    return () => {};
  }, [isRecordingVideo]);

  // Load stickers when picker is shown
  useEffect(() => {
    if (showStickerPicker) {
      stickersService.getStickerPacks().then(packs => {
        setStickerPacks(packs);
        // Load recently used stickers
        if (user?.uid) {
          stickersService.getFrequentlyUsed(user.uid, 12).then(frequent => {
            const recent = frequent.map(usage => {
              const pack = packs.find(p => p.id === usage.packId);
              const sticker = pack?.stickers?.find(s => s.id === usage.stickerId);
              return sticker ? { ...sticker, packId: pack.id } : null;
            }).filter(Boolean);
            setRecentStickers(recent);
          }).catch(() => setRecentStickers([]));
        }
        // Load all stickers for "all" view
        const allStickers = packs.flatMap(pack =>
          (pack.stickers || []).map(s => ({ ...s, packId: pack.id, packName: pack.name }))
        );
        setAvailableStickers(allStickers);
      }).catch(() => {
        setStickerPacks([]);
        setAvailableStickers([]);
      });
    }
  }, [showStickerPicker, user]);

  // Close emoji picker and more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Ignore clicks on the emoji toggle button itself
      if (event.target?.closest('.emoji-btn')) {
        return;
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target) && showMoreMenu) {
        setShowMoreMenu(false);
      }
    };
    // Use click event instead of mousedown to avoid conflicts with button clicks
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMoreMenu]);

  // Subscribe to real-time messages
  useRealtimeMessages(currentChatId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + K to open new chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openNewChatModal();
      }
      // Cmd/Ctrl + F to toggle search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openNewChatModal, setShowSearch]);

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);

    // Create previews for images
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const newPreviews = [];

    if (imageFiles.length === 0) {
      setPreviewImages([]);
      return;
    }

    let loadedCount = 0;
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        newPreviews.push({ file, url: event.target.result });
        loadedCount++;
        if (loadedCount === imageFiles.length) {
          setPreviewImages(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const formatDuration = (milliseconds) => {
    const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const cleanupRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach(track => track.stop());
      recordingStreamRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current = null;
    }
    recordingChunksRef.current = [];
    shouldSendRecordingRef.current = false;
    recordingStartTimeRef.current = null;
  };

  const sendVoiceMessage = async (blob, durationMs) => {
    if (!blob || blob.size === 0 || !currentChatId || !user) {
      return;
    }

    const mimeType = blob.type || 'audio/webm';
    const fileName = `voice-${Date.now()}.webm`;
    const file = new File([blob], fileName, { type: mimeType });

    setIsSendingVoice(true);
    try {
      await chatService.sendMessage(currentChatId, {
        text: '',
        audioFile: file,
        audioName: fileName,
        audioDuration: Math.round(durationMs / 1000),
        fileSize: file.size,
        fileType: file.type,
        senderId: user.uid,
        senderName: myDisplayName || 'User'
      });
      showNotification('Voice message sent', 'success');
    } catch (error) {
      console.error('Error sending voice message:', error);
      showNotification(error?.message || 'Failed to send voice message', 'error');
    } finally {
      setIsSendingVoice(false);
    }
  };

  const startVoiceRecording = async () => {
    if (isRecordingVoice || isSendingVoice) {
      return;
    }

    if (typeof window === 'undefined' || typeof window.MediaRecorder !== 'function') {
      setRecordingError('Voice recording is not supported in this environment.');
      showNotification('Voice recording is not supported in this environment.', 'error');
      return;
    }

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setRecordingError('Voice recording is not supported in this browser.');
      showNotification('Voice recording is not supported in this browser.', 'error');
      return;
    }

    setRecordingError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recordingChunksRef.current = [];
      shouldSendRecordingRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const duration = Date.now() - (recordingStartTimeRef.current || Date.now());
        const shouldSend = shouldSendRecordingRef.current;
        const chunks = recordingChunksRef.current.slice();
        cleanupRecording();
        setIsRecordingVoice(false);
        setRecordingDurationMs(0);

        if (!shouldSend || chunks.length === 0) {
          return;
        }

        try {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          await sendVoiceMessage(blob, duration);
        } catch (error) {
          console.error('Failed to process voice recording:', error);
          showNotification('Failed to process voice recording.', 'error');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      recordingStartTimeRef.current = Date.now();
      setRecordingDurationMs(0);
      setIsRecordingVoice(true);
    } catch (error) {
      console.error('Unable to start voice recording:', error);
      setRecordingError('Microphone permission denied. Please enable access and try again.');
      showNotification('Microphone permission denied. Please enable access and try again.', 'error');
      cleanupRecording();
    }
  };

  const stopVoiceRecording = (shouldSend = true) => {
    if (!mediaRecorderRef.current) {
      return;
    }
    shouldSendRecordingRef.current = shouldSend;
    try {
      mediaRecorderRef.current.stop();
    } catch (error) {
      console.error('Failed to stop voice recording:', error);
      cleanupRecording();
      setIsRecordingVoice(false);
      if (shouldSend) {
        showNotification({
          type: 'error',
          message: 'Failed to finalize voice recording.'
        });
      }
    }
  };

  const cancelVoiceRecording = () => {
    stopVoiceRecording(false);
    setRecordingDurationMs(0);
    setIsRecordingVoice(false);
  };

  const completeVoiceRecording = () => {
    stopVoiceRecording(true);
  };

  const formatVideoDuration = (milliseconds) => {
    const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const clearVideoPreview = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoPreviewUrl('');
    setVideoPreviewBlob(null);
  };

  const stopVideoStreamPreview = () => {
    if (videoPreviewRef.current && videoPreviewRef.current.srcObject) {
      const stream = videoPreviewRef.current.srcObject;
      stream?.getTracks()?.forEach(track => track.stop());
      videoPreviewRef.current.srcObject = null;
    }
  };

  const startVideoRecording = async () => {
    if (isRecordingVideo || isUploadingVideo) {
      return;
    }
    if (!currentChatId || !user) {
      showNotification('Select a chat before recording video.', 'info');
      return;
    }
    if (!videoMessageService.isSupported()) {
      setVideoRecordingError('Video recording is not supported in this browser.');
      showNotification('Video recording is not supported in this browser.', 'error');
      return;
    }

    setVideoRecordingError('');
    try {
      const stream = await videoMessageService.startRecording(currentChatId, user.uid);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.muted = true;
        videoPreviewRef.current.playsInline = true;
        try {
          await videoPreviewRef.current.play();
        } catch (playError) {
          // Autoplay might be blocked; ignore and let user tap to play
        }
      }
      setIsRecordingVideo(true);
    } catch (error) {
      console.error('Unable to start video recording:', error);
      setVideoRecordingError(error?.message || 'Unable to start video recording.');
      showNotification(error?.message || 'Unable to start video recording.', 'error');
      videoMessageService.cancelRecording();
      stopVideoStreamPreview();
      setIsRecordingVideo(false);
    }
  };

  const finalizeVideoRecording = async () => {
    setIsRecordingVideo(false);
    if (!videoMessageService.mediaRecorder) {
      return;
    }
    try {
      const blob = await videoMessageService.stopRecording();
      stopVideoStreamPreview();
      videoRecordingStartRef.current = null;
      setVideoRecordingDurationMs(0);
      if (blob && blob.size > 0) {
        clearVideoPreview();
        const objectUrl = URL.createObjectURL(blob);
        setVideoPreviewBlob(blob);
        setVideoPreviewUrl(objectUrl);
      } else {
        clearVideoPreview();
      }
    } catch (error) {
      console.error('Failed to stop video recording:', error);
      setVideoRecordingError('Failed to process recorded video.');
      showNotification('Failed to process recorded video.', 'error');
      clearVideoPreview();
    }
  };

  const cancelVideoRecording = () => {
    videoMessageService.cancelRecording();
    stopVideoStreamPreview();
    videoRecordingStartRef.current = null;
    setVideoRecordingDurationMs(0);
    setIsRecordingVideo(false);
    setVideoRecordingError('');
  };

  const discardVideoPreview = () => {
    clearVideoPreview();
  };

  const handleSendVideoMessage = async () => {
    if (!videoPreviewBlob) {
      showNotification('No video to send.', 'info');
      return;
    }
    if (!currentChatId || !user) {
      showNotification('Select a chat before sending video.', 'info');
      return;
    }
    setIsUploadingVideo(true);
    try {
      await videoMessageService.sendVideoMessage(
        currentChatId,
        user.uid,
        myDisplayName || 'User',
        videoPreviewBlob
      );
      showNotification('Video message sent', 'success');
      clearVideoPreview();
    } catch (error) {
      console.error('Failed to send video message:', error);
      showNotification(error?.message || 'Failed to send video message', 'error');
    } finally {
      setIsUploadingVideo(false);
    }
  };

  useEffect(() => {
    return () => {
      videoMessageService.cancelRecording();
      stopVideoStreamPreview();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  const removePreview = (index) => {
    const newPreviews = [...previewImages];
    const newFiles = [...selectedFiles];
    newPreviews.splice(index, 1);
    newFiles.splice(index, 1);
    setPreviewImages(newPreviews);
    setSelectedFiles(newFiles);
  };

  const handleStartCall = (type) => {
    if (!currentChatId || !currentChat) {
      showNotification('Please select a chat first', 'info');
      return;
    }

    const participants = Array.isArray(currentChat.participants) ? currentChat.participants : [];
    const otherParticipants = participants.filter((participantId) => participantId !== user?.uid);

    if (otherParticipants.length !== 1) {
      showNotification('Calling is currently supported for one-on-one chats only.', 'info');
      return;
    }

    const receiverId = otherParticipants[0];
    const receiverName = currentChatContactName;

    openCallModal({
      type,
      chatId: currentChat.id,
      receiverId,
      receiverName,
      callerId: user?.uid || null,
      callerName: myDisplayName || 'You'
    });
  };

  const handleEmojiClick = (emoji) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleVoiceRecordingComplete = async (audioBlob) => {
    if (!user) {return;}

    try {
      // Convert blob to base64 for storage (in production, upload to Firebase Storage)
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result;
        await chatService.sendMessage(currentChatId, {
          text: '',
          audio: base64Audio,
          audioName: `voice_${Date.now()}.webm`,
          senderId: user.uid,
          senderName: myDisplayName || 'User'
        });
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Error sending voice message:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!messageText.trim() && selectedFiles.length === 0) || !user) {
      return;
    }

    // Validate chat exists
    if (!currentChatId) {
      console.error('❌ Cannot send message: No chat selected');
      alert('Please select a chat first');
      return;
    }

    console.log('📤 handleSendMessage called:', {
      chatId: currentChatId,
      userId: user.uid,
      hasText: !!messageText.trim(),
      filesCount: selectedFiles.length,
      imagesCount: previewImages.length
    });

    try {
      // Validate message text
      if (messageText.trim()) {
        const textValidation = validationService.validateMessage(messageText.trim());
        if (!textValidation.valid) {
          alert(textValidation.error);
          return;
        }
      }

      // Validate files
      for (const file of selectedFiles) {
        const fileValidation = validationService.validateFile(file);
        if (!fileValidation.valid) {
          alert(fileValidation.error);
          return;
        }
      }

      // Send images first
      for (const preview of previewImages) {
        const fileValidation = validationService.validateFile(preview.file);
        if (!fileValidation.valid) {
          alert(`Invalid image: ${fileValidation.error}`);
          continue;
        }

        try {
          await chatService.sendMessage(currentChatId, {
            text: '',
            image: preview.url,
            imageName: preview.file.name,
            fileSize: preview.file.size,
            fileType: preview.file.type,
            senderId: user.uid,
            senderName: myDisplayName || 'User'
          });
        } catch (error) {
          alert(`Error sending image: ${error.message || 'Unknown error'}`);
        }
      }

      // Send files
      for (const file of selectedFiles) {
        if (!file.type.startsWith('image/')) {
          const fileValidation = validationService.validateFile(file);
          if (!fileValidation.valid) {
            alert(`Invalid file: ${fileValidation.error}`);
            continue;
          }

          try {
            const fileData = {
              name: file.name,
              size: file.size,
              type: file.type
            };
            await chatService.sendMessage(currentChatId, {
              text: '',
              file: fileData,
              fileSize: file.size,
              fileType: file.type,
              fileName: file.name,
              senderId: user.uid,
              senderName: myDisplayName || 'User'
            });
          } catch (error) {
            alert(`Error sending file: ${error.message || 'Unknown error'}`);
          }
        }
      }

      // Send text message
      if (messageText.trim()) {
        try {
          await chatService.sendMessage(currentChatId, {
            text: validationService.sanitizeInput(messageText.trim()),
            senderId: user.uid,
            senderName: myDisplayName || 'User'
          });
        } catch (error) {
          console.error('❌ Error sending text message:', error);
          console.error('   Error details:', {
            chatId: currentChatId,
            userId: user.uid,
            errorMessage: error.message,
            errorCode: error.code
          });
          alert(`Error sending message: ${error.message || 'Unknown error'}`);
          return;
        }
      }

      setMessageText('');
      setSelectedFiles([]);
      setPreviewImages([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      stopTyping();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('An error occurred while sending your message. Please try again.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleInputChange = (e) => {
    setMessageText(e.target.value);
    if (e.target.value.trim()) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  // Show welcome screen if no messages and no current chat
  if (messages.length === 0 && !currentChatId) {
    return (
      <div
        className="chat-area"
        data-has-chat="false"
      >
        <div className="welcome-screen">
          <div className="welcome-content">
            <div className="welcome-icon">💬</div>
            <h2>Welcome to EchoChat</h2>
            <p>Select a chat or start a new conversation to begin messaging</p>
            <div className="welcome-actions">
              <button className="btn btn-primary" onClick={openNewChatModal}>
                Start New Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`chat-area ${currentChatId ? 'has-chat' : ''}`}
      data-has-chat={currentChatId ? 'true' : 'false'}
    >
      <div className="chat-interface">
        {/* Chat Header */}
        <div className="chat-header">
          <div className="chat-info">
            {/* Back button on mobile - shows sidebar and clears chat selection */}
            {isMobile && (
              <button
                className="back-button mobile-only"
                onClick={() => {
                  setCurrentChatId(null);
                  toggleSidebar();
                }}
                data-testid="back-button"
                aria-label="Back to chats"
              >
                ←
              </button>
            )}
            <div className="chat-avatar">
              <img
                src={currentChat?.avatar || '/icons/default-avatar.png'}
                alt={currentChat?.name || 'Chat'}
                onError={(e) => { e.target.src = '/icons/default-avatar.png'; }}
              />
            </div>
            <div className="chat-details">
              <h3>{currentChatDisplayName}</h3>
              <div className="chat-status">
                {Object.keys(typingUsers).length > 0
                  ? `${typingDisplayName || 'Someone'} is typing...`
                  : 'Online'
                }
              </div>
            </div>
          </div>
          <div className="chat-actions">
            <button
              className="action-btn action-btn-search"
              title="Search messages"
              onClick={() => setShowSearch((prev) => !prev)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
            </button>
            <button
              className="action-btn action-btn-call"
              title="Voice call"
              onClick={() => handleStartCall('audio')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </button>
            <button
              className="action-btn action-btn-video"
              title="Video call"
              onClick={() => handleStartCall('video')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 11l-7-5v10l7-5z"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            </button>
            <div className="action-btn-wrapper" ref={moreMenuRef} style={{ position: 'relative' }}>
              <button
                className="action-btn action-btn-more"
                title="More options"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoreMenu(!showMoreMenu);
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1"/>
                  <circle cx="19" cy="12" r="1"/>
                  <circle cx="5" cy="12" r="1"/>
                </svg>
              </button>
              {showMoreMenu && (
                <div className="more-menu" style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: 'var(--surface-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  minWidth: '160px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  zIndex: 1000
                }}>
                  <button
                    className="more-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      openMediaGallery();
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>🖼️</span>
                    <span>View Media & Files</span>
                  </button>
                  <button
                    className="more-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSearch(true);
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>🔍</span>
                    <span>Search Messages</span>
                  </button>
                  <button
                    className="more-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      openGroupChatModal();
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>👥</span>
                    <span>Create Group Chat</span>
                  </button>
                  <button
                    className="more-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      openStatusModal();
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>✏️</span>
                    <span>Status Updates</span>
                  </button>
                  <button
                    className="more-menu-item"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!videoMessageService.isSupported()) {
                        showNotification('Video recording is not supported on this device', 'error');
                        setShowMoreMenu(false);
                        return;
                      }
                      try {
                        await videoMessageService.startRecording(currentChatId, user?.uid, (size) => {
                          console.log('Recording size:', size);
                        });
                        setIsRecordingVideo(true);
                        setShowVideoRecorder(true);
                        showNotification('Video recording started', 'success');
                      } catch (error) {
                        showNotification(`Error starting video recording: ${error.message}`, 'error');
                      }
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>📹</span>
                    <span>Video Message</span>
                  </button>
                  <button
                    className="more-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowStickerPicker(!showStickerPicker);
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>😊</span>
                    <span>Stickers</span>
                  </button>
                  <button
                    className="more-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPollCreator(true);
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>📊</span>
                    <span>Create Poll</span>
                  </button>
                  {isBusinessAccount && (
                    <button
                      className="more-menu-item"
                      onClick={async (e) => {
                        e.stopPropagation();
                        // Check subscription status before allowing Quick Reply
                        try {
                          const isProduction = import.meta.env.PROD;
                          const baseUrl = import.meta.env.VITE_API_BASE_URL || (isProduction ? '' : 'http://localhost:3001');
                          const API_BASE_URL = baseUrl.endsWith('/api') ? baseUrl.replace(/\/api$/, '') : baseUrl;
                          const response = await fetch(`${API_BASE_URL}/api/stripe/subscription/${user?.uid}`);
                          if (response.ok) {
                            const subscription = await response.json();
                            const hasActiveSubscription = subscription.status === 'active' || subscription.status === 'trialing';
                            if (!hasActiveSubscription) {
                              showNotification('🔒 Business features are locked. Please update your payment method or subscribe to access Quick Reply.', 'error');
                              openSettingsModal();
                              setShowMoreMenu(false);
                              return;
                            }
                          } else if (response.status === 404) {
                            // No subscription - locked
                            showNotification('🔒 Business features are locked. Please subscribe to access Quick Reply.', 'error');
                            openSettingsModal();
                            setShowMoreMenu(false);
                            return;
                          }
                        } catch (error) {
                          console.error('Error checking subscription:', error);
                          // Allow access if check fails (graceful degradation)
                        }
                        setShowQuickReplyModal(true);
                        setShowMoreMenu(false);
                      }}
                    >
                      <span>💬</span>
                      <span>Quick Reply</span>
                    </button>
                  )}
                  <button
                    className="more-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSendMoneyModal(true);
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>💵</span>
                    <span>Send Money</span>
                  </button>
                  <button
                    className="more-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRequestMoneyModal(true);
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>📥</span>
                    <span>Request Money</span>
                  </button>
                  <button
                    className="more-menu-item"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (currentChatId && messages.length > 0) {
                        if (window.confirm(`Are you sure you want to clear all ${messages.length} messages from this chat? This action cannot be undone.`)) {
                          try {
                            await chatService.clearChatHistory(currentChatId);
                            showNotification('Chat history cleared', 'success');
                          } catch (error) {
                            showNotification('Failed to clear chat history', 'error');
                            console.error('Error clearing chat:', error);
                          }
                        }
                      }
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>🗑️</span>
                    <span>Clear Chat History</span>
                  </button>
                  <button
                    className="more-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      try {
                        const chatData = {
                          chatId: currentChatId,
                          messages: messages,
                          timestamp: new Date().toISOString()
                        };
                        const dataStr = JSON.stringify(chatData, null, 2);
                        const dataBlob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(dataBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `chat-export-${currentChatId || 'chat'}-${Date.now()}.json`;
                        link.click();
                        URL.revokeObjectURL(url);
                        showNotification('Chat exported successfully', 'success');
                      } catch (error) {
                        showNotification('Failed to export chat', 'error');
                        console.error('Error exporting chat:', error);
                      }
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>💾</span>
                    <span>Export Chat</span>
                  </button>
                  <button
                    className="more-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      openSettingsModal();
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>⚙️</span>
                    <span>Settings</span>
                  </button>
                  <button
                    className="more-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentChatId) {
                        if (window.confirm('Are you sure you want to leave this chat?')) {
                          setCurrentChatId(null);
                          showNotification('Left chat', 'info');
                        }
                      }
                      setShowMoreMenu(false);
                    }}
                    style={{ color: '#f44336' }}
                  >
                    <span>🚪</span>
                    <span>Leave Chat</span>
                  </button>
                  <button
                    className="more-menu-item"
                    onClick={async (e) => {
                      e.stopPropagation();
                      setShowMoreMenu(false);
                      try {
                        // Check if user is a demo user (no Firebase UID)
                        const isDemoUser = user && !user.uid;

                        if (isDemoUser) {
                          // Demo user - just clear localStorage and state
                          localStorage.removeItem('echochat_account_type');
                          localStorage.removeItem('echochat_user');
                          setUser(null);
                          showNotification('Signed out successfully', 'success');
                        } else if (signOut && typeof signOut === 'function') {
                          // Real user - use Firebase signOut
                          try {
                            const result = await signOut();
                            if (result && result.success) {
                              showNotification('Signed out successfully', 'success');
                              // Clear account type and demo user from localStorage
                              localStorage.removeItem('echochat_account_type');
                              localStorage.removeItem('echochat_user');
                              // Clear user state
                              setUser(null);
                            } else {
                              showNotification(result?.error || 'Failed to sign out', 'error');
                            }
                          } catch (signOutError) {
                            // If signOut throws an error, still clear local data
                            console.error('Error during signOut:', signOutError);
                            localStorage.removeItem('echochat_account_type');
                            localStorage.removeItem('echochat_user');
                            setUser(null);
                            showNotification('Signed out successfully', 'success');
                          }
                        } else {
                          // signOut not available - manually clear everything
                          console.warn('signOut function not available, clearing local data');
                          localStorage.removeItem('echochat_account_type');
                          localStorage.removeItem('echochat_user');
                          setUser(null);
                          showNotification('Signed out successfully', 'success');
                        }
                      } catch (error) {
                        // If anything fails, still try to clear local data
                        console.error('Error signing out:', error);
                        localStorage.removeItem('echochat_account_type');
                        localStorage.removeItem('echochat_user');
                        setUser(null);
                        showNotification('Signed out successfully', 'success');
                      }
                    }}
                    style={{ color: '#f44336' }}
                  >
                    <span>🔓</span>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message Search */}
        {showSearch && (
          <MessageSearch />
        )}

        {/* Send Money Modal */}
        {showSendMoneyModal && (
          <SendMoneyModal
            recipientId={currentChatId}
            recipientName={currentChat?.name || 'Chat'}
            initialMode="send"
            onClose={() => setShowSendMoneyModal(false)}
          />
        )}

        {/* Request Money Modal */}
        {showRequestMoneyModal && (
          <SendMoneyModal
            recipientId={currentChatId}
            recipientName={currentChat?.name || 'Chat'}
            initialMode="request"
            onClose={() => setShowRequestMoneyModal(false)}
          />
        )}

        {/* Quick Reply Modal */}
        {showQuickReplyModal && (
          <QuickReplyModal onClose={() => setShowQuickReplyModal(false)} />
        )}

        {/* Sticker Picker - Modern Enhanced Version */}
        {showStickerPicker && (
          <div style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '500px',
            background: 'var(--background-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '0',
            zIndex: 2000,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header with Search */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <input
                type="text"
                placeholder="Search stickers..."
                value={stickerSearchQuery}
                onChange={(e) => setStickerSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: 'var(--surface-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: 'var(--text-color)'
                }}
              />
              <button
                onClick={() => setShowStickerPicker(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'var(--text-color)'
                }}
              >
                ✕
              </button>
            </div>

            {/* Category Tabs */}
            <div style={{
              display: 'flex',
              gap: '4px',
              padding: '8px',
              borderBottom: '1px solid var(--border-color)',
              overflowX: 'auto',
              scrollbarWidth: 'thin'
            }}>
              <button
                onClick={() => { setSelectedPack('recent'); setStickerSearchQuery(''); }}
                style={{
                  padding: '8px 12px',
                  background: selectedPack === 'recent' ? 'var(--primary-color)' : 'var(--surface-color)',
                  color: selectedPack === 'recent' ? '#fff' : 'var(--text-color)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                ⭐ Recent
              </button>
              <button
                onClick={() => { setSelectedPack('all'); setStickerSearchQuery(''); }}
                style={{
                  padding: '8px 12px',
                  background: selectedPack === 'all' ? 'var(--primary-color)' : 'var(--surface-color)',
                  color: selectedPack === 'all' ? '#fff' : 'var(--text-color)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                🎨 All
              </button>
              {stickerPacks.map(pack => (
                <button
                  key={pack.id}
                  onClick={() => { setSelectedPack(pack.id); setStickerSearchQuery(''); }}
                  style={{
                    padding: '8px 12px',
                    background: selectedPack === pack.id ? 'var(--primary-color)' : 'var(--surface-color)',
                    color: selectedPack === pack.id ? '#fff' : 'var(--text-color)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s'
                  }}
                >
                  {pack.icon} {pack.name}
                </button>
              ))}
            </div>

            {/* Stickers Grid */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
              gap: '12px',
              scrollbarWidth: 'thin'
            }}>
            {(() => {
              // Filter stickers based on selected pack and search
              let filteredStickers = [];

              if (selectedPack === 'recent') {
                filteredStickers = recentStickers;
              } else if (selectedPack === 'all') {
                filteredStickers = availableStickers;
              } else {
                const pack = stickerPacks.find(p => p.id === selectedPack);
                filteredStickers = pack ? (pack.stickers || []).map(s => ({ ...s, packId: pack.id, packName: pack.name })) : [];
              }

              // Apply search filter
              if (stickerSearchQuery.trim()) {
                const query = stickerSearchQuery.toLowerCase();
                filteredStickers = filteredStickers.filter(sticker => {
                  const matchesKeyword = sticker.keywords?.some(k => k.toLowerCase().includes(query));
                  const matchesEmoji = sticker.emoji?.includes(query);
                  return matchesKeyword || matchesEmoji;
                });
              }

              return filteredStickers.length > 0 ? (
                filteredStickers.map((sticker, idx) => (
                <button
                  key={sticker.id || idx}
                  onClick={async () => {
                    try {
                      await stickersService.sendSticker(
                        currentChatId,
                        user?.uid,
                        myDisplayName || 'User',
                        sticker
                      );
                      setShowStickerPicker(false);
                      showNotification('Sticker sent!', 'success');
                    } catch (error) {
                      showNotification(`Error sending sticker: ${error.message}`, 'error');
                    }
                  }}
                  style={{
                    background: 'var(--surface-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '12px',
                    cursor: 'pointer',
                    fontSize: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {sticker.emoji || '😊'}
                </button>
                ))
              ) : (
                <div style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'var(--text-color-secondary)',
                  fontSize: '14px'
                }}>
                  {stickerSearchQuery ? 'No stickers found matching your search' : 'No stickers available'}
                </div>
              );
            })()}
            </div>
          </div>
        )}

        {/* Poll Creator Modal */}
        {showPollCreator && (
          <PollCreatorModal
            chatId={currentChatId}
            userId={user?.uid}
            userName={myDisplayName || 'User'}
            onClose={() => setShowPollCreator(false)}
            onSuccess={() => {
              setShowPollCreator(false);
              showNotification('Poll created!', 'success');
            }}
          />
        )}

        {/* Messages Container */}
        <div className="messages-container">
          <div className="messages-list">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💬</div>
                <h3>No messages yet</h3>
                <p>Start the conversation by sending a message!</p>
                <button className="btn btn-secondary" onClick={openNewChatModal}>
                  Start New Chat
                </button>
              </div>
            ) : (
              <>
                {messages.map((message, idx) => (
                  <MessageBubble
                    key={message.id || idx}
                    message={message}
                    isOwn={message.senderId === user?.uid}
                    chatId={currentChatId}
                    participants={participants}
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Image Previews */}
        {previewImages.length > 0 && (
          <div className="image-previews">
            {previewImages.map((preview, idx) => (
              <div key={idx} className="image-preview">
                <img src={preview.url} alt={preview.file.name} />
                <button
                  className="remove-preview"
                  onClick={() => removePreview(idx)}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Message Input */}
        <div className="message-input-container">
          <div className="input-actions">
            <input
              ref={fileInputRef}
              type="file"
              id="file-input"
              style={{ display: 'none' }}
              multiple
              accept="image/*,application/pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
            />
            <button
              className="input-action-btn"
              title="Attach file"
              onClick={() => fileInputRef.current?.click()}
            >
              📎
            </button>
            <button
              className="input-action-btn emoji-btn"
              title="Add emoji"
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                setShowGifPicker(false);
              }}
            >
              😀
            </button>
            {currentChat?.type === 'group' && (
              <button
                className="input-action-btn poll-btn"
                title="Create poll"
                onClick={() => {
                  if (!currentChatId) {
                    showNotification('Please select a chat before creating a poll.', 'info');
                    return;
                  }
                  setShowPollCreator(true);
                }}
              >
                📊
              </button>
            )}
            <button
              className={`input-action-btn voice-btn ${isRecordingVoice ? 'recording' : ''}`}
              title={isRecordingVoice ? 'Stop recording' : 'Record voice message'}
              onClick={() => {
                if (!currentChatId) {
                  showNotification('Please select a chat before recording.', 'info');
                  return;
                }
                if (isRecordingVoice) {
                  completeVoiceRecording();
                } else {
                  startVoiceRecording();
                }
              }}
              disabled={isSendingVoice}
            >
              {isRecordingVoice ? '⏹️' : '🎙️'}
            </button>
            <button
              className="input-action-btn money-btn"
              title="Send Money"
              onClick={() => {
                if (currentChatId) {
                  setShowSendMoneyModal(true);
                } else {
                  showNotification('Please select a chat first', 'info');
                }
              }}
              style={{ color: '#4caf50' }}
            >
              💵
            </button>
            {showGifPicker && (
              <GifPicker
                onSelectGif={async (gifUrl) => {
                  try {
                    await chatService.sendMessage(currentChatId, {
                      text: '',
                      image: gifUrl,
                      imageName: 'gif.gif',
                      senderId: user.uid,
                      senderName: myDisplayName || 'User'
                    });
                    setShowGifPicker(false);
                  } catch (error) {
                    alert('Error sending GIF: ' + (error.message || 'Unknown error'));
                  }
                }}
                onClose={() => setShowGifPicker(false)}
              />
            )}
          </div>

          {isRecordingVoice && (
            <div className="voice-recording-indicator" role="status">
              <span className="recording-dot" aria-hidden="true" />
              <span className="recording-timer">{formatDuration(recordingDurationMs)}</span>
              <div className="recording-controls">
                <button
                  type="button"
                  className="recording-control-btn cancel"
                  onClick={cancelVoiceRecording}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="recording-control-btn send"
                  onClick={completeVoiceRecording}
                  disabled={isSendingVoice}
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {!isRecordingVoice && recordingError && (
            <div className="voice-recording-error">
              {recordingError}
            </div>
          )}

          {isRecordingVideo && (
            <div className="video-recording-indicator">
              <div className="video-recording-preview">
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                />
              </div>
              <div className="video-recording-meta">
                <span className="recording-dot" aria-hidden="true" />
                <span className="recording-timer">{formatVideoDuration(videoRecordingDurationMs)}</span>
              </div>
              <div className="video-recording-controls">
                <button
                  type="button"
                  className="recording-control-btn cancel"
                  onClick={cancelVideoRecording}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="recording-control-btn send"
                  onClick={finalizeVideoRecording}
                >
                  Stop
                </button>
              </div>
            </div>
          )}

          {!isRecordingVideo && videoPreviewUrl && (
            <div className="video-preview-panel">
              <video
                src={videoPreviewUrl}
                controls
                playsInline
              />
              <div className="video-preview-actions">
                <button
                  type="button"
                  className="recording-control-btn cancel"
                  onClick={discardVideoPreview}
                >
                  Discard
                </button>
                <button
                  type="button"
                  className="recording-control-btn send"
                  onClick={handleSendVideoMessage}
                  disabled={isUploadingVideo}
                >
                  {isUploadingVideo ? 'Uploading…' : 'Send video'}
                </button>
              </div>
            </div>
          )}

          {!isRecordingVideo && videoRecordingError && (
            <div className="video-recording-error">
              {videoRecordingError}
            </div>
          )}

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="emoji-picker" ref={emojiPickerRef}>
              <div className="emoji-picker-header">
                <span>Pick an emoji</span>
              </div>
              <div className="emoji-grid">
                {EMOJI_LIST.map(emoji => (
                  <button
                    key={emoji}
                    className="emoji-item"
                    onClick={() => handleEmojiClick(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="message-input-wrapper" style={{ flex: 1 }}>
            <label htmlFor="message-input" className="sr-only">
              Message
            </label>
            <input
              id="message-input"
              type="text"
              placeholder="Type a message..."
              autoComplete="off"
              name="message"
              value={messageText}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
            />
            <button
              type="submit"
              className="send-btn"
              disabled={!messageText.trim() && selectedFiles.length === 0}
              title="Send message"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
