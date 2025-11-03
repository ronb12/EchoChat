// WebRTC Call Service for Video/Voice Calls
class CallService {
  constructor() {
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.isCallActive = false;
    this.callType = null; // 'video' or 'audio'
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

