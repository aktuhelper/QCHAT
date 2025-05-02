import { MessageModel, ConversationModel } from '../database/conversationModel.js';
import mongoose from 'mongoose';

const deleteConversation = async (req, res) => {
    const { userId } = req.body;
    const { conversationId } = req.params;

    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(conversationId)) {
        return res.status(400).json({ message: "Invalid userId or conversationId format." });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    try {
        // Find conversation where user is either sender or receiver
        const conversation = await ConversationModel.findOne({
            _id: conversationId,
            $or: [
                { sender: userObjectId },
                { receiver: userObjectId }
            ]
        });

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found or not accessible by this user." });
        }

        // Delete all related messages
        await MessageModel.deleteMany({ _id: { $in: conversation.messages } });

        // Delete the conversation itself
        await conversation.deleteOne();

        console.log('Conversation deleted successfully:', conversationId);
        return res.status(200).json({ message: "Conversation deleted successfully." });
    } catch (error) {
        console.error('Error deleting conversation:', error);
        return res.status(500).json({ message: "Server error while deleting conversation." });
    }
};

export { deleteConversation };
