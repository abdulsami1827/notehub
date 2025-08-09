import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const UploadAccessRoute = ({ children }) => {
  const { hasUploadAccess, loading } = useAuth();

  if (loading) return null; // Or a spinner

  return hasUploadAccess ? children : <Navigate to="/dashboard" replace />;
};

export default UploadAccessRoute;
