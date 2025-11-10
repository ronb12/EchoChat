// WebRTC Call Service for Video/Voice Calls with Screen Sharing
import { callSignalingService } from './callSignalingService';
import { callHistoryService } from './callHistoryService';

class CallService {
  constructor() {
    this.localStream = null;
    this.remoteStream = null;
    this.screenStream = null; // Screen sharing stream
    this.peerConnection = null;
    this.isCallActive = false;
    this.callType = null; // 'video' or 'audio'
    this.isScreenSharing = false;
    this.callListeners = new Set();
    this.currentCallId = null;
    this.currentChatId = null;
    this.currentCallerId = null;
    this.currentReceiverId = null;
    this.answerListener = null;
    this.candidateListener = null;
    this.callDocListener = null;
    this.localRole = null; // 'caller' or 'callee'
    this.receivedCandidateKeys = new Set();
    this.ringtoneAudio = null;
    this.answerToneAudio = null;
    this.remoteAudioElement = null;
    this.audioContext = null;
    this.remoteGainNode = null;
    this.remoteAudioSource = null;
    this.ringtoneOscillator = null;
    this.answerOscillator = null;
    this.ringIntervalId = null;
    this.ringtoneGainNode = null;
    this.callHistoryDocId = null;
    this.callStartTime = null;
    this.callHistoryStatus = 'completed';
  }

  setCallHistoryStatus(status) {
    if (!status) {return;}
    this.callHistoryStatus = status;
  }

  isRecoverableMediaError(error) {
    if (!error) {return false;}
    const name = (error.name || '').toLowerCase();
    const message = (error.message || '').toLowerCase();
    const recoverableNames = [
      'notallowederror',
      'permissiondeniederror',
      'notfounderror',
      'overconstrainederror',
      'notreadableerror',
      'aborterror',
      'securityerror',
      'constraintserror'
    ];
    if (recoverableNames.includes(name)) {
      return true;
    }
    return message.includes('permission') ||
      message.includes('denied') ||
      message.includes('not allowed') ||
      message.includes('hardware access');
  }

