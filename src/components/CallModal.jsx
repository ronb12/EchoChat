import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { callService } from '../services/callService';

export default function CallModal({ callType = 'video', callSession = null, isIncoming = false, onEndCall }) {
  const { closeCallModal, showNotification } = useUI();
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [activeCallType, setActiveCallType] = useState(callType);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState('connecting');
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [callDuration, setCallDuration] = useState(0);
  const callId = callSession?.callId || callSession?.chatId || null;
  const chatId = callSession?.chatId || null;
  const receiverId = callSession?.receiverId || null;
  const receiverName = callSession?.receiverName || 'Contact';
  const callerId = callSession?.callerId || null;
  const callerName = callSession?.callerName || 'Caller';
  const offer = callSession?.offer || null;
  const displayName = isIncoming ? callerName : receiverName;
  const hasInitializedRef = useRef(false);
  const hasEndedRef = useRef(false);
  const permissionWarningShownRef = useRef(false);
  const showNotificationRef = useRef(showNotification);
  const [hasAccepted, setHasAccepted] = useState(!isIncoming);

  const buildMediaErrorMessage = (error, attemptedType) => {
    const isIOSDevice = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!error) {
      return 'We could not access your camera or microphone. Please check your browser permissions and try again.';
    }

    const isVideoAttempt = attemptedType === 'video';

    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      if (isIOSDevice) {
        return isVideoAttempt
          ? 'Camera or microphone access is blocked. On iPhone, open Settings → Safari → Camera & Microphone and allow access, then reload EchoDynamo.'
          : 'Microphone access is blocked. On iPhone, open Settings → Safari → Microphone and allow access, then reload EchoDynamo.';
      }

      return isVideoAttempt
        ? 'Camera or microphone access was denied. Please allow access in your browser address bar and try again.'
        : 'Microphone access was denied. Please allow access in your browser address bar and try again.';
    }

    if (error.name === 'NotFoundError') {
      return 'We could not find a camera or microphone on this device. Please connect one and try again.';
    }

    if (error.name === 'NotReadableError') {
      return 'Another application is already using your camera or microphone. Close it and try again.';
    }

    return 'Something went wrong while starting the call. Please check your camera and microphone permissions and try again.';
  };

  useEffect(() => {
    showNotificationRef.current = showNotification;
  }, [showNotification]);

  useEffect(() => {
    let interval;
    if (isConnected) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  useEffect(() => {
    hasInitializedRef.current = false;
    hasEndedRef.current = false;
    setActiveCallType(callType);
    setIsVideoEnabled(callType === 'video');
    permissionWarningShownRef.current = false;
    setHasAccepted(!isIncoming);
  }, [callId, isIncoming, callType]);

  useEffect(() => {
    const unsubscribe = callService.subscribeToCallEvents((event, data) => {
      switch (event) {
        case 'localStream':
          if (localVideoRef.current && data) {
            localVideoRef.current.srcObject = data;
          }
          break;
        case 'remoteStream':
          if (remoteVideoRef.current && data) {
            remoteVideoRef.current.srcObject = data;
            setIsConnected(true);
            setConnectionState('connected');
          }
          break;
        case 'connectionState':
          setConnectionState(data);
          if (data === 'connected') {
            setIsConnected(true);
          }
          break;
        case 'iceConnectionState':
          if (data === 'failed') {
            showNotificationRef.current?.('We could not establish a stable media connection. Please try again or switch networks.', 'error', 7000);
          } else if (data === 'disconnected') {
            showNotificationRef.current?.('Call connection lost. Attempting to reconnect...', 'warning', 5000);
          }
          break;
        case 'callTypeChanged':
          if (typeof data === 'string') {
            setActiveCallType(data);
            if (data !== 'video') {
              setIsVideoEnabled(false);
            }
          }
          break;
        case 'callError':
          if (data?.message) {
            showNotificationRef.current?.(data.message, 'error', 9000);
          }
          break;
        case 'mediaPermissionWarning':
          if (!permissionWarningShownRef.current) {
            const resolvedType = data?.resolvedType;
            const originalType = data?.originalType;
            const message = resolvedType === 'audio' && originalType === 'video'
              ? 'We could only access your microphone. The call will continue without video. Please enable camera access in your browser settings if you want to share video.'
              : 'We were unable to access your camera or microphone. Please review your browser permissions.';
            showNotificationRef.current?.(message, 'warning', 8000);
            permissionWarningShownRef.current = true;
          }
          break;
        case 'callEnded':
          handleEndCall({ triggerSource: 'listener', skipServiceCall: true });
          break;
        case 'videoToggled':
          setIsVideoEnabled(data);
          break;
        case 'audioToggled':
          setIsAudioEnabled(data);
          break;
        default:
          break;
      }
    });

    const initCall = async () => {
      if (!user?.uid || hasInitializedRef.current) {
        return;
      }

      if (isIncoming && !hasAccepted) {
        return;
      }

      try {
        if (isIncoming) {
          if (!offer || !callId) {
            console.warn('Incoming call missing offer or call ID');
            return;
          }
          await callService.answerCall({
            offer,
            callType,
            callId,
            chatId,
            callerId,
            callerName,
            receiverId: user.uid,
            receiverName: user.displayName || user.email || 'You'
          });
        } else {
          if (!receiverId || !chatId) {
            alert('Unable to start call. Missing participant information.');
            handleEndCall();
            return;
          }
          await callService.startCall({
            callType,
            callerId: user.uid,
            callerName: user.displayName || user.email || 'You',
            receiverId,
            receiverName,
            chatId,
            callId
          });
        }
        hasInitializedRef.current = true;
      } catch (error) {
        console.error('Call error:', error);
        const friendlyMessage = buildMediaErrorMessage(error, callType);
        showNotificationRef.current?.(friendlyMessage, 'error', 9000);
        handleEndCall({ skipServiceCall: true });
      }
    };

    initCall();

    return () => {
      unsubscribe();
      if (!hasEndedRef.current) {
        callService.endCall();
      }
    };
  }, [callType, isIncoming, hasAccepted, user, callId, chatId, receiverId, receiverName, callerId, callerName, offer]);

  const handleEndCall = ({ triggerSource = 'manual', skipServiceCall = false } = {}) => {
    if (hasEndedRef.current) {
      if (triggerSource === 'listener') {
        closeCallModal();
      }
      return;
    }
    hasEndedRef.current = true;
    if (!skipServiceCall) {
      callService.endCall();
    }
    if (onEndCall) {
      onEndCall();
    }
    closeCallModal();
  };

  const acceptCall = () => {
    setHasAccepted(true);
  };

  const declineCall = () => {
    handleEndCall();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="modal active" id="call-modal" style={{ zIndex: 10000 }}>
      <div className="call-container" style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10000
      }}>
        {/* Remote Video */}
        <div className="remote-video" style={{ flex: 1, position: 'relative' }}>
          {activeCallType === 'video' ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontSize: '4rem',
              color: '#fff'
            }}>
              🎤
            </div>
          )}
          {!isConnected && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#fff',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📞</div>
              <div>{connectionState === 'connecting' ? 'Connecting...' : 'Calling...'}</div>
            </div>
          )}
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            color: '#fff',
            fontSize: '1.1rem',
            fontWeight: '600',
            textShadow: '0 2px 6px rgba(0,0,0,0.5)'
          }}>
            {displayName}
          </div>
        </div>

        {/* Local Video (Video calls only) */}
        {activeCallType === 'video' && (
          <div className="local-video" style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: '150px',
            height: '200px',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '2px solid #fff',
            background: '#000'
          }}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Call Controls */}
        <div className="call-controls" style={{
          position: 'absolute',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center'
        }}>
          {isIncoming && !hasAccepted ? (
            <>
              <button
                className="call-control-btn"
                onClick={declineCall}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(255,0,0,0.85)',
                  color: '#fff',
                  fontSize: '1.5rem',
                  cursor: 'pointer'
                }}
              >
                ❌
              </button>
              <button
                className="call-control-btn"
                onClick={acceptCall}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(48,209,88,0.9)',
                  color: '#fff',
                  fontSize: '1.5rem',
                  cursor: 'pointer'
                }}
              >
                ✅
              </button>
            </>
          ) : (
            <>
              {activeCallType === 'video' && (
                <button
                  className="call-control-btn"
                  onClick={() => {
                    callService.toggleVideo();
                  }}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    border: 'none',
                    background: isVideoEnabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,0,0,0.8)',
                    color: '#fff',
                    fontSize: '1.5rem',
                    cursor: 'pointer'
                  }}
                >
                  {isVideoEnabled ? '📹' : '📵'}
                </button>
              )}
              <button
                className="call-control-btn"
                onClick={() => {
                  callService.toggleAudio();
                }}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: 'none',
                  background: isAudioEnabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,0,0,0.8)',
                  color: '#fff',
                  fontSize: '1.5rem',
                  cursor: 'pointer'
                }}
              >
                {isAudioEnabled ? '🎤' : '🔇'}
              </button>
              <button
                className="call-control-btn end-call"
                onClick={handleEndCall}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(255,0,0,0.9)',
                  color: '#fff',
                  fontSize: '1.5rem',
                  cursor: 'pointer'
                }}
              >
                📞
              </button>
            </>
          )}
        </div>

        {/* Call Duration */}
        {isConnected && hasAccepted && (
          <div style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#fff',
            fontSize: '1.25rem',
            fontWeight: 'bold'
          }}>
            {formatTime(callDuration)}
          </div>
        )}
      </div>
    </div>
  );
}

CallModal.propTypes = {
  callType: PropTypes.oneOf(['video', 'audio']),
  callSession: PropTypes.shape({
    callId: PropTypes.string,
    chatId: PropTypes.string,
    callerId: PropTypes.string,
    callerName: PropTypes.string,
    receiverId: PropTypes.string,
    receiverName: PropTypes.string,
    offer: PropTypes.object,
    callType: PropTypes.oneOf(['video', 'audio'])
  }),
  isIncoming: PropTypes.bool,
  onEndCall: PropTypes.func
};

