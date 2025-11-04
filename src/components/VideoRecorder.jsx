import React, { useState, useEffect, useRef } from 'react';
import { videoMessageService } from '../services/videoMessageService';

export default function VideoRecorder({ chatId, userId, senderName, onVideoSent, onCancel }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoStream, setVideoStream] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const maxDuration = 60; // 60 seconds max

  useEffect(() => {
    startRecording();
    return () => {
      stopRecording();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await videoMessageService.startRecording(chatId, userId, (size) => {
        setUploadProgress(Math.min((size / (50 * 1024 * 1024)) * 100, 100)); // 50MB max
      });

      setVideoStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      onCancel();
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);

    try {
      const blob = await videoMessageService.stopRecording();
      if (blob) {
        setPreviewBlob(blob);
        // Create preview URL
        const previewUrl = URL.createObjectURL(blob);
        setPreviewBlob({ blob, url: previewUrl });
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      videoMessageService.cancelRecording();
    }
    if (previewBlob?.url) {
      URL.revokeObjectURL(previewBlob.url);
    }
    onCancel();
  };

  const handleSend = async () => {
    if (!previewBlob?.blob) {return;}

    setIsUploading(true);
    try {
      await videoMessageService.sendVideoMessage(
        chatId,
        userId,
        senderName,
        previewBlob.blob,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      // Cleanup
      if (previewBlob.url) {
        URL.revokeObjectURL(previewBlob.url);
      }

      onVideoSent();
    } catch (error) {
      console.error('Error sending video:', error);
      setIsUploading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-recorder-modal" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      zIndex: 3000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Video Preview */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '640px',
        maxHeight: '480px',
        background: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '20px'
      }}>
        {previewBlob?.url ? (
          <video
            src={previewBlob.url}
            controls
            autoPlay
            style={{
              width: '100%',
              height: '100%',
              display: 'block'
            }}
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              transform: 'scaleX(-1)' // Mirror effect
            }}
          />
        )}

        {/* Recording Timer */}
        {isRecording && (
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            background: 'rgba(255, 0, 0, 0.8)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{
              width: '12px',
              height: '12px',
              background: '#fff',
              borderRadius: '50%',
              animation: 'recordingPulse 1s infinite'
            }}></span>
            {formatTime(recordingTime)}
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            right: '16px',
            background: 'rgba(0, 0, 0, 0.7)',
            padding: '12px',
            borderRadius: '8px'
          }}>
            <div style={{
              color: '#fff',
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              Uploading video... {Math.round(uploadProgress)}%
            </div>
            <div style={{
              width: '100%',
              height: '4px',
              background: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${uploadProgress}%`,
                height: '100%',
                background: '#0084ff',
                transition: 'width 0.3s ease'
              }}></div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        {!previewBlob ? (
          <>
            {/* Stop Recording Button */}
            <button
              onClick={stopRecording}
              disabled={!isRecording}
              style={{
                padding: '16px 32px',
                background: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '50px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isRecording ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(220, 53, 69, 0.4)'
              }}
              onMouseEnter={(e) => {
                if (isRecording) {e.target.style.transform = 'scale(1.05)';}
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
              }}
            >
              <span>⏹️</span>
              Stop Recording
            </button>

            {/* Cancel Button */}
            <button
              onClick={handleCancel}
              style={{
                padding: '16px 32px',
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#fff',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={isUploading}
              style={{
                padding: '16px 32px',
                background: '#0084ff',
                color: '#fff',
                border: 'none',
                borderRadius: '50px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(0, 132, 255, 0.4)',
                opacity: isUploading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!isUploading) {e.target.style.transform = 'scale(1.05)';}
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
              }}
            >
              <span>📤</span>
              {isUploading ? 'Sending...' : 'Send Video'}
            </button>

            {/* Retake Button */}
            <button
              onClick={() => {
                if (previewBlob.url) {
                  URL.revokeObjectURL(previewBlob.url);
                }
                setPreviewBlob(null);
                startRecording();
              }}
              disabled={isUploading}
              style={{
                padding: '16px 32px',
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#fff',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: isUploading ? 0.5 : 1
              }}
            >
              Retake
            </button>

            {/* Cancel Button */}
            <button
              onClick={handleCancel}
              disabled={isUploading}
              style={{
                padding: '16px 32px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '50px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: isUploading ? 0.5 : 1
              }}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

