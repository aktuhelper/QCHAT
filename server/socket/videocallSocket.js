const userSockets = new Map(); // userId -> socketId

export const handleVideoSocket = (io, socket) => {
  socket.on("video-register", (userId) => {
    userSockets.set(userId, socket.id);
    console.log(`🎥 Registered: ${userId} -> ${socket.id}`);
    socket.emit("video-registered", { userId });
  });

  socket.on("video-call-user", ({ to, from, username, offer }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      console.log(`Sending incoming call to ${to}`); // Debug incoming call
      io.to(targetSocketId).emit("video-incoming-call", { from, username, offer });
    } else {
      console.log(`User ${to} is not online or registered.`);
      io.to(socket.id).emit("video-call-error", { message: "User is not online or not registered." });
    }
  });

  socket.on("video-answer-call", ({ to, answer }) => {
    const callerSocketId = userSockets.get(to);
    if (callerSocketId) {
      console.log(`Sending answer to ${to}`); // Debug answer
      io.to(callerSocketId).emit("video-call-answered", { answer });
    }
  });

  socket.on("video-ice-candidate", ({ to, candidate }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      console.log(`Sending ICE candidate to ${to}`); // Debug ICE candidate
      io.to(targetSocketId).emit("video-ice-candidate", { candidate });
    }
  });

  socket.on("video-decline-call", ({ to }) => {
    const callerSocketId = userSockets.get(to);
    if (callerSocketId) {
      console.log(`Call declined by ${socket.id}`);
      io.to(callerSocketId).emit("video-call-declined");
    }
  });

  socket.on("video-end-call", ({ to }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      console.log(`Call ended by ${socket.id}`);
      io.to(targetSocketId).emit("video-call-ended");
    }
  });

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
