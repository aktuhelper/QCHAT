const userSockets = new Map(); // userId -> socketId

export const handleVideoSocket = (io, socket) => {
  // Register the user
  socket.on("video-register", (userId) => {
    userSockets.set(userId, socket.id);
    console.log(`🎥 Registered: ${userId} -> ${socket.id}`);
    console.log("🗺️ Current userSockets map:", Array.from(userSockets.entries()));
    socket.emit("video-registered", { userId }); // Send confirmation back to client
  });

  // Handle incoming video call
  socket.on("video-call-user", ({ to, from, username, offer }) => {
    const targetSocketId = userSockets.get(to);
    console.log(`📩 Received video call for ${to} from ${from}. Target socket ID: ${targetSocketId}`);

    if (targetSocketId) {
      io.to(targetSocketId).emit("video-incoming-call", { from, username, offer });
    } else {
      console.log(`❌ No socket found for target user ${to}`);
      io.to(socket.id).emit("video-call-error", { message: "User is not online or not registered." });
    }
  });

  // Handle call acceptance
  socket.on("video-answer-call", ({ to, answer }) => {
    const callerSocketId = userSockets.get(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit("video-call-answered", { answer });
    }
  });

  // Handle ICE candidates
  socket.on("video-ice-candidate", ({ to, candidate }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("video-ice-candidate", { candidate });
    }
  });

  // Handle call decline
  socket.on("video-decline-call", ({ to }) => {
    const callerSocketId = userSockets.get(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit("video-call-declined");
    }
  });

  // Handle call end
  socket.on("video-end-call", ({ to }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("video-call-ended");
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    for (let [userId, id] of userSockets.entries()) {
      if (id === socket.id) {
        userSockets.delete(userId);
        console.log(`🔴 Disconnected: ${userId} (${id})`);
        break;
      }
    }
  });
};
