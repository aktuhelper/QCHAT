import UserModel from "../database/usermodel.js";

// Controller function to get the list of friends for the logged-in user
export const getLoggedInUserFriends = async (req, res) => {
    try {
        // Access the authenticated user's ID from the middleware (attached in userAuth)
        const userId = req.body.userId;

        // Find the user by userId and populate the friends list
        const user = await UserModel.findById(userId).populate('friends', 'name profile_pic'); // Populate only relevant fields (name, email, profile_pic)

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Remove duplicate friends based on 'friendId'
        const uniqueFriends = user.friends.filter((friend, index, self) =>
            index === self.findIndex((f) => f._id.toString() === friend._id.toString())
        );

        // Respond with the list of unique friends
        return res.status(200).json({
            message: "Friends list fetched successfully",
            friends: uniqueFriends
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
};
