import mongoose from "mongoose";
import usermodel from "../database/usermodel.js";
import { ConversationModel, MessageModel } from "../database/conversationModel.js";
import getConversation from "../controllers/getConversation.js";

export const handleSocketConnection = (io) => {
    const userSockets = new Map(); // Maps User ID → Socket ID
    const onlineUsers = new Map(); // Maps User ID → User Details

    io.on("connection", async (socket) => {
        console.log("✅ User connected:", socket.id);
        const userId = socket.handshake.query.userId;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            socket.disconnect();
            return;
        }

        let user;
        try {
            user = await usermodel.findById(userId).select("name profile_pic");
            if (!user) throw new Error("User not found");
        } catch (error) {
            console.error("Error fetching user:", error);
            socket.disconnect();
            return;
        }

        // Check that user._id exists before using .toString()
        if (user && user._id) {
            userSockets.set(user._id.toString(), socket.id);
            onlineUsers.set(user._id.toString(), user);
            io.emit("onlineUsers", Array.from(onlineUsers.keys())); // Emit to all clients
        } else {
            console.error('User or user._id is undefined');
            socket.disconnect();
            return;
        }

        // Send chat list on connection
        const chatList = await getConversation(userId);
        socket.emit("conversation", chatList);

        // Fetch conversations on demand
        socket.on("fetchConversations", async () => {
            try {
                const chatList = await getConversation(userId);
                socket.emit("conversation", chatList);
            } catch (error) {
                console.error("Error fetching conversations on demand:", error);
                socket.emit("conversation", []);
            }
        });

        // Typing Indicator: Listen for 'typing' event
        socket.on("typing", (data) => {
            const { senderId, receiverId } = data;

            // Validate receiverId
            if (receiverId && mongoose.Types.ObjectId.isValid(receiverId)) {
                const receiverSocket = userSockets.get(receiverId.toString());
                if (receiverSocket) {
                    // Emit typing indicator to receiver
                    io.to(receiverSocket).emit("typing", { senderId });
                }
            }
        });

        // Typing Indicator: Listen for 'stop-typing' event
        socket.on("stop-typing", (data) => {
            const { senderId, receiverId } = data;

            // Validate receiverId
            if (receiverId && mongoose.Types.ObjectId.isValid(receiverId)) {
                const receiverSocket = userSockets.get(receiverId.toString());
                if (receiverSocket) {
                    // Emit stop-typing indicator to receiver
                    io.to(receiverSocket).emit("stop-typing", { senderId });
                }
            }
        });

        // Fetch messages
        socket.on("message-page", async (chatuserId) => {
            try {
                if (!mongoose.Types.ObjectId.isValid(chatuserId)) {
                    console.error("Invalid chat user ID");
                    socket.emit("message", []);
                    return;
                }

                let conversation = await ConversationModel.findOne({
                    "$or": [
                        { sender: user._id, receiver: chatuserId },
                        { sender: chatuserId, receiver: user._id },
                    ],
                }).populate("messages");

                if (!conversation) {
                    socket.emit("message", []);
                    return;
                }

                await MessageModel.updateMany(
                    { _id: { $in: conversation.messages.map(msg => msg._id) }, seen: false },
                    { $set: { seen: true } }
                );

                socket.emit("message", conversation.messages);
                const senderSocket = userSockets.get(chatuserId.toString());
                if (senderSocket) {
                    io.to(senderSocket).emit("messagesRead", conversation._id);
                }
            } catch (error) {
                console.error("Error fetching messages:", error.message);
            }
        });

        // Handle new messages
        socket.on("newMessage", async (data, callback) => {
            try {
                const { senderId, receiverId, text, imageUrl, videoUrl } = data;

                if (!senderId || !receiverId) {
                    return callback({ success: false, error: "Missing senderId or receiverId" });
                }

                if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(receiverId)) {
                    return callback({ success: false, error: "Invalid senderId or receiverId" });
                }

                let conversation = await ConversationModel.findOne({
                    "$or": [
                        { sender: senderId, receiver: receiverId },
                        { sender: receiverId, receiver: senderId },
                    ],
                });

                if (!conversation) {
                    conversation = new ConversationModel({ sender: senderId, receiver: receiverId, messages: [] });
                    await conversation.save();
                }

                const message = new MessageModel({
                    text: text,
                    imageUrl: imageUrl || "",
                    videoUrl: videoUrl || "",
                    msgByUserId: senderId,
                    seen: false,
                });

                await message.save();
                conversation.messages.push(message._id);
                await conversation.save();

                const updatedConversation = await ConversationModel.findById(conversation._id).populate("messages");
                const updatedMessages = updatedConversation.messages.map(msg => ({
                    ...msg.toObject(),
                    senderId: msg.msgByUserId,
                }));

                const senderSocket = userSockets.get(senderId.toString());
                const receiverSocket = userSockets.get(receiverId.toString());

                if (senderSocket) {
                    io.to(senderSocket).emit("newMessage", {
                        sender: await usermodel.findById(senderId).select("name _id profile_pic"),
                        receiver: await usermodel.findById(receiverId).select("name _id profile_pic"),
                        text,
                        imageUrl,
                        videoUrl,
                        _id: message._id,
                        createdAt: message.createdAt,
                    });
                }

                if (receiverSocket) {
                    io.to(receiverSocket).emit("newMessage", {
                        sender: await usermodel.findById(senderId).select("name _id profile_pic"),
                        receiver: await usermodel.findById(receiverId).select("name _id profile_pic"),
                        text,
                        imageUrl,
                        videoUrl,
                        _id: message._id,
                        createdAt: message.createdAt,
                    });
                    io.to(receiverSocket).emit("message-user", { online: true });
                }

                // Refresh chat lists for both users
                const senderChatList = await getConversation(senderId);
                const receiverChatList = await getConversation(receiverId);

                if (senderSocket) io.to(senderSocket).emit("conversation", senderChatList);
                if (receiverSocket) io.to(receiverSocket).emit("conversation", receiverChatList);

                // Send callback
                if (callback && typeof callback === "function") {
                    callback({ success: true, messages: updatedMessages });
                }
            } catch (error) {
                console.error("Error handling new message:", error.message);
                if (callback && typeof callback === "function") {
                    callback({ success: false, error: "Failed to send message" });
                }
            }
        });

        // Handle user disconnect gracefully
        socket.on("disconnect", () => {
            if (user && user._id) {
                userSockets.delete(user._id.toString());
                onlineUsers.delete(user._id.toString());
                io.emit("onlineUsers", Array.from(onlineUsers.keys()));
                console.log(`❌ User disconnected: ${user._id.toString()}`);
            }
        });
    });
};
