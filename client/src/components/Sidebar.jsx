import { useContext, useEffect, useState, useCallback } from "react";
import { IoChatbubbleEllipses } from "react-icons/io5";
import { FaUserPlus, FaImage, FaUserFriends, FaRandom } from "react-icons/fa";
import { RiLogoutBoxLine } from "react-icons/ri";
import { GoArrowUpLeft } from "react-icons/go";
import { AppContent } from "../context/AppContext";
import Avatar from "../components/Avatar";
import EditUserDetails from "./EditUserDetails";
import SearchUser from "./SearchUser";
import axios from "axios";
import { toast } from "react-toastify";
import { NavLink, useNavigate } from "react-router-dom";

const Sidebar = () => {
  const navigate = useNavigate();
  const { userdata, socket, backendUrl } = useContext(AppContent);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [isSearchUserOpen, setIsSearchUserOpen] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loadingFriendRequests, setLoadingFriendRequests] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [loadingConversations, setLoadingConversations] = useState(true);

  // Increment unread count for a specific user
  const incrementUnread = (userId) => {
    setUnreadCounts((prev) => ({
      ...prev,
      [userId]: (prev[userId] || 0) + 1,
    }));
  };

  // Clear unread count for a specific user
  const clearUnreadFor = (userId) =>
    setUnreadCounts((prev) => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });

  useEffect(() => {
    const savedUnread = localStorage.getItem('unreadCounts');
    if (savedUnread) {
      try {
        setUnreadCounts(JSON.parse(savedUnread));
      } catch (err) {
        console.error('Failed to parse unreadCounts from localStorage', err);
      }
    }
  }, []);

  // Fetch Friend Requests
  const fetchFriendRequests = useCallback(async () => {
    try {
      setLoadingFriendRequests(true);
      const response = await axios.get(`${backendUrl}/api/friend-requests/${userdata._id}`, { withCredentials: true });
      setFriendRequests(response.data.friendRequests);
    } catch (error) {
      toast.error('Failed to fetch friend requests');
    } finally {
      setLoadingFriendRequests(false);
    }
  }, [userdata._id, backendUrl]);

  // Fetch Friends
  const fetchFriends = useCallback(async () => {
    try {
      setLoadingFriends(true);
      const response = await axios.get(`${backendUrl}/api/friends/user/${userdata._id}/friends`, { withCredentials: true });
      setFriends(response.data.friends || []);
    } catch (error) {
      toast.error('Failed to fetch friends');
    } finally {
      setLoadingFriends(false);
    }
  }, [userdata._id, backendUrl]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchFriends();
        await fetchFriendRequests();
      } catch {
        const savedFriendRequests = localStorage.getItem('friendRequests');
        const savedFriends = localStorage.getItem('friends');
        if (savedFriendRequests) setFriendRequests(JSON.parse(savedFriendRequests));
        if (savedFriends) setFriends(JSON.parse(savedFriends));
      }
    };

    if (userdata?._id) fetchData();
  }, [userdata?._id, fetchFriends, fetchFriendRequests]);

  // Listen for online users and update online status
  useEffect(() => {
    if (!socket) return;

    const handleOnlineUsers = (onlineUserIds) => {
      setOnlineUsers(onlineUserIds);
    };

    socket.on('onlineUsers', handleOnlineUsers);

    return () => {
      socket.off('onlineUsers', handleOnlineUsers);
    };
  }, [socket]);

  // Handle new messages and update unread counts
  useEffect(() => {
    if (!socket || !userdata?._id) return;
  
    // Handle new message and update the unread count only for the receiver
    const handleNewMessage = (msg) => {
      console.log('📩 Received newMessage:', msg);
  
      // Ensure the message contains sender and receiver IDs
      if (!msg?.sender?._id || !msg?.receiver?._id) {
        console.warn('Invalid message structure:', msg);
        return;
      }
  
      // Check if the current user is the receiver (not the sender)
      const isReceiver = msg.receiver._id === userdata._id;
  
      if (isReceiver) {
        // Increment unread count for the receiver (only the receiver should have the unread count)
        const otherUserId = msg.sender._id; // This is the sender's ID
        incrementUnread(otherUserId); // This should update only the receiver's unread count
      }
    };
  
    // Set up the listener for 'newMessage' event
    socket.on('newMessage', handleNewMessage);
  
    // Clean up the listener when the component unmounts or dependencies change
    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, [socket, userdata?._id]);  // Dependencies: socket and userdata
  

  useEffect(() => {
    localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts));
  }, [unreadCounts]);

  // Fetch conversations
  useEffect(() => {
    if (!socket || !userdata?._id) return;

    const fetchConversations = () => {
      setLoadingConversations(true);
      socket.emit('fetchConversations');
    };

    const handleConversations = (convos) => {
      if (Array.isArray(convos) && convos.length > 0) {
        setConversations(convos);
        localStorage.setItem('conversations', JSON.stringify(convos));
      } else {
        setConversations([]);
      }
      setLoadingConversations(false);
    };

    fetchConversations();
    socket.on('conversation', handleConversations);

    return () => {
      socket.off('conversation', handleConversations);
    };
  }, [socket, userdata?._id]);

  // Register the user with the socket
  useEffect(() => {
    if (socket && userdata?._id) {
      socket.emit('register-user', userdata._id);
    }
  }, [socket, userdata?._id]);

  // Listen for friend request events
  useEffect(() => {
    if (!socket || !userdata?._id) return;

    const handleFriendRequestReceived = (newRequest) => {
      console.log('📩 New Friend Request Received:', newRequest);
      setFriendRequests((prevRequests) => {
        const updatedRequests = [...prevRequests, newRequest];
        localStorage.setItem('friendRequests', JSON.stringify(updatedRequests));
        return updatedRequests;
      });
      toast.info('You have a new friend request!');
    };

    socket.on('receive-friend-request', handleFriendRequestReceived);

    return () => {
      socket.off('receive-friend-request', handleFriendRequestReceived);
    };
  }, [socket, userdata?._id]);

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(backendUrl + '/api/auth/logout');
      if (data.success) {
        toast.success(data.message);
        navigate('/login');
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('An error occurred during logout.');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    const userId = userdata._id;
    try {
      const response = await axios.post(`${backendUrl}/api/friends/accept/${requestId}`, { userId });
      const newFriend = response.data.friend;

      setFriendRequests((prev) => {
        const updated = prev.filter((r) => r._id !== requestId);
        localStorage.setItem('friendRequests', JSON.stringify(updated));
        return updated;
      });

      await fetchFriends();
      toast.success('Friend request accepted!');
    } catch {
      toast.error('Error accepting friend request.');
    }
  };

  const handleRejectRequest = async (requestId) => {
    const userId = userdata._id;
    try {
      await axios.post(`${backendUrl}/api/friends/reject/${requestId}`, { userId });

      setFriendRequests((prev) => {
        const updated = prev.filter((r) => r._id !== requestId);
        localStorage.setItem('friendRequests', JSON.stringify(updated));
        return updated;
      });

      await fetchFriendRequests();
      toast.error('Friend request rejected.');
    } catch {
      toast.error('Error rejecting friend request.');
    }
  };

  const handleMessageClick = (friend) => {
    setUnreadCounts((prev) => {
      const updated = { ...prev };
      delete updated[friend._id];  // Clear the unread count for this friend
      return updated;
    });
  };

  if (!userdata) return <div className="text-white p-4">Loading...</div>;

  return (
   

    <div className="w-full h-full grid grid-cols-1 md:grid-cols-[70px,1fr] bg-[#161616] text-white">
      {/* Desktop Sidebar */}
          {/* Mobile/Tablet Top Header */}
          <div className="fixed top-0 left-0 right-0 z-50 md:hidden bg-[#161616] h-14 flex items-center justify-between px-4 shadow-md">
  <h1 className="text-2xl font-bold text-red-400">Qchatt</h1>
  <button
    onClick={() => setIsEditUserOpen(true)}
    title={userdata?.name}
    className="w-9 h-9 rounded-full border-2 border-blue-500 overflow-hidden"
  >
    <Avatar
      imageUrl={userdata?.profile_pic || "/avtarr.png"}
      name={userdata?.name}
      width={36}
      height={36}
      className="rounded-full"
    />
  </button>
</div>


      <div className="hidden md:flex flex-col justify-between items-center py-5 w-16 bg-black/30 text-gray-300 rounded-3xl backdrop-blur-2xl shadow-lg shadow-black/40">
        <div className="space-y-4">
          <button onClick={() => setShowFriends(false)} className={`w-12 h-12 flex justify-center items-center rounded-full transition-all duration-300 ${!showFriends ? "bg-blue-600" : "shadow-md shadow-blue-500/50"} hover:scale-110 hover:bg-blue-700`} title="Chat">
            <IoChatbubbleEllipses size={22} />
          </button>
        
          <button onClick={() => setIsSearchUserOpen(true)} className="w-12 h-12 flex justify-center items-center rounded-full transition-all duration-300 shadow-md shadow-blue-500/50 hover:scale-110 hover:bg-blue-700" title="Add User">
            <FaUserPlus size={22} />
          </button>
          <button
  onClick={() => setShowFriends(true)}
  className={`relative w-12 h-12 flex justify-center items-center rounded-full transition-all duration-300 ${
    showFriends ? "bg-blue-600" : "shadow-md shadow-blue-500/50"
  } hover:scale-110 hover:bg-blue-700`}
  title="Friends"
>
  <FaUserFriends size={22} />
  {friendRequests.length > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
      {friendRequests.length}
    </span>
  )}
