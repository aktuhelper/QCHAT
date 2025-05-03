import { useEffect, useState, useRef, useContext } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { FaAngleLeft, FaPlus, FaTrash, FaUserPlus, FaSmile, FaTimes, FaVideo } from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import { IoMdSend } from "react-icons/io";
import Avatar from './Avatar';
import moment from 'moment';
import { AppContent } from '../context/AppContext';
import axios from 'axios';
import EmojiPicker from 'emoji-picker-react';
import { useNavigate } from 'react-router-dom';
import { useLayoutEffect } from 'react';
const MessagePage = () => {
  const { userId } = useParams();
  const currentMessage = useRef(null);
  const location = useLocation(); // Get the recipient from the state
  const { socket, userdata, backendUrl } = useContext(AppContent);
  const [isTyping, setIsTyping] = useState(false);
  const navigate = useNavigate();
  const [message, setMessage] = useState({ text: "", imageUrl: "" });
  const [allMessages, setAllMessages] = useState([]);
  const [recipientStatus, setRecipientStatus] = useState("");
  const [showFriendDialog, setShowFriendDialog] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(false); // For loading state
  const [previewImage, setPreviewImage] = useState("");
  const [isCheckingFriendStatus, setIsCheckingFriendStatus] = useState(false);
  const [conversationId, setConversationId] = useState(null); // Track conversation ID
  const [errorMessage, setErrorMessage] = useState(""); // Error message state
  const [friendStatus, setFriendStatus] = useState(""); // Track if users are already friends
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [friendStatusMessage, setFriendStatusMessage] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [recipient, setRecipient] = useState(null);

  const [deletionMessage, setDeletionMessage] = useState("");
  
  useEffect(() => {
    if (userId) {
      axios.get(`${backendUrl}/api/users/${userId}`)
        .then((res) => {
          setRecipient(res.data);
          console.log("✅ Fetched recipient data:", res.data);
        })
        .catch((err) => {
          console.error("❌ Error fetching recipient data:", err);
        });
    }
  }, [userId, backendUrl]);

  const handleVideoCall = () => {
    // Navigate to the video call page, passing recipient's _id in the URL
    navigate(`/videoCall/${recipient._id}`);
  };
  
  const fetchConversationId = async () => {
    if (!userId || !recipient?._id) return;

    try {
      const response = await axios.get(`${backendUrl}/api/conv/${userId}/${recipient._id}`);
      if (response.data.conversationId) {
        setConversationId(response.data.conversationId); // Set the conversation ID in state
      } else {
        console.error("Conversation not found");
      }
    } catch (error) {
      console.error("Error fetching conversation ID:", error);
    }
  };

  useEffect(() => {
    fetchConversationId();
  }, [userId, recipient?._id]);

  useEffect(() => {
    scrollToBottom();
  }, [allMessages]); 

  useEffect(() => {
    if (!conversationId) return;

    try {
      const storedMessages = localStorage.getItem(`messages_${conversationId}`);
      const parsedMessages = JSON.parse(storedMessages || '[]');
      setAllMessages(Array.isArray(parsedMessages) ? parsedMessages : []);
    } catch (error) {
      console.error('Error parsing messages from localStorage:', error);
      setAllMessages([]);
    }
  }, [conversationId]);

  useEffect(() => {
    try {
      const messages = JSON.parse(localStorage.getItem('allMessages') || '[]');
      setAllMessages(Array.isArray(messages) ? messages : []);
    } catch (error) {
      console.error('Error parsing messages from localStorage:', error);
      setAllMessages([]);
    }

    if (!socket || !userId || !recipient?._id) return;

    socket.emit('message-page', userId);

    const handleMessageUser = (data) => setRecipientStatus(data.online ? 'Online' : 'Offline');
    const handleMessage = (data) => {
      if (Array.isArray(data?.messages)) {
        setAllMessages(data.messages);
      } else if (Array.isArray(data)) {
        setAllMessages(data);
      } else if (data?.message) {
        setAllMessages((prev) => [...prev, data.message]);
      } else {
        console.warn('Invalid messages from server:', data);
        setAllMessages([]);
      }
    };

    const handleOnlineUsers = (onlineUsers) => {
      setRecipientStatus(onlineUsers.includes(recipient?._id) ? 'Online' : 'Offline');
    };

    const handleFriendRequestResponse = (data) => {
      if (data.status === 'sent' || data.status === 'accepted') {
        setFriendRequestSent(true);
      } else if (data.status === 'rejected') {
        setFriendRequestSent(false);
      } else if (data.error) {
        setErrorMessage(data.error);
      }
    };

    const handleTyping = (data) => {
      if (data.senderId === recipient?._id) {
        setIsTyping(true);
        if (isUserNearBottom()) scrollToBottom();
      }
    };

    const handleStopTyping = (data) => {
      if (data.senderId === recipient?._id) setIsTyping(false);
    };

    socket.on('message-user', handleMessageUser);
    socket.on('message', handleMessage);
    socket.on('newMessage', handleReceiveMessage);
    socket.on('onlineUsers', handleOnlineUsers);
    socket.on('friendRequestResponse', handleFriendRequestResponse);
    socket.on('typing', handleTyping);
    socket.on('stop-typing', handleStopTyping);

    return () => {
      socket.off('message-user', handleMessageUser);
      socket.off('message', handleMessage);
      socket.off('newMessage', handleReceiveMessage);
      socket.off('onlineUsers', handleOnlineUsers);
      socket.off('friendRequestResponse', handleFriendRequestResponse);
      socket.off('typing', handleTyping);
      socket.off('stop-typing', handleStopTyping);
    };
  }, [socket, userId, recipient]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (currentMessage.current) {
        currentMessage.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [allMessages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.text.trim() && !message.imageUrl) return;
    if (!userdata?._id) return;

    const tempMessageId = Date.now().toString();

    const newMessage = {
      _id: tempMessageId,
      senderId: userdata._id,
      receiverId: userId,
      text: message.text,
      imageUrl: message.imageUrl,
      createdAt: new Date().toISOString(),
    };

    setAllMessages((prev) => [...prev, newMessage]);

    socket.emit('newMessage', newMessage, (serverResponse) => {
      if (serverResponse?.success) {
        setAllMessages(serverResponse.messages);
        socket.emit('fetchConversations');
        fetchConversationId();
      } else {
        setAllMessages((prev) => prev.filter(msg => msg._id !== tempMessageId));
      }
    });

    setMessage({ text: "", imageUrl: "" });
    setPreviewImage("");

    setTimeout(() => {
      scrollToBottom();
    }, 100);
  };

  const handleReceiveMessage = (newMessage) => {
    if (!userdata?._id || !recipient?._id) {
      console.warn("🚫 Missing userdata._id or recipient._id, skipping message display.");
      return;
    }

    const senderId = newMessage.senderId || newMessage.sender?._id;
    const receiverId = newMessage.receiverId || newMessage.receiver?._id;

    const isCurrentChat = 
      (senderId === userdata._id && receiverId === recipient._id) || 
      (senderId === recipient._id && receiverId === userdata._id);

    if (isCurrentChat) {
      setAllMessages((prev) => {
        if (!Array.isArray(prev)) {
          const updated = [newMessage];
          return updated;
        }

        const alreadyExists = prev.some((msg) => msg._id === newMessage._id);
        if (!alreadyExists) {
          const updated = [...prev, newMessage];
          return updated;
        } 
        return prev;
      });

      fetchConversationId();
    }
  };

  useLayoutEffect(() => {
    if (currentMessage.current) {
      currentMessage.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allMessages]);

  const handleSendImage = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoadingImage(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      setMessage((prev) => ({ ...prev, imageUrl: reader.result }));
      setPreviewImage(reader.result);
      setIsLoadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleCancelImagePreview = () => {
    setPreviewImage("");
    setMessage((prev) => ({ ...prev, imageUrl: "" }));
  };

  useEffect(() => {
    if (conversationId) {
      localStorage.setItem(`messages_${conversationId}`, JSON.stringify(allMessages));
    }
  }, [allMessages, conversationId]);

  const handleDeleteConversation = async () => {
    if (!conversationId) {
      setDeletionMessage("No conversation selected.");
      return;
    }

    setIsDeleting(true);
    try {
      const response = await axios.delete(
        `${backendUrl}/api/auth/deleteConversation/${conversationId}`,
        {
          headers: {
            Authorization: `Bearer ${userdata.token}`,
          },
        }
      );

      if (response.status === 200 || response.status === 204 || response.data.success) {
        setAllMessages([]);
        setConversationId(null);
        localStorage.removeItem('conversationId');
        localStorage.removeItem('allMessages');
        setDeletionMessage("Conversation deleted successfully.");
        socket.emit('fetchConversations');
      } else {
        setDeletionMessage("Unexpected server response.");
      }
    } catch (error) {
      setDeletionMessage(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!userdata?._id || friendStatus === "You are already friends." || isCheckingFriendStatus) return;
    setIsCheckingFriendStatus(true);

    try {
      const { data } = await axios.get(
        `${backendUrl}/api/user/${userdata._id}/friend-status/${userId}`,
        { headers: { Authorization: `Bearer ${userdata.token}` } }
      );

      if (data.isAlreadyFriends) {
        setFriendStatus("You are already friends.");
        setFriendStatusMessage("You are already friends.");
      } else {
        socket.emit('send-friend-request', userdata._id, userId);
        setFriendRequestSent(true);
      }
    } catch (err) {
      setFriendStatusMessage("Error checking friend status. Please try again.");
    } finally {
      setIsCheckingFriendStatus(false);
    }
  };

  const handleCloseDialog = () => {
    setShowFriendDialog(false);
    setFriendRequestSent(false);
    setErrorMessage(""); 
  };

  const typingTimeout = useRef(null);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setMessage((prev) => ({ ...prev, text }));

    if (!socket || !userdata?._id || !userId) return;

    socket.emit("typing", { senderId: userdata._id, receiverId: userId });

    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("stop-typing", { senderId: userdata._id, receiverId: userId });
    }, 1500);
  };

  const handleCheckFriendStatus = async () => {
    if (!userdata || !userdata._id) {
      console.log("User data is not available.");
      return;
    }

    try {
      const response = await axios.get(
        `${backendUrl}/api/user/${userdata._id}/friend-status/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${userdata.token}`,
          },
        }
      );

      if (response.data.isAlreadyFriends) {
        setFriendStatus("You are already friends.");
        setFriendRequestSent(false);
        setFriendStatusMessage("You are already friends.");
      } else {
        setFriendStatus(""); 
        setFriendStatusMessage(""); 
      }
    } catch (error) {
      console.log("Error checking friend status:", error);
      setFriendStatusMessage("Error checking friend status. Please try again.");
    }
  };

  const scrollToBottom = () => {
    currentMessage.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const isUserNearBottom = () => {
    const messageContainer = document.querySelector('section.flex-1.overflow-y-auto');
    if (!messageContainer) return true;

    const threshold = 100;
    const position = messageContainer.scrollTop + messageContainer.clientHeight;
    const height = messageContainer.scrollHeight;

    return height - position < threshold;
  };


  return (
    <div className="h-screen flex flex-col text-white bg-[url('../assets/bg.jpg')] bg-cover bg-center bg-no-repeat relative">
      {/* Header */}
      <header className="sticky top-0 z-10 h-16 bg-[#1A1A1A] flex justify-between items-center px-4 shadow-md">
        <div className="flex items-center gap-4">
          <Link to="/" className="lg:hidden text-white hover:text-green-400 transition">
            <FaAngleLeft size={25} />
          </Link>
          <Avatar width={50} height={50} imageUrl={recipient?.profile_pic} />
          <div>
            <h3 className="font-semibold text-lg">{recipient?.name || "User"}</h3>
            {isTyping ? (
  <div className="flex items-center space-x-1">
  <span className="w-2 h-2 bg-green-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
  <span className="w-2 h-2 bg-green-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
  <span className="w-2 h-2 bg-green-300 rounded-full animate-bounce"></span>
</div>

) : (
  <p className={`text-sm ${recipientStatus === "Online" ? "text-green-400" : "text-red-500"}`}>
    {recipientStatus}
  </p>
)}

          </div>
        </div>

        <div className="flex gap-3">
        <button 
            className="text-gray-300 hover:bg-white/20 rounded-full p-2 transition"
            onClick={handleVideoCall} // Open the video call
          >
            <FaVideo size={20} />
          </button>
          {/* Add Friend Button */}
          {friendStatus !== "You are already friends." && (
  <button
    className="text-gray-300 hover:bg-white/20 rounded-full p-2 transition"
    onClick={async () => {
      await handleCheckFriendStatus(); // Wait for status check
      setShowFriendDialog(true); // Then show dialog
    }}
  >
    <FaUserPlus size={20} />
  </button>
)}


          {/* Delete Button */}
          <button
  className="text-gray-300 hover:bg-white/20 rounded-full p-2 transition"
  onClick={() => setShowDeleteDialog(true)}
>
  <FaTrash size={20} />
</button>



          <button className="text-gray-300 hover:text-gray-100 transition">
            <HiDotsVertical size={22} />
          </button>
        </div>
      </header>

      <section className="flex-1 overflow-y-auto px-4 py-2">
  <div className="flex flex-col gap-2">
    {allMessages.map((msg, index) => {
      const isLastMessage = index === allMessages.length - 1;

      return (
        <div
          key={msg._id || `${index}-${msg.text}`} 
          ref={isLastMessage ? currentMessage : null} // Assign ref only to the last message
          className={`flex justify-${msg.senderId === userdata?._id ? 'end' : 'start'} p-3 rounded-3xl min-w-[120px] min-h-[40px] shadow-lg`}
        >
          <div
            className={`${
              msg.senderId === userdata?._id
                ? 'bg-[#0078FF] text-white max-w-[45%] ml-auto'
                : 'bg-[#1A1A1A] text-white max-w-[50%] mr-auto'
            } p-3 rounded-3xl`}
          >
            {msg.imageUrl && (
              <img
                src={msg.imageUrl}
                className="max-w-full max-h-80 w-auto object-contain rounded-lg"
                alt="Message"
              />
            )}
            <p className="text-sm break-words">{msg.text}</p>
            <p className="text-xs text-gray-200 text-right">
              {moment(msg.createdAt).format('hh:mm A')}
            </p>
          </div>
        </div>
      );
    })}
    {/* Add the typing indicator */}
    {isTyping && (
      <div className="flex justify-start p-3 rounded-3xl">
        <div className="bg-[#1A1A1A] text-white max-w-[50%] p-3 rounded-3xl">
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-green-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-2 h-2 bg-green-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-2 h-2 bg-green-300 rounded-full animate-bounce"></span>
          </div>
        </div>
      </div>
    )}

    <div ref={currentMessage}></div> {/* This is the final element we scroll to */}
  </div>
</section>



      {/* Message Input */}
      <section className="sticky bottom-0 z-10 bg-[#1A1A1A] flex items-center px-2 sm:px-4 gap-2 sm:gap-3 shadow-inner py-3">
        <form className="flex-1 flex items-center gap-2 relative" onSubmit={handleSendMessage}>
          {/* File Upload Icon */}
          <label htmlFor="image-upload" className="absolute left-3 text-gray-400 cursor-pointer hover:text-white z-10">
            <FaPlus size={20} />
          </label>
          <input type="file" id="image-upload" accept="image/*" className="hidden" onChange={handleSendImage} />
          
          {/* Message Input with Emoji Button Inside */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Type a message..."
              className="w-full p-3 sm:p-4 pl-10 pr-10 sm:pl-12 sm:pr-12 rounded-full bg-[#2A2A2A] text-white outline-none border border-gray-600"
              value={message.text}
              onChange={handleInputChange}
            />
            {/* Emoji icon inside input (right side) */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-400 hover:text-yellow-300 cursor-pointer z-10">
              <FaSmile size={22} onClick={() => setShowEmojiPicker((prev) => !prev)} />
            </div>

            {/* Emoji Picker Dropdown (positioned absolutely below input) */}
            {showEmojiPicker && (
              <div className="absolute bottom-14 right-0 z-50">
                <EmojiPicker
                  onEmojiClick={(emojiData) => {
                    setMessage((prev) => ({ ...prev, text: prev.text + emojiData.emoji }));
                  }}
                  theme="dark"
                />
              </div>
            )}
          </div>

          {/* Send Button */}
          <button type="submit" className="text-green-400 hover:text-green-300">
            <IoMdSend size={35} />
          </button>
        </form>
      </section>

      {/* Image Preview */}
      {previewImage && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black/20 p-4 rounded-lg shadow-lg flex items-center gap-2">
          <img src={previewImage} className="w-32 h-32 object-cover rounded-md" alt="Preview" />
          <button onClick={handleCancelImagePreview} className="text-red-500 hover:text-red-700">
            <FaTimes size={20} />
          </button>
        </div>
      )}

      {/* Loading State for Image */}
      {isLoadingImage && (
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-black opacity-50 flex items-center justify-center">
          <span className="text-white">Loading...</span>
        </div>
      )}

      {/* Friend Request Dialog */}
{showFriendDialog && (
  <div className="fixed inset-0 flex items-center justify-center bg-black/60">
    <div className="bg-[#1A1A1A] p-6 rounded-lg text-center w-80">
      <div className="flex justify-center">
        <Avatar width={80} height={80} imageUrl={recipient?.profile_pic} />
      </div>

      <h3 className="text-lg font-semibold mt-3">{recipient?.name}</h3>

      <div className="mt-4">
  {/* Show the friend status message */}
  {friendStatusMessage ? (
    <p className="text-sm text-gray-400">{friendStatusMessage}</p> // Show message (checking or error)
  ) : (
    <p className="text-sm text-gray-400">Checking friend status...</p>
  )}

  {/* Conditionally display buttons based on friend status */}
  {friendStatus === "You are already friends." ? (
    <>
     
    </>
  ) : (
    <>
      {/* Show the Send Friend Request button only if not friends */}
      {!friendRequestSent ? (  // Show button only if the friend request has not been sent
        <button
          className="mt-3 px-4 py-2 bg-green-500 text-white rounded-md"
          onClick={handleSendFriendRequest}
          disabled={isCheckingFriendStatus} // Disable button while checking status
        >
          {isCheckingFriendStatus ? "Checking..." : "Send Friend Request"}
        </button>
      ) : (
        // Show message if the friend request has been sent
        <p className="text-sm text-gray-400 mt-3">
          Friend request has been sent to {recipient?.name}.
        </p>
      )}
    </>
  )}
</div>


      <button
        className="mt-4 text-gray-400 hover:text-white"
        onClick={handleCloseDialog}
      >
        Close
      </button>
    </div>
  </div>
)}

{showDeleteDialog && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-[#1A1A1A] rounded-xl p-6 w-11/12 max-w-sm text-center shadow-lg text-white">
      {deletionMessage ? (
        <>
          <h2 className="text-lg font-semibold mb-4">✅ {deletionMessage}</h2>
          <button
            onClick={() => {
              setShowDeleteDialog(false);
              setDeletionMessage("");
            }}
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-full mt-4"
          >
            Close
          </button>
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold mb-4">Are you sure you want to delete this conversation?</h2>
          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={handleDeleteConversation}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-full"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
            <button
              onClick={() => setShowDeleteDialog(false)}
              className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-full"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  </div>
)}
   <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <h1 className="text-5xl font-bold text-red-400 opacity-10 select-none">Qchatt</h1>
      </div>
    </div>
  );
};

export default MessagePage;
