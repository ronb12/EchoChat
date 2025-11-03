import React, { useState, useEffect, useRef } from 'react';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';
import { callService } from '../services/callService';

export default function CallModal({ callType = 'video', isIncoming = false, callerId = null, onEndCall }) {
  const { closeCallModal } = useUI();
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState('connecting');
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [callDuration, setCallDuration] = useState(0);

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
        case 'callEnded':
          handleEndCall();
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

    // Start or answer call
    const initCall = async () => {
      try {
        if (isIncoming) {
          // Incoming call - answer it
          // In production, receive offer from signaling server
          console.log('Answering incoming call');
        } else {
          // Outgoing call
          await callService.startCall(callType, user?.uid);
        }
      } catch (error) {
        console.error('Call error:', error);
        alert('Error starting call. Please check your camera/microphone permissions.');
        handleEndCall();
      }
    };

    initCall();

    return () => {
      unsubscribe();
      callService.endCall();
    };
  }, [callType, isIncoming, user]);

  const handleEndCall = () => {
    callService.endCall();
    if (onEndCall) {
      onEndCall();
    }
    closeCallModal();
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
          {callType === 'video' ? (
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
        </div>

        {/* Local Video (Video calls only) */}
        {callType === 'video' && (
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
          {callType === 'video' && (
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
        </div>

        {/* Call Duration */}
        {isConnected && (
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

