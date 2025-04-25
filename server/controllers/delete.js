import { MessageModel, ConversationModel } from '../database/conversationModel.js'; // Assuming models are in 'models' directory
import mongoose from 'mongoose'; // For validating MongoDB ObjectId

// Controller for deleting a whole conversation
const deleteConversation = async (req, res) => {
    const userId = req.body.userId;  // Use userId from the request body
    const { conversationId } = req.params;

    // Validate the ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid userId format." });
    }

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ message: "Invalid conversationId format." });
    }

    try {
        // Find the conversation by its ID
        const conversation = await ConversationModel.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found." });
        }

        // Ensure the user is part of the conversation (either sender or receiver)
        if (!conversation.sender.equals(userId) && !conversation.receiver.equals(userId)) {
            return res.status(403).json({ message: "You are not authorized to delete this conversation." });
        }

        // Delete all messages related to this conversation
        await MessageModel.deleteMany({ _id: { $in: conversation.messages } });

        // Delete the conversation itself using deleteOne
        await conversation.deleteOne();  // Using deleteOne on the found conversation directly

        // Log success only if deletion is successful
        console.log('Conversation deleted successfully:', conversationId);

        // Send success response
        return res.status(200).json({ message: "Conversation deleted successfully." });
    } catch (error) {
        // Only log error if there is an actual failure in the process
        console.error('Error deleting conversation:', error);

        // Return a generic server error message
        return res.status(500).json({ message: "Server error while deleting conversation." });
    }
};

// Exporting controller with middleware attached to protect the route
export { deleteConversation };
