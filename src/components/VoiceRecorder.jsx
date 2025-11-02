import React, { useState, useRef, useEffect } from 'react';
import { chatService } from '../services/chatService';

function VoiceRecorder({ chatId, onRecordComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await sendVoiceMessage(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const sendVoiceMessage = async (blob) => {
    try {
      const result = await chatService.sendVoiceMessage(chatId, blob);
      if (result.success) {
        onRecordComplete?.();
      }
    } catch (error) {
      console.error('Error sending voice message:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (!isRecording) {
    return (
      <button 
        className="voice-record-btn"
        onClick={startRecording}
        aria-label="Record voice message"
      >
        🎤
      </button>
    );
  }

  return (
    <div className="voice-recording">
      <div className="recording-indicator">
        <span className="recording-dot"></span>
        <span className="recording-time">{formatTime(recordingTime)}</span>
      </div>
      <button 
        className="stop-recording-btn"
        onClick={stopRecording}
        aria-label="Stop recording"
      >
        Stop
      </button>
    </div>
  );
}

export default VoiceRecorder;


