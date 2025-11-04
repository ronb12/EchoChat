// WebRTC Call Service for Video/Voice Calls with Screen Sharing
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
  }

  // Initialize peer connection
  async initializePeerConnection() {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
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
  }

  // Start a call (video or audio)
  async startCall(type = 'video', userId) {
    try {
      this.callType = type;
      this.isCallActive = true;

      // Get user media
      const constraints = {
        video: type === 'video' ? true : false,
        audio: true
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.notifyCallListeners('localStream', this.localStream);

      await this.initializePeerConnection();

      // Create offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      this.notifyCallListeners('callStarted', { type, userId, offer });

      return { offer, type };
    } catch (error) {
      console.error('Error starting call:', error);
      this.endCall();
      throw error;
    }
  }

  // Answer incoming call
  async answerCall(offer, type = 'video') {
    try {
      this.callType = type;
      this.isCallActive = true;

      // Get user media
      const constraints = {
        video: type === 'video' ? true : false,
        audio: true
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.notifyCallListeners('localStream', this.localStream);

      await this.initializePeerConnection();

      // Set remote description
      await this.peerConnection.setRemoteDescription(offer);

      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.notifyCallListeners('callAnswered', { type, answer });

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
}

export const callService = new CallService();
export default callService;


