import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    profile_pic: {
        type: String,
        default: ""
    },
    verifyOTP: {
        type: String,
        default: ""
    },
    verifyOTPexpireAt: {
        type: Number,
        default: 0
    },
    isAccountverified: {
        type: Boolean,
        default: false
    },
    resetOTP: {
        type: String,
        default: ""
    },
    resetOTPexpireAt: {
        type: Number,
        default: 0
    },
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }],
}, { timestamps: true });

const UserModel = mongoose.model("user", userSchema);

export default UserModel;
