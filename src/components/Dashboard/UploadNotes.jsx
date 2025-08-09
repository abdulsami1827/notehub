// src/components/Upload/UploadNotes.jsx

import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  Calendar, 
  BookOpen, 
  User, 
  CheckCircle, 
  AlertCircle, 
  Info,
  X,
  PlusCircle,
  Sparkles,
  CloudUpload,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { saveNoteMetadata } from '../../services/firestoreService';
import { initializeGoogleDrive, signInToGoogle, uploadFile, setFilePublic  } from '../../services/driveService';
import { validateFile } from '../../utils/validators';
import { 
  DEPARTMENTS, 
  ACADEMIC_YEARS, 
  getDepartmentNames, 
  getSubjectsForDepartmentSemester 
} from '../../utils/constants';

const UploadNotes = () => {
  const { userProfile } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: '',
    semester: '',
    subject: '',
    academicYear: '',
    file: null
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [dragOver, setDragOver] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
      // Reset semester and subject when department changes
      ...(name === 'department' && { semester: '', subject: '' }),
      // Reset subject when semester changes
      ...(name === 'semester' && { subject: '' })
    });
    setMessage({ type: '', text: '' });
  };

  const handleFileChange = (file) => {
    const validation = validateFile(file);
    
    if (validation.isValid) {
      setFormData({ ...formData, file });
      setMessage({ type: '', text: '' });
    } else {
      setMessage({ type: 'error', text: validation.error });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Validate form
      if (!formData.title || !formData.department || !formData.semester || 
          !formData.subject || !formData.academicYear || !formData.file) {
        setMessage({ type: 'error', text: 'Please fill all required fields' });
        setLoading(false);
        return;
      }

      setMessage({ type: 'info', text: 'Initializing Google Drive...' });

      // Initialize Google Drive
      await initializeGoogleDrive();
      
      setMessage({ type: 'info', text: 'Please sign in to Google Drive...' });
      
      // Sign in to Google
      await signInToGoogle();

      setMessage({ type: 'info', text: 'Uploading file to Google Drive...' });

      // Create folder structure if needed (you can enhance this to create department/semester/subject folders)
      const fileName = `${formData.title}.${formData.file.name.split('.').pop()}`;
      
      // Upload file to Google Drive (using 'root' folder for simplicity, you can create nested folders)
      const uploadResult = await uploadFile(formData.file, 'root', fileName);

      if (uploadResult.id) {
        setMessage({ type: 'info', text: 'Setting file permissions...' });

        try {
          // Make file link-accessible for anyone with link:
          await setFilePublic(uploadResult.id, { type: 'anyone', role: 'reader', allowFileDiscovery: false });

          // OR to restrict to domain:
          // await setFilePublic(uploadResult.id, { type: 'domain', role: 'reader', domain: 'aiktc.ac.in' });
        } catch (permErr) {
          // Non-blocking: log and show a friendly message, still save metadata
          console.error('Failed to set permission on uploaded file:', permErr);
          setMessage({ type: 'info', text: 'Uploaded, but failed to set public permissions. File may require access.' });
          // continue — still save metadata
        }

        setMessage({ type: 'info', text: 'Saving note information...' });

        // Save metadata to Firestore
        const noteData = {
          title: formData.title,
          description: formData.description,
          department: formData.department,
          semester: formData.semester,
          subject: formData.subject,
          academicYear: formData.academicYear,
          fileName: fileName,
          fileId: uploadResult.id,
          fileSize: formData.file.size,
          uploadedBy: userProfile.rollNumber
        };

        await saveNoteMetadata(noteData);

        setMessage({ type: 'success', text: 'Notes uploaded successfully!' });
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          department: '',
          semester: '',
          subject: '',
          academicYear: '',
          file: null
        });
      } else {
        throw new Error('Failed to upload file to Google Drive');
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      // Provide more specific error messages
      if (error.message.includes('popup_blocked')) {
        setMessage({ type: 'error', text: 'Please allow popups and try again.' });
      } else if (error.message.includes('access_denied')) {
        setMessage({ type: 'error', text: 'Google Drive access denied. Please grant permission and try again.' });
      } else if (error.message.includes('Not authenticated')) {
        setMessage({ type: 'error', text: 'Authentication failed. Please try signing in to Google again.' });
      } else {
        setMessage({ type: 'error', text: `Upload failed: ${error.message}` });
      }
    } finally {
      setLoading(false);
    }
  };

  const getSubjectsForCurrentSelection = () => {
    return getSubjectsForDepartmentSemester(formData.department, formData.semester);
  };

  const getSemestersForCurrentDepartment = () => {
    if (!formData.department) return [];
    const departmentData = DEPARTMENTS[formData.department];
    return departmentData ? Object.keys(departmentData.semesters) : [];
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      department: '',
      semester: '',
      subject: '',
      academicYear: '',
      file: null
    });
    setMessage({ type: '', text: '' });
  };

  const getMessageIcon = () => {
    switch (message.type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />;
      case 'info':
        return <Info className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header Section */}
      <div>
        <div className="flex items-center space-x-3 mb-3 sm:mb-4">
          <div className="p-2 sm:p-3 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg sm:rounded-xl">
            <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Upload Notes
            </h1>
            <p className="text-white/70 text-sm sm:text-base lg:text-lg">
              Share your knowledge and help fellow students succeed
            </p>
          </div>
        </div>
      </div>

      {/* Upload Form */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/10">
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
          {/* Message Alert */}
          {message.text && (
            <div className={`flex items-start space-x-3 p-3 sm:p-4 rounded-lg sm:rounded-xl border transition-all ${
              message.type === 'error' 
                ? 'bg-red-500/10 border-red-500/20 text-red-300'
                : message.type === 'success'
                ? 'bg-green-500/10 border-green-500/20 text-green-300'
                : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
            }`}>
              {getMessageIcon()}
              <span className="font-medium text-sm sm:text-base">{message.text}</span>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Title */}
            <div className="lg:col-span-1">
              <label className="flex items-center space-x-2 text-sm font-medium text-white/80 mb-2 sm:mb-3">
                <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400" />
                <span>Title *</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Chapter 5 - Data Structures"
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-white/50 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all"
                required
              />
            </div>

            {/* Academic Year */}
            <div className="lg:col-span-1">
              <label className="flex items-center space-x-2 text-sm font-medium text-white/80 mb-2 sm:mb-3">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400" />
                <span>Academic Year *</span>
              </label>
              <select
                name="academicYear"
                value={formData.academicYear}
                onChange={handleChange}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all"
                required
              >
                <option value="" className="bg-slate-800 text-white">Select Academic Year</option>
                {ACADEMIC_YEARS.map(year => (
                  <option key={year} value={year} className="bg-slate-800 text-white">{year}</option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div className="lg:col-span-1">
              <label className="flex items-center space-x-2 text-sm font-medium text-white/80 mb-2 sm:mb-3">
                <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400" />
                <span>Department *</span>
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all"
                required
              >
                <option value="" className="bg-slate-800 text-white">Select Department</option>
                {getDepartmentNames().map(dept => (
                  <option key={dept} value={dept} className="bg-slate-800 text-white">{dept}</option>
                ))}
              </select>
            </div>

            {/* Semester */}
            <div className="lg:col-span-1">
              <label className="flex items-center space-x-2 text-sm font-medium text-white/80 mb-2 sm:mb-3">
                <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400" />
                <span>Semester *</span>
              </label>
              <select
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all disabled:opacity-50"
                required
                disabled={!formData.department}
              >
                <option value="" className="bg-slate-800 text-white">Select Semester</option>
                {getSemestersForCurrentDepartment().map(sem => (
                  <option key={sem} value={sem} className="bg-slate-800 text-white">Semester {sem}</option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div className="lg:col-span-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-white/80 mb-2 sm:mb-3">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400" />
                <span>Subject *</span>
              </label>
              <select
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all disabled:opacity-50"
                required
                disabled={!formData.semester || !formData.department}
              >
                <option value="" className="bg-slate-800 text-white">Select Subject</option>
                {getSubjectsForCurrentSelection().map(subject => (
                  <option key={subject} value={subject} className="bg-slate-800 text-white">{subject}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-white/80 mb-2 sm:mb-3">
              <User className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400" />
              <span>Description</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Brief description of the notes content..."
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-white/50 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all resize-none"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-white/80 mb-2 sm:mb-3">
              <CloudUpload className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400" />
              <span>Upload File *</span>
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 text-center transition-all duration-300 ${
                dragOver 
                  ? 'border-violet-400 bg-violet-500/10 scale-[1.02]' 
                  : 'border-white/20 hover:border-white/40'
              }`}
            >
              {formData.file ? (
                <div className="space-y-3 sm:space-y-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm sm:text-base lg:text-lg break-all px-2">{formData.file.name}</p>
                    <p className="text-white/60 mt-1 text-sm">
                      {(formData.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, file: null })}
                    className="flex items-center space-x-2 mx-auto px-3 sm:px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-300 rounded-md sm:rounded-lg hover:bg-red-500/30 transition-all text-sm"
                  >
                    <X className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Remove file</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto">
                    <CloudUpload className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white/50" />
                  </div>
                  <div className="px-2">
                    <p className="text-white text-sm sm:text-base lg:text-lg mb-2">
                      <span className="hidden sm:inline">Drag and drop your file here, or </span>
                      <label className="text-violet-400 cursor-pointer hover:text-violet-300 font-medium underline">
                        {window.innerWidth < 640 ? 'Choose file' : 'browse'}
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.ppt,.pptx"
                          onChange={(e) => e.target.files[0] && handleFileChange(e.target.files[0])}
                        />
                      </label>
                    </p>
                    <p className="text-white/50 text-xs sm:text-sm">
                      PDF, DOC, DOCX, PPT, PPTX (Max 50MB)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-4 sm:pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center justify-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 bg-white/10 border border-white/20 text-white rounded-lg sm:rounded-xl hover:bg-white/20 transition-all duration-300 text-sm sm:text-base"
            >
              <X className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Reset</span>
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center space-x-2 px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-lg sm:rounded-xl transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm sm:text-base"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Upload Notes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadNotes;