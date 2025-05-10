import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import usermodel from '../database/usermodel.js';
import transporter from '../config/nodemailer.js';
import dotenv from 'dotenv';
import { EMAIL_VERIFY_TEMPLATE, PASSWORD_RESET_TEMPLATE } from '../config/emailTemplates.js';
import { OAuth2Client } from 'google-auth-library';
dotenv.config();

const isValidEnvVariable = (variable, name) => {
  if (!variable) {
    throw new Error(`Missing environment variable: ${name}`);
  }
};

// Ensure required environment variables are present
isValidEnvVariable(process.env.JWT_SECRET, 'JWT_SECRET');
isValidEnvVariable(process.env.SENDER_EMAIL, 'SENDER_EMAIL');

export const register = async (req, res) => {
  const { email, name, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "Missing details" });
  }

  try {
    const existingUser = await usermodel.findOne({ $or: [{ email }, { name }] });
    if (existingUser) {
      const conflictField = existingUser.email === email ? "Email" : "Username";
      return res.status(409).json({ success: false, message: `${conflictField} already in use!` });
    }

    const hashpass = await bcrypt.hash(password, 10);
    const verifyOTP = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpireAt = Date.now() + 24 * 60 * 60 * 1000;

    const user = new usermodel({ email, name, password: hashpass, verifyOTP, otpExpireAt, isAccountverified: false });
    await user.save();

    const mailOption = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: 'Verify Your Email',
      html: EMAIL_VERIFY_TEMPLATE.replace("{{otp}}", verifyOTP).replace("{{email}}", email),
    };

    await transporter.sendMail(mailOption);

    return res.status(200).json({ success: true, message: 'OTP sent. Please verify your email.' });
  } catch (error) {
    console.error('Registration error:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required!' });
  }

  try {
    const user = await usermodel.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Invalid email!' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password!' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({ success: true, message: 'Login successful!' });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    });

    return res.status(200).json({ success: true, message: 'Logged out successfully!' });
  } catch (error) {
    console.error('Logout error:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const sendVerifyOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await usermodel.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.isAccountverified) {
      return res.status(400).json({ success: false, message: "Account already verified!" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000)); // Generate OTP
    user.verifyOTP = otp;  // Store OTP in verifyOTP field
    user.otpExpireAt = Date.now() + 24 * 60 * 60 * 1000; // Set OTP expiry (1 day)
    await user.save();

    const mailOption = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: 'Account Verification OTP',
      html: EMAIL_VERIFY_TEMPLATE.replace("{{otp}}", otp).replace("{{email}}", user.email),
    };

    await transporter.sendMail(mailOption);

    return res.status(200).json({ success: true, message: "Verification OTP sent to email." });
  } catch (error) {
    console.error('Error sending OTP:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


export const verifyEmail = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: "Missing details" });
  }

  try {
    const user = await usermodel.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.isAccountverified) {
      return res.status(200).json({ success: true, message: "Your email is already verified." });
    }

    if (String(user.verifyOTP) !== String(otp)) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (new Date(user.otpExpireAt).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    user.isAccountverified = true;
    user.verifyOTP = undefined;
    user.otpExpireAt = undefined;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: 'Email Verification Successful',
      text: 'Your email has been successfully verified.',
    });

    return res.status(200).json({ success: true, message: "Email verified successfully!" });
  } catch (error) {
    console.error('Verify error:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


// Check if user is authenticated
export const isAuthenticated = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    return res.status(200).json({ success: true, message: 'User is authenticated' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const sendResetOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }
  try {
    const user = await usermodel.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not Found' });
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.resetOTP = otp;
    user.resetOTPexpireAt = Date.now() + 15 * 60 * 1000; // 15 minutes expiration
    await user.save();
    const mailOption = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: 'Password Reset OTP',
      html: PASSWORD_RESET_TEMPLATE.replace("{{otp}}", otp).replace("{{email}}", user.email),
    };
    await transporter.sendMail(mailOption);
    return res.status(200).json({ success: true, message: "Password reset OTP sent to your email" });
  } catch (error) {
    console.error('Error sending OTP:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const resetpassword = async (req, res) => {
  const { email, otp, newpassword } = req.body;
  if (!email || !otp || !newpassword) {
    return res.status(400).json({ success: false, message: "Details are missing" });
  }
  try {
    const user = await usermodel.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not Found" });
    }
    if (user.resetOTP === "" || user.resetOTP !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
    if (user.resetOTPexpireAt < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP Expired" });
    }
    const hashedPass = await bcrypt.hash(newpassword, 10);
    user.password = hashedPass;
    user.resetOTP = '';
    user.resetOTPexpireAt = 0;
    await user.save();
    return res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Google token is required' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let user = await usermodel.findOne({ email });

    if (!user) {
      // Create a new user if not exists
      user = new usermodel({
        name,
        email,
        password: '', // optional, if you want to keep password login separate
        isAccountverified: true, // assume verified since Google verified the email
        avatar: picture,
        provider: 'google',
      });
      await user.save();
    }

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({ success: true, message: 'Logged in with Google', user });
  } catch (error) {
    console.error('Google login error:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid Google token' });
  }
};

