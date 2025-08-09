// src/components/Notes/MyNotesViewer.jsx

import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Search, 
  Filter, 
  FileText, 
  Star, 
  Eye, 
  Calendar,
  BookOpen,
  User,
  Sparkles,
  ChevronDown,
  GraduationCap,
  BarChart3,
  Edit,
  Trash2,
  Save,
  X,
  Upload,
  AlertCircle,
  Check,
  Clock,
  Bookmark,
  BookmarkCheck,
  BookmarkX
} from 'lucide-react';
import { 
  getNotes, 
  updateNoteMetadata, 
  deleteNote, 
  updateNoteDownloads,
  getUserBookmarks,
  removeBookmark,
  checkUploadAccess
} from '../../services/firestoreService';
import { 
  uploadFile, 
  deleteFile, 
  initializeGoogleDrive,
  signInToGoogle 
} from '../../services/driveService';
import { downloadFile } from '../../services/driveService';
import { 
  DEPARTMENTS, 
  ACADEMIC_YEARS, 
  getDepartmentNames, 
  getSubjectsForDepartmentSemester 
} from '../../utils/constants';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboard } from '../../contexts/DashboardContext';

const MyNotesViewer = () => {
  const [notes, setNotes] = useState([]);
  const [bookmarkedNotes, setBookmarkedNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(null);
  const [activeTab, setActiveTab] = useState('uploaded'); // 'uploaded' or 'bookmarked'
  const [hasUploadAccess, setHasUploadAccess] = useState(false);
  const [bookmarkRemoveLoading, setBookmarkRemoveLoading] = useState({});
  const { user: currentUser } = useAuth();
  const { userProfile } = useDashboard();
  
  const [filters, setFilters] = useState({
    department: '',
    semester: '',
    subject: '',
    academicYear: '',
    search: ''
  });

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    department: '',
    semester: '',
    subject: '',
    academicYear: '',
    file: null,
    fileName: ''
  });

  useEffect(() => {
    if (currentUser?.uid) {
      checkUserUploadAccess();
      loadMyNotes();
      loadBookmarkedNotes();
    }
  }, [currentUser, userProfile]);

  useEffect(() => {
    applyFilters();
  }, [notes, bookmarkedNotes, filters, activeTab]);

  const checkUserUploadAccess = async () => {
    if (!userProfile?.rollNumber) return;
    try {
      const hasAccess = await checkUploadAccess(userProfile.rollNumber);
      setHasUploadAccess(hasAccess);
      // If user doesn't have upload access, default to bookmarks tab
      if (!hasAccess) {
        setActiveTab('bookmarked');
      }
    } catch (error) {
      console.error('Error checking upload access:', error);
    }
  };

  const loadMyNotes = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const allNotes = await getNotes();
      // Filter to show only current user's notes
      const myNotes = allNotes.filter(note => 
        note.uploadedByUid === currentUser.uid || 
        (note.uploadedBy && note.uploadedBy === userProfile?.rollNumber)
      );
      setNotes(myNotes);
    } catch (error) {
      console.error('Error loading my notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarkedNotes = async () => {
    if (!currentUser?.uid) return;
    
    try {
      setBookmarksLoading(true);
      const bookmarkIds = await getUserBookmarks(currentUser.uid);
      
      if (bookmarkIds.length > 0) {
        const allNotes = await getNotes();
        const bookmarked = allNotes.filter(note => bookmarkIds.includes(note.id));
        setBookmarkedNotes(bookmarked);
      } else {
        setBookmarkedNotes([]);
      }
    } catch (error) {
      console.error('Error loading bookmarked notes:', error);
      setBookmarkedNotes([]);
    } finally {
      setBookmarksLoading(false);
    }
  };

  const handleRemoveBookmark = async (noteId) => {
    setBookmarkRemoveLoading({ ...bookmarkRemoveLoading, [noteId]: true });
    
    try {
      await removeBookmark(currentUser.uid, noteId);
      setBookmarkedNotes(bookmarkedNotes.filter(note => note.id !== noteId));
    } catch (error) {
      console.error('Error removing bookmark:', error);
      alert('Failed to remove bookmark. Please try again.');
    } finally {
      setBookmarkRemoveLoading({ ...bookmarkRemoveLoading, [noteId]: false });
    }
  };

  const applyFilters = () => {
    const sourceNotes = activeTab === 'uploaded' ? notes : bookmarkedNotes;
    let filtered = [...sourceNotes];

    if (filters.department) {
      filtered = filtered.filter(note => note.department === filters.department);
    }
    if (filters.semester) {
      filtered = filtered.filter(note => note.semester === filters.semester);
    }
    if (filters.subject) {
      filtered = filtered.filter(note => note.subject === filters.subject);
    }
    if (filters.academicYear) {
      filtered = filtered.filter(note => note.academicYear === filters.academicYear);
    }
    if (filters.search) {
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        note.description?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    setFilteredNotes(filtered);
  };

  const handleEdit = (note) => {
    setEditingNote(note.id);
    setEditForm({
      title: note.title,
      description: note.description || '',
      department: note.department,
      semester: note.semester,
      subject: note.subject,
      academicYear: note.academicYear,
      file: null,
      fileName: note.fileName
    });
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setEditForm({
      title: '',
      description: '',
      department: '',
      semester: '',
      subject: '',
      academicYear: '',
      file: null,
      fileName: ''
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditForm({
        ...editForm,
        file: file,
        fileName: file.name
      });
    }
  };

  const handleDelete = async (noteId) => {
    try {
      const note = notes.find(n => n.id === noteId);
      
      try {
        await initializeGoogleDrive();
        await signInToGoogle();
        await deleteFile(note.fileId);
      } catch (driveError) {
        console.error('Error deleting file from Google Drive:', driveError);
      }
      
      await deleteNote(noteId);
      setNotes(notes.filter(n => n.id !== noteId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const note = notes.find(n => n.id === editingNote);
      let fileId = note.fileId;
      let fileName = editForm.fileName;

      if (editForm.file) {
        setUploadingFile(editingNote);
        
        try {
          await initializeGoogleDrive();
          await signInToGoogle();

          const uploadResponse = await uploadFile(
            editForm.file, 
            note.folderId, 
            editForm.file.name
          );
          
          await deleteFile(note.fileId);
          
          fileId = uploadResponse.id;
          fileName = editForm.file.name;
        } catch (driveError) {
          console.error('Error handling file operations:', driveError);
          setUploadingFile(null);
          return;
        }
      }

      await updateNoteMetadata(editingNote, {
        title: editForm.title,
        description: editForm.description,
        department: editForm.department,
        semester: editForm.semester,
        subject: editForm.subject,
        academicYear: editForm.academicYear,
        fileId: fileId,
        fileName: fileName,
        updatedAt: new Date()
      });

      setNotes(notes.map(n => 
        n.id === editingNote 
          ? { 
              ...n, 
              title: editForm.title,
              description: editForm.description,
              department: editForm.department,
              semester: editForm.semester,
              subject: editForm.subject,
              academicYear: editForm.academicYear,
              fileId,
              fileName,
              updatedAt: new Date()
            }
          : n
      ));

      setEditingNote(null);
      setUploadingFile(null);
    } catch (error) {
      console.error('Error updating note:', error);
      setUploadingFile(null);
    }
  };

  const handleDownload = async (note) => {
    try {
      await updateNoteDownloads(note.id);
      downloadFile(note.fileId, note.fileName);
      
      // Update local state for both uploaded and bookmarked notes
      setNotes(notes.map(n => 
        n.id === note.id 
          ? { ...n, downloads: (n.downloads || 0) + 1 }
          : n
      ));
      setBookmarkedNotes(bookmarkedNotes.map(n => 
        n.id === note.id 
          ? { ...n, downloads: (n.downloads || 0) + 1 }
          : n
      ));
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file. Please try again.');
    }
  };

  const getSubjectsForCurrentSelection = () => {
    return getSubjectsForDepartmentSemester(editForm.department, editForm.semester);
  };

  const getSemestersForCurrentDepartment = () => {
    if (!editForm.department) return [];
    const departmentData = DEPARTMENTS[editForm.department];
    return departmentData ? Object.keys(departmentData.semesters) : [];
  };

  const hasActiveFilters = () => {
    return filters.department || filters.semester || filters.subject || filters.academicYear || filters.search;
  };

  const clearFilters = () => {
    setFilters({
      department: '',
      semester: '',
      subject: '',
      academicYear: '',
      search: ''
    });
  };

  const handleDepartmentChange = (e) => {
    const value = e.target.value;
    setFilters({
      ...filters,
      department: value,
      semester: '',
      subject: ''
    });
  };

  const handleSemesterChange = (e) => {
    setFilters({
      ...filters,
      semester: e.target.value,
      subject: ''
    });
  };

  const handleEditDepartmentChange = (e) => {
    const value = e.target.value;
    setEditForm({
      ...editForm,
      department: value,
      semester: '',
      subject: ''
    });
  };

  const handleEditSemesterChange = (e) => {
    setEditForm({
      ...editForm,
      semester: e.target.value,
      subject: ''
    });
  };

  const renderNoteCard = (note) => {
    const isUploadedNote = activeTab === 'uploaded';
    const canEdit = isUploadedNote && hasUploadAccess;

    if (editingNote === note.id && canEdit) {
      // Edit Form
      return (
        <div key={note.id} className="bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 border border-white/20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">Edit Note</h3>
            <button
              onClick={handleCancelEdit}
              className="p-2 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Title</label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-violet-400 transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                rows={3}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-violet-400 transition-all resize-none"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Department</label>
              <select
                value={editForm.department}
                onChange={handleEditDepartmentChange}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-400 transition-all"
              >
                <option value="" className="bg-slate-800">Select Department</option>
                {getDepartmentNames().map(dept => (
                  <option key={dept} value={dept} className="bg-slate-800">
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Semester</label>
              <select
                value={editForm.semester}
                onChange={handleEditSemesterChange}
                disabled={!editForm.department}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-400 transition-all disabled:opacity-50"
              >
                <option value="" className="bg-slate-800">Select Semester</option>
                {getSemestersForCurrentDepartment().map(sem => (
                  <option key={sem} value={sem} className="bg-slate-800">
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Subject</label>
              <select
                value={editForm.subject}
                onChange={(e) => setEditForm({...editForm, subject: e.target.value})}
                disabled={!editForm.semester}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-400 transition-all disabled:opacity-50"
              >
                <option value="" className="bg-slate-800">Select Subject</option>
                {getSubjectsForCurrentSelection().map(subject => (
                  <option key={subject} value={subject} className="bg-slate-800">
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Year */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Academic Year</label>
              <select
                value={editForm.academicYear}
                onChange={(e) => setEditForm({...editForm, academicYear: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-400 transition-all"
              >
                <option value="" className="bg-slate-800">Select Year</option>
                {ACADEMIC_YEARS.map(year => (
                  <option key={year} value={year} className="bg-slate-800">
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Replace File (Optional)
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="file"
                  id={`file-${note.id}`}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                />
                <label
                  htmlFor={`file-${note.id}`}
                  className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Choose File</span>
                </label>
                {editForm.file && (
                  <span className="text-sm text-white/70 truncate">
                    {editForm.file.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-white/50 mt-1">
                Current: {editForm.fileName}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleSaveEdit}
                disabled={uploadingFile === note.id}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-1 justify-center"
              >
                {uploadingFile === note.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="text-sm">Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span className="text-sm">Save Changes</span>
                  </>
                )}
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
                <span className="text-sm">Cancel</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Display Note
    return (
      <div key={note.id} className="group bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300">
        {/* Header */}
        <div className="flex justify-between items-start mb-3 sm:mb-4">
          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-violet-500 to-purple-600 rounded-md sm:rounded-lg">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex flex-col items-end space-y-1">
              <span className="text-xs bg-gradient-to-r from-violet-500 to-purple-600 text-white px-2 sm:px-3 py-1 rounded-full font-medium">
                Sem {note.semester}
              </span>
              {note.department && (
                <span className="text-xs bg-white/20 text-white/80 px-2 py-0.5 rounded-full font-medium">
                  {note.department}
                </span>
              )}
            </div>
            {/* Remove Bookmark Button for bookmarked notes */}
            {activeTab === 'bookmarked' && (
              <button
                onClick={() => handleRemoveBookmark(note.id)}
                disabled={bookmarkRemoveLoading[note.id]}
                className="p-2 bg-amber-500/20 text-amber-400 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all duration-300 hover:scale-110"
                title="Remove bookmark"
              >
                {bookmarkRemoveLoading[note.id] ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <BookmarkX className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-white text-base sm:text-lg lg:text-xl mb-2 sm:mb-3 group-hover:text-purple-200 transition-colors line-clamp-2">
          {note.title}
        </h3>
        
        {/* Details */}
        <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
          {note.department && (
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-white/70 font-medium truncate">{note.department}</span>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-white/70 font-medium truncate">{note.subject}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-white/70 truncate">{note.academicYear}</span>
          </div>

          <div className="flex items-center space-x-2">
            <User className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-white/70 truncate">by {note.uploadedBy}</span>
          </div>

          {note.description && (
            <p className="text-xs sm:text-sm text-white/60 line-clamp-2 mt-2 sm:mt-3">
              {note.description}
            </p>
          )}

          {/* Upload/Update Date */}
          <div className="flex items-center space-x-2">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-white/70">
              {note.updatedAt ? 'Updated' : 'Uploaded'} {new Date(note.updatedAt?.seconds * 1000 || note.uploadedAt?.seconds * 1000).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mb-4 sm:mb-5 p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Download className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" />
                <span className="text-lg sm:text-xl font-bold text-white">
                  {note.downloads || 0}
                </span>
              </div>
              <span className="text-xs text-white/60">Downloads</span>
            </div>
            <div>
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
                <span className="text-lg sm:text-xl font-bold text-white">
                  {note.averageRating ? note.averageRating.toFixed(1) : '0.0'}
                </span>
              </div>
              <span className="text-xs text-white/60">Rating</span>
            </div>
            <div>
              <div className="flex items-center justify-center space-x-1 mb-1">
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                <span className="text-lg sm:text-xl font-bold text-white">
                  {note.ratingCount || 0}
                </span>
              </div>
              <span className="text-xs text-white/60">Reviews</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-3 sm:pt-4 border-t border-white/10">
          {/* View and Download Row */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.open(`https://drive.google.com/file/d/${note.fileId}/view`, '_blank')}
              className="flex items-center space-x-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition-all duration-300 hover:scale-105 flex-1 justify-center"
            >
              <Eye className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium">Preview</span>
            </button>

            <button
              onClick={() => handleDownload(note)}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white px-3 py-2 rounded-lg transition-all duration-300 hover:scale-105 shadow-lg flex-1 justify-center"
            >
              <Download className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium">Download</span>
            </button>
          </div>

          {/* Edit and Delete Row (only for uploaded notes with upload access) */}
          {canEdit && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleEdit(note)}
                className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 shadow-lg flex-1 justify-center"
              >
                <Edit className="w-4 h-4" />
                <span className="text-sm font-medium">Edit</span>
              </button>

              <button
                onClick={() => setDeleteConfirm(note.id)}
                className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 shadow-lg flex-1 justify-center"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header Section */}
      <div>
        <div className="flex items-center space-x-3 mb-3 sm:mb-4">
          <div className="p-2 sm:p-3 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg sm:rounded-xl">
            <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              My Notes
            </h1>
            <p className="text-white/70 text-sm sm:text-base lg:text-lg">
              {hasUploadAccess 
                ? "Manage your uploaded notes and view your bookmarked collection"
                : "View and manage your bookmarked notes"
              }
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/10">
        <div className="flex space-x-1 bg-white/5 rounded-xl p-1">
          {hasUploadAccess && (
            <button
              onClick={() => setActiveTab('uploaded')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all duration-300 ${
                activeTab === 'uploaded'
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span className="font-medium">My Uploads</span>
              <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                {notes.length}
              </span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('bookmarked')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all duration-300 ${
              activeTab === 'bookmarked'
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span className="font-medium">Bookmarked</span>
            <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
              {bookmarkedNotes.length}
            </span>
          </button>
        </div>
      </div>

      {/* Search Bar for Mobile */}
      <div className="lg:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            placeholder={`Search ${activeTab === 'uploaded' ? 'my notes' : 'bookmarked notes'}...`}
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all"
          />
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/10">
        {/* Mobile Filter Toggle */}
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Filter className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">Filters</h2>
            {hasActiveFilters() && (
              <span className="bg-violet-500 text-white text-xs px-2 py-1 rounded-full">
                Active
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {hasActiveFilters() && (
              <button
                onClick={clearFilters}
                className="text-white/60 hover:text-white text-sm transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center space-x-1 text-white/80 hover:text-white transition-colors"
            >
              <span className="text-sm">Toggle</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 transition-all duration-300 ${
          showFilters || window.innerWidth >= 1024 ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0 overflow-hidden lg:opacity-100 lg:max-h-96'
        }`}>
          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
              <div className="flex items-center space-x-1">
                <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400" />
                <span>Department</span>
              </div>
            </label>
            <select
              value={filters.department}
              onChange={handleDepartmentChange}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-white/50 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all"
            >
              <option value="" className="bg-slate-800 text-white">All Departments</option>
              {getDepartmentNames().map(dept => (
                <option key={dept} value={dept} className="bg-slate-800 text-white">
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Semester */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
              Semester
            </label>
            <select
              value={filters.semester}
              onChange={handleSemesterChange}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-white/50 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all disabled:opacity-50"
              disabled={!filters.department}
            >
              <option value="" className="bg-slate-800 text-white">All Semesters</option>
              {filters.department && DEPARTMENTS[filters.department] && 
                Object.keys(DEPARTMENTS[filters.department].semesters).map(sem => (
                  <option key={sem} value={sem} className="bg-slate-800 text-white">
                    Semester {sem}
                  </option>
                ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
              Subject
            </label>
            <select
              value={filters.subject}
              onChange={(e) => setFilters({...filters, subject: e.target.value})}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-white/50 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all disabled:opacity-50"
              disabled={!filters.semester || !filters.department}
            >
              <option value="" className="bg-slate-800 text-white">All Subjects</option>
              {getSubjectsForDepartmentSemester(filters.department, filters.semester).map(subject => (
                <option key={subject} value={subject} className="bg-slate-800 text-white">
                  {subject}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
              Academic Year
            </label>
            <select
              value={filters.academicYear}
              onChange={(e) => setFilters({...filters, academicYear: e.target.value})}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-white/50 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all"
            >
              <option value="" className="bg-slate-800 text-white">All Years</option>
              {ACADEMIC_YEARS.map(year => (
                <option key={year} value={year} className="bg-slate-800 text-white">
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="hidden lg:block">
            <label className="block text-sm font-medium text-white/80 mb-3">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'uploaded' ? 'my notes' : 'bookmarked notes'}...`}
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notes Grid Section */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/10">
        {(loading || bookmarksLoading) ? (
          <div className="flex items-center justify-center py-12 sm:py-16 lg:py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 border-b-2 border-violet-400 mx-auto mb-3 sm:mb-4"></div>
              <p className="text-white/70 text-base sm:text-lg">
                Loading {activeTab === 'uploaded' ? 'your notes' : 'bookmarked notes'}...
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <div className="flex items-center space-x-2 sm:space-x-3">
                {activeTab === 'uploaded' ? (
                  <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />
                ) : (
                  <Bookmark className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                )}
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                  {activeTab === 'uploaded' ? 'Your Uploaded Notes' : 'Your Bookmarked Notes'}
                  <span className="text-violet-400 ml-2">({filteredNotes.length})</span>
                </h2>
              </div>
            </div>

            {filteredNotes.length === 0 ? (
              <div className="text-center py-12 sm:py-16 lg:py-20">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  {activeTab === 'uploaded' ? (
                    <FileText className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white/30" />
                  ) : (
                    <Bookmark className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white/30" />
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 sm:mb-4">
                  {activeTab === 'uploaded' 
                    ? (notes.length === 0 ? "No notes uploaded yet" : "No notes found")
                    : (bookmarkedNotes.length === 0 ? "No bookmarked notes yet" : "No bookmarked notes found")
                  }
                </h3>
                <p className="text-white/60 text-base sm:text-lg">
                  {activeTab === 'uploaded' 
                    ? (notes.length === 0 
                        ? "Start sharing your knowledge by uploading your first note" 
                        : "Try adjusting your filters")
                    : (bookmarkedNotes.length === 0
                        ? "Start bookmarking notes you find useful while browsing"
                        : "Try adjusting your filters")
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {filteredNotes.map((note) => renderNoteCard(note))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 max-w-md w-full">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Delete Note</h3>
            </div>
            
            <p className="text-white/70 mb-6">
              Are you sure you want to delete this note? This action cannot be undone and will permanently remove the note and its file from Google Drive.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-4 py-2 rounded-lg transition-all flex-1 justify-center"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all flex-1 justify-center"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyNotesViewer;