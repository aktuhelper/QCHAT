import React, { useContext, useState, useRef } from 'react';
import { assets } from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { AppContent } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';

const Email = () => {
  const { backendUrl, getUserData } = useContext(AppContent);
  const navigate = useNavigate();
  const inputRefs = useRef([]);
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('enter-email'); // 'enter-email' | 'verify-otp'
  const [loading, setLoading] = useState(false);

  // Handle email submission
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${backendUrl}/api/auth/send-verify-otp`, { email });
      if (data.success) {
        toast.success(data.message);
        setStep('verify-otp');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP submission
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otp = inputRefs.current.map((ref) => ref.value).join('');
    setLoading(true);
    try {
      const { data } = await axios.post(`${backendUrl}/api/auth/verify-account`, { email, otp });
      if (data.success) {
        toast.success(data.message);
        getUserData(); // Update user context if needed
        navigate('/'); // Redirect after successful verification
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e, index) => {
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
    const paste = e.clipboardData.getData('text').slice(0, 6).split('');
    paste.forEach((char, i) => {
      if (inputRefs.current[i]) {
        inputRefs.current[i].value = char;
      }
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form
        onSubmit={step === 'enter-email' ? handleSendOtp : handleVerifyOtp}
        className="bg-[#1A1A1A] p-6 rounded-lg shadow-lg w-96 text-sm"
      >
        {step === 'enter-email' ? (
          <>
            <h1 className="text-white text-2xl font-semibold text-center mb-4">Verify Your Email</h1>
            <p className="text-center mb-6 text-indigo-300">Enter your email address to receive a verification code.</p>
            <div className="mb-4 flex items-center gap-3 w-full px-5 py-2 rounded-full bg-[#1f1f20]">
              <img src={assets.mail_icon} alt="" className="w-5 h-5" />
              <input
                type="email"
                placeholder="Enter your Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent outline-none text-white w-full py-1.5 pl-2"
                required
              />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-white text-2xl font-semibold text-center mb-4">Enter OTP</h1>
            <p className="text-center mb-6 text-indigo-300">
  Enter the 6-digit OTP sent to <strong>{email}</strong>. If you don’t see the email, please check your <strong>Spam</strong> folder.
</p>

            <div onPaste={handlePaste} className="flex justify-between mb-8 gap-4">
              {Array(6)
                .fill(0)
                .map((_, index) => (
                  <input
                    key={index}
                    maxLength="1"
                    ref={(el) => (inputRefs.current[index] = el)}
                    onInput={(e) => handleInput(e, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="w-10 h-10 bg-[#333A5C] text-white text-center text-xl rounded-md"
                    type="text"
                    required
                  />
                ))}
            </div>
          </>
        )}
        <button className="w-full py-2.5 rounded-full bg-gradient-to-r from-red-500 to-red-900 text-white font-medium">
          {loading ? (
            <div className="flex justify-center items-center">
              <Loader2 className="animate-spin mr-2" size={24} />
              Processing...
            </div>
          ) : step === 'enter-email' ? 'Send OTP' : 'Verify OTP'}
        </button>
      </form>
    </div>
  );
};

export default Email;
