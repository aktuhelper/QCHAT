import express from 'express';
import { googleLogin, isAuthenticated, login, logout, register, resetpassword, sendResetOtp, sendVerifyOtp, verifyEmail } from '../controllers/auth.js';
import userAuth from '../middleware/userauth.js';

import { deleteConversation } from '../controllers/delete.js';
import getConversation from '../controllers/getConversation.js';
const authRouter= express.Router();
authRouter.post('/register',register)
authRouter.post('/login',login)
authRouter.post('/logout',logout)
authRouter.post('/send-verify-otp',userAuth,sendVerifyOtp)
authRouter.post('/verify-account',userAuth,verifyEmail)
authRouter.get('/isauth',userAuth,isAuthenticated)
authRouter.post('/sendResetOtp',sendResetOtp)
authRouter.post('/resetpassword',resetpassword)
authRouter.get('/getconversation',userAuth,getConversation)
authRouter.delete('/deleteConversation/:conversationId', userAuth, deleteConversation);
authRouter.post('/google-login', googleLogin);
export default authRouter 