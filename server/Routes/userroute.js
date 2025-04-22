import express from 'express';
import userAuth from '../middleware/userauth.js';
import { getUserData } from '../controllers/user.js';
import updateUserDetails from '../controllers/Update.js';
import searchUser from '../controllers/searchuser.js';


const userRouter = express.Router();

userRouter.get('/data', userAuth, getUserData);  
userRouter.post('/update', userAuth, updateUserDetails);
userRouter.get('/searchuser', searchUser);



export default userRouter;
