// src/components/Notes/NotesViewer.jsx

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
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import { 
  getNotes, 
  updateNoteDownloads, 
  rateNote,
  addBookmark,
  removeBookmark,
  getUserBookmarks
} from '../../services/firestoreService';
import { downloadFile } from '../../services/driveService';
import { 
  DEPARTMENTS, 
  ACADEMIC_YEARS, 
  getDepartmentNames, 
  getSubjectsForDepartmentSemester 
} from '../../utils/constants';
import { useAuth } from '../../contexts/AuthContext';

const NotesViewer = ({ onLoginClick }) => {
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarkLoading, setBookmarkLoading] = useState({});
  const { user: currentUser, isLoggedIn} = useAuth();
  const [ratingState, setRatingState] = useState({});
  const [hoverRating, setHoverRating] = useState({});
  const [filters, setFilters] = useState({
    department: '',
    semester: '',
    subject: '',
    academicYear: '',
    search: ''
  });

  useEffect(() => {
    loadNotes();
    if (isLoggedIn) {
      loadBookmarks();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    applyFilters();
  }, [notes, filters]);

  const loadNotes = async () => {
    try {
      const notesData = await getNotes();

      // Ensure each note has rating-related defaults
      const initializedNotes = notesData.map(note => ({
        ...note,
        ratings: note.ratings || {},
        averageRating: note.averageRating ?? 0,
        ratingCount: note.ratingCount ?? 0,
      }));

      setNotes(initializedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarks = async () => {
    if (!currentUser?.uid) return;
    try {
      const userBookmarks = await getUserBookmarks(currentUser.uid);
      setBookmarks(userBookmarks);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  };

  const handleBookmark = async (noteId) => {
    if (!isLoggedIn) {
      if (onLoginClick) onLoginClick();
      return;
    }

    setBookmarkLoading({ ...bookmarkLoading, [noteId]: true });

    try {
      const isBookmarked = bookmarks.includes(noteId);
      
      if (isBookmarked) {
        await removeBookmark(currentUser.uid, noteId);
        setBookmarks(bookmarks.filter(id => id !== noteId));
      } else {
        await addBookmark(currentUser.uid, noteId);
        setBookmarks([...bookmarks, noteId]);
      }
    } catch (error) {
      console.error('Error updating bookmark:', error);
      alert('Failed to update bookmark. Please try again.');
    } finally {
      setBookmarkLoading({ ...bookmarkLoading, [noteId]: false });
    }
  };

  const handleRateNote = async (noteId, ratingValue) => {
    if (!isLoggedIn) {
      if (onLoginClick) onLoginClick();
      return;
    }

    try {
      await rateNote(noteId, currentUser.uid, ratingValue);

      // Update local state
      setNotes((prev) =>
        prev.map((note) =>
          note.id === noteId
            ? {
                ...note,
                ratings: {
                  ...(note.ratings || {}),
                  [currentUser.uid]: ratingValue,
                },
                averageRating:
                  Object.values({
                    ...(note.ratings || {}),
                    [currentUser.uid]: ratingValue,
                  }).reduce((a, b) => a + b, 0) /
                  (Object.keys({
                    ...(note.ratings || {}),
                    [currentUser.uid]: ratingValue,
                  }).length),
                ratingCount: Object.keys({
                  ...(note.ratings || {}),
                  [currentUser.uid]: ratingValue,
                }).length
              }
            : note
        )
      );

      // Update rating display state
      setRatingState({ ...ratingState, [noteId]: ratingValue });
    } catch (error) {
      console.error('Rating error:', error);
      alert('Failed to rate. Try again later.');
    }
  };

  const applyFilters = () => {
    let filtered = [...notes];

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

  const handleDownload = async (note) => {
    try {
      await updateNoteDownloads(note.id);
      downloadFile(note.fileId, note.fileName);
      
      // Update local state
      setNotes(notes.map(n => 
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
    return getSubjectsForDepartmentSemester(filters.department, filters.semester);
  };

  const getSemestersForCurrentDepartment = () => {
    if (!filters.department) return [];
    const departmentData = DEPARTMENTS[filters.department];
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
    setFilters({
      ...filters,
      department: e.target.value,
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

  const StarRating = ({ noteId, currentRating, averageRating, ratingCount, onRate }) => {
    const userRating = ratingState[noteId] || currentRating || 0;
    const hoverValue = hoverRating[noteId] || 0;
    
    return (
      <div className="flex flex-col space-y-2">
        {/* Interactive Stars */}
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-4 h-4 cursor-pointer transition-all duration-200 ${
                (hoverValue || userRating) >= star
                  ? 'text-yellow-400 fill-yellow-400 scale-110'
                  : 'text-white/30 hover:text-yellow-200'
              }`}
              onMouseEnter={() => setHoverRating({ ...hoverRating, [noteId]: star })}
              onMouseLeave={() => setHoverRating({ ...hoverRating, [noteId]: 0 })}
              onClick={() => onRate(noteId, star)}
            />
          ))}
          {userRating > 0 && (
            <span className="text-xs text-yellow-400 ml-2 font-medium">
              Your rating: {userRating}
            </span>
          )}
        </div>
        
        {/* Average Rating Display */}
        {averageRating > 0 && (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-sm text-white/80 font-medium">
                {averageRating.toFixed(1)}
              </span>
            </div>
            <span className="text-xs text-white/60">
              ({ratingCount} rating{ratingCount !== 1 ? 's' : ''})
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header Section */}
      <div>
        <div className="flex items-center space-x-3 mb-3 sm:mb-4">
          <div className="p-2 sm:p-3 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg sm:rounded-xl">
            <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Browse Notes
            </h1>
            <p className="text-white/70 text-sm sm:text-base lg:text-lg">
              Discover and download notes from your peers across all departments
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar for Mobile */}
      <div className="lg:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            placeholder="Search notes..."
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
              {getSemestersForCurrentDepartment().map(sem => (
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
              {getSubjectsForCurrentSelection().map(subject => (
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
                placeholder="Search notes..."
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
        {loading ? (
          <div className="flex items-center justify-center py-12 sm:py-16 lg:py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 border-b-2 border-violet-400 mx-auto mb-3 sm:mb-4"></div>
              <p className="text-white/70 text-base sm:text-lg">Loading notes...</p>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                  Available Notes 
                  <span className="text-violet-400 ml-2">({filteredNotes.length})</span>
                </h2>
              </div>
            </div>

            {filteredNotes.length === 0 ? (
              <div className="text-center py-12 sm:py-16 lg:py-20">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white/30" />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 sm:mb-4">No notes found</h3>
                <p className="text-white/60 text-base sm:text-lg">
                  Try adjusting your filters or check back later
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredNotes.map((note) => (
                  <div 
                    key={note.id} 
                    className="group bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 hover:scale-105"
                  >
                    {/* Header with Bookmark */}
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
                        {/* Bookmark Button */}
                        {isLoggedIn && (
                          <button
                            onClick={() => handleBookmark(note.id)}
                            disabled={bookmarkLoading[note.id]}
                            className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 ${
                              bookmarks.includes(note.id)
                                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-amber-400'
                            }`}
                          >
                            {bookmarkLoading[note.id] ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            ) : bookmarks.includes(note.id) ? (
                              <BookmarkCheck className="w-4 h-4" />
                            ) : (
                              <Bookmark className="w-4 h-4" />
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
                    </div>

                    {/* Rating Section */}
                    <div className="mb-4 sm:mb-5 p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center space-x-2 mb-2">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-medium text-white">Rate this note</span>
                      </div>
                      <StarRating 
                        noteId={note.id}
                        currentRating={note.ratings?.[currentUser?.uid]}
                        averageRating={note.averageRating}
                        ratingCount={note.ratingCount}
                        onRate={handleRateNote}
                      />
                    </div>

                    {/* Stats and Actions Footer */}
                    <div className="space-y-3 pt-3 sm:pt-4 border-t border-white/10">
                      {/* Stats Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Download className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" />
                            <span className="text-xs sm:text-sm text-white/70 font-medium">
                              {note.downloads || 0} downloads
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                            <span className="text-xs sm:text-sm text-white/70">
                              {note.ratingCount || 0} reviews
                            </span>
                          </div>
                        </div>
                        {/* Bookmark Status Indicator */}
                        {isLoggedIn && bookmarks.includes(note.id) && (
                          <div className="flex items-center space-x-1">
                            <BookmarkCheck className="w-3 h-3 text-amber-400" />
                            <span className="text-xs text-amber-400">Bookmarked</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons Row */}
                      <div className="flex items-center justify-between space-x-2">
                        <button
                          onClick={() => window.open(`https://drive.google.com/file/d/${note.fileId}/view`, '_blank')}
                          className="flex items-center space-x-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition-all duration-300 hover:scale-105"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-xs sm:text-sm font-medium">Preview</span>
                        </button>

                        <button
                          onClick={() => handleDownload(note)}
                          className="flex items-center space-x-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 shadow-lg flex-1 justify-center"
                        >
                          <Download className="w-4 h-4" />
                          <span className="text-sm font-medium">Download</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesViewer;