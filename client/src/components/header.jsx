import React, { useContext, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
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

const App = () => {
  const { callIncoming, ringtoneRef } = useContext(AppContent);

  useEffect(() => {
    if (callIncoming) {
      ringtoneRef.current.play();
    } else {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, [callIncoming, ringtoneRef]);

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
        <Route path="/email-verify" element={<VerifyEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </div>
  );
};

export default App;
