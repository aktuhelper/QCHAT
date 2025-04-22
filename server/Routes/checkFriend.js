import express from 'express';
import UserModel from '../database/usermodel.js';  // Adjust the path as needed
import userAuth from '../middleware/userauth.js';  // Import the userAuth middleware

const rou = express.Router();

// Route to check if two users are friends
rou.get('/:userId/friend-status/:otherUserId', userAuth, async (req, res) => {
  const { userId, otherUserId } = req.params;
  // Check if the userId in the URL matches the logged-in user
  if (userId !== req.body.userId) {
    return res.status(403).json({ success: false, message: 'You are not authorized to view this data.' });
  }

  try {
    // Fetch the logged-in user (userId) and populate their friends list
    const user = await UserModel.findById(userId).populate('friends');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if the other user is in the friends array
    const isAlreadyFriends = user.friends.some(friend => friend._id.toString() === otherUserId);

    // Respond with whether they are friends or not
    return res.status(200).json({ success: true, isAlreadyFriends });
  } catch (error) {
    console.error('Error checking friend status:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong' });
  }
});

export default rou;
