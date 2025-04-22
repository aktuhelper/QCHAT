import express from "express";
import { acceptFriendRequest, rejectFriendRequest } from "../controllers/friend.js";
import userAuth from "../middleware/userauth.js"; // Import the authentication middleware
import {getLoggedInUserFriends } from "../controllers/fetchfriends.js";

const acceptorreject = express.Router();

// Route to accept a friend request (middleware for user authentication is used here)
acceptorreject.post("/accept/:requestId", userAuth, acceptFriendRequest);

// Route to reject a friend request (middleware for user authentication is used here)
acceptorreject.post("/reject/:requestId", userAuth, rejectFriendRequest);
acceptorreject.get('/user/:userId/friends',userAuth,getLoggedInUserFriends);
export default acceptorreject;