  async acquireLocalMedia(callType) {
    const wantsVideo = callType === 'video';
    const constraints = {
      audio: true,
      video: wantsVideo ? { facingMode: 'user' } : false
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return {
        stream,
        effectiveType: wantsVideo ? 'video' : 'audio',
        permissionIssue: null
      };
    } catch (error) {
      if (wantsVideo && this.isRecoverableMediaError(error)) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          return {
            stream: audioStream,
            effectiveType: 'audio',
            permissionIssue: error
          };
        } catch (audioError) {
          throw audioError;
        }
      }
      throw error;
    }
  }

  // Initialize peer connection
  async initializePeerConnection({ callId = null, role = null } = {}) {
    const baseIceServers = [
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
          'stun:stun3.l.google.com:19302'
        ]
      }
    ];

    const envTurnUrlsRaw = (import.meta?.env?.VITE_TURN_URLS || '').split(',')
      .map(url => url.trim())
      .filter(Boolean);
    const envTurnUsername = import.meta?.env?.VITE_TURN_USERNAME;
    const envTurnCredential = import.meta?.env?.VITE_TURN_CREDENTIAL;

    if (envTurnUrlsRaw.length > 0) {
      baseIceServers.push({
        urls: envTurnUrlsRaw,
        ...(envTurnUsername ? { username: envTurnUsername } : {}),
        ...(envTurnCredential ? { credential: envTurnCredential } : {})
      });
    } else {
      baseIceServers.push({
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp'
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject'
      });
    }

    const configuration = {
      iceServers: baseIceServers,
      bundlePolicy: 'balanced'
    };

    this.peerConnection = new RTCPeerConnection(configuration);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      if (!this.remoteAudioElement) {
        this.remoteAudioElement = document.createElement('audio');
        this.remoteAudioElement.autoplay = true;
        this.remoteAudioElement.playsInline = true;
        this.remoteAudioElement.style.display = 'none';
        document.body.appendChild(this.remoteAudioElement);
      }

      if (!this.audioContext && (window.AudioContext || window.webkitAudioContext)) {
        try {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          this.audioContext = new AudioContextClass();
          this.remoteGainNode = this.audioContext.createGain();
          this.remoteGainNode.connect(this.audioContext.destination);
        } catch (error) {
          console.warn('Failed to initialize AudioContext:', error?.message || error);
        }
      }
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.notifyCallListeners('remoteStream', this.remoteStream);
      if (this.remoteAudioElement) {
        this.remoteAudioElement.srcObject = this.remoteStream;
        this.remoteAudioElement.play().catch((error) => {
          console.warn('Unable to autoplay remote audio:', error?.message || error);
        });
      }
      if (this.audioContext && this.remoteGainNode && this.remoteStream) {
        try {
          if (this.remoteAudioSource) {
            this.remoteAudioSource.disconnect();
          }
          this.remoteAudioSource = this.audioContext.createMediaStreamSource(this.remoteStream);
          this.remoteAudioSource.connect(this.remoteGainNode);
          if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {});
          }
        } catch (error) {
          console.warn('Failed to route remote audio through AudioContext:', error?.message || error);
        }
      }
      this.stopRingtone();
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.notifyCallListeners('iceCandidate', event.candidate);
        if (callId && role) {
          callSignalingService.addIceCandidate(callId, event.candidate.toJSON(), role).catch((error) => {
            console.error('Error adding ICE candidate to signaling channel:', error);
          });
        }
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      this.notifyCallListeners('connectionState', this.peerConnection.connectionState);
      if (this.peerConnection.connectionState === 'disconnected' ||
          this.peerConnection.connectionState === 'failed') {
        this.endCall();
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection.iceConnectionState;
      this.notifyCallListeners('iceConnectionState', state);
      if (state === 'failed') {
        this.notifyCallListeners('callError', {
          message: 'We could not establish a stable media connection. This can happen when network firewalls block peer-to-peer traffic. Try again, switch networks, or ensure TURN access is available.'
        });
      }
    };
  }

  // Start a call (video or audio)
  async startCall({
    callType = 'video',
    callerId,
    callerName = null,
    receiverId,
    receiverName = null,
    chatId,
    callId: explicitCallId = null
  } = {}) {
    try {
      if (!callerId || !receiverId || !chatId) {
        throw new Error('Caller ID, receiver ID, and chat ID are required to start a call');
      }

      const callId = explicitCallId || chatId;

      this.callType = callType;
      this.isCallActive = true;
      this.localRole = 'caller';
      this.currentCallId = callId;
      this.currentChatId = chatId;
      this.currentCallerId = callerId;
      this.currentReceiverId = receiverId;
      this.receivedCandidateKeys.clear();
      this.callHistoryStatus = 'completed';
      this.callStartTime = null;
      this.callHistoryDocId = null;
      this.callHistoryStatus = 'completed';
      this.callStartTime = Date.now();
      this.callHistoryDocId = null;

      const mediaResult = await this.acquireLocalMedia(callType);
      this.localStream = mediaResult.stream;
      this.callType = mediaResult.effectiveType;
      this.notifyCallListeners('localStream', this.localStream);
      if (mediaResult.permissionIssue) {
        this.notifyCallListeners('mediaPermissionWarning', {
          originalType: callType,
          resolvedType: mediaResult.effectiveType,
          error: mediaResult.permissionIssue
        });
      }
      if (this.callType !== callType) {
        this.notifyCallListeners('callTypeChanged', this.callType);
      }
      if (mediaResult.permissionIssue) {
        if (callId) {
          await callSignalingService.updateCallSession(callId, {
            callType: this.callType,
            permissionWarning: {
              name: mediaResult.permissionIssue?.name || 'PermissionError',
              message: mediaResult.permissionIssue?.message || 'Media permission denied'
            }
          });
        }
      }

      const historyDocRef = await callHistoryService.logCallStart({
        callId,
        chatId,
        callerId,
        receiverId,
        callType: this.callType
      });
      this.callHistoryDocId = historyDocRef?.id || null;

      await this.initializePeerConnection({ callId, role: this.localRole });

      // Create offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      this.startRingtone();

      const offerPayload = {
        type: offer.type,
        sdp: offer.sdp
      };

      await callSignalingService.createOffer(callId, {
        chatId,
        callType: this.callType,
        historyDocId: this.callHistoryDocId,
        callerId,
        callerName,
        receiverId,
        receiverName,
        offer: offerPayload
      });

      this.callDocListener = callSignalingService.listenToCall(callId, async (callData) => {
        if (!callData) {return;}

        if (callData.historyDocId && !this.callHistoryDocId) {
          this.callHistoryDocId = callData.historyDocId;
        }

        if (callData.status === 'ended') {
          if (!callData.answer) {
            this.setCallHistoryStatus('missed');
          } else {
            this.setCallHistoryStatus('remote-ended');
          }
          this.endCall();
          return;
        }

        if (callData.callType && callData.callType !== this.callType) {
          this.callType = callData.callType;
          this.notifyCallListeners('callTypeChanged', this.callType);
        }

        if (callData.answer && this.peerConnection) {
          this.stopRingtone();
          if (!this.callStartTime) {
            this.callStartTime = Date.now();
          }
          if (this.peerConnection.signalingState === 'have-local-offer' || this.peerConnection.signalingState === 'stable') {
            try {
              await this.peerConnection.setRemoteDescription(new RTCSessionDescription(callData.answer));
            } catch (error) {
              console.error('Error setting remote description (answer):', error);
            }
          }
        }
      });

      this.candidateListener = callSignalingService.listenForCandidates(callId, this.localRole, async (candidate) => {
        if (!candidate || !this.peerConnection) {return;}
        const key = JSON.stringify(candidate);
        if (this.receivedCandidateKeys.has(key)) {return;}
        this.receivedCandidateKeys.add(key);
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error('Error adding remote ICE candidate:', error);
        }
      });

      this.notifyCallListeners('callStarted', { type: this.callType, userId: callerId, offer });

      return { offer, type: this.callType, callId };
    } catch (error) {
      console.error('Error starting call:', error);
      this.setCallHistoryStatus('failed');
      this.endCall();
      throw error;
    }
  }

  // Answer incoming call
  async answerCall({
    offer,
    callType = 'video',
    callId,
    chatId,
    callerId,
    callerName = null,
    receiverId,
    receiverName = null
  } = {}) {
    try {
      if (!offer || !callId || !receiverId) {
        throw new Error('Offer, callId, and receiverId are required to answer call');
      }

      this.callType = callType;
      this.isCallActive = true;
      this.localRole = 'callee';
      this.currentCallId = callId;
      this.currentChatId = chatId || null;
      this.currentCallerId = callerId || null;
      this.currentReceiverId = receiverId;
      this.receivedCandidateKeys.clear();

      const mediaResult = await this.acquireLocalMedia(callType);
      this.localStream = mediaResult.stream;
      this.callType = mediaResult.effectiveType;
      this.notifyCallListeners('localStream', this.localStream);
      if (mediaResult.permissionIssue) {
        this.notifyCallListeners('mediaPermissionWarning', {
          originalType: callType,
          resolvedType: mediaResult.effectiveType,
          error: mediaResult.permissionIssue
        });
      }
      if (this.callType !== callType) {
        this.notifyCallListeners('callTypeChanged', this.callType);
      }
      if (mediaResult.permissionIssue) {
        if (callId) {
          await callSignalingService.updateCallSession(callId, {
            callType: this.callType,
            permissionWarning: {
              name: mediaResult.permissionIssue?.name || 'PermissionError',
              message: mediaResult.permissionIssue?.message || 'Media permission denied'
            }
          });
        }
      }

      await this.initializePeerConnection({ callId, role: this.localRole });

      // Set remote description
      const remoteDescription = offer.type ? offer : new RTCSessionDescription(offer);
      await this.peerConnection.setRemoteDescription(remoteDescription);

      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      const answerPayload = {
        type: answer.type,
        sdp: answer.sdp,
        receiverId,
        receiverName,
        callType: this.callType
      };

      await callSignalingService.setAnswer(callId, answerPayload);

      this.callDocListener = callSignalingService.listenToCall(callId, (callData) => {
        if (!callData) {return;}
        if (callData.historyDocId && !this.callHistoryDocId) {
          this.callHistoryDocId = callData.historyDocId;
        }
        if (callData.status === 'ended') {
          this.setCallHistoryStatus('remote-ended');
          this.endCall();
          return;
        }
        if (callData.callType && callData.callType !== this.callType) {
          this.callType = callData.callType;
          this.notifyCallListeners('callTypeChanged', this.callType);
        }
      });

      this.candidateListener = callSignalingService.listenForCandidates(callId, this.localRole, async (candidate) => {
        if (!candidate || !this.peerConnection) {return;}
        const key = JSON.stringify(candidate);
        if (this.receivedCandidateKeys.has(key)) {return;}
        this.receivedCandidateKeys.add(key);
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error('Error adding remote ICE candidate (callee):', error);
        }
      });

      this.notifyCallListeners('callAnswered', { type: this.callType, answer });
      this.startAnswerTone();

      return answer;
    } catch (error) {
      console.error('Error answering call:', error);
      this.setCallHistoryStatus('failed');
      this.endCall();
      throw error;
    }
  }

  // Handle answer
  async handleAnswer(answer) {
    try {
      await this.peerConnection.setRemoteDescription(answer);
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(candidate) {
    try {
      await this.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  // End call
  endCall() {
    this.stopRingtone();
    this.stopAnswerTone();

    if (this.answerListener) {
      this.answerListener();
      this.answerListener = null;
    }
    if (this.candidateListener) {
      this.candidateListener();
      this.candidateListener = null;
    }
    if (this.callDocListener) {
      this.callDocListener();
      this.callDocListener = null;
    }

    // Stop screen sharing first
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.remoteAudioElement) {
      this.remoteAudioElement.srcObject = null;
    }
    if (this.remoteAudioSource) {
      try {
        this.remoteAudioSource.disconnect();
      } catch (_) {}
      this.remoteAudioSource = null;
    }

    const status = this.callHistoryStatus || 'completed';
    const durationSeconds = this.callStartTime
      ? Math.max(0, Math.round((Date.now() - this.callStartTime) / 1000))
      : null;

    if (this.callHistoryDocId) {
      callHistoryService.logCallEnd({
        historyDocId: this.callHistoryDocId,
        durationSeconds,
        status
      });
    }

    this.callHistoryDocId = null;
    this.callStartTime = null;
    this.callHistoryStatus = 'completed';

    this.remoteStream = null;
    this.isCallActive = false;
    this.isScreenSharing = false;
    this.callType = null;
    this.receivedCandidateKeys.clear();

    if (this.currentCallId) {
      callSignalingService.markCallEnded(this.currentCallId).catch(() => {});
      callSignalingService.clearCall(this.currentCallId).catch(() => {});
    }

    this.currentCallId = null;
    this.currentChatId = null;
    this.currentCallerId = null;
    this.currentReceiverId = null;
    this.localRole = null;

    this.notifyCallListeners('callEnded');
  }

  // Toggle video
  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.notifyCallListeners('videoToggled', videoTrack.enabled);
      }
    }
  }

  // Toggle audio
  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.notifyCallListeners('audioToggled', audioTrack.enabled);
      }
    }
  }

  startRingtone() {
    if (typeof window === 'undefined') {return;}
    this.stopRingtone();

    const ensureContext = () => {
      if (!this.audioContext || (this.audioContext?.state === 'closed')) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {return false;}
        try {
          this.audioContext = new AudioContextClass();
        } catch (error) {
          console.warn('Unable to create AudioContext for ringtone:', error?.message || error);
          return false;
        }
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      return true;
    };

    if (!ensureContext()) {return;}

    try {
      const ctx = this.audioContext;
      this.ringtoneGainNode = ctx.createGain();
      this.ringtoneGainNode.gain.setValueAtTime(0, ctx.currentTime);
      this.ringtoneGainNode.connect(ctx.destination);

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.setValueAtTime(480, ctx.currentTime);
      osc1.connect(this.ringtoneGainNode);
      osc2.connect(this.ringtoneGainNode);
      osc1.start();
      osc2.start();
      this.ringtoneOscillator = [osc1, osc2];

      const ringPattern = () => {
        if (!this.audioContext || !this.ringtoneGainNode) {return;}
        const now = this.audioContext.currentTime;
        this.ringtoneGainNode.gain.cancelScheduledValues(now);
        this.ringtoneGainNode.gain.setValueAtTime(0.22, now);
        this.ringtoneGainNode.gain.setValueAtTime(0, now + 1);
      };

      ringPattern();
      this.ringIntervalId = window.setInterval(ringPattern, 3000);
    } catch (error) {
      console.warn('Failed to synthesize ringtone:', error?.message || error);
    }
  }

  stopRingtone() {
    if (this.ringtoneAudio) {
      this.ringtoneAudio.pause();
      this.ringtoneAudio.currentTime = 0;
      this.ringtoneAudio = null;
    }
    if (Array.isArray(this.ringtoneOscillator)) {
      this.ringtoneOscillator.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (_) {}
      });
      this.ringtoneOscillator = null;
    }
    if (this.ringtoneGainNode) {
      try { this.ringtoneGainNode.disconnect(); } catch (_) {}
      this.ringtoneGainNode = null;
    }
    if (this.ringIntervalId) {
      window.clearInterval(this.ringIntervalId);
      this.ringIntervalId = null;
    }
  }

  startAnswerTone() {
    if (typeof window === 'undefined') {return;}
    this.stopAnswerTone();
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {return;}
      this.audioContext = new AudioContextClass();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    try {
      const ctx = this.audioContext;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.connect(gain);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.01);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.55);
      this.answerOscillator = osc;
    } catch (error) {
      console.warn('Failed to synthesize answer tone:', error?.message || error);
    }
  }

  stopAnswerTone() {
    if (this.answerToneAudio) {
      this.answerToneAudio.pause();
      this.answerToneAudio.currentTime = 0;
      this.answerToneAudio = null;
    }
    if (this.answerOscillator) {
      try {
        this.answerOscillator.stop();
        this.answerOscillator.disconnect();
      } catch (_) {}
      this.answerOscillator = null;
    }
  }

  // Start screen sharing
  async startScreenShare() {
    try {
      if (!this.peerConnection || !this.isCallActive) {
        throw new Error('Call must be active to share screen');
      }

      // Get screen stream
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'browser'
        },
        audio: true // Capture system audio if available
      });

      // Replace video track in peer connection with screen track
      const screenVideoTrack = this.screenStream.getVideoTracks()[0];
      if (screenVideoTrack) {
        const sender = this.peerConnection.getSenders().find(s =>
          s.track && s.track.kind === 'video'
        );

        if (sender) {
          await sender.replaceTrack(screenVideoTrack);
        }

        // Handle screen share ending (user stops sharing)
        screenVideoTrack.onended = () => {
          this.stopScreenShare();
        };

        this.isScreenSharing = true;
        this.notifyCallListeners('screenShareStarted', this.screenStream);
      }

      return this.screenStream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      if (error.name === 'NotAllowedError') {
        throw new Error('Screen sharing permission denied');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No screen/window available to share');
      }
      throw error;
    }
  }

  // Stop screen sharing
  async stopScreenShare() {
    try {
      if (!this.isScreenSharing || !this.screenStream) {
        return;
      }

      // Stop screen stream tracks
      this.screenStream.getTracks().forEach(track => track.stop());

      // Restore original video track if local stream exists
      if (this.localStream && this.peerConnection) {
        const originalVideoTrack = this.localStream.getVideoTracks()[0];
        if (originalVideoTrack) {
          const sender = this.peerConnection.getSenders().find(s =>
            s.track && s.track.kind === 'video'
          );

          if (sender) {
            await sender.replaceTrack(originalVideoTrack);
          }
        }
      }

      this.screenStream = null;
      this.isScreenSharing = false;
      this.notifyCallListeners('screenShareStopped');
    } catch (error) {
      console.error('Error stopping screen share:', error);
      // Clean up even if replaceTrack fails
      this.screenStream = null;
      this.isScreenSharing = false;
    }
  }

  // Toggle screen sharing
  async toggleScreenShare() {
    if (this.isScreenSharing) {
      await this.stopScreenShare();
    } else {
      await this.startScreenShare();
    }
  }

  // Check if screen sharing is supported
  isScreenShareSupported() {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getDisplayMedia
    );
  }

  // Subscribe to call events
  subscribeToCallEvents(callback) {
    this.callListeners.add(callback);
    return () => this.callListeners.delete(callback);
  }

  notifyCallListeners(event, data) {
    this.callListeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in call listener:', error);
      }
    });
  }

  listenForIncomingCalls(userId, callback) {
    return callSignalingService.listenForIncomingCalls(userId, callback);
  }
}

export const callService = new CallService();
export default callService;


