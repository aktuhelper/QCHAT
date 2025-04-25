import UserModel from "../database/usermodel.js";

const userSockets = new Map(); // userId -> socketId

export const handleVideoSocket = (io, socket) => {
  // Register user with socket
  socket.on("video-register", (userId) => {
    userSockets.set(userId, socket.id);
    console.log(`🎥 Registered: ${userId} -> ${socket.id}`);
    socket.emit("video-registered", { userId });
  });

  // Handle outgoing call to another user
  socket.on("video-call-user", async ({ to, from, offer }) => {
    const targetSocketId = userSockets.get(to);
    console.log(`Target Socket ID for user ${to}: ${targetSocketId}`); // Debug log

    if (targetSocketId) {
      try {
        // Fetch caller details from database
        const caller = await UserModel.findById(from).select("name profile_pic");
        console.log("Caller details:", caller); // Debug log

        if (!caller) throw new Error("Caller not found");

        // Fetch target user details
        const targetUser = await UserModel.findById(to).select("name profile_pic");
        console.log("Target user details:", targetUser); // Debug log

        if (!targetUser) throw new Error("Target user not found");

        // Emit incoming call to the target user with caller and target details
        io.to(targetSocketId).emit("video-incoming-call", {
          from,
          caller,  // Sending entire caller object
          targetUser,  // Sending target user details
          offer,
        });

      } catch (error) {
        console.error("Error fetching caller or target user:", error.message);
        io.to(socket.id).emit("video-call-error", {
          message: "Could not fetch user details.",
        });
      }
    } else {
      io.to(socket.id).emit("video-call-error", {
        message: "User is not online or not registered.",
      });
    }
  });

  // Handle call answer
  socket.on("video-answer-call", ({ to, answer }) => {
    const callerSocketId = userSockets.get(to);
    if (callerSocketId) {
      console.log(`Sending answer to ${to}`);
      io.to(callerSocketId).emit("video-call-answered", { answer });
    }
  });

  // Handle ICE candidate exchange
  socket.on("video-ice-candidate", ({ to, candidate }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      console.log(`Sending ICE candidate to ${to}`);
      io.to(targetSocketId).emit("video-ice-candidate", { candidate });
    }
  });

  // Handle call decline
  socket.on("video-decline-call", ({ to }) => {
    const callerSocketId = userSockets.get(to);
    if (callerSocketId) {
      console.log(`Call declined by ${socket.id}`);
      io.to(callerSocketId).emit("video-call-declined");
    }
  });

  // Handle call end
  socket.on("video-end-call", ({ to }) => {
    const targetSocketId = userSockets.get(to);
    if (targetSocketId) {
      console.log(`Call ended by ${socket.id}`);
      io.to(targetSocketId).emit("video-call-ended");
    }
  });

  // Handle socket disconnect
  socket.on("disconnect", () => {
    // Clean up userSockets map on disconnect
    for (let [userId, id] of userSockets.entries()) {
      if (id === socket.id) {
        userSockets.delete(userId);
        console.log(`🔴 Disconnected: ${userId} (${id})`);
        break;
      }
    }
  });
};
