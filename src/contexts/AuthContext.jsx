import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUserProfile, checkUploadAccess } from '../services/firestoreService';
import { extractRollNumber } from '../utils/validators';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [hasUploadAccess, setHasUploadAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshUserData = async (firebaseUser) => {
    if (firebaseUser && firebaseUser.emailVerified) {
      setUser(firebaseUser);

      // Get user profile
      const profile = await getUserProfile(firebaseUser.uid);
      setUserProfile(profile);

      // Check upload access
      const rollNumber = extractRollNumber(firebaseUser.email);
      const hasAccess = await checkUploadAccess(rollNumber);
      setHasUploadAccess(hasAccess);
    } else {
      // Not verified or not logged in
      setUser(null);
      setUserProfile(null);
      setHasUploadAccess(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.email, firebaseUser?.emailVerified);
      
      if (firebaseUser) {
        // Force reload the user to get the latest emailVerified status
        try {
          await firebaseUser.reload();
          console.log('After reload - emailVerified:', firebaseUser.emailVerified);
          
          // Get the fresh user object after reload
          const refreshedUser = auth.currentUser;
          await refreshUserData(refreshedUser);
        } catch (error) {
          console.error('Error reloading user:', error);
          await refreshUserData(firebaseUser);
        }
      } else {
        // Not logged in
        setUser(null);
        setUserProfile(null);
        setHasUploadAccess(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const refreshUploadAccess = async () => {
    if (user) {
      const rollNumber = extractRollNumber(user.email);
      const hasAccess = await checkUploadAccess(rollNumber);
      setHasUploadAccess(hasAccess);
    }
  };

  const forceRefresh = async () => {
    console.log('Force refresh called');
    if (auth.currentUser) {
      try {
        await auth.currentUser.reload();
        const refreshedUser = auth.currentUser;
        console.log('Force refresh - emailVerified:', refreshedUser.emailVerified);
        await refreshUserData(refreshedUser);
      } catch (error) {
        console.error('Error in force refresh:', error);
      }
    }
  };

  const value = {
    user,
    userProfile,
    hasUploadAccess,
    loading,
    refreshUploadAccess,
    forceRefresh, // Add this new method
    isLoggedIn: !!user && user.emailVerified 
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};