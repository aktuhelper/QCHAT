// Routes/friendRequestRoute.js
import express from 'express';
import mongoose from 'mongoose';
import FriendRequest from '../database/FriendRequestModel.js'; // Import the FriendRequest model
import UserModel from '../database/usermodel.js'; // Import the User model correctly

const router = express.Router();

// Route to get all friend requests for a user (both sent and received)
router.get('/:userId', async (req, res) => {
    const userId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }

    try {
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // ✅ Only fetch received requests
        const receivedRequests = await FriendRequest.find({ receiver: userId })
            .populate('sender', 'name profile_pic');

        res.status(200).json({ friendRequests: receivedRequests });

    } catch (error) {
        console.error('Error fetching friend requests:', error);
        res.status(500).json({ message: 'Error fetching friend requests' });
    }
});


export default router;
