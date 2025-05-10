import { useNavigate } from "react-router-dom";

const UserSearchCard = ({ user, onClose }) => {
  const navigate = useNavigate();

  const handleOpenChat = () => {
    if (!user || !user._id) return; // Validate user data before navigating
    navigate(`/${user._id}`, { state: { recipient: user } });
    onClose(); // Close the search modal
  };

  return (
    <div
      onClick={handleOpenChat}
      className="p-3 flex items-center gap-3 cursor-pointer hover:bg-black/20 rounded-lg"
    >
      <img
        src={user.profile_pic || '/avtarr.png'} // Add default image if profile_pic is missing
        alt="User"
        className="w-10 h-10 rounded-full"
      />
      <p className="text-white">{user.name || "Unnamed User"}</p> {/* Fallback for missing name */}
    </div>
  );
};

export default UserSearchCard;