</button>

        </div>
        <div className="flex flex-col items-center">
          <button className="relative mx-auto mb-6 hover:scale-105 transition-transform duration-300" title={userdata?.name} onClick={() => setIsEditUserOpen(true)}>
            <div className="before:absolute before:-inset-1 before:border-2 before:border-blue-500 before:animate before:rounded-full shadow-lg shadow-blue-500/50"></div>
            <Avatar imageUrl={userdata?.profile_pic || "/avtarr.png"} name={userdata?.name} width={48} height={48} className="rounded-full relative" />
          </button>
          <button onClick={handleLogout} className="w-10 h-10 flex justify-center items-center rounded-full transition-all duration-300 bg-red-600 hover:scale-110 hover:bg-red-700" title="Logout">
            <RiLogoutBoxLine size={22} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full h-full flex flex-col">
        <div className="h-16 flex items-center">
          <h2 className="text-xl font-bold p-4">{showFriends ? "Friends" : "Messages"}</h2>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-[calc(100vh-65px)] overflow-x-hidden overflow-y-auto scrollbar">
            {showFriends ? (
              <>
                {loadingFriendRequests ? (
                  <div className="text-center">Loading friend requests...</div>
                ) : friendRequests.length > 0 ? (
                  <div className="my-4">
                    <h3 className="text-lg text-white mb-3">Friend Requests</h3>
                    {friendRequests.map((request) => (
                      <div key={request._id} className="flex flex-col items-start py-3 px-2 cursor-pointer rounded-full">
                        <div className="flex items-center gap-3">
                          <Avatar imageUrl={request.sender?.profile_pic || "/default.png"} name={request.sender?.name} width={52} height={42} className="rounded-full" />
                          <h3 className="font-semibold text-base">{request.sender.name}</h3>
                        </div>
                        <div className="ml-auto flex gap-2 mt-2">
                          <button onClick={() => handleAcceptRequest(request._id)} className="bg-green-600 text-white py-1 px-4 rounded-full hover:bg-green-700">Accept</button>
                          <button onClick={() => handleRejectRequest(request._id)} className="bg-red-600 text-white py-1 px-4 rounded-full hover:bg-red-700">Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-400">No friend requests.</p>
                )}
                {loadingFriends ? (
                  <div className="text-center">Loading friends...</div>
                ) : friends.length === 0 ? (
                  <p className="text-center text-slate-400">No friends found.</p>
                ) : (
                  <>
            

            {friends.map((friend) => {
  const isOnline = onlineUsers.includes(friend._id);
  const conversation = conversations.find(
    (c) =>
      (c.sender._id === friend._id && c.receiver._id === userdata._id) ||
      (c.receiver._id === friend._id && c.sender._id === userdata._id)
  );
  const lastMsg = conversation?.lastMsg;

  // ✅ Define unread count for this friend
  const unread = unreadCounts[friend._id] || 0;

  return (
    <NavLink
      to={`/${friend._id}`}
      state={{ recipient: friend }}
      key={friend._id}
      onClick={() =>
        setUnreadCounts((prev) => {
          const updated = { ...prev };
          delete updated[friend._id];
          return updated;
        })
      }
      className="relative flex items-center gap-3 py-3 px-4 sm:px-6 md:px-4 hover:bg-black/40 hover:backdrop-blur-sm rounded-full transition-all duration-200"
    >
      <Avatar
        imageUrl={friend.profile_pic || "/avtarr.png"}
        name={friend.name}
        width={52}
        height={42}
        className="rounded-full"
      />
      <div className="flex flex-col overflow-hidden w-full">
        <h3 className="truncate font-semibold text-white">
          {friend.name} {isOnline && <span className="text-green-500">⦿</span>}
        </h3>
        <div className="text-slate-300 text-xs truncate">
          {lastMsg?.imageUrl ? (
            <span className="flex items-center gap-1">
              <FaImage /> <span>Image</span>
            </span>
          ) : (
            <span>{lastMsg?.text}</span>
          )}
        </div>
      </div>

      {/* ✅ Green unread badge */}
      {unread > 0 && (
       <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {unread}
        </span>
      )}
    </NavLink>
  );
})}



                  </>
                )}
              </>
              ) : loadingConversations ? (
  <div className="flex flex-col justify-center items-center mt-10 text-slate-400">
    <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-500 border-solid mb-4"></div>
    <p className="text-sm">Fetching conversations...</p>
  </div>
) : conversations.length === 0 ? (
  <div className="flex flex-col items-center justify-center mt-10 text-slate-400">
    <GoArrowUpLeft size={50} />
    <p className="mt-4 text-lg font-semibold text-center">
      No conversations yet.
    </p>
    <p className="mt-2 text-sm text-center text-gray-500">
      Explore users to start a conversation.
    </p>
  </div>
) : (
  conversations.map((conv) => {
    const otherUser = conv.sender?._id === userdata?._id ? conv.receiver : conv.sender;
    const isOnline = onlineUsers.includes(otherUser?._id);
    const unread = unreadCounts[otherUser?._id] || 0;
    return (
      <NavLink
        to={`/${otherUser?._id}`}
        state={{ recipient: otherUser }}
        key={conv._id}
        onClick={() => clearUnreadFor(otherUser?._id)}


                  className="relative flex items-center gap-3 py-3 px-2 hover:bg-black/40 hover:backdrop-blur-sm rounded-full cursor-pointer"
                >
                  <Avatar
                    imageUrl={otherUser?.profile_pic || "/avtarr.png"}
                    name={otherUser?.name}
                    width={55}
                    height={42}
                    className="rounded-full"
                  />
               <div className="flex flex-col overflow-hidden w-full">
  <h3 className="truncate font-semibold text-white">
    {otherUser?.name} {isOnline && <span className="text-green-500">⦿</span>}
  </h3>
  <div className="text-slate-300 text-xs overflow-hidden whitespace-nowrap text-ellipsis break-all max-w-[160px]">
    {conv?.lastMsg?.imageUrl ? (
      <span className="flex items-center gap-1">
        <FaImage /><span>Image</span>
      </span>
    ) : (
      <span>{conv?.lastMsg?.text}</span>
    )}
  </div>
</div>

                  {/* ✅ Green unread badge on the right */}
                  {unread > 0 && (
  <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
    {unread}
  </span>
)}

                </NavLink>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
 {/* Mobile Bottom Nav */}
<div className="fixed bottom-0 left-0 right-0 md:hidden bg-[#161616] text-white flex justify-around items-center py-2 z-50 backdrop-blur-md border-t-8 border-transparent border-t-[#161616]">
  <button onClick={() => setShowFriends(false)} className={`w-12 h-12 flex justify-center items-center rounded-full ${!showFriends ? "bg-blue-600" : "bg-gray-800"} transition-all duration-300`}>
    <IoChatbubbleEllipses size={22} />
  </button>
  <button onClick={() => setIsSearchUserOpen(true)} className="w-12 h-12 flex justify-center items-center rounded-full bg-gray-800 transition-all duration-300">
    <FaUserPlus size={22} />
  </button>
  <button
  onClick={() => setShowFriends(true)}
  className={`relative w-12 h-12 flex justify-center items-center rounded-full ${
    showFriends ? "bg-blue-600" : "bg-gray-800"
  } transition-all duration-300`}
>
  <FaUserFriends size={22} />
  {friendRequests.length > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
      {friendRequests.length}
    </span>
  )}
</button>

  <button onClick={handleLogout} className="w-12 h-12 flex justify-center items-center rounded-full bg-red-600 transition-all duration-300">
    <RiLogoutBoxLine size={22} />
  </button>
</div>


{/* Floating Chat Button (Mobile/Tablet Only) */}

<button
  onClick={() => navigate('/randomchat')}
  className="fixed bottom-16 left-1/2 transform -translate-x-1/2 bg-[#ef3434fd] text-white w-16 h-16 flex justify-center items-center rounded-full shadow-lg shadow-black/10 hover:bg-[#c91d4c] transition-all duration-300 z-50 md:hidden pulse-animation"
  title="Open Chat"
>
  <FaRandom size={26} />
</button>
      {isEditUserOpen && <EditUserDetails onClose={() => setIsEditUserOpen(false)} />}
      {isSearchUserOpen && <SearchUser onClose={() => setIsSearchUserOpen(false)} />}
    </div>
  );
};

export default Sidebar;
