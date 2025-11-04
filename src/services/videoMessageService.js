// Video Message Service - Record, compress, and send video messages
import { storage } from './firebaseConfig';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { firestoreService } from './firestoreService';
import { chatService } from './chatService';

class VideoMessageService {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.stream = null;
    this.maxDuration = 60; // 60 seconds max
    this.maxFileSize = 50 * 1024 * 1024; // 50MB max
  }

  // Start recording video
  async startRecording(chatId, userId, onProgress) {
    try {
      // Request camera and microphone permissions
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      });

      // Create MediaRecorder
      const options = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      };

      // Fallback to other codecs if vp9 not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'video/webm';
        }
      }

      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.recordedChunks = [];

      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
          if (onProgress) {
            const totalSize = this.recordedChunks.reduce((sum, chunk) => sum + chunk.size, 0);
            onProgress(totalSize);
          }
        }
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second

      return this.stream;
    } catch (error) {
      console.error('Error starting video recording:', error);
      throw new Error('Failed to start video recording. Please check camera/microphone permissions.');
    }
  }

  // Stop recording
  async stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        // Stop all tracks
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
        }

        // Create blob from recorded chunks
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        resolve(blob);
      };

      this.mediaRecorder.onerror = (error) => {
        reject(error);
      };

      this.mediaRecorder.stop();
    });
  }

  // Cancel recording
  cancelRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.recordedChunks = [];
  }

  // Compress video (optional - client-side compression)
  async compressVideo(blob) {
    // Basic compression by reducing quality
    // For production, use FFmpeg.wasm or server-side compression
    return blob;
  }

  // Upload video to Firebase Storage
  async uploadVideo(chatId, userId, videoBlob, fileName = 'video-message.webm') {
    try {
      // Check file size
      if (videoBlob.size > this.maxFileSize) {
        throw new Error(`Video too large. Maximum ${(this.maxFileSize / 1024 / 1024).toFixed(0)}MB.`);
      }

      // Create storage reference
      const timestamp = Date.now();
      const storageRef = ref(storage, `videos/${chatId}/${userId}/${timestamp}-${fileName}`);

      // Upload video
      const snapshot = await uploadBytes(storageRef, videoBlob, {
        contentType: videoBlob.type || 'video/webm',
        customMetadata: {
          chatId,
          userId,
          uploadedAt: new Date().toISOString()
        }
      });

      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      return {
        url: downloadURL,
        fileName: fileName,
        fileSize: videoBlob.size,
        fileType: videoBlob.type || 'video/webm',
        duration: null // Duration would need to be calculated separately
      };
    } catch (error) {
      console.error('Error uploading video:', error);
      throw error;
    }
  }

  // Send video message
  async sendVideoMessage(chatId, userId, senderName, videoBlob, onUploadProgress) {
    try {
      // Upload video
      const videoData = await this.uploadVideo(chatId, userId, videoBlob);

      // Create message data
      const messageData = {
        senderId: userId,
        senderName: senderName,
        video: videoData.url,
        videoName: videoData.fileName,
        videoSize: videoData.fileSize,
        videoType: videoData.fileType,
        videoDuration: videoData.duration,
        timestamp: Date.now()
      };

      // Send message via chatService
      const message = await chatService.sendMessage(chatId, messageData, userId);

      return message;
    } catch (error) {
      console.error('Error sending video message:', error);
      throw error;
    }
  }

  // Delete video from storage
  async deleteVideo(videoUrl) {
    try {
      // Extract storage path from URL
      const urlParts = videoUrl.split('/');
      const encodedPath = urlParts.slice(urlParts.indexOf('videos')).join('/');
      const decodedPath = decodeURIComponent(encodedPath);

      const storageRef = ref(storage, decodedPath);
      await deleteObject(storageRef);
      console.log('Video deleted from storage');
    } catch (error) {
      console.error('Error deleting video:', error);
      // Don't throw - video may already be deleted
    }
  }

  // Check if video recording is supported
  isSupported() {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder
    );
  }
}

export const videoMessageService = new VideoMessageService();
export default videoMessageService;
