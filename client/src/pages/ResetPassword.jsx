import React, { useContext, useState } from 'react';
import { assets } from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { AppContent } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';  // Import Loader2 from lucide-react

const ResetPassword = () => {
  const { backendUrl } = useContext(AppContent);
  axios.defaults.withCredentials = true;
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [newpassword, setNewPassword] = useState('');
  const [isEmailSent, setEmailSent] = useState(false);  // set initial value to false
  const [otp, setOtp] = useState('');
  const [isOtpSubmit, setOtpSubmit] = useState(false);
  const [loading, setLoading] = useState(false);  // Add loading state
  const inputRefs = React.useRef([]);
  const { isLoggedin, userdata, getUserData } = useContext(AppContent);

  const handleInput = (e, index) => {
    // If the input is not empty and it's not the last input, focus the next one
    if (e.target.value.length > 0 && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text');
    const pasteArray = paste.split('');
    pasteArray.forEach((char, index) => {
      if (inputRefs.current[index]) {
        inputRefs.current[index].value = char;
      }
    });
  };

  const onSubmitEmail = async (e) => {
    e.preventDefault();
    setLoading(true);  // Set loading to true when submitting the email
    try {
      const { data } = await axios.post(backendUrl + '/api/auth/sendResetOtp', { email });
      data.success ? toast.success(data.message) : toast.error(data.message);
      data.success && setEmailSent(true);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);  // Set loading to false after the request
    }
  };

  const onSubmitOtp = async (e) => {
    e.preventDefault();
    const otpArray = inputRefs.current.map((e) => e.value);
    setOtp(otpArray.join(''));
    setOtpSubmit(true);
  };

  const onSubmitNewPassword = async (e) => {
    e.preventDefault();  // Prevent default behavior
    setLoading(true);  // Set loading to true while submitting the new password
    try {
      const { data } = await axios.post(backendUrl + '/api/auth/resetpassword', { email, otp, newpassword });
      data.success ? toast.success(data.message) : toast.error(data.message);
      data.success && navigate('/login');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);  // Set loading to false after the request
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen ">
     
      {/* Enter email Id */}
      {!isEmailSent && (
        <form onSubmit={onSubmitEmail} className="bg-[#1A1A1A] p-6 rounded-lg shadow-lg w-96 text-sm">
          <h1 className="text-white text-2xl font-semibold text-center mb-4">Reset Password</h1>
          <p className="text-center mb-6 text-indigo-300">Enter your Registered email address</p>
          <div className="mb-4 flex items-center gap-3 w-full px-5 py-2 rounded-full bg-[#1f1f20]">
            <img src={assets.mail_icon} alt="" className="w-5 h-5" />
            <input
              type="email"
              placeholder="Enter your Email Id"
              className="bg-transparent outline-none text-white w-full py-1.5 pl-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button className="w-full py-2.5 rounded-full bg-gradient-to-r from-red-500 to-red-900 text-white font-medium">
            {loading ? (  // Display Loader2 spinner while loading
              <div className="flex justify-center items-center">
                <Loader2 className="animate-spin mr-2" size={24} />
                Processing...
              </div>
            ) : (
              'Submit'
            )}
          </button>
        </form>
      )}
      {!isOtpSubmit && isEmailSent && (
        <form onSubmit={onSubmitOtp} className="bg-slate-900 p-6 rounded-lg shadow-lg w-96 text-sm">
          <h1 className="text-white text-2xl font-semibold text-center mb-4">Reset Password OTP</h1>
          <p className="text-center mb-6 text-indigo-300">Enter 6 digit code sent to your Email</p>

          <div onPaste={handlePaste} className="flex justify-between mb-8 gap-4">
            {Array(6)
              .fill(0)
              .map((_, index) => (
                <input
                  type="text"
                  maxLength="1"
                  key={index}
                  required
                  className="w-10 h-10 bg-[#333A5C] text-white text-center text-xl rounded-md"
                  ref={(e) => (inputRefs.current[index] = e)}
                  onInput={(e) => handleInput(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                />
              ))}
          </div>
          <button className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-900 text-white rounded-full">
            {loading ? (  // Display Loader2 spinner while loading
              <div className="flex justify-center items-center">
                <Loader2 className="animate-spin mr-2" size={24} />
                Processing...
              </div>
            ) : (
              'Submit'
            )}
          </button>
        </form>
      )}

      {isOtpSubmit && isEmailSent && (
        <form onSubmit={onSubmitNewPassword} className="bg-slate-900 p-6 rounded-lg shadow-lg w-96 text-sm">
          <h1 className="text-white text-2xl font-semibold text-center mb-4">New Password</h1>
          <p className="text-center mb-6 text-indigo-300">Enter new password</p>
          <div className="mb-4 flex items-center gap-3 w-full px-5 py-2 rounded-full bg-[#333A5C]">
            <img src={assets.lock_icon} alt="" className="w-5 h-5" />
            <input
              type="password"
              placeholder="Password"
              className="bg-transparent outline-none text-white w-full py-1.5 pl-2"
              value={newpassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <button className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-900 text-white rounded-full">
            {loading ? (  // Display Loader2 spinner while loading
              <div className="flex justify-center items-center">
                <Loader2 className="animate-spin mr-2" size={24} />
                Processing...
              </div>
            ) : (
              'Submit'
            )}
          </button>
        </form>
      )}
    </div>
  );
};

export default ResetPassword;
