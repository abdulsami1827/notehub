// src/components/Dashboard/Dashboard.jsx

import React, { useEffect, useState } from 'react';
import { BookOpen, Download, Upload, TrendingUp, FileText, Star, Eye, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getNotes } from '../../services/firestoreService';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { userProfile, hasUploadAccess } = useAuth();
  const [recentNotes, setRecentNotes] = useState([]);
  const [stats, setStats] = useState({
    totalNotes: 0,
    totalDownloads: 0,
    userUploads: 0,
  });
  const [loading, setLoading] = useState(true);
  const [timeOfDay, setTimeOfDay] = useState('morning');
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
    determineTimeOfDay();
  }, []);

  const loadDashboardData = async () => {
    try {
      const notes = await getNotes();
      
      // Ensure each note has rating-related defaults
      const initializedNotes = notes.map(note => ({
        ...note,
        ratings: note.ratings || {},
        averageRating: note.averageRating ?? 0,
        ratingCount: note.ratingCount ?? 0,
      }));
      
      setRecentNotes(initializedNotes.slice(0, 6));
      setStats({
        totalNotes: notes.length,
        totalDownloads: notes.reduce((sum, note) => sum + (note.downloads || 0), 0),
        userUploads: notes.filter(note => note.uploadedBy === userProfile?.rollNumber).length
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const determineTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) setTimeOfDay('morning');
    else if (hour < 17) setTimeOfDay('afternoon');
    else setTimeOfDay('evening');
  };

  const getGreeting = () => {
    const greetings = {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
    };
    return greetings[timeOfDay];
  };

  // Create stat cards array with conditional upload stats
  const getStatCards = () => {
    const baseStats = [
      {
        title: 'Total Notes',
        value: stats.totalNotes,
        icon: <BookOpen className="w-6 h-6 sm:w-8 sm:h-8" />,
        color: 'from-violet-500 to-purple-600',
      },
      {
        title: 'Downloads',
        value: stats.totalDownloads,
        icon: <Download className="w-6 h-6 sm:w-8 sm:h-8" />,
        color: 'from-blue-500 to-indigo-600',
      },
    ];

    // Only add upload stats if user has upload access
    if (hasUploadAccess) {
      baseStats.push({
        title: 'Your Uploads',
        value: stats.userUploads,
        icon: <Upload className="w-6 h-6 sm:w-8 sm:h-8" />,
        color: 'from-green-500 to-teal-600',
      });
    }

    return baseStats;
  };

  const statCards = getStatCards();

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10">
      {/* Greeting and Date */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="text-center lg:text-left">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 sm:mb-4">
            <span className="bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              {getGreeting()},
            </span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              {userProfile?.rollNumber || 'Student'}!
            </span>
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-white/70 px-2 lg:px-0">
            {hasUploadAccess
              ? 'Ready to share knowledge and inspire others?'
              : 'Discover amazing notes from your peers and excel in your studies'}
          </p>
        </div>
        
        <div className="text-center lg:text-right">
          <p className="text-white/60 text-lg sm:text-xl">
            {new Date().toLocaleDateString('en-US', {
              weekday: window.innerWidth < 640 ? 'short' : 'long',
              year: 'numeric',
              month: window.innerWidth < 640 ? 'short' : 'long',
              day: 'numeric',
            })}
          </p>
          <p className="text-white/40 mt-1 text-sm sm:text-base">Welcome back to your learning journey</p>
        </div>
      </div>

      {/* Stats - Grid adjusts based on number of cards */}
      <div className={`grid gap-4 sm:gap-6 ${
        hasUploadAccess 
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
          : 'grid-cols-1 sm:grid-cols-2'
      }`}>
        {statCards.map((stat, i) => (
          <div
            key={i}
            className="group bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className={`p-2 sm:p-3 bg-gradient-to-r ${stat.color} rounded-lg sm:rounded-xl text-white group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-white/80 mb-1 sm:mb-2">{stat.title}</h3>
            <p className="text-2xl sm:text-3xl font-bold text-white mb-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Notes */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/10">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Recent Notes</h2>
          <button
            onClick={() => navigate('/dashboard/notes')}
            className="flex items-center text-violet-400 hover:text-violet-300 transition-colors text-sm sm:text-base"
          >
            <span className="hidden sm:inline">View All</span>
            <span className="sm:hidden">All</span>
            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3 sm:space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-16 sm:h-20 bg-white/10 rounded-lg sm:rounded-xl"></div>
            ))}
          </div>
        ) : recentNotes.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {recentNotes.map((note, i) => (
              <div
                key={note.id || i}
                className="group p-3 sm:p-4 bg-white/5 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                    <div className="p-1.5 sm:p-2 bg-gradient-to-r from-violet-500 to-purple-600 rounded-md sm:rounded-lg flex-shrink-0">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white group-hover:text-purple-200 transition-colors text-sm sm:text-base truncate">
                        {note.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-white/60 truncate">
                        Sem {note.semester} • {note.subject}
                      </p>
                      <p className="text-xs text-white/40 mt-1 truncate">Uploaded by {note.uploadedBy}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                    {/* Rating Display */}
                    {note.averageRating > 0 && (
                      <div className="flex items-center text-yellow-400">
                        <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1 fill-yellow-400" />
                        <span className="text-xs sm:text-sm font-medium">
                          {note.averageRating.toFixed(1)}
                        </span>
                      </div>
                    )}
                    
                    {/* Download Count */}
                    <div className="flex items-center text-white/60">
                      <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span className="text-xs sm:text-sm">{note.downloads || 0}</span>
                    </div>
                    
                    {/* Preview Button */}
                    <button
                      onClick={() => window.open(`https://drive.google.com/file/d/${note.fileId}/view`, '_blank')}
                      className="p-1.5 sm:p-2 bg-white/10 rounded-md sm:rounded-lg hover:bg-white/20 transition-colors"
                    >
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-white/70" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-white/30 mx-auto mb-3 sm:mb-4" />
            <p className="text-white/60 text-base sm:text-lg mb-2 sm:mb-4">No notes available yet</p>
            <p className="text-white/50 text-sm sm:text-base">Be the first to upload and share knowledge!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;