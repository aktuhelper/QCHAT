
import UserModel from '../database/usermodel.js'; // Import your user model


let waitingUsers = [];  // Stores users waiting to chat
let activeChats = {};   // Stores active chat rooms
let userSocketMap = {}; // Maps userId to socketId

// Function to start a chat
export const startChat = (io, socket, userId) => {
    console.log(`User ${userId} wants to chat`);

    // Prevent duplicate users in the waiting list
    if (userSocketMap[userId] && userSocketMap[userId] !== socket.id) {
        console.log(`User ${userId} had an old socket, replacing with new one.`);
        userSocketMap[userId] = socket.id;
        waitingUsers = waitingUsers.filter(user => user.userId !== userId); // Remove old entry
    }
    

    // Add the user to the waiting list
    waitingUsers.push({ userId, socketId: socket.id });
    userSocketMap[userId] = socket.id;

    console.log(`Current waiting users:`, waitingUsers); // Debug log to check the list

    if (waitingUsers.length > 1) {
        const user1 = waitingUsers.shift();
        const user2 = waitingUsers.shift();

        // Fetch user details (like name and profile_pic) from the database
        Promise.all([
            UserModel.findById(user1.userId),  // Fetch user1 data from the database
            UserModel.findById(user2.userId)   // Fetch user2 data from the database
        ])
        .then(([user1Data, user2Data]) => {
            if (!user1Data || !user2Data) {
                console.error('User data not found!');
                return;
            }

            // Create a unique chat room ID
            const chatRoomId = `${user1.userId}-${user2.userId}`;
            activeChats[chatRoomId] = {
                users: { [user1.userId]: user1.socketId, [user2.userId]: user2.socketId },
                messages: []
            };

            // Send chat-started event with full user data to both users
            io.to(user1.socketId).emit('chat-started', chatRoomId, { 
                userId: user2.userId, 
                username: user2Data.name, 
                profile_pic: user2Data.profile_pic, 
                socketId: user2.socketId 
            });
            io.to(user2.socketId).emit('chat-started', chatRoomId, { 
                userId: user1.userId, 
                username: user1Data.name, 
                profile_pic: user1Data.profile_pic, 
                socketId: user1.socketId 
            });

            console.log(`Chat started between ${user1.userId} and ${user2.userId}`);
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
        });
    } else {
        console.log(`User ${userId} is waiting for a partner...`);
        io.to(socket.id).emit('no-partner-available'); // Notify the user if no partner is available
    }
};

// Function to send a message
export const sendMessage = (io, chatRoomId, senderId, message) => {
    const chat = activeChats[chatRoomId];
  
    if (chat) {
      // Ensure receiverId is defined
      if (!message.receiverId) {
        console.error('Receiver ID is undefined!');
        return;
      }
  
      const newMessage = { ...message, senderId, createdAt: new Date().toISOString() };
      chat.messages.push(newMessage);
  
      // Emit to both users in the chat
      Object.entries(chat.users).forEach(([userId, socketId]) => {
        if (userId !== senderId) {
          io.to(socketId).emit('new-message', chatRoomId, chat.messages);
        }
      });
    } else {
      console.error('Chat room not found!');
    }
};

// Function to handle user disconnect
export const handleDisconnect = (socket, io) => {
    console.log(`User disconnected: ${socket.id}`);

    // Remove from waiting list
    waitingUsers = waitingUsers.filter(user => user.socketId !== socket.id);

    const userId = socket.userId;
    if (userId) {
        delete userSocketMap[userId];

        for (let chatRoomId in activeChats) {
            if (activeChats[chatRoomId].users[userId]) {
                const partnerId = Object.keys(activeChats[chatRoomId].users).find(id => id !== userId);
                const partnerSocketId = activeChats[chatRoomId].users[partnerId];

                io.to(partnerSocketId).emit('chat-ended', "Partner disconnected");
                delete activeChats[chatRoomId];
                break;
            }
        }
    }
};

// Function to end the chat
export const endChat = (io, userId) => {
    for (let chatRoomId in activeChats) {
        if (activeChats[chatRoomId].users[userId]) {
            console.log(`Ending chat for user ${userId} in chat room ${chatRoomId}`);

            // Notify both users in the chat room
            Object.values(activeChats[chatRoomId].users).forEach(socketId => {
                io.to(socketId).emit('chat-ended');
            });

            // Remove chat room and user from the socket map
            delete activeChats[chatRoomId];
            delete userSocketMap[userId];
            break;
        }
    }
};
// Function to handle typing indicators
export const handleTyping = (io, chatRoomId, senderId, isTyping) => {
    const chat = activeChats[chatRoomId];

    if (chat) {
        const receiverId = Object.keys(chat.users).find(id => id !== senderId);
        const receiverSocketId = chat.users[receiverId];

        if (receiverSocketId) {
            io.to(receiverSocketId).emit('typing-status', {
                senderId,
                isTyping,
                chatRoomId
            });
        }
    } else {
        console.error('Chat room not found for typing indicator!');
    }
};

