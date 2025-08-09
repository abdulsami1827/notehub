import React, { createContext, useContext, useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "./AuthContext";

const DashboardContext = createContext();

export const useDashboard = () => useContext(DashboardContext);

export const DashboardProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const authContext = useAuth();
  
  // Handle different possible naming conventions in AuthContext
  const currentUser = authContext.user || authContext.currentUser;
  
  console.log('DashboardProvider - Auth Context:', authContext);
  console.log('DashboardProvider - Current User:', currentUser);
  console.log('DashboardProvider - User Profile:', userProfile);
  console.log('DashboardProvider - Loading:', loading);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      if (currentUser?.uid) {
        console.log('Fetching user profile for UID:', currentUser.uid);
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const userData = docSnap.data();
          console.log("Document data retrieved:", userData);
          setUserProfile(userData);
        } else {
          console.log("No document found for user:", currentUser.uid);
          setUserProfile(null);
        }
      } else {
        console.log("No current user or UID");
        setUserProfile(null);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = (newData) => {
    console.log('Updating user profile with:', newData);
    setUserProfile(prev => ({ ...prev, ...newData }));
  };

  useEffect(() => {
    console.log('DashboardProvider useEffect triggered, currentUser:', currentUser);
    if (currentUser?.uid) {
      fetchUserProfile();
    } else {
      setUserProfile(null);
      setLoading(false);
    }
  }, [currentUser]);

  return (
    <DashboardContext.Provider
      value={{ 
        userProfile, 
        updateUserProfile,
        loading,
        refetchUserProfile: fetchUserProfile,
        // Pass through auth context values that dashboard needs
        canUpload: authContext.hasUploadAccess || false,
        isLoggedIn: authContext.isLoggedIn || false
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};