import React, { useContext, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';
import MessagePage from './components/MessagePage';
import RandomChatPage from './components/randomChatPage';
import PrivateRoute from './components/PrivateRoute'; // Make sure this path is correct
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import VideoCall from './components/Videocall'; // Import your VideoCall component
import { AppContent } from './context/AppContext';
import IncomingCallPopup from './components/IncomingCallPopup'; // Import the Incoming Call Popup
import Email from './pages/email-verify';

const App = () => {
  const { callIncoming, ringtoneRef, userdata } = useContext(AppContent);

  useEffect(() => {
    if (callIncoming) {
      ringtoneRef.current.play();
    } else {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, [callIncoming, ringtoneRef]);

  // Check if user is logged in via Google and email is verified
  const isEmailVerified = userdata?.isAccountverified || userdata?.isGoogleAuthenticated;

  return (
    <div>
      {/* Conditionally show the Incoming Call Popup only if call is incoming */}
      {callIncoming && <IncomingCallPopup />}

      <audio
        ref={ringtoneRef}
        src="/sound/ringtone.mp3"
        loop
        preload="auto"
        style={{ display: 'none' }}
      />

      <ToastContainer />
      <Routes>
        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        >
          <Route
            path=":userId"
            element={
              <PrivateRoute>
                <MessagePage />
              </PrivateRoute>
            }
          />
        </Route>

        <Route
          path="/randomChat"
          element={
            <PrivateRoute>
              <RandomChatPage />
            </PrivateRoute>
          }
        />

        {/* Video Call Route */}
        <Route
          path="/videoCall/:targetUserId"
          element={
            <PrivateRoute>
              <VideoCall />
            </PrivateRoute>
          }
        />
        
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        {/* Show email verification page only if user is not verified */}
        <Route
          path="/email-verify"
          element={ <VerifyEmail />}
        />
           <Route
          path="/email"
          element={isEmailVerified ? <Navigate to="/" /> : <Email />}
        />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </div>
  );
};

export default App;
