import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../hooks/useAuth';
import { useUI } from '../hooks/useUI';
import { useRealtimeMessages, useTypingIndicator } from '../hooks/useRealtime';
import { useDisplayName } from '../hooks/useDisplayName';
import { chatService } from '../services/chatService';
import { validationService } from '../services/validationService';
import { stickersService } from '../services/stickersService';
import { videoMessageService } from '../services/videoMessageService';
import { firestoreService } from '../services/firestoreService';
import { businessService } from '../services/businessService';
import MessageBubble from './MessageBubble';
import MessageSearch from './MessageSearch';
import GifPicker from './GifPicker';
import SendMoneyModal from './SendMoneyModal';
import QuickReplyModal from './QuickReplyModal';
import PollCreatorModal from './PollCreatorModal';
import ScheduleMessageModal from './ScheduleMessageModal';
import { EMOJI_LIST } from '../data/emojis';
import { resolveApiBaseUrl } from '../utils/apiBaseUrl';

function MicIcon({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 15a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z" />
      <path d="M19 11a7 7 0 0 1-14 0" />
      <path d="M12 19v3" />
      <path d="M8 22h8" />
    </svg>
  );
}

function StopIcon({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="6" y="6" width="12" height="12" rx="3" />
    </svg>
  );
}

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
  const [quickReplies, setQuickReplies] = useState([]);
  const [smartReplySuggestions, setSmartReplySuggestions] = useState([]);
  const [quickRepliesLoading, setQuickRepliesLoading] = useState(false);
  const [hideSmartReplies, setHideSmartReplies] = useState(false);
  const [isSendingSmartReplyId, setIsSendingSmartReplyId] = useState(null);
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
  const [showPinnedTray, setShowPinnedTray] = useState(true);
  const [showScheduledTray, setShowScheduledTray] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDraftValue, setScheduleDraftValue] = useState('');
  const [isSchedulingMessage, setIsSchedulingMessage] = useState(false);
  const [scheduleMode, setScheduleMode] = useState('create'); // 'create' | 'reschedule'
  const [scheduleTargetMessage, setScheduleTargetMessage] = useState(null);
  const scheduleModeRef = useRef('create');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__echochatScheduleState = {
        mode: scheduleModeRef.current,
        targetId: scheduleTargetMessage?.id || null
      };
    }
  }, [scheduleMode, scheduleTargetMessage]);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
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

  const loadQuickReplies = useCallback(async () => {
    if (!user?.uid) {
      setQuickReplies([]);
      return;
    }
    try {
      setQuickRepliesLoading(true);
      const replies = await businessService.getQuickReplies(user.uid);
      setQuickReplies(replies);
      if (replies.length === 0) {
        const defaultSuggestions = [
          { id: 'default-1', text: 'Thanks for reaching out!', usageCount: 0, lastUsedAt: null },
          { id: 'default-2', text: 'I will check on this and get back to you shortly.', usageCount: 0, lastUsedAt: null },
          { id: 'default-3', text: 'Can you provide a bit more detail?', usageCount: 0, lastUsedAt: null }
        ];
        setSmartReplySuggestions(defaultSuggestions.slice(0, 3));
      }
    } catch (error) {
      console.error('Failed to load quick replies:', error);
    } finally {
      setQuickRepliesLoading(false);
    }
  }, [user?.uid]);

  const computeDefaultScheduleValue = useCallback(() => {
    const base = new Date(Date.now() + 15 * 60 * 1000);
    base.setSeconds(0, 0);
    const offset = base.getTimezoneOffset() * 60000;
    const localISOTime = new Date(base.getTime() - offset).toISOString().slice(0, 16);
    return localISOTime;
  }, []);

  const toScheduleInputValue = useCallback((timestamp) => {
    if (!Number.isFinite(timestamp)) {
      return computeDefaultScheduleValue();
    }
    const base = new Date(timestamp);
    base.setSeconds(0, 0);
    const offset = base.getTimezoneOffset() * 60000;
    return new Date(base.getTime() - offset).toISOString().slice(0, 16);
  }, [computeDefaultScheduleValue]);

  const pinnedMessages = useMemo(() => {
    if (!Array.isArray(messages)) {
      return [];
    }
    return messages.filter((msg) => msg?.pinned && !msg.deleted);
  }, [messages]);

  const scheduledMessages = useMemo(() => {
    if (!Array.isArray(messages)) {
      return [];
    }
    return messages
      .filter((msg) => msg?.scheduled && !msg.deleted)
      .sort((a, b) => {
        const timeA = a.scheduleTime || a.scheduledFor || a.timestamp || 0;
        const timeB = b.scheduleTime || b.scheduledFor || b.timestamp || 0;
        return timeA - timeB;
      });
  }, [messages]);

  const lastIncomingMessage = useMemo(() => {
    if (!Array.isArray(messages) || messages.length === 0) {
      return null;
    }
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (!msg || msg.senderId === user?.uid) {
        continue;
      }
      if (msg.deleted) {
        continue;
      }
      return msg;
    }
    return null;
  }, [messages, user?.uid]);

  const evaluateSmartReplies = useCallback(() => {
    if (hideSmartReplies || quickRepliesLoading) {
      return;
    }

    const suggestions = [];
    const seen = new Set();

    const addSuggestion = (item, reason = 'default') => {
      if (!item || !item.text) {return;}
      const text = item.text.trim();
      if (!text) {return;}
      const normalized = text.toLowerCase();
      if (seen.has(normalized)) {return;}
      seen.add(normalized);
      suggestions.push({
        id: item.id || `${reason}-${text.slice(0, 12)}`,
        text,
        reason,
        usageCount: item.usageCount || 0
      });
    };

    // include frequently used quick replies
    quickReplies
      .filter((reply) => reply && reply.text)
      .sort((a, b) => {
        const aUsage = Number.isFinite(a.usageCount) ? a.usageCount : 0;
        const bUsage = Number.isFinite(b.usageCount) ? b.usageCount : 0;
        if (bUsage !== aUsage) {
          return bUsage - aUsage;
        }
        const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
        const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5)
      .forEach((reply) => addSuggestion(reply, 'quick-reply'));

    const incomingText = lastIncomingMessage?.decryptedText || lastIncomingMessage?.text || '';
    const normalizedIncoming = incomingText.toLowerCase();

    if (incomingText) {
      if (normalizedIncoming.includes('?')) {
        addSuggestion({ id: 'question-1', text: 'Great question — let me check on that and reply shortly.' }, 'question');
        addSuggestion({ id: 'question-2', text: 'Could you clarify a bit more so I can help?' }, 'question');
      }
      if (normalizedIncoming.match(/\bthank(s| you)\b/)) {
        addSuggestion({ id: 'thanks-1', text: 'You’re welcome! Happy to help.' }, 'gratitude');
      }
      if (normalizedIncoming.match(/\bhello\b|\bhi\b|\bhey\b/)) {
        addSuggestion({ id: 'greeting-1', text: 'Hi there! How can I assist you today?' }, 'greeting');
      }
      if (normalizedIncoming.match(/\bprice\b|\brate\b|\bcost\b/)) {
        addSuggestion({ id: 'pricing-1', text: 'Our pricing depends on the package. Want me to send the latest options?' }, 'pricing');
      }
      if (normalizedIncoming.match(/\bissue\b|\bproblem\b|\bhelp\b/)) {
        addSuggestion({ id: 'issue-1', text: 'I’m sorry for the trouble—let me gather a few details so we can fix this.' }, 'support');
      }
    }

    if (suggestions.length === 0) {
      const fallback = [
        { id: 'fallback-1', text: 'Thanks for your patience! I’ll update you soon.' },
        { id: 'fallback-2', text: 'Let me double-check that and get right back to you.' },
        { id: 'fallback-3', text: 'Appreciate the update. I’ll follow up shortly.' }
      ];
      fallback.forEach((item) => addSuggestion(item, 'fallback'));
    }

    setSmartReplySuggestions(suggestions.slice(0, 4));
  }, [hideSmartReplies, lastIncomingMessage, quickReplies, quickRepliesLoading]);

  useEffect(() => {
    evaluateSmartReplies();
  }, [evaluateSmartReplies]);

  const sendSmartReplyNow = useCallback(async (suggestion) => {
    if (!suggestion?.text) {return;}
    if (!currentChatId) {
      showNotification('Please select a chat first.', 'info');
      return;
    }
    if (!user?.uid) {
      showNotification('You must be signed in to reply.', 'error');
      return;
    }
    try {
      setIsSendingSmartReplyId(suggestion.id || suggestion.text);
      await chatService.sendMessage(currentChatId, {
        text: suggestion.text,
        senderId: user.uid,
        senderName: myDisplayName || user.displayName || user.email || 'You'
      });
      businessService.recordQuickReplyUsage(user.uid, suggestion.id).catch(() => {});
      showNotification('Message sent.', 'success');
      setMessageText('');
      stopTyping();
      if (isBusinessAccount) {
        loadQuickReplies();
      }
    } catch (error) {
      console.error('Failed to send smart reply:', error);
      showNotification(error?.message || 'Unable to send reply.', 'error');
    } finally {
      setIsSendingSmartReplyId(null);
    }
  }, [currentChatId, isBusinessAccount, loadQuickReplies, myDisplayName, showNotification, stopTyping, user?.displayName, user?.email, user?.uid]);

  const handleSmartReplyClick = useCallback((suggestion, { sendImmediately = false } = {}) => {
    if (!suggestion?.text) {return;}
    if (sendImmediately) {
      sendSmartReplyNow(suggestion);
      return;
    }
    setMessageText(suggestion.text);
    if (messageInputRef.current) {
      messageInputRef.current.focus();
      messageInputRef.current.setSelectionRange(suggestion.text.length, suggestion.text.length);
    }
  }, [sendSmartReplyNow]);

  const pinnedCountLabel = useMemo(() => {
    const count = pinnedMessages.length;
    if (count === 0) {return '';}
    if (count === 1) {return '1 pinned message';}
    return `${count} pinned messages`;
  }, [pinnedMessages]);

  const scheduledCountLabel = useMemo(() => {
    const count = scheduledMessages.length;
    if (count === 0) {return '';}
    if (count === 1) {return '1 scheduled message';}
    return `${count} scheduled messages`;
  }, [scheduledMessages]);

  const getMessagePreview = useCallback((msg) => {
    if (!msg || msg.deleted) {return 'Message';}
    const textFields = [
      msg.decryptedText,
      msg.displayText,
      msg.text
    ].filter((value) => typeof value === 'string' && value.trim().length > 0);
    if (textFields.length > 0) {
      const preview = textFields[0].trim();
      return preview.length > 48 ? `${preview.slice(0, 45)}…` : preview;
    }
    if (msg.sticker || msg.stickerId) {return 'Sticker';}
    if (msg.image || msg.imageUrl || msg.encryptedImage) {return 'Photo';}
    if (msg.video || msg.videoUrl || msg.encryptedVideo) {return 'Video';}
    if (msg.audio || msg.audioUrl || msg.encryptedAudio) {return 'Voice message';}
    if (msg.file || msg.fileUrl) {return msg.fileName || 'File';}
    if (msg.isPoll || msg.pollId) {return 'Poll';}
    return 'Message';
  }, []);

  const highlightMessageById = useCallback((messageId) => {
    if (!messageId) {return;}
    const elementId = `message-${messageId}`;
    const target = typeof document !== 'undefined' ? document.getElementById(elementId) : null;
    if (!target) {
      showNotification('Message is not available yet. Try scrolling through the chat.', 'info');
      return;
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('pinned-message-highlight');
    const schedule = typeof window !== 'undefined' ? window.setTimeout : setTimeout;
    schedule(() => {
      target.classList.remove('pinned-message-highlight');
    }, 1600);
  }, [showNotification]);

  const formatScheduleTime = useCallback((timestamp) => {
    if (!timestamp) {return 'Pending';}
    return new Date(timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, []);

  const formatFileSize = useCallback((bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) {return '';}
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }
    const precision = size >= 10 || unitIndex === 0 ? 0 : 1;
    return `${size.toFixed(precision)} ${units[unitIndex]}`;
  }, []);

  const getAttachmentIcon = useCallback((attachment) => {
    const type = (attachment?.type || '').toLowerCase();
    if (type === 'image') {return '📷';}
    if (type === 'audio') {return '🎵';}
    if (type === 'video') {return '🎥';}
    if (type === 'sticker') {return '🗒️';}
    return '📎';
  }, []);

  const getAttachmentName = useCallback((attachment) => {
    if (attachment?.name) {return attachment.name;}
    const type = (attachment?.type || '').toLowerCase();
    if (type === 'image') {return 'Photo';}
    if (type === 'audio') {return 'Audio';}
    if (type === 'video') {return 'Video';}
    if (type === 'sticker') {return 'Sticker';}
    return 'Attachment';
  }, []);

  const getAttachmentLabel = useCallback((attachment) => {
    const name = getAttachmentName(attachment);
    const sizeLabel = formatFileSize(attachment?.size);
    return sizeLabel ? `${name} • ${sizeLabel}` : name;
  }, [formatFileSize, getAttachmentName]);

  const handleOpenScheduleModal = (targetMessage = null) => {
    if (targetMessage) {
      scheduleModeRef.current = 'reschedule';
      setScheduleMode('reschedule');
      setScheduleTargetMessage(targetMessage);
      const targetTime = targetMessage.scheduleTime || targetMessage.scheduledFor || Date.now() + 15 * 60 * 1000;
      setScheduleDraftValue(toScheduleInputValue(targetTime));
      if (typeof window !== 'undefined') {
        window.__echochatScheduleState = {
          mode: scheduleModeRef.current,
          targetId: targetMessage?.id || null
        };
      }
      setShowScheduleModal(true);
      return;
    }

    const hasText = !!messageText.trim();
    const hasAttachments = previewImages.length > 0 || selectedFiles.length > 0;

    if (!user) {
      showNotification('You need to be signed in to schedule messages.', 'error');
      return;
    }
    if (!currentChatId) {
      showNotification('Select a chat before scheduling a message.', 'info');
      return;
    }
    if (!hasText && !hasAttachments) {
      showNotification('Add text or attachments before scheduling.', 'info');
      return;
    }
    scheduleModeRef.current = 'create';
    setScheduleMode('create');
    setScheduleTargetMessage(null);
    setScheduleDraftValue(computeDefaultScheduleValue());
    if (typeof window !== 'undefined') {
      window.__echochatScheduleState = {
        mode: scheduleModeRef.current,
        targetId: null
      };
    }
    setShowScheduleModal(true);
  };

  const scheduleComposerPayload = useCallback(async (scheduledTimestamp) => {
    if (!user || !currentChatId) {
      showNotification('Please select a chat first.', 'error');
      return 0;
    }

    const baseDisplayName = myDisplayName || 'User';
    const trimmedText = messageText.trim();
    const hasText = !!trimmedText;
    const imagePreviews = Array.isArray(previewImages) ? [...previewImages] : [];
    const nonImageFiles = Array.isArray(selectedFiles)
      ? selectedFiles.filter(file => !(file?.type || '').startsWith('image/'))
      : [];

    if (!hasText && imagePreviews.length === 0 && nonImageFiles.length === 0) {
      showNotification('Add text or attachments before scheduling.', 'info');
      return 0;
    }

    let scheduledCount = 0;

    for (const preview of imagePreviews) {
      const file = preview?.file;
      if (!file) {continue;}
      const imageUrl = await firestoreService.uploadFile(currentChatId, file, 'images');
      await chatService.scheduleMessage(
        currentChatId,
        {
          text: '',
          attachments: [{
            type: 'image',
            url: imageUrl,
            name: file.name || null,
            size: file.size || null,
            contentType: file.type || null
          }],
          image: imageUrl,
          imageName: file.name || null,
          imageSize: file.size || null,
          imageType: file.type || null
        },
        scheduledTimestamp,
        user.uid,
        baseDisplayName
      );
      scheduledCount += 1;
    }

    for (const file of nonImageFiles) {
      if (!file) {continue;}
      const fileUrl = await firestoreService.uploadFile(currentChatId, file, 'files');
      await chatService.scheduleMessage(
        currentChatId,
        {
          text: '',
          attachments: [{
            type: 'file',
            url: fileUrl,
            name: file.name || null,
            size: file.size || null,
            contentType: file.type || null
          }],
          file: {
            url: fileUrl,
            name: file.name || null,
            size: file.size || null,
            type: file.type || null
          },
          fileName: file.name || null,
          fileSize: file.size || null,
          fileType: file.type || null
        },
        scheduledTimestamp,
        user.uid,
        baseDisplayName
      );
      scheduledCount += 1;
    }

    if (hasText) {
      const sanitizedText = validationService.sanitizeInput(trimmedText);
      await chatService.scheduleMessage(
        currentChatId,
        {
          text: sanitizedText,
          attachments: []
        },
        scheduledTimestamp,
        user.uid,
        baseDisplayName
      );
      scheduledCount += 1;
      setMessageText('');
      stopTyping();
    }

    setSelectedFiles([]);
    setPreviewImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    return scheduledCount;
  }, [currentChatId, fileInputRef, myDisplayName, messageText, previewImages, selectedFiles, showNotification, stopTyping, user]);

  const handleScheduleSubmit = async (scheduledTimestamp) => {
    if (!user || !currentChatId) {
      showNotification('Please select a chat first.', 'error');
      return;
    }

    try {
      setIsSchedulingMessage(true);
      console.debug('handleScheduleSubmit invoked', {
        scheduledTimestamp,
        scheduleMode: scheduleModeRef.current,
        hasTarget: !!scheduleTargetMessage
      });
      if (scheduleModeRef.current === 'reschedule' && scheduleTargetMessage) {
        await chatService.rescheduleScheduledMessage(
          currentChatId,
          scheduleTargetMessage.id,
          scheduledTimestamp
        );
        showNotification('Message rescheduled.', 'success');
      } else {
        const scheduledCount = await scheduleComposerPayload(scheduledTimestamp);
        if (scheduledCount > 0) {
          showNotification(`Scheduled ${scheduledCount} message${scheduledCount > 1 ? 's' : ''}.`, 'success');
        }
      }
      setScheduleTargetMessage(null);
      scheduleModeRef.current = 'create';
      setScheduleMode('create');
      if (typeof window !== 'undefined') {
        window.__echochatScheduleState = {
          mode: scheduleModeRef.current,
          targetId: null
        };
      }
      setShowScheduleModal(false);
    } catch (error) {
      console.error(
        'Failed to schedule message:',
        error?.message || String(error),
        error?.code || 'no-code',
        error?.stack || error
      );
      showNotification(error?.message || 'Unable to schedule message.', 'error');
    } finally {
      setIsSchedulingMessage(false);
    }
  };

  const quickScheduleOptions = useMemo(() => ([
    { id: '5m', label: 'In 5 minutes', getScheduleTime: () => Date.now() + 5 * 60 * 1000 },
    { id: '30m', label: 'In 30 minutes', getScheduleTime: () => Date.now() + 30 * 60 * 1000 },
    { id: '1h', label: 'In 1 hour', getScheduleTime: () => Date.now() + 60 * 60 * 1000 },
    { id: 'tomorrow', label: 'Tomorrow morning', getScheduleTime: () => {
      const now = new Date();
      const tomorrowMorning = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0, 0);
      return tomorrowMorning.getTime();
    } }
  ]), []);

  const handleQuickSchedule = useCallback(async (option) => {
    if (!option?.getScheduleTime) {return;}
    const scheduleTime = option.getScheduleTime();
    const scheduledCount = await scheduleComposerPayload(scheduleTime);
    if (scheduledCount > 0) {
      showNotification(`Scheduled for ${option.label.toLowerCase()}.`, 'success');
    }
  }, [scheduleComposerPayload, showNotification]);

  const handleCloseScheduleModal = () => {
    setShowScheduleModal(false);
    setScheduleTargetMessage(null);
    scheduleModeRef.current = 'create';
    setScheduleMode('create');
    if (typeof window !== 'undefined') {
      window.__echochatScheduleState = {
        mode: scheduleModeRef.current,
        targetId: null
      };
    }
  };

  const handleCancelScheduledMessage = useCallback(async (message) => {
    if (!message?.id || !currentChatId) {return;}
    try {
      await chatService.cancelScheduledMessage(currentChatId, message.id);
      showNotification('Scheduled message canceled.', 'success');
    } catch (error) {
      console.error('Failed to cancel scheduled message:', error);
      showNotification(error?.message || 'Unable to cancel scheduled message.', 'error');
    }
  }, [currentChatId, showNotification]);

  const handleSendScheduledMessageNow = useCallback(async (message) => {
    if (!message?.id || !currentChatId) {return;}
    try {
      await chatService.sendScheduledMessageNow(currentChatId, message.id);
      showNotification('Message sent.', 'success');
    } catch (error) {
      console.error('Failed to send scheduled message immediately:', error);
      showNotification(error?.message || 'Unable to send message right now.', 'error');
    }
  }, [currentChatId, showNotification]);

  const handleRescheduleScheduledMessage = useCallback((message) => {
    if (!message) {return;}
    handleOpenScheduleModal(message);
  }, [handleOpenScheduleModal]);


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
      if (isBusiness) {
        loadQuickReplies();
      } else {
        setQuickReplies([]);
      }
    }
  }, [user, loadQuickReplies]);

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

  const requestCallPermissions = async (type) => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      showNotification('Calling requires a browser that supports camera and microphone access.', 'error', 8000);
      return false;
    }

    const constraints = {
      audio: true,
      video: type === 'video' ? { facingMode: 'user' } : false
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      console.error('Call permission error:', error);
      const isIOSDevice = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
      let message;
      if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
        message = type === 'video'
          ? 'EchoDynamo needs access to your camera and microphone for video calls.'
          : 'EchoDynamo needs access to your microphone for audio calls.';
        message += isIOSDevice
          ? ' Open the Settings app → Safari → Camera & Microphone and allow access, then reload EchoDynamo.'
          : ' Please allow access in your browser address bar and try again.';
      } else if (error?.name === 'NotFoundError') {
        message = 'No camera or microphone was detected on this device.';
      } else if (error?.name === 'NotReadableError') {
        message = 'Another application is already using your camera or microphone. Close it and try again.';
      } else {
        message = 'We could not access your camera or microphone. Please check your browser permissions and try again.';
      }
      showNotification(message, 'error', 9000);
      return false;
    }
  };

  const handleStartCall = async (type) => {
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
    const receiverNameCandidates = [
      currentChat?.alias,
      currentChat?.displayName,
      currentChat?.name,
      currentChatContactName,
      otherParticipantName,
      receiverId
    ];
    const receiverName = receiverNameCandidates.find((value) => {
      if (!value) {return false;}
      const trimmed = String(value).trim();
      if (!trimmed) {return false;}
      const lower = trimmed.toLowerCase();
      return lower !== 'user' && lower !== 'contact';
    }) || 'Contact';

    const callerNameCandidates = [
      myDisplayName,
      user?.displayName,
      user?.email,
      'Me'
    ];
    const callerName = callerNameCandidates.find((value) => {
      if (!value) {return false;}
      const trimmed = String(value).trim();
      if (!trimmed) {return false;}
      const lower = trimmed.toLowerCase();
      return lower !== 'you' && lower !== 'user';
    }) || 'Me';

    const hasPermissions = await requestCallPermissions(type);
    if (!hasPermissions) {
      return;
    }

    openCallModal({
      type,
      chatId: currentChat.id,
      receiverId,
      receiverName,
      callerId: user?.uid || null,
      callerName
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
            <h2>Welcome to EchoDynamo</h2>
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
                          const API_BASE_URL = resolveApiBaseUrl();
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

        <ScheduleMessageModal
          isOpen={showScheduleModal}
          defaultValue={scheduleDraftValue}
          minTimestamp={Date.now() + 15 * 1000}
          onClose={handleCloseScheduleModal}
          onConfirm={handleScheduleSubmit}
          isSubmitting={isSchedulingMessage}
          mode={scheduleMode}
        />

        {/* Messages Container */}
        <div className="messages-container">
          {scheduledMessages.length > 0 && (
            <div className={`scheduled-messages-tray ${showScheduledTray ? 'expanded' : 'collapsed'}`}>
              <div className="scheduled-messages-header">
                <button
                  type="button"
                  className="scheduled-messages-toggle"
                  onClick={() => setShowScheduledTray(prev => !prev)}
                  aria-expanded={showScheduledTray}
                >
                  <span className="scheduled-toggle-icon">⏰</span>
                  <span className="scheduled-toggle-text">{scheduledCountLabel || 'Scheduled messages'}</span>
                  <span className="scheduled-toggle-caret">{showScheduledTray ? '▲' : '▼'}</span>
                </button>
              </div>
              {showScheduledTray && (
                <div className="scheduled-messages-list">
                  {scheduledMessages.map((msg) => {
                    const scheduledAt = msg.scheduleTime || msg.scheduledFor || null;
                    return (
                      <div key={msg.id} className="scheduled-message-item">
                        <button
                          type="button"
                          className="scheduled-message-pill"
                          onClick={() => highlightMessageById(msg.id)}
                          title={getMessagePreview(msg)}
                        >
                          <span className="pill-icon">💬</span>
                          <span className="pill-text">{getMessagePreview(msg)}</span>
                        </button>
                        {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                          <div className="scheduled-message-attachments">
                            {msg.attachments.map((attachment, index) => {
                              const sizeLabel = formatFileSize(attachment?.size);
                              return (
                                <span
                                  key={`${msg.id}-attachment-${index}`}
                                  className="scheduled-attachment-chip"
                                  title={getAttachmentLabel(attachment)}
                                >
                                  <span className="scheduled-attachment-icon">
                                    {getAttachmentIcon(attachment)}
                                  </span>
                                  <span className="scheduled-attachment-name">
                                    {getAttachmentName(attachment)}
                                  </span>
                                  {sizeLabel && (
                                    <span className="scheduled-attachment-size">
                                      {sizeLabel}
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <div className="scheduled-message-meta">
                          <span className="scheduled-time-label">
                            {scheduledAt ? `Scheduled for ${formatScheduleTime(scheduledAt)}` : 'Awaiting delivery'}
                          </span>
                        </div>
                        <div className="scheduled-message-actions">
                          <button
                            type="button"
                            className="scheduled-action send-now"
                            onClick={() => handleSendScheduledMessageNow(msg)}
                          >
                            Send now
                          </button>
                          <button
                            type="button"
                            className="scheduled-action reschedule"
                            onClick={() => handleRescheduleScheduledMessage(msg)}
                          >
                            Reschedule
                          </button>
                          <button
                            type="button"
                            className="scheduled-action cancel"
                            onClick={() => handleCancelScheduledMessage(msg)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {pinnedMessages.length > 0 && (
            <div className={`pinned-messages-tray ${showPinnedTray ? 'expanded' : 'collapsed'}`}>
              <div className="pinned-messages-header">
                <button
                  type="button"
                  className="pinned-messages-toggle"
                  onClick={() => setShowPinnedTray(prev => !prev)}
                  aria-expanded={showPinnedTray}
                >
                  <span className="pinned-toggle-icon">📌</span>
                  <span className="pinned-toggle-text">{pinnedCountLabel || 'Pinned messages'}</span>
                  <span className="pinned-toggle-caret">{showPinnedTray ? '▲' : '▼'}</span>
                </button>
              </div>
              {showPinnedTray && (
                <div className="pinned-messages-list" role="list">
                  {pinnedMessages.map((msg) => (
                    <button
                      key={msg.id}
                      type="button"
                      className="pinned-message-pill"
                      onClick={() => highlightMessageById(msg.id)}
                      title={getMessagePreview(msg)}
                      role="listitem"
                    >
                      <span className="pill-icon">📌</span>
                      <span className="pill-text">{getMessagePreview(msg)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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

        {/* Smart Reply Suggestions */}
        {smartReplySuggestions.length > 0 && !messageText.trim() && hideSmartReplies && !quickRepliesLoading && (
          <div className="smart-reply-restore">
            <button
              type="button"
              onClick={() => setHideSmartReplies(false)}
              className="smart-reply-show-btn"
            >
              Show smart replies
            </button>
          </div>
        )}

        {smartReplySuggestions.length > 0 && !messageText.trim() && !hideSmartReplies && !quickRepliesLoading && (
          <div className="smart-reply-strip" role="list">
            <div className="smart-reply-header">
              <span className="smart-reply-title">
                Suggested replies
              </span>
              <button
                type="button"
                className="smart-reply-hide"
                onClick={() => setHideSmartReplies(true)}
                aria-label="Hide smart replies"
              >
                ×
              </button>
            </div>
            <div className="smart-reply-buttons">
              {smartReplySuggestions.map((suggestion) => (
                <div key={suggestion.id} className="smart-reply-item" role="listitem">
                  <button
                    type="button"
                    className="smart-reply-btn"
                    onClick={() => handleSmartReplyClick(suggestion)}
                  >
                    {suggestion.text}
                  </button>
                  <button
                    type="button"
                    className="smart-reply-send"
                    disabled={isSendingSmartReplyId === (suggestion.id || suggestion.text)}
                    onClick={() => handleSmartReplyClick(suggestion, { sendImmediately: true })}
                    title="Send immediately"
                  >
                    {isSendingSmartReplyId === (suggestion.id || suggestion.text) ? '…' : 'Send'}
                  </button>
                </div>
              ))}
            </div>
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
              aria-label={isRecordingVoice ? 'Stop recording' : 'Record voice message'}
              aria-pressed={isRecordingVoice}
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
              type="button"
              data-state={isRecordingVoice ? 'recording' : 'idle'}
            >
              {isRecordingVoice ? <StopIcon /> : <MicIcon />}
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
            <button
              className="input-action-btn schedule-btn"
              title="Schedule message"
              onClick={() => handleOpenScheduleModal()}
              disabled={
                (
                  !messageText.trim() &&
                  selectedFiles.length === 0 &&
                  previewImages.length === 0
                ) ||
                isSchedulingMessage
              }
            >
              ⏰
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

        {(!isRecordingVoice && !isRecordingVideo) &&
          (messageText.trim() || previewImages.length > 0 || selectedFiles.length > 0) && (
          <div className="quick-schedule-strip">
            <span className="quick-schedule-label">Send later:</span>
            {quickScheduleOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className="quick-schedule-btn"
                disabled={isSchedulingMessage}
                onClick={() => handleQuickSchedule(option)}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

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
              ref={messageInputRef}
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
