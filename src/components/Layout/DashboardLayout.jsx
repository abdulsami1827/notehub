// src/components/Layout/DashboardLayout.jsx

import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Upload,
  Users,
  Search,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  NotebookText,
  Settings,
  MessageSquare,
} from 'lucide-react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../services/firebase';
import { signOut } from 'firebase/auth';
import { useDashboard } from '../../contexts/DashboardContext';

const DashboardLayout = () => {
  const { userProfile, canUpload } = useDashboard();
  const [currentView, setCurrentView] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
        await signOut(auth);

        setTimeout(() => {
        navigate('/');
        }, 100); 
    } catch (error) {
        console.error('Error signing out:', error.message);
        alert('Logout failed. Please try again.');
    }
  };

  useEffect(() => {
    const path = location.pathname.split('/')[2] || 'dashboard';
    setCurrentView(path);
  }, [location]);

  // Close sidebar on route change for mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const sidebarItems = [
    { name: 'Dashboard', icon: <BookOpen className="w-5 h-5" />, view: 'dashboard' },
    { name: 'Browse Notes', icon: <Search className="w-5 h-5" />, view: 'notes' },
    { name: 'My Notes', icon: <NotebookText className="w-5 h-5" />, view: 'my-notes' },
    ...(canUpload
      ? [
          { name: 'Upload', icon: <Upload className="w-5 h-5" />, view: 'upload' },
          { name: 'Manage Access', icon: <Users className="w-5 h-5" />, view: 'manage-access' },
        ]
      : []),
      { name: 'AI Chat', icon: <MessageSquare className="w-5 h-5" />, view: 'ai-chat' },
      { name: 'Settings', icon: <Settings className="w-5 h-5" />, view: 'settings' },
  ];

  const handleNavigation = (view) => {
    setCurrentView(view);
    navigate(`/dashboard/${view === 'dashboard' ? '' : view}`);
    setSidebarOpen(false); // Close sidebar on mobile after navigation
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-900/10 via-purple-800/5 to-pink-900/10 animate-pulse"></div>
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/10 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-30 bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Mobile Menu Button & Logo */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
                <img src="/notehub-logo.png" alt="NoteHub Logo" className="w-7 h-7" />
                <div className="text-xl sm:text-2xl font-bold">
                    <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                    NoteHub
                    </span>
                </div>
                </div>
            </div>

            {/* User Info & Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center space-x-2 cursor-pointer">
                <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-medium text-sm sm:text-base hidden sm:inline">
                  {userProfile?.displayName ?? userProfile?.rollNumber}
                </span>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="group flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg text-white bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:scale-105"
              >
                <LogOut className="w-4 h-4 text-white group-hover:rotate-[-20deg] transition-transform duration-300" />
                <span className="font-medium text-sm sm:text-base hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar + Content */}
      <div className="flex relative z-10">
        {/* Sidebar */}
        <aside className={`
          fixed lg:relative inset-y-0 left-0 z-40
          w-64 bg-white/5 backdrop-blur-xl border-r border-white/10 
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          lg:block
        `}>
          <div className="pt-20 lg:pt-6 p-6 h-full overflow-y-auto">
            <nav className="space-y-2">
              {sidebarItems.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleNavigation(item.view)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    currentView === item.view
                      ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;