import { COLLEGE_DOMAIN } from './constants';

export const validateCollegeEmail = (email) => {
  return email.endsWith(COLLEGE_DOMAIN) && email.length > COLLEGE_DOMAIN.length;
};

export const extractRollNumber = (email) => {
  return email.split('@')[0];
};

export const validateRollNumber = (rollNumber) => {
  const pattern = /^\d{2}[a-z]{2}\d{2}$/;
  return pattern.test(rollNumber);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const validateFile = (file) => {
  const allowedTypes = ['pdf', 'doc', 'docx', 'ppt', 'pptx'];
  const fileExtension = file.name.split('.').pop().toLowerCase();
  const maxSize = 50 * 1024 * 1024; // 50MB
  
  return {
    isValid: allowedTypes.includes(fileExtension) && file.size <= maxSize,
    error: !allowedTypes.includes(fileExtension) ? 'Invalid file type' : 
           file.size > maxSize ? 'File too large (max 50MB)' : null
  };
};