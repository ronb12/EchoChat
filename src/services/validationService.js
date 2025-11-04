// Input Validation Service
class ValidationService {
  constructor() {
    this.maxMessageLength = 4000;
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedFileTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'audio/webm',
      'audio/mpeg',
      'audio/wav'
    ];
  }

  validateMessage(text) {
    if (!text || typeof text !== 'string') {
      return { valid: false, error: 'Message text is required' };
    }

    if (text.trim().length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }

    if (text.length > this.maxMessageLength) {
      return {
        valid: false,
        error: `Message too long. Maximum ${this.maxMessageLength} characters.`
      };
    }

    // XSS prevention - basic sanitization
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(text)) {
        return { valid: false, error: 'Message contains potentially unsafe content' };
      }
    }

    return { valid: true };
  }

  validateFile(file) {
    if (!file) {
      return { valid: false, error: 'File is required' };
    }

    if (!(file instanceof File)) {
      return { valid: false, error: 'Invalid file object' };
    }

    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: `File too large. Maximum ${(this.maxFileSize / 1024 / 1024).toFixed(0)}MB.`
      };
    }

    if (!this.allowedFileTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${this.allowedFileTypes.join(', ')}`
      };
    }

    return { valid: true };
  }

  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true };
  }

  validatePassword(password) {
    if (!password || typeof password !== 'string') {
      return { valid: false, error: 'Password is required' };
    }

    if (password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters' };
    }

    if (password.length > 128) {
      return { valid: false, error: 'Password too long' };
    }

    // Check for strong password (at least one number, one letter, one special char)
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasNumber || !hasLetter) {
      return {
        valid: false,
        error: 'Password must contain at least one letter and one number'
      };
    }

    return { valid: true, strong: hasSpecial };
  }

  validateGroupName(name) {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Group name is required' };
    }

    if (name.trim().length === 0) {
      return { valid: false, error: 'Group name cannot be empty' };
    }

    if (name.length > 100) {
      return { valid: false, error: 'Group name too long. Maximum 100 characters.' };
    }

    return { valid: true };
  }

  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }

    // Remove potentially dangerous HTML/script tags
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
}

export const validationService = new ValidationService();
export default validationService;


