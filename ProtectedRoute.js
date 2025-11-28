import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, role }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or a proper loading component
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // If a specific role is required, check if user has that role
  if (role) {
    // Note: In a real app, you'd fetch user role from Firestore
    // For now, we'll assume role is stored in user claims or local storage
    const userRole = localStorage.getItem('userRole');
    if (userRole !== role) {
      return <Navigate to="/" />;
    }
  }

  return children;
};

export default ProtectedRoute;
