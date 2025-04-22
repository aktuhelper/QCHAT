import mongoose from "mongoose";
import usermodel from "../database/usermodel.js";

export const handleSockeConnection = (io) => {
  const onlineUsers = new Set();
  const userSockets = new Map();
  const waitingQueue = []; // Queue for users waiting to be matched
  const activeChats = new Map(); // Track active chat rooms

  io.on("connection", async (socket) => {
    console.log("✅ User connected:", socket.id);

    const userId = socket.handshake.query.userId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log("❌ Invalid or missing user ID.");
      socket.disconnect();
      return;
    }

    let user;
    try {
      user = await usermodel.findById(userId).select("-password");
      if (!user) {
        console.log("❌ User not found.");
        socket.disconnect();
        return;
      }
    } catch (error) {
      console.error("❌ Error fetching user:", error);
      socket.disconnect();
      return;
    }

    userSockets.set(user._id.toString(), socket.id);
    onlineUsers.add(user._id.toString());
    io.emit("onlineUsers", Array.from(onlineUsers));

    // When user starts a random chat
    socket.on("startRandomChat", () => {
      console.log(`${user.name} is looking for a random chat!`);
      
      // Add user to waiting queue
      waitingQueue.push(user._id.toString());
      
      // Try to match the user with someone in the waiting queue
      if (waitingQueue.length >= 2) {
        const partnerId = waitingQueue.shift(); // Get the first user from the queue
        const partnerSocketId = userSockets.get(partnerId);

        if (partnerSocketId) {
          // Emit random chat started to both users
          io.to(socket.id).emit("randomChatStarted", { partnerId, room: socket.id });
          io.to(partnerSocketId).emit("randomChatStarted", {
            partnerId: user._id.toString(),
            room: partnerSocketId,
          });

          // Log the match
          console.log("Random chat started between:", user.name, partnerId);
        } else {
          console.log(`Partner with ID ${partnerId} not found.`);
        }
      } else {
        console.log(`Waiting for more users to join the random chat. Current waiting queue: ${waitingQueue.length}`);
      }
    });

    // Handle incoming random chat messages
    socket.on("randomChatMessage", (message) => {
      const room = message.room || socket.id;
      io.to(room).emit("randomChatMessage", message);
      console.log(`Message from ${user.name}:`, message);
    });

    // When user disconnects
    socket.on("disconnect", () => {
      console.log(`${user.name} disconnected`);
      onlineUsers.delete(user._id.toString());
      userSockets.delete(user._id.toString());
      io.emit("onlineUsers", Array.from(onlineUsers));
    });
  });
};
