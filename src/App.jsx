// src/App.js - Updated with Homepage
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useEffect } from 'react';
import { auth } from './services/firebase';

// Import Components
import Homepage from './components/Home/Homepage';
import Dashboard from './components/Dashboard/Dashboard';
import NotesViewer from './components/Dashboard/NotesViewer';
import UploadNotes from './components/Dashboard/UploadNotes';
import ManageAccess from './components/Dashboard/ManageAccess';
import ProtectedRoute from './components/Common/ProtectedRoute';
import DashboardLayout from './components/Layout/DashboardLayout';
import useLenis from './services/useLenis';
import UploadAccessRoute from './components/Common/UploadAccessRoute';
import MyNotesViewer from './components/Dashboard/MyNotesViewer';
import Settings from './components/Dashboard/Settings';
import AIChatNotes from './components/Dashboard/AIChatNotes';

function App() {
  const { user, loading } = useAuth();
  useLenis();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && !user.emailVerified) {
        await user.reload();
        if (user.emailVerified) {
          console.log('User just verified email!');
          // You can optionally navigate or update Firestore here
        }
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="flex flex-col items-center space-y-6 animate-fadeIn">
        {/* Glowing spinner */}
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-500 to-purple-600 blur-xl opacity-70 animate-ping"></div>
          <div className="animate-spin rounded-full h-20 w-20 border-[6px] border-violet-400/30 border-t-violet-500 shadow-xl"></div>
        </div>

        <img src="/notehub-logo.png" alt="Logo" className="w-10 h-10" />

        {/* Loading text */}
        <div className="text-center">
          <h2 className="text-white text-2xl font-semibold tracking-wide">
            Loading <span className="text-purple-400">NotesShare</span>...
          </h2>
          <p className="text-white/60 mt-1 text-sm animate-pulse">
            Fetching knowledge from the cloud ✨
          </p>
        </div>
      </div>
    </div>
  );
}


  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          {/* Public Route */}
          <Route path="/" element={!user ? <Homepage /> : <Navigate to="/dashboard" />} />

          {/* Protected Dashboard Layout */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="notes" element={<NotesViewer />} />
            <Route path="my-notes" element={<MyNotesViewer />} />

            <Route path="upload" element={
              <UploadAccessRoute>
                <UploadNotes />
              </UploadAccessRoute>
            } />
            <Route path="manage-access" element={
              <UploadAccessRoute>
                <ManageAccess />
              </UploadAccessRoute>
            } />

            <Route path="ai-chat" element={<AIChatNotes />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;