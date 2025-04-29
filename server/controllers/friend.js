import FriendRequest from '../database/FriendRequestModel.js';
import UserModel from "../database/usermodel.js";
// Accept Friend Request
// Accept Friend Request
export const acceptFriendRequest = async (req, res) => {
  const { requestId } = req.params;
  const userId = req.body.userId;  // Get the user ID from the request body (after authentication)

  try {
    // Find the friend request and populate sender and receiver
    const friendRequest = await FriendRequest.findById(requestId).populate('sender receiver');
    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Ensure the current user is the receiver of the friend request
    if (friendRequest.receiver._id.toString() !== userId) {
      return res.status(403).json({ message: 'You are not authorized to accept this request' });
    }

    // Call the acceptRequest method on the FriendRequest model
    await friendRequest.acceptRequest();

    // Add the sender to receiver's friends list
    await UserModel.findByIdAndUpdate(friendRequest.receiver._id, {
      $push: { friends: friendRequest.sender._id }
    });

    // Add the receiver to sender's friends list
    await UserModel.findByIdAndUpdate(friendRequest.sender._id, {
      $push: { friends: friendRequest.receiver._id }
    });

    // Remove the friend request from the database after it is accepted
    await FriendRequest.findByIdAndDelete(requestId);

    // Fetch the updated friends list for both sender and receiver
    const sender = await UserModel.findById(friendRequest.sender._id).populate('friends');
    const receiver = await UserModel.findById(friendRequest.receiver._id).populate('friends');

    return res.status(200).json({
      message: 'Friend request accepted and friends list updated',
      senderFriends: sender.friends,
      receiverFriends: receiver.friends
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Something went wrong while accepting the friend request', error: error.message });
  }
};

// Reject Friend Request
// Reject Friend Request
export const rejectFriendRequest = async (req, res) => {
  const { requestId } = req.params;
  const userId = req.body.userId;  // Get the user ID from the request body (after authentication)

  try {
    // Find the friend request
    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Ensure the current user is the receiver of the friend request
    if (friendRequest.receiver._id.toString() !== userId) {
      return res.status(403).json({ message: 'You are not authorized to reject this request' });
    }

    // Call the rejectRequest method on the FriendRequest model
    await friendRequest.rejectRequest();

    // Remove the friend request from the database after it is rejected
    await FriendRequest.findByIdAndDelete(requestId);

    return res.status(200).json({ message: 'Friend request rejected and removed from database' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Something went wrong while rejecting the friend request', error: error.message });
  }
};
