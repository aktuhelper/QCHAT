import mongoose from 'mongoose';

const friendRequestSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },  // "user" matches the model name in `userModel.js`
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },  // "user" matches the model name in `userModel.js`
    status: { 
      type: String, 
      enum: ["pending", "accepted", "rejected"], 
      default: "pending" 
    },
  },
  { timestamps: true }
);

// Method to accept the request
friendRequestSchema.methods.acceptRequest = async function() {
  if (this.status !== "pending") {
    throw new Error("Only pending requests can be accepted.");
  }
  this.status = "accepted";
  await this.save();
};

// Method to reject the request
friendRequestSchema.methods.rejectRequest = async function() {
  if (this.status !== "pending") {
    throw new Error("Only pending requests can be rejected.");
  }
  this.status = "rejected";
  await this.save();
};

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);

export default FriendRequest;
