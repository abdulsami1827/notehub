import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  addNotice as addNoticeToDb,
  getNotices as fetchNoticesFromDb,
} from "../../services/firestoreService";
import {
  Bell,
  Filter,
  Send,
  Calendar,
  User,
  BookOpen,
  ChevronDown,
  Sparkles,
  GraduationCap,
  AlertCircle
} from "lucide-react";

export default function Notices() {
  const { userProfile, hasUploadAccess } = useAuth();
  const [filters, setFilters] = useState({ branch: "", academicYear: "", semester: "" });
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Faculty form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    loadNotices();
  }, [filters, userProfile]);

  async function loadNotices() {
    setLoading(true);
    try {
      const effective = { ...filters };
      if (!hasUploadAccess && userProfile) {
        effective.branch = userProfile.branch || "";
        effective.academicYear = userProfile.academicYear || "";
        effective.semester = userProfile.semester || "";
      }
      const docs = await fetchNoticesFromDb(effective);
      setNotices(docs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return alert("Please fill title and content");

    const payload = {
      title: title.trim(),
      content: content.trim(),
      branch: filters.branch || "all",
      academicYear: filters.academicYear || "all",
      semester: filters.semester || "all",
      postedBy: userProfile?.displayName || userProfile?.email || "Faculty",
      postedById: userProfile?.uid || "",
      postedAt: new Date(),
    };
    try {
      await addNoticeToDb(payload);
      setTitle("");
      setContent("");
      await loadNotices();
      alert("Notice posted!");
    } catch (err) {
      console.error(err);
      alert("Failed to post notice");
    }
  }

  const hasActiveFilters = () => {
    return filters.branch || filters.academicYear || filters.semester;
  };

  const clearFilters = () => {
    setFilters({ branch: "", academicYear: "", semester: "" });
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header Section */}
      <div>
        <div className="flex items-center space-x-3 mb-3 sm:mb-4">
          <div className="p-2 sm:p-3 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg sm:rounded-xl">
            <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Notices
            </h1>
            <p className="text-white/70 text-sm sm:text-base lg:text-lg">
              Stay updated with important announcements and updates
            </p>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/10">
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

        <div className={`grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 transition-all duration-300 ${
          showFilters || window.innerWidth >= 1024 ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0 overflow-hidden lg:opacity-100 lg:max-h-96'
        }`}>
          {/* Branch Filter */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
              <div className="flex items-center space-x-1">
                <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400" />
                <span>Branch</span>
              </div>
            </label>
            <select
              value={filters.branch}
              onChange={(e) => setFilters(f => ({ ...f, branch: e.target.value }))}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-white/50 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all"
            >
              <option value="" className="bg-slate-800 text-white">All Branches</option>
              <option value="CSE" className="bg-slate-800 text-white">CSE</option>
              <option value="ECE" className="bg-slate-800 text-white">ECE</option>
              <option value="ME" className="bg-slate-800 text-white">ME</option>
              <option value="CE" className="bg-slate-800 text-white">CE</option>
            </select>
          </div>

          {/* Academic Year Filter */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
              Academic Year
            </label>
            <select
              value={filters.academicYear}
              onChange={(e) => setFilters(f => ({ ...f, academicYear: e.target.value }))}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-white/50 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all"
            >
              <option value="" className="bg-slate-800 text-white">All Years</option>
              <option value="1" className="bg-slate-800 text-white">1st Year</option>
              <option value="2" className="bg-slate-800 text-white">2nd Year</option>
              <option value="3" className="bg-slate-800 text-white">3rd Year</option>
              <option value="4" className="bg-slate-800 text-white">4th Year</option>
            </select>
          </div>

          {/* Semester Filter */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
              Semester
            </label>
            <select
              value={filters.semester}
              onChange={(e) => setFilters(f => ({ ...f, semester: e.target.value }))}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-white/50 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all"
            >
              <option value="" className="bg-slate-800 text-white">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <option key={s} value={s} className="bg-slate-800 text-white">
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          {/* Apply Button */}
          <div className="flex items-end">
            <button
              onClick={loadNotices}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-300 hover:scale-105 shadow-lg font-medium"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Faculty Post Notice Form */}
      {hasUploadAccess && (
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/10">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
            <Send className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">Post New Notice</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
                Notice Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter notice title..."
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-white/50 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
                Notice Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                placeholder="Enter notice content..."
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-white/50 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-6 py-3 rounded-lg sm:rounded-xl transition-all duration-300 hover:scale-105 shadow-lg font-medium flex items-center justify-center space-x-2"
            >
              <Send className="w-5 h-5" />
              <span>Post Notice</span>
            </button>
          </form>
        </div>
      )}

      {/* Notices List Section */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/10">
        {loading ? (
          <div className="flex items-center justify-center py-12 sm:py-16 lg:py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 border-b-2 border-violet-400 mx-auto mb-3 sm:mb-4"></div>
              <p className="text-white/70 text-base sm:text-lg">Loading notices...</p>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-6 sm:mb-8">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                Recent Notices
                <span className="text-violet-400 ml-2">({notices.length})</span>
              </h2>
            </div>

            {notices.length === 0 ? (
              <div className="text-center py-12 sm:py-16 lg:py-20">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white/30" />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 sm:mb-4">No notices found</h3>
                <p className="text-white/60 text-base sm:text-lg">
                  Try adjusting your filters or check back later
                </p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-5">
                {notices.map(n => (
                  <div
                    key={n.id}
                    className="group bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300"
                  >
                    {/* Notice Header */}
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-white text-base sm:text-lg lg:text-xl mb-2 group-hover:text-purple-200 transition-colors">
                          {n.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <span className="text-xs bg-gradient-to-r from-violet-500 to-purple-600 text-white px-2 sm:px-3 py-1 rounded-full font-medium">
                            {n.branch === 'all' ? 'All Branches' : n.branch}
                          </span>
                          <span className="text-xs bg-white/20 text-white/80 px-2 sm:px-3 py-1 rounded-full font-medium">
                            Year {n.academicYear === 'all' ? 'All' : n.academicYear}
                          </span>
                          <span className="text-xs bg-white/20 text-white/80 px-2 sm:px-3 py-1 rounded-full font-medium">
                            Sem {n.semester === 'all' ? 'All' : n.semester}
                          </span>
                        </div>
                      </div>
                      <div className="p-1.5 sm:p-2 bg-gradient-to-r from-violet-500 to-purple-600 rounded-md sm:rounded-lg ml-3">
                        <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                    </div>

                    {/* Notice Content */}
                    <p className="text-sm sm:text-base text-white/80 whitespace-pre-line mb-4 sm:mb-5 leading-relaxed">
                      {n.content}
                    </p>

                    {/* Notice Footer */}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-white/10">
                      <div className="flex items-center space-x-2">
                        <User className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400 flex-shrink-0" />
                        <span className="text-xs sm:text-sm text-white/70 font-medium truncate">
                          {n.postedBy}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400 flex-shrink-0" />
                        <span className="text-xs sm:text-sm text-white/70">
                          {formatDate(n.postedAt)}
                        </span>
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
}