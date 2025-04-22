import React from 'react';
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

const App = () => {
  return (
    <div>
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
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/email-verify" element={<VerifyEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </div>
  );
};

export default App;
