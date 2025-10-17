import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  addSubmission as addSubmissionToDb,
  getSubmissions as fetchSubmissionsFromDb,
} from "../../services/firestoreService";
import {
  FileText,
  Filter,
  Send,
  Calendar,
  User,
  Clock,
  ChevronDown,
  Sparkles,
  GraduationCap,
  AlertCircle,
  Bell,
  CalendarClock,
  BookOpen,
  CheckCircle2
} from "lucide-react";

export default function Submissions() {
  const { userProfile, hasUploadAccess } = useAuth();
  const [filters, setFilters] = useState({ branch: "", academicYear: "", semester: "" });
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Faculty form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [reminderMinutes, setReminderMinutes] = useState(60);

  useEffect(() => { loadSubs(); }, [filters, userProfile]);

  async function loadSubs() {
    setLoading(true);
    try {
      const f = { ...filters };
      if (!hasUploadAccess && userProfile) {
        f.branch = userProfile.branch;
        f.academicYear = userProfile.academicYear;
        f.semester = userProfile.semester;
      }
      const docs = await fetchSubmissionsFromDb(f);
      setSubs(docs);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !deadline) return alert("Fill title and deadline");
    const payload = {
      title: title.trim(),
      description: description.trim(),
      deadline: new Date(deadline).toISOString(),
      reminderMinutes: Number(reminderMinutes) || 0,
      branch: filters.branch || "all",
      academicYear: filters.academicYear || "all",
      semester: filters.semester || "all",
      postedBy: userProfile?.displayName || userProfile?.email,
      postedById: userProfile?.uid || "",
      createdAt: new Date(),
    };
    try {
      await addSubmissionToDb(payload);
      setTitle("");
      setDescription("");
      setDeadline("");
      setReminderMinutes(60);
      await loadSubs();
      alert("Submission created!");
    } catch (err) {
      console.error(err);
      alert("Failed to create submission");
    }
  }

  const hasActiveFilters = () => {
    return filters.branch || filters.academicYear || filters.semester;
  };

  const clearFilters = () => {
    setFilters({ branch: "", academicYear: "", semester: "" });
  };

  const formatDeadline = (deadlineStr) => {
    const date = new Date(deadlineStr);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDeadlineStatus = (deadlineStr) => {
    const deadline = new Date(deadlineStr);
    const now = new Date();
    const hoursUntil = (deadline - now) / (1000 * 60 * 60);
    
    if (hoursUntil < 0) {
      return { status: 'overdue', color: 'text-red-400', bgColor: 'bg-red-500/20', label: 'Overdue' };
    } else if (hoursUntil < 24) {
      return { status: 'urgent', color: 'text-orange-400', bgColor: 'bg-orange-500/20', label: 'Due Soon' };
    } else if (hoursUntil < 72) {
      return { status: 'upcoming', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', label: 'Upcoming' };
    } else {
      return { status: 'normal', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', label: 'Active' };
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header Section */}
      <div>
        <div className="flex items-center space-x-3 mb-3 sm:mb-4">
          <div className="p-2 sm:p-3 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg sm:rounded-xl">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Submissions
            </h1>
            <p className="text-white/70 text-sm sm:text-base lg:text-lg">
              Track your assignments and submission deadlines
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
              onClick={loadSubs}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-300 hover:scale-105 shadow-lg font-medium"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Faculty Create Submission Form */}
      {hasUploadAccess && (
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/10">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
            <Send className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">Create New Submission</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
                Submission Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter submission title..."
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-white/50 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Enter submission description..."
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-white/50 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400" />
                    <span>Deadline</span>
                  </div>
                </label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-white/50 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
                  <div className="flex items-center space-x-1">
                    <Bell className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400" />
                    <span>Reminder (minutes before)</span>
                  </div>
                </label>
                <input
                  type="number"
                  min="0"
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(e.target.value)}
                  className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-white/50 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-6 py-3 rounded-lg sm:rounded-xl transition-all duration-300 hover:scale-105 shadow-lg font-medium flex items-center justify-center space-x-2"
            >
              <Send className="w-5 h-5" />
              <span>Create Submission</span>
            </button>
          </form>
        </div>
      )}

      {/* Submissions List Section */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/10">
        {loading ? (
          <div className="flex items-center justify-center py-12 sm:py-16 lg:py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 border-b-2 border-violet-400 mx-auto mb-3 sm:mb-4"></div>
              <p className="text-white/70 text-base sm:text-lg">Loading submissions...</p>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-6 sm:mb-8">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                Active Submissions
                <span className="text-violet-400 ml-2">({subs.length})</span>
              </h2>
            </div>

            {subs.length === 0 ? (
              <div className="text-center py-12 sm:py-16 lg:py-20">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white/30" />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 sm:mb-4">No submissions found</h3>
                <p className="text-white/60 text-base sm:text-lg">
                  Try adjusting your filters or check back later
                </p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-5">
                {subs.map(s => {
                  const deadlineStatus = getDeadlineStatus(s.deadline);
                  return (
                    <div
                      key={s.id}
                      className="group bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300"
                    >
                      {/* Submission Header */}
                      <div className="flex items-start justify-between mb-3 sm:mb-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-2">
                            <div className="p-1.5 sm:p-2 bg-gradient-to-r from-violet-500 to-purple-600 rounded-md sm:rounded-lg flex-shrink-0 mt-1">
                              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-white text-base sm:text-lg lg:text-xl mb-2 group-hover:text-purple-200 transition-colors">
                                {s.title}
                              </h3>
                              {s.description && (
                                <p className="text-sm sm:text-base text-white/70 leading-relaxed">
                                  {s.description}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-0 sm:ml-12">
                            <span className="text-xs bg-gradient-to-r from-violet-500 to-purple-600 text-white px-2 sm:px-3 py-1 rounded-full font-medium">
                              {s.branch === 'all' ? 'All Branches' : s.branch}
                            </span>
                            <span className="text-xs bg-white/20 text-white/80 px-2 sm:px-3 py-1 rounded-full font-medium">
                              Year {s.academicYear === 'all' ? 'All' : s.academicYear}
                            </span>
                            <span className="text-xs bg-white/20 text-white/80 px-2 sm:px-3 py-1 rounded-full font-medium">
                              Sem {s.semester === 'all' ? 'All' : s.semester}
                            </span>
                            <span className={`text-xs ${deadlineStatus.bgColor} ${deadlineStatus.color} px-2 sm:px-3 py-1 rounded-full font-medium`}>
                              {deadlineStatus.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Submission Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-white/10">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <CalendarClock className="w-4 h-4 text-violet-400 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="text-xs text-white/60 block">Deadline</span>
                              <span className={`text-sm font-medium ${deadlineStatus.color}`}>
                                {formatDeadline(s.deadline)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Bell className="w-4 h-4 text-violet-400 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="text-xs text-white/60 block">Reminder</span>
                              <span className="text-sm text-white/80 font-medium">
                                {s.reminderMinutes} minutes before
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-violet-400 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="text-xs text-white/60 block">Posted by</span>
                              <span className="text-sm text-white/80 font-medium truncate block">
                                {s.postedBy}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-violet-400 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="text-xs text-white/60 block">Created</span>
                              <span className="text-sm text-white/80 font-medium">
                                {new Date(s.createdAt?.toDate?.() || s.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}