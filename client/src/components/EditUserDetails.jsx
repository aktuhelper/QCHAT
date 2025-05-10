import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { AppContent } from "../context/AppContext"; 
import { toast } from "react-toastify";
import uploadFile from "../helper/upload.js"; 
import { Camera, X } from "lucide-react"; 

const EditUserDetails = ({ onClose }) => {
  const { backendUrl, userdata, setUserdata, getUserData } = useContext(AppContent);
  const [name, setName] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (userdata) {
      setName(userdata.name || "Developer");
      setPreviewImage(userdata.profile_pic || "/avtarr.png");
    }
  }, [userdata]);

  const handleOnChange = (e) => setName(e.target.value);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name cannot be empty");

    let uploadedImageUrl = previewImage;
    if (profileImage) {
      setIsUploading(true);
      uploadedImageUrl = await uploadFile(profileImage);
      setIsUploading(false);
      if (!uploadedImageUrl) return toast.error("Image upload failed");
    }

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/user/update`,
        { userId: userdata._id, name: name.trim(), profile_pic: uploadedImageUrl },
        { headers: { "Content-Type": "application/json" }, withCredentials: true }
      );

      if (data.success) {
        toast.success(data.message);
        setUserdata(data.data);
        getUserData();
        onClose();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-[#1A1A1A] p-6 rounded-xl shadow-lg w-full max-w-sm text-white relative">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white transition">
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <h2 className="text-xl font-semibold text-gray-100">Edit Profile</h2>
        <p className="text-sm text-gray-400 mb-4">Update your details below</p>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          {/* Profile Image Upload */}
          <div className="relative w-24 h-24 mx-auto">
            <img
              src={previewImage}
              alt="Profile"
              className="w-24 h-24 rounded-full border border-gray-600 object-cover"
            />
            <label className="absolute bottom-1 right-1 bg-gray-700 p-2 rounded-full cursor-pointer hover:bg-gray-600 transition">
              <Camera className="w-5 h-5 text-white" />
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          {/* Name Input */}
          <div>
            <label htmlFor="name" className="block text-gray-300 mb-1">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={handleOnChange}
              className="w-full py-2 px-3 border border-gray-600 bg-[#2A2A2A] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="border border-gray-500 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-700 transition">
              Cancel
            </button>
            <button type="submit" className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-red-700 transition" disabled={isUploading}>
              {isUploading ? "Uploading..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default React.memo(EditUserDetails);
