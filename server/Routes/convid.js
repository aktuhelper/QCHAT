import express from 'express';
import mongoose from 'mongoose';
import { ConversationModel } from '../database/conversationModel.js';  // Assuming this model exists

const router = express.Router();

// Endpoint to fetch conversation details
router.get('/:userId/:recipientId', async (req, res) => {
    const { userId, recipientId } = req.params;

    // Validate the ObjectIds to ensure they are correct
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(recipientId)) {
        return res.status(400).json({ message: 'Invalid userId or recipientId' });
    }

    try {
        // Find a conversation where either the user is the sender or receiver
        const conversation = await ConversationModel.findOne({
            $or: [
                { sender: userId, receiver: recipientId },  // user is sender
                { sender: recipientId, receiver: userId },  // recipient is sender
                { sender: userId },                        // user is only sender
                { receiver: userId },                      // user is only receiver
                { sender: recipientId },                   // recipient is only sender
                { receiver: recipientId }                  // recipient is only receiver
            ]
        }).lean();  // Use lean for better performance

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        res.json({ conversationId: conversation._id });  // Return the conversation ID
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
