import express from 'express';
import connectDB from './database/db.js';
import dotenv from 'dotenv';
import cors from 'cors';
import authrouter from './Routes/authroutes.js';
import cookieParser from 'cookie-parser';
import userRouter from './Routes/userroute.js';
import { handleVideoSocket } from './socket/videocallSocket.js';
import http from 'http';
import { Server } from 'socket.io';
import { handleSocketConnection } from './socket/socket.js'; // Normal chat functionality
import {
  startChat,
  sendMessage,
  handleDisconnect,
  endChat,
  handleTyping
} from './socket/randomchatSocket.js'; // Updated random chat logic
import router from './Routes/convid.js';
import FriendRequest from './database/FriendRequestModel.js';
import UserModel from './database/usermodel.js';
import friendRequestRoute from './Routes/friendroute.js';
import acceptorreject from './Routes/acceptorreject.js';
import rou from './Routes/checkFriend.js';
import path from 'path';
import target from './Routes/targetuser.js';
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const __dirname= path.resolve();
connectDB();

const allowedOrigins = ['https://qchat-7gsn.onrender.com'];

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Routes
app.use('/api/auth', authrouter);
app.use('/api/user', userRouter);
app.use('/api/conv', router);
app.use('/api/friend-requests', friendRequestRoute);
app.use("/api/friends", acceptorreject);
app.use("/api/user", rou);
app.use('/api/users', target);
// Health Check

// HTTP + WebSocket server setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }
});

// Track user sockets by user ID
let userSockets = {}; // This keeps track of user socket connections

handleSocketConnection(io);

// WebSocket events
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Register user
  socket.on('register-user', (userId) => {
    userSockets[userId] = socket.id;
    console.log(`User ${userId} is connected with socket ${socket.id}`);
  });
  handleVideoSocket(io, socket); // 👈 Add this inside the `connection` event

  socket.on('typing', (chatRoomId, senderId, isTyping) => {
    console.log(`User ${senderId} is ${isTyping ? 'typing...' : 'not typing'} in ${chatRoomId}`);
    handleTyping(io, chatRoomId, senderId, isTyping);
  });
  //typing indicator in random chat
  socket.on('typing', (chatRoomId, senderId, isTyping) => {
    console.log(`User ${senderId} is ${isTyping ? 'typing...' : 'not typing'} in ${chatRoomId}`);
    handleTyping(io, chatRoomId, senderId, isTyping);
  });
  // Friend request handling
  socket.on('send-friend-request', async (senderId, receiverId) => {
    try {
      // Prevent sending request to self
      if (senderId === receiverId) {
        return socket.emit('error', 'You cannot send a friend request to yourself');
      }

      const sender = await UserModel.findById(senderId).select('friends');
      const receiver = await UserModel.findById(receiverId).select('friends');

      // Check if already friends
      if (sender.friends.includes(receiverId)) {
        return socket.emit('error', 'You are already friends with this user');
      }

      // Check if request already exists
      const existingRequest = await FriendRequest.findOne({ sender: senderId, receiver: receiverId });
      if (existingRequest) {
        return socket.emit('error', 'Friend request already sent');
      }

      // Create a new friend request
      const newRequest = new FriendRequest({ sender: senderId, receiver: receiverId, status: 'pending' });
      await newRequest.save();

      // Add sender details to the request
      const senderDetails = await UserModel.findById(senderId).select('name profile_pic');
      const requestWithSenderDetails = {
        ...newRequest.toObject(),
        sender: {
          _id: senderDetails._id,
          name: senderDetails.name,
          profile_pic: senderDetails.profile_pic,
        },
      };

      // Emit the friend request to the receiver if online
      const receiverSocketId = userSockets[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive-friend-request', requestWithSenderDetails);
        console.log(`Friend request sent to receiver ${receiverId}`);
      } else {
        console.log(`Receiver ${receiverId} is not online.`);
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      socket.emit('error', 'Error sending friend request');
    }
  });

  // Check if already friends
  socket.on('check-if-already-friends', async (senderId, receiverId) => {
    try {
      const sender = await UserModel.findById(senderId).select('friends');
      const isAlreadyFriends = sender.friends.includes(receiverId);
      socket.emit('friendStatus', { isAlreadyFriends });
    } catch (error) {
      console.error('Error checking friend status:', error);
      socket.emit('error', 'Error checking friend status');
    }
  });

  // Random chat logic
  socket.on('start-chat', (userId) => {
    console.log(`start-chat from ${userId}`);
    startChat(io, socket, userId);
  });

  socket.on('send-message', (chatRoomId, message) => {
    if (!chatRoomId || !message || !message.senderId) {
      console.error("Invalid send-message payload");
      return;
    }

    console.log(`send-message in room ${chatRoomId} by ${message.senderId}`);
    sendMessage(io, chatRoomId, message.senderId, message);
  });

  socket.on('end-chat', (userId) => {
    console.log(`end-chat from ${userId}`);
    endChat(io, userId);
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    handleDisconnect(socket, io);
  });

  // Error handling
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

app.use(express.static(path.join(__dirname,'/client/dist')))
app.get('*',(req,res)=>{
    res.sendFile(path.resolve(__dirname,'client','dist','index.html'))
})
// Start the server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
