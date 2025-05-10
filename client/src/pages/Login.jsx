import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { assets } from '../assets/assets.js';
import { AppContent } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

// Function to base64 URL decode
const base64UrlDecode = (base64Url) => {
  // Replace base64 URL-safe characters
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  // Pad with '=' to make it a valid base64 string
  base64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  // Decode the base64 string into a string
  const decoded = atob(base64);
  return decoded;
};

// Function to decode JWT
const decodeJwt = (token) => {
  if (!token) return null;
  
  // Split token into parts
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  // Decode the payload part (the second part of the JWT)
  const payload = parts[1];
  const decodedPayload = base64UrlDecode(payload);
  
  // Parse the JSON string to an object
  return JSON.parse(decodedPayload);
};

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { backendUrl, setIsLoggedin, getUserData, googleLogin } = useContext(AppContent); // Access googleLogin
  const [state, setState] = useState('Sign Up');
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
  
    try {
      axios.defaults.withCredentials = true;
      let data;
  
      if (state === 'Sign Up') {
        data = await axios.post(`${backendUrl}/api/auth/register`, { name, email, password });
  
        if (data.data.success) {
          navigate('/email-verify', { state: { email } });
          toast.success(data.data.message);
          
        }
      } else {
        data = await axios.post(`${backendUrl}/api/auth/login`, { email, password });
  
        if (data.data.success) {
          setIsLoggedin(true);
          getUserData();
          navigate('/');
        } else {
          toast.error(data.data.message);
        }
      }
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message || 'An error occurred';
  
      if (status === 409) {
        toast.error("Email or username already exists.");
      } 
      else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };
  

  const handleGoogleLogin = async (credentialResponse) => {
    try {
      const { credential } = credentialResponse;

      // Decode the Google ID token manually
      const decoded = decodeJwt(credential);
      const { name, email, picture } = decoded;

      console.log("Google User Info:", { name, email, picture });

      // Call googleLogin from AppContext to handle user data
      await googleLogin(credential); // Ensure that googleLogin is used here

      toast.success(`Welcome ${name.split(' ')[0]}!`);
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || "Google login failed.");
    }
  };

  return (
    <div className='flex items-center justify-center min-h-screen px-6 sm:px-0'>
      <div className='bg-[#1A1A1A] p-10 rounded-lg shadow-lg w-full sm:w-96 text-white'>
        <h2 className='text-3xl font-semibold text-center m-3'>
          {state === 'Sign Up' ? 'Create Account' : 'Login'}
        </h2>
        <p className='text-center text-sm mb-6'>
          {state === 'Sign Up' ? 'Create your account' : 'Login to Your account'}
        </p>

        <form onSubmit={onSubmitHandler}>
          {state === 'Sign Up' && (
            <div className='mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#1f1f20]'>
              <img src={assets.person_icon} alt="" className='w-5 h-5'/>
              <input 
                onChange={e => setName(e.target.value)} 
                value={name} 
                className='bg-transparent outline-none w-full text-white' 
                type='text' 
                placeholder='Enter your Username' 
                required 
              />
            </div>
          )}

          <div className='mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#1f1f20]'>
            <img src={assets.mail_icon} alt="" className='w-5 h-5'/>
            <input 
              onChange={e => setEmail(e.target.value)} 
              value={email} 
              className='bg-transparent outline-none w-full text-white' 
              type='email' 
              placeholder='Enter your Email id' 
              required 
            />
          </div>

          <div className='mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#1f1f20]'>
            <img src={assets.lock_icon} alt="" className='w-5 h-5'/>
            <input 
              onChange={e => setPassword(e.target.value)} 
              value={password} 
              className='bg-transparent outline-none w-full text-white' 
              type='password' 
              placeholder='Enter your Password' 
              required 
            />
          </div>

          <p onClick={() => navigate('/reset-password')} className='mb-4 text-indigo-500 cursor-pointer'>
            Forgot Password?
          </p>

          <button className='w-full py-2.5 rounded-full bg-gradient-to-r from-red-500 to-red-900 text-white font-medium'>
            {loading ? (
              <div className="flex justify-center items-center">
                <Loader2 className="animate-spin mr-2" size={24} />
                Processing...
              </div>
            ) : (
              state === 'Sign Up' ? 'Create Account' : 'Login'
            )}
          </button>
        </form>

        {/* Google Authentication Button */}
        <div className="mt-4 mb-4 flex items-center justify-center">
          <GoogleLogin
            onSuccess={handleGoogleLogin}
            onError={() => {
              toast.error("Google Sign In was unsuccessful. Try again.");
            }}
          />
        </div>

        {state === 'Sign Up' ? (
          <p className='text-gray-400 text-center text-xs mt-4'>
            Already have an Account? {' '}
            <span onClick={() => setState('Login')} className='text-blue-400 cursor-pointer underline'>Login here</span>
          </p>
        ) : (
          <p className='text-gray-400 text-center text-xs mt-4'>
            Don't have an Account? {' '}
            <span onClick={() => setState('Sign Up')} className='text-blue-400 cursor-pointer underline'>Sign up</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;
