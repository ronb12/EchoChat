import React, { useRef } from 'react';
import { chatService } from '../services/chatService';

function FileUploadHandler({ chatId, onFileUploaded }) {
  const fileInputRef = useRef(null);
  const voiceInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit');
      return;
    }

    try {
      const result = await chatService.sendFileMessage(chatId, file, 'file');
      if (result.success) {
        onFileUploaded?.(result);
      } else {
        console.error('Error uploading file:', result.error);
        alert('Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    }

    // Reset input
    e.target.value = '';
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Check file size
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size exceeds 10MB limit');
      return;
    }

    try {
      const result = await chatService.sendFileMessage(chatId, file, 'image');
      if (result.success) {
        onFileUploaded?.(result);
      } else {
        console.error('Error uploading image:', result.error);
        alert('Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    }

    // Reset input
    e.target.value = '';
  };

  const openFileSelector = () => fileInputRef.current?.click();
  const openImageSelector = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = handleImageSelect;
    input.click();
  };

  const openVoiceRecorder = () => voiceInputRef.current?.click();

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        accept="*/*"
      />
      <input
        ref={voiceInputRef}
        type="file"
        style={{ display: 'none' }}
        accept="audio/*"
      />
      <div style={{ display: 'none' }}>
        {/* File upload handlers - will be exposed via refs */}
      </div>
    </>
  );
}

export default FileUploadHandler;


