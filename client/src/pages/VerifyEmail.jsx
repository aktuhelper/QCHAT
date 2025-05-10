import React, { useContext, useEffect, useState } from 'react';
import { assets } from '../assets/assets';
import { AppContent } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';  // Import Loader2 from lucide-react
import { useLocation } from 'react-router-dom';

const VerifyEmail = () => {
  const navigate = useNavigate();
  axios.defaults.withCredentials = true;
  const inputRefs = React.useRef([]);
  const { backendUrl, isLoggedin, userdata, getUserData,setIsLoggedin } = useContext(AppContent);
  const [loading, setLoading] = useState(false);  // Add loading state
  const location = useLocation();
  const email = location.state?.email;
  
  const handleInput = (e, index) => {
    // If the input is not empty and it's not the last input, focus the next one
    if (e.target.value.length > 0 && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    // If the key is Backspace and the input is empty, focus the previous input
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

  const onSubmitHandler = async (e) => {
    try {
      e.preventDefault();
      setLoading(true);  // Set loading to true while submitting OTP
      const otpArray = inputRefs.current.map((e) => e.value);
      const otp = otpArray.join('');
      const { data } = await axios.post(backendUrl + '/api/auth/verify-account', {
        email,
        otp
      },{ withCredentials: true });
      

      if (data.success) {
        toast.success(data.message);
        setIsLoggedin(true);        // ✅ explicitly set login state
        getUserData();
        navigate('/');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);  // Set loading to false after the request is done
    }
  };

  useEffect(() => {
    if (isLoggedin && userdata && userdata.isAccountverified) {
      navigate('/');
    }
  }, [isLoggedin, userdata]);

  return (
    <div className="flex items-center justify-center min-h-screen ">
      
      <form onSubmit={onSubmitHandler} className="bg-[#1A1A1A] p-6 rounded-lg shadow-lg w-96 text-sm">
        <h1 className="text-white text-2xl font-semibold text-center mb-4">Email Verify OTP</h1>
        <p className="text-center mb-6 text-indigo-300">Enter 6 digit code sent to your Email & Check your Spam folder if email not received</p>

        <div onPaste={handlePaste} className="flex justify-between mb-8 gap-4">
          {Array(6)
            .fill(0)
            .map((_, index) => (
              <input
                type="text"
                maxLength="1"
                key={index}
                required
                className="w-10 h-10  bg-[#1f1f20] text-white text-center text-xl rounded-md"
                ref={(e) => (inputRefs.current[index] = e)}
                onInput={(e) => handleInput(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
              />
            ))}
        </div>
        <button className="w-full py-2.5 rounded-full bg-gradient-to-r from-red-500 to-red-900 text-white font-medium">
          {loading ? (  // Show spinner while loading
            <div className="flex justify-center items-center">
              <Loader2 className="animate-spin mr-2" size={24} />
              Verifying...
            </div>
          ) : (
            'Verify Email'
          )}
        </button>
      </form>
    </div>
  );
};

export default VerifyEmail;
