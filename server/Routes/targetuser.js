import express from 'express';
import UserModel from '../database/usermodel.js'; // Import your user model

const target = express.Router();

// Route to get user details by ID
target.get('/:userId', async (req, res) => {
  const { userId } = req.params; // Get the targetUserId from URL parameter

  try {
    // Find the user by ID
    const user = await UserModel.findById(userId).select('name  profile_pic ');

    // If user is not found, return an error
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return the user data (you can adjust what data to send back)
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default target;
