// WebRTC Call Service for Video/Voice Calls with Screen Sharing
import { callSignalingService } from './callSignalingService';

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

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.notifyCallListeners('remoteStream', this.remoteStream);
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

      // Create offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      const offerPayload = {
        type: offer.type,
        sdp: offer.sdp
      };

      await callSignalingService.createOffer(callId, {
        chatId,
        callType: this.callType,
        callerId,
        callerName,
        receiverId,
        receiverName,
        offer: offerPayload
      });

      this.callDocListener = callSignalingService.listenToCall(callId, async (callData) => {
        if (!callData) {return;}
        if (callData.status === 'ended') {
          this.endCall();
          return;
        }
        if (callData.callType && callData.callType !== this.callType) {
          this.callType = callData.callType;
          this.notifyCallListeners('callTypeChanged', this.callType);
        }
        if (callData.answer && this.peerConnection) {
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
        if (callData.status === 'ended') {
          this.endCall();
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

      return answer;
    } catch (error) {
      console.error('Error answering call:', error);
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


