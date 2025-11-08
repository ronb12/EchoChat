import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUI } from '../hooks/useUI';
import { chatService } from '../services/chatService';
import { useDisplayName } from '../hooks/useDisplayName';
import { useWindowFocus } from '../hooks/useWindowFocus';
import { groupPollsService } from '../services/groupPollsService';

const COMMON_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function MessageBubble({ message, isOwn = false, chatId = 'demo', participants = [] }) {
  const { user } = useAuth();
  const { openBlockUserModal, openForwardModal, showNotification } = useUI();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message?.text || '');
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [decryptedText, setDecryptedText] = useState(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [pollData, setPollData] = useState(null);
  const [pollLoading, setPollLoading] = useState(false);
  const [pollError, setPollError] = useState('');
  const [isVoting, setIsVoting] = useState(false);
  const contextMenuRef = useRef(null);
  const editInputRef = useRef(null);
  const messageRef = useRef(null);
  const hasMarkedReadRef = useRef(false);
  const isIntersectingRef = useRef(false);
  const windowFocused = useWindowFocus();

  useEffect(() => {
    hasMarkedReadRef.current = false;
    isIntersectingRef.current = false;
  }, [message?.id]);
  const senderId = message?.senderId || null;
  const fallbackSenderName = message?.senderName || 'User';
  const senderDisplayName = useDisplayName(senderId, fallbackSenderName);
  const currentUserId = user?.uid || null;
  const userOptionIds = useMemo(() => {
    if (!pollData || !currentUserId || !Array.isArray(pollData.options)) {
      return new Set();
    }
    const ids = pollData.options
      .filter((opt) => Array.isArray(opt.votes) && opt.votes.includes(currentUserId))
      .map(opt => opt.id);
    return new Set(ids);
  }, [pollData, currentUserId]);

  const userHasVoted = useMemo(() => {
    if (!pollData || !currentUserId) {return false;}
    return pollData.voters?.includes(currentUserId) || userOptionIds.size > 0;
  }, [pollData, currentUserId, userOptionIds]);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  const handleVote = async (optionId) => {
    if (!pollData || !pollData.id) {
      showNotification('Poll data not available.', 'error');
      return;
    }
    if (!currentUserId) {
      showNotification('You must be signed in to vote.', 'error');
      return;
    }
    if (!pollData.isActive) {
      showNotification('This poll is closed.', 'info');
      return;
    }
    if (pollData.settings?.expiresAt && pollData.settings.expiresAt < Date.now()) {
      showNotification('This poll has expired.', 'info');
      return;
    }

    const hasOptionVote = userOptionIds.has(optionId);
    const allowMultiple = !!pollData.settings?.allowMultipleChoices;

    if (!allowMultiple && userHasVoted && !hasOptionVote) {
      showNotification('You have already voted on this poll.', 'info');
      return;
    }

    setIsVoting(true);
    try {
      await groupPollsService.votePoll(
        pollData.id,
        optionId,
        currentUserId,
        user?.displayName || user?.email || 'You',
        allowMultiple ? !hasOptionVote : true
      );
      if (hasOptionVote && !allowMultiple) {
        // Single choice polls do not support un-voting in current service
        showNotification('Vote recorded.', 'success');
      }
    } catch (error) {
      console.error('Error voting on poll:', error);
      showNotification(error?.message || 'Unable to submit vote.', 'error');
    } finally {
      setIsVoting(false);
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setShowContextMenu(false);
        setShowReactions(false);
        setShowDeleteMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Decrypt encrypted messages when component mounts or message changes
  useEffect(() => {
    const decryptMessage = async () => {
      // If already decrypted, use it
      if (decryptedText) {
        return;
      }

      if (message && message.isEncrypted && message.encryptedText && !isDecrypting) {
        setIsDecrypting(true);
        try {
          const decrypted = await chatService.decryptMessage(message, user?.uid, chatId);
          setDecryptedText(decrypted || '[Unable to decrypt message]');
        } catch (error) {
          console.error('Error decrypting message:', error);
          setDecryptedText('[Unable to decrypt message]');
        } finally {
          setIsDecrypting(false);
        }
      } else if (message && !message.isEncrypted && message.text) {
        // Plain text message
        setDecryptedText(message.text);
      } else if (message?.decryptedText) {
        // Already decrypted
        setDecryptedText(message.decryptedText);
      } else if (message?.text) {
        // Fallback: use text if available
        setDecryptedText(message.text);
      }
    };

    decryptMessage();
  }, [message, user, chatId]);

  useEffect(() => {
    if (!message?.isPoll || !message?.pollId) {
      setPollData(null);
      setPollError('');
      setPollLoading(false);
      return;
    }

    setPollLoading(true);
    const unsubscribe = groupPollsService.subscribeToPoll(
      message.pollId,
      (poll) => {
        setPollData(poll);
        setPollLoading(false);
        setPollError('');
      },
      (error) => {
        setPollError(error?.message || 'Unable to load poll.');
        setPollLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [message?.pollId, message?.isPoll]);

  const attemptMarkAsRead = useCallback(() => {
    if (!currentUserId) {return;}
    const alreadyRead = message?.reads && message.reads[currentUserId];
    if (hasMarkedReadRef.current) {return;}
    if (!isIntersectingRef.current) {return;}
    if (!windowFocused) {return;}
    if (isOwn || message?.senderId === currentUserId || alreadyRead || !chatId || !message?.id) {return;}

    hasMarkedReadRef.current = true;
    chatService.markMessageAsRead(chatId, message.id, currentUserId).catch(() => {
      hasMarkedReadRef.current = false;
    });
  }, [chatId, isOwn, message?.id, message?.reads, message?.senderId, currentUserId, windowFocused]);

  useEffect(() => {
    const node = messageRef.current;
    if (!node || isOwn || message?.senderId === currentUserId || !currentUserId || !chatId || !message?.id) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target !== node) {return;}
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          isIntersectingRef.current = true;
          attemptMarkAsRead();
        } else if (!entry.isIntersecting) {
          isIntersectingRef.current = false;
        }
      });
    }, {
      threshold: [0.6, 0.8, 1]
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
      isIntersectingRef.current = false;
    };
  }, [attemptMarkAsRead, isOwn, message?.readAt, chatId, user?.uid, message?.id]);

  useEffect(() => {
    attemptMarkAsRead();
  }, [attemptMarkAsRead, windowFocused]);

  if (!message) {return null;}

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) {return '';}
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (messageDate.getTime() === today.getTime() - 86400000) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
             ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const timestamp = formatTimestamp(message.timestamp);
  const messageClass = `message ${isOwn ? 'sent' : 'received'} ${message.deleted ? 'deleted' : ''}`;
  const displaySticker = message.decryptedSticker || message.sticker;
  const displayImage = message.decryptedImage || message.image;
  const displayAudio = message.decryptedAudio || message.audio;
  const displayVideo = message.decryptedVideo || message.video;
  const videoDurationLabel = (() => {
    const rawDuration = Number.isFinite(message.videoDuration)
      ? Math.max(0, Math.round(message.videoDuration))
      : null;
    if (rawDuration === null) {return null;}
    const minutes = Math.floor(rawDuration / 60);
    const seconds = rawDuration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  })();
  const displayText = decryptedText || message.text || (message.encryptedText ? '[Encrypted message]' : '');
  const audioDurationLabel = (() => {
    const rawDuration = Number.isFinite(message.audioDuration)
      ? Math.max(0, Math.round(message.audioDuration))
      : null;
    if (rawDuration === null) {return null;}
    const minutes = Math.floor(rawDuration / 60);
    const seconds = rawDuration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  })();

  const renderPollCard = () => {
    if (!message.isPoll) {
      return null;
    }
    if (pollLoading) {
      return (
        <div className="poll-card loading">
          <span>Loading poll…</span>
        </div>
      );
    }
    if (pollError) {
      return (
        <div className="poll-card error">
          <span>{pollError}</span>
        </div>
      );
    }
    if (!pollData) {
      return (
        <div className="poll-card error">
          <span>Poll unavailable.</span>
        </div>
      );
    }

    const totalVotes = pollData.totalVotes || 0;
    const allowMultiple = !!pollData.settings?.allowMultipleChoices;
    const pollExpired = pollData.settings?.expiresAt && pollData.settings.expiresAt < Date.now();
    const pollClosed = pollExpired || !pollData.isActive;

    return (
      <div className={`poll-card ${pollClosed ? 'poll-closed' : ''}`}>
        <div className="poll-question">
          <span role="img" aria-hidden="true">📊</span> {pollData.question}
        </div>
        <div className="poll-options">
          {pollData.options.map((option) => {
            const voteCount = option.voteCount || 0;
            const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const hasVotedOption = userOptionIds.has(option.id);
            const disableVote = pollClosed || isVoting || (!allowMultiple && userHasVoted && !hasVotedOption);
            const showPercent = totalVotes > 0;

            return (
              <button
                key={option.id}
                type="button"
                className={`poll-option ${hasVotedOption ? 'selected' : ''}`}
                onClick={() => handleVote(option.id)}
                disabled={disableVote}
              >
                <div className="poll-option-main">
                  <span className="poll-option-text">{option.text}</span>
                  <span className="poll-option-votes">
                    {showPercent ? `${percent}% · ${voteCount} vote${voteCount === 1 ? '' : 's'}` : '0 votes'}
                  </span>
                </div>
                <div className="poll-option-bar">
                  <div className="poll-option-bar-fill" style={{ width: `${showPercent ? percent : 0}%` }} />
                </div>
              </button>
            );
          })}
        </div>
        <div className="poll-meta">
          <span>{totalVotes} vote{totalVotes === 1 ? '' : 's'}</span>
          {allowMultiple && <span>• Multiple choices allowed</span>}
          {pollData.settings?.anonymous && <span>• Anonymous</span>}
          {pollClosed && <span>• Closed</span>}
        </div>
      </div>
    );
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setShowContextMenu(true);
  };

  const handleCopy = () => {
    const textToCopy = displayText;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setShowContextMenu(false);
    }
  };

  const handleReaction = (emoji) => {
    if (!user) {return;}
    const hasReaction = message.reactions?.[emoji]?.includes(user.uid);
    if (hasReaction) {
      chatService.removeReaction(chatId, message.id, emoji, user.uid);
    } else {
      chatService.addReaction(chatId, message.id, emoji, user.uid);
    }
    setShowReactions(false);
    setShowContextMenu(false);
  };

  const handleEdit = () => {
    if (isOwn && message.senderId === user?.uid && !message.deleted) {
      setIsEditing(true);
      setEditText(decryptedText || message.text || '');
      setShowContextMenu(false);
    }
  };

  const handleSaveEdit = () => {
    const currentText = decryptedText || message.text || '';
    if (editText.trim() && editText !== currentText) {
      chatService.editMessage(chatId, message.id, editText.trim(), user.uid);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(decryptedText || message.text || '');
  };

  const handleDelete = (forEveryone = false) => {
    if (isOwn && message.senderId === user?.uid) {
      chatService.deleteMessage(chatId, message.id, user.uid, forEveryone);
    }
    setShowDeleteMenu(false);
    setShowContextMenu(false);
  };

  const handleForward = () => {
    setShowContextMenu(false);
    if (!message) {
      showNotification('Unable to forward this message.', 'error');
      return;
    }
    openForwardModal({
      message,
      fromChatId: chatId
    });
  };

  const handlePin = () => {
    if (!chatId || !message?.id) {
      showNotification('Unable to pin this message.', 'error');
      setShowContextMenu(false);
      return;
    }
    if (!user?.uid) {
      showNotification('You must be signed in to pin messages.', 'error');
      setShowContextMenu(false);
      return;
    }
    if (message.pinned) {
      chatService.unpinMessage(chatId, message.id)
        .catch((error) => {
          console.error('Error unpinning message:', error);
          showNotification(error?.message || 'Failed to unpin message.', 'error');
        });
    } else {
      chatService.pinMessage(chatId, message.id, user.uid)
        .catch((error) => {
          console.error('Error pinning message:', error);
          showNotification(error?.message || 'Failed to pin message.', 'error');
        });
    }
    setShowContextMenu(false);
  };

  const handleDisappearing = () => {
    if (isOwn && message.senderId === user?.uid && !message.deleted) {
      chatService.setDisappearingTimer(chatId, message.id, 5);
      setShowContextMenu(false);
    }
  };

  // Read receipt status
  const getReadStatus = () => {
    if (!isOwn) {return null;}
    if (message.readAt) {return '✓✓';} // Read (double check)
    if (message.deliveredAt) {return '✓';} // Delivered (single check)
    return '';
  };

  return (
    <div
      className={messageClass}
      onContextMenu={handleContextMenu}
      onDoubleClick={() => !isOwn && setShowReactions(true)}
      ref={messageRef}
    >
      {/* Context Menu */}
      {showContextMenu && (
        <div className="message-context-menu" ref={contextMenuRef}>
          {isOwn && !message.deleted && (
            <>
              <button onClick={handleEdit} className="context-menu-item">
                ✏️ Edit
              </button>
              <button onClick={() => setShowDeleteMenu(true)} className="context-menu-item">
                🗑️ Delete
              </button>
            </>
          )}
          <button onClick={handleCopy} className="context-menu-item">
            📋 Copy
          </button>
          <button onClick={() => handleForward()} className="context-menu-item">
            ➡️ Forward
          </button>
          <button onClick={() => handlePin()} className="context-menu-item">
            📌 {message.pinned ? 'Unpin' : 'Pin'}
          </button>
          {isOwn && (
            <button onClick={handleDisappearing} className="context-menu-item">
              ⏱️ Disappear (5s)
            </button>
          )}
          <button onClick={() => setShowReactions(true)} className="context-menu-item">
            😀 React
          </button>
          {!isOwn && (
            <button onClick={() => {
              openBlockUserModal(message.senderId, senderDisplayName);
              setShowContextMenu(false);
            }} className="context-menu-item">
              🚫 Block/Report
            </button>
          )}
        </div>
      )}

      {/* Delete Menu */}
      {showDeleteMenu && (
        <div className="message-context-menu" ref={contextMenuRef}>
          <button onClick={() => handleDelete(false)} className="context-menu-item">
            Delete for me
          </button>
          <button onClick={() => handleDelete(true)} className="context-menu-item">
            Delete for everyone
          </button>
          <button onClick={() => setShowDeleteMenu(false)} className="context-menu-item">
            Cancel
          </button>
        </div>
      )}

      {/* Reactions Picker */}
      {showReactions && (
        <div className="reactions-picker" ref={contextMenuRef}>
          {COMMON_REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className={`reaction-btn ${message.reactions?.[emoji]?.includes(user?.uid) ? 'active' : ''}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {message.pinned && (
        <div className="message-pinned-indicator">
          📌 Pinned
        </div>
      )}
      {message.forwarded && (
        <div className="message-forwarded-indicator">
          ➡️ Forwarded{message.originalSenderName ? ` from ${message.originalSenderName}` : ''}
        </div>
      )}
      <div className="message-content">
        {message.deleted ? (
          <div className="message-text deleted-text">
            {message.deletedForEveryone ? 'This message was deleted' : 'You deleted this message'}
          </div>
        ) : isEditing && isOwn ? (
          <div className="message-edit-input">
            <input
              ref={editInputRef}
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {handleSaveEdit();}
                if (e.key === 'Escape') {handleCancelEdit();}
              }}
              onBlur={handleSaveEdit}
            />
          </div>
        ) : (
          <>
            {renderPollCard()}
            {/* Show sticker first if it exists */}
            {displaySticker && (
              <div className="message-sticker" style={{
                fontSize: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px',
                background: 'transparent',
                minHeight: '80px'
              }}>
                {displaySticker}
              </div>
            )}
            {/* Show text if it exists */}
            {(displayText || message.encryptedText) && !message.isPoll && (
              <div className="message-text">
                {isDecrypting ? (
                  <span style={{ opacity: 0.6 }}>Decrypting...</span>
                ) : (
                  <>
                    {displayText}
                    {message.edited && (
                      <span className="edited-indicator" title={`Edited at ${formatTimestamp(message.editedAt)}`}>
                        (edited)
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
            {displayImage && (
              <div className="message-media">
                <img src={displayImage} alt="Shared" className="message-image" />
              </div>
            )}
            {displayAudio && (
              <div className="message-audio">
                <audio
                  controls
                  preload="metadata"
                  src={displayAudio}
                  style={{ width: '100%' }}
                >
                  Your browser does not support the audio element.
                </audio>
                {audioDurationLabel && (
                  <span className="audio-duration">{audioDurationLabel}</span>
                )}
              </div>
            )}
            {displayVideo && (
              <div className="message-video">
                <video
                  controls
                  preload="metadata"
                  src={displayVideo}
                  style={{ width: '100%', maxHeight: '320px' }}
                >
                  Your browser does not support the video element.
                </video>
                {videoDurationLabel && (
                  <span className="video-duration">{videoDurationLabel}</span>
                )}
              </div>
            )}
            {message.file && (
              <div className="message-file">
                <div className="message-file-fallback">
                  <span>📎</span>
                  <span>{message.file.name || 'File'}</span>
                  {message.file.size && (
                    <span className="file-size">
                      {(message.file.size / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reactions Display */}
      {message.reactions && Object.keys(message.reactions).length > 0 && (
        <div className="message-reactions">
          {Object.entries(message.reactions).map(([emoji, userIds]) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className={`reaction-badge ${userIds.includes(user?.uid) ? 'own-reaction' : ''}`}
              title={`${userIds.length} reaction${userIds.length > 1 ? 's' : ''}`}
            >
              {emoji} {userIds.length > 1 ? userIds.length : ''}
            </button>
          ))}
        </div>
      )}

      <div className="message-meta">
        {!isOwn && senderDisplayName && (
          <span className="message-sender">{senderDisplayName}</span>
        )}
        <span className="message-time" title={message.timestamp ? new Date(message.timestamp).toLocaleString() : ''}>
          {timestamp}
        </span>
        {isOwn && (
          <span className="message-status" title={message.readAt ? 'Read' : message.deliveredAt ? 'Delivered' : 'Sending'}>
            {getReadStatus()}
          </span>
        )}
      </div>
      {isOwn && (
        <ReadReceipts
          message={message}
          currentUserId={currentUserId}
          participants={participants}
        />
      )}
    </div>
  );
}

function ReadReceipts({ message, currentUserId, participants = [] }) {
  const allowedReaders = useMemo(() => {
    if (!Array.isArray(participants) || participants.length === 0) {
      return null;
    }
    const set = new Set(participants.filter(Boolean));
    if (message?.senderId) {
      set.delete(message.senderId);
    }
    if (currentUserId) {
      set.delete(currentUserId);
    }
    return set;
  }, [participants, message?.senderId, currentUserId]);

  const readerEntries = useMemo(() => {
    if (!message?.reads) {return [];}
    return Object.entries(message.reads)
      .filter(([uid]) => {
        if (!uid) {return false;}
        if (uid === currentUserId || uid === message?.senderId) {
          return false;
        }
        if (allowedReaders) {
          return allowedReaders.has(uid);
        }
        return true;
      })
      .map(([uid, readAt]) => ({
        uid,
        readAt: typeof readAt === 'number' && Number.isFinite(readAt)
          ? readAt
          : Date.now()
      }))
      .sort((a, b) => (a.readAt || 0) - (b.readAt || 0));
  }, [message?.reads, message?.senderId, currentUserId]);

  if (readerEntries.length === 0) {
    return null;
  }

  const displayed = readerEntries.slice(0, 2);
  const remaining = readerEntries.length - displayed.length;

  return (
    <div className="message-read-receipts" title={`Read by ${readerEntries.length} participant${readerEntries.length > 1 ? 's' : ''}`}>
      <span className="message-read-icon" aria-hidden="true">✓✓</span>
      <span className="message-read-text">
        Read by{' '}
        {displayed.map((entry, index) => (
          <React.Fragment key={entry.uid}>
            {index > 0 ? ', ' : ''}
            <ReadReceiptName userId={entry.uid} />
          </React.Fragment>
        ))}
        {remaining > 0 && ` +${remaining}`}
      </span>
    </div>
  );
}

function ReadReceiptName({ userId }) {
  const displayName = useDisplayName(userId, 'Someone');
  return <span className="message-read-name">{displayName}</span>;
}
