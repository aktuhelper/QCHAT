// components/PrivateRoute.jsx
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AppContent } from '../context/AppContext'; // update path if needed

const PrivateRoute = ({ children }) => {
  const { isLoggedin } = useContext(AppContent);
  if (isLoggedin === undefined) return <div>Loading...</div>; // or a loading spinner

  return isLoggedin ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
