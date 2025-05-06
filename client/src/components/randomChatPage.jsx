import React, { useEffect, useState, useRef, useContext } from 'react';
import { Link } from 'react-router-dom';
import { FaAngleLeft, FaUserPlus, FaPlus, FaTrash, FaSmile } from "react-icons/fa";
import { IoMdSend } from "react-icons/io";
import Avatar from './Avatar';
import moment from 'moment';
import { AppContent } from '../context/AppContext';
import '../App.css';
import axios from 'axios';
import EmojiPicker from 'emoji-picker-react';
import styles from './TypingIndicator.module.css';

const RandomChatPage = () => {
  const { userdata, socket, onlineUsersCount, backendUrl } = useContext(AppContent);

  const [message, setMessage] = useState({ text: "", imageUrl: "" });
  const [allMessages, setAllMessages] = useState([]);
  const [recipientStatus, setRecipientStatus] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [randomUser, setRandomUser] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupVisible, setPopupVisible] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentlyTyping, setCurrentlyTyping] = useState(false);

  const [showFriendDialog, setShowFriendDialog] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [friendStatus, setFriendStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [chatRoomId, setChatRoomId] = useState(null);
  const fileInputRef = useRef(null);

  const messageContainerRef = useRef(null);
  const chatStartedRef = useRef(false);

  useEffect(() => {
    if (randomUser?.name) {
      alert(`You are connected with ${randomUser.name}`);
    }

    if (socket) {
      socket.on("new-message", (chatRoomId, newMessages) => {
        if (newMessages.some(msg => msg.receiverId === userdata?._id || msg.senderId === userdata?._id)) {
          setAllMessages(newMessages);
        }
      });

      socket.on("statusUpdate", (status) => {
        if (randomUser?._id === status.userId) {
          setRecipientStatus(status.status);
        }
      });

      socket.on("chat-started", (roomId, partner) => {
        setIsSearching(false);
        setChatRoomId(roomId);
        setRandomUser(partner);
        setChatStarted(true);
        chatStartedRef.current = true;
        setRecipientStatus("Online");
      });

      socket.on("chat-ended", () => {
        const leftUser = randomUser?.username;
        setChatRoomId(null);
        setChatStarted(false);
        chatStartedRef.current = false;
        setRecipientStatus("Offline");
        setRandomUser(null);
        setPopupMessage(`${leftUser} left the chat`);
        setPopupVisible(true);
        setTimeout(() => setPopupVisible(false), 3000);
      });

      socket.on("typing-status", ({ senderId, isTyping: typingStatus, chatRoomId: typingRoomId }) => {
        if (typingRoomId === chatRoomId && senderId === randomUser?.userId) {
          setIsTyping(typingStatus);
        }
      });
      

      socket.on('friendRequestResponse', (data) => {
        if (data.status === 'sent' || data.status === 'accepted') {
          setFriendRequestSent(true);
        } else if (data.status === 'rejected') {
          setFriendRequestSent(false);
        } else if (data.error) {
          setErrorMessage(data.error);
        }
      });
    }

    return () => {
      socket?.off("new-message");
      socket?.off("statusUpdate");
      socket?.off("chat-started");
      socket?.off("chat-ended");
      socket?.off("typing");
      socket?.off("friendRequestResponse");
    };
  }, [socket, userdata, randomUser]);

  useEffect(() => {
    messageContainerRef.current?.scrollTo(0, messageContainerRef.current.scrollHeight);
  }, [allMessages, isTyping]);
  

  const handleStartChat = () => {
    setIsSearching(true);
    setChatStarted(false);
    chatStartedRef.current = false;
    setRandomUser(null);

    socket?.emit("start-chat", userdata._id);

    setTimeout(() => {
      setIsSearching(false);
      if (!chatStartedRef.current) {
        setPopupMessage("No chat partner found. Please try again.");
        setPopupVisible(true);
        setTimeout(() => setPopupVisible(false), 3000);
      }
    }, 5000);
  };

  const handleEndChat = () => {
    setChatStarted(false);
    chatStartedRef.current = false;
    setChatRoomId(null);
    socket?.emit("end-chat", userdata._id);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
  
    if (!chatStarted || !chatRoomId || (!message.text.trim() && !message.imageUrl)) {
      return;
    }
  
    // Indicate that the user is no longer typing once they send a message
    socket.emit("typing", chatRoomId, userdata._id, false);
  
    const newMessage = {
      senderId: userdata?._id,
      receiverId: randomUser.userId,
      text: message.text,
      imageUrl: message.imageUrl,  // Ensure the image URL is included if available
      createdAt: new Date().toISOString(),
    };
  
    console.log("Sending message:", newMessage);
  
    // Emit message to the server through socket
    socket.emit("send-message", chatRoomId, newMessage, (response) => {
      setIsSending(false);  // Stop the loading state after message is sent
  
      if (response.error) {
        console.error("Error sending message:", response.error);
        // Optionally display an error message to the user
        setErrorMessage("Failed to send the message. Please try again.");
      } else {
        console.log("Server response:", response);
      }
    });
  
    setAllMessages((prev) => [...prev, newMessage]);
    setMessage({ text: "", imageUrl: "" });
    setShowEmojiPicker(false);
  };
  
  
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
      alert('Please upload a valid image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size is too large. Please upload under 5MB.');
      return;
    }
  
    const reader = new FileReader();
    reader.onloadend = () => {
      console.log("Image size (base64 length):", reader.result.length);
      setMessage(prev => ({ ...prev, imageUrl: reader.result }));
    };
    
    reader.readAsDataURL(file);
  
    // Reset file input so selecting the same file again will trigger onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };
  


  const handleClearChat = () => setAllMessages([]);

  const handleSendFriendRequest = () => {
    if (!userdata?._id || !randomUser?.userId) return;

    if (friendStatus === "You are already friends.") {
      setShowFriendDialog(true);
      return;
    }

    socket.emit('send-friend-request', userdata._id, randomUser.userId);
    setFriendRequestSent(true);
  };

  const handleCheckFriendStatus = async () => {
    if (!userdata || !userdata._id || !randomUser?.userId) return;
  
    try {
      const res = await axios.get(`${backendUrl}/api/user/${userdata._id}/friend-status/${randomUser.userId}`, {
        headers: {
          Authorization: `Bearer ${userdata.token}`,
        }
      });
  
      console.log("Friend status response:", res.data);  // Log the API response for debugging
  
      if (res.data.isAlreadyFriends) {
        setFriendStatus("You are already friends.");
      } else {
        setFriendStatus("");  // Clear the status if they are not friends
      }
    } catch (error) {
      console.log("Friend status error:", error);
    }
  };
  const handleOpenFriendDialog = () => {
    handleCheckFriendStatus();
    setShowFriendDialog(true);
  };

  const handleCloseDialog = () => {
    setShowFriendDialog(false);
    setFriendRequestSent(false);
    setFriendStatus("");
    setErrorMessage("");
  };
  const typingTimeoutRef = useRef(null);

  const handleTyping = (text) => {
    setMessage({ ...message, text });
  
    if (chatRoomId && userdata?._id) {
      if (!currentlyTyping) {
        socket.emit("typing", chatRoomId, userdata._id, true);
        setCurrentlyTyping(true);
      }
  
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
  
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing", chatRoomId, userdata._id, false);
        setCurrentlyTyping(false);
      }, 1500);
    }
  };
  
  return (
    <div className="h-screen flex flex-col text-white bg-[url('../assets/bg.jpg')] bg-cover bg-center bg-no-repeat relative overflow-hidden">
  <header className="fixed top-0 left-0 right-0 h-16 bg-[#1A1A1A] flex justify-between items-center px-4 shadow-md z-10">
  <div className="flex items-center gap-4">
    <Link to="/" className="lg:hidden text-white hover:text-[#E74C3C] transition">
      <FaAngleLeft size={25} />
    </Link>
    <Avatar width={50} height={50} imageUrl={userdata?.profile_pic} />
    <div className="flex items-center">
      <h3 className="font-semibold text-lg">{userdata?.name}</h3>
      <div className="ml-2 flex items-center justify-center w-6 h-6 bg-green-600 rounded-full text-sm font-semibold">
        {onlineUsersCount}
      </div>
      <span className="text-green-400 ml-1 text-sm">Online</span>
    </div>
  </div>
  <div className="flex items-center gap-4">
    {friendStatus !== "You are already friends." && ( // Only show the button if not already friends
      <button className="text-gray-300 hover:bg-white/20 rounded-full p-2" onClick={handleOpenFriendDialog}>
        <FaUserPlus size={20} />
      </button>
    )}
    <button onClick={handleClearChat} className="text-gray-300 hover:text-red-500 transition">
      <FaTrash size={20} />
    </button>
  </div>
</header>



      {showFriendDialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-10">
          <div className="bg-[#1A1A1A] p-6 rounded-lg text-center w-80">
            <div className="flex justify-center">
              <Avatar width={80} height={80} imageUrl={randomUser?.profile_pic} />
            </div>
            <h3 className="text-lg font-semibold mt-3">{randomUser?.username}</h3>
            <div className="mt-4">
              {friendRequestSent ? (
                <>
                  <p className="text-gray-300 text-lg">Friend request sent to {randomUser?.username}!</p>
                  <button className="mt-4 px-5 py-2 bg-red-500 text-white rounded-md" onClick={handleCloseDialog}>OK</button>
                </>
              ) : friendStatus === "You are already friends." ? (
                <>
                  <p className="text-gray-300 text-lg">You are already friends with {randomUser?.username}.</p>
                  <button className="mt-4 px-5 py-2 bg-red-500 text-white rounded-md" onClick={handleCloseDialog}>OK</button>
                </>
              ) : (
                <>
                  {errorMessage && <p className="text-red-400 mb-2">{errorMessage}</p>}
                  <div className="flex justify-center gap-4 mt-4">
                    <button className="px-5 py-2 bg-blue-500 text-white rounded-md" onClick={handleSendFriendRequest}>Add Friend</button>
                    <button className="px-5 py-2 bg-red-500 text-white rounded-md" onClick={handleCloseDialog}>Cancel</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {popupVisible && (
        <div className="popup-message fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className="bg-[#333] text-white text-center px-6 py-4 rounded-lg shadow-lg max-w-sm w-full animate-popup">
            {popupMessage}
          </div>
        </div>
      )}

      {randomUser && chatStarted && (
        <div className="flex flex-col items-center justify-center p-4 text-center mt-16">
          <div className="relative w-20 h-20">
            <Avatar width={80} height={80} imageUrl={randomUser?.profile_pic} />
            {recipientStatus === "Online" && (
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          <p className="text-md mt-2">You are connected with {randomUser?.username}, say hi! 👋</p>
          <button
      onClick={handleOpenFriendDialog}
      className="mt-4 px-6 py-2 bg-white text-black font-semibold rounded-full shadow hover:bg-gray-200 transition"
    >
      Add Friend
    </button>
        </div>
      )}
  {/* Chat Messages */}
{/* Chat Messages */}
{/* Chat Messages */}
<div className="flex-1 overflow-y-auto pt-20 px-4 pb-24" ref={messageContainerRef}>
{allMessages.map((msg, index) => {
  const isSender = msg.senderId === userdata?._id;
  const userAvatar = isSender ? userdata?.profile_pic : randomUser?.profile_pic;

  return (
    <div
      key={index}
      className={`flex ${isSender ? "justify-end" : "justify-start"} mb-4`}
    >
      <div className="flex flex-col relative max-w-[75%]">
        {/* Avatar */}
        {!isSender && (
          <div className="mb-1 ml-1">
            <Avatar
              width={28}
              height={28}
              imageUrl={userAvatar}
              className="rounded-full shadow-sm"
            />
          </div>
        )}
        {isSender && (
          <div className="mb-1 self-end mr-1">
            <Avatar
              width={28}
              height={28}
              imageUrl={userAvatar}
              className="rounded-full shadow-sm"
            />
          </div>
        )}

        {/* Chat Bubble */}
        <div
          className={`px-3 py-2 rounded-xl text-sm leading-snug ${
            isSender
              ? "bg-[#0078FF] text-white rounded-tr-none self-end"
              : "bg-[#1A1A1A] text-white rounded-tl-none self-start"
          }`}
        >
          <p>{msg.text}</p>

          {msg.imageUrl && (
            <div className="mt-2">
              <img
                src={msg.imageUrl}
                className="max-w-[180px] w-auto object-contain rounded-md"
                alt="Message"
              />
            </div>
          )}

          <div className="text-[11px] mt-1 text-gray-400 text-right">
            {moment(msg.createdAt).fromNow()}
          </div>
        </div>
      </div>
    </div>
  );
})}

  {/* Typing Indicator */}
  {isTyping && randomUser && (
  <div className="flex items-center gap-2 mt-4 ml-2">
    <Avatar width={30} height={30} imageUrl={randomUser?.profile_pic} />
    <div className={`${styles.typingIndicator} px-4 py-2 bg-[#2A2A2A] rounded-full`}>
      <span className={styles.dot}></span>
      <span className={styles.dot}></span>
      <span className={styles.dot}></span>
    </div>
  </div>
)}

</div>



{/* Chat Input Section */}
{/* Chat Input Section */}
<section className="fixed bottom-0 left-0 right-0 bg-[#1A1A1A] px-2 py-2 flex items-center gap-2 shadow-inner z-10">
  <div className="flex-shrink-0">
    <button
      onClick={chatStarted ? handleEndChat : handleStartChat}
      className="min-w-[100px] h-12 px-4 flex items-center justify-center rounded-full bg-[#E74C3C] text-white font-semibold hover:bg-[#C0392B] transition"
    >
      {isSearching ? (
        <div className="loader border-t-2 border-white border-solid rounded-full w-5 h-5 animate-spin" />
      ) : (
        chatStarted ? "End Chat" : "Start Chat"
      )}
    </button>
  </div>

  {/* Form */}
  <form
    className="relative flex items-center w-full gap-2"
    onSubmit={handleSendMessage}
  >
    {/* Image Preview */}
    {message.imageUrl && (
      <div className="absolute bottom-16 left-2 z-20">
        <div className="relative w-32 h-32">
          <img
            src={message.imageUrl}
            alt="Preview"
            className="object-cover w-32 h-32 rounded-lg border border-gray-600"
          />
          <button
            type="button"
            onClick={() => setMessage(prev => ({ ...prev, imageUrl: "" }))}
            className="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-700"
          >
            ×
          </button>
        </div>
      </div>
    )}

    {/* Input */}
    <div className="relative flex flex-1 items-center">
      <input
        type="text"
        value={message.text}
        onChange={(e) => handleTyping(e.target.value)}

        
        placeholder="Type a message..."
        className="w-full p-3 pl-12 pr-12 rounded-full bg-[#2A2A2A] text-white outline-none border border-gray-600"
      />

      {/* File Upload Icon (LEFT SIDE) */}
      <label className="absolute left-3 top-1/2 transform -translate-y-1/2 cursor-pointer">
        <FaPlus size={18} className="text-white hover:text-red-400 transition" />
        <input
          type="file"
          className="hidden"
          onChange={handleFileUpload}
          ref={fileInputRef}
        />
      </label>

      {/* Emoji Icon (RIGHT SIDE) */}
      <button
        type="button"
        onClick={() => setShowEmojiPicker(prev => !prev)}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-yellow-300 hover:text-yellow-400"
      >
        <FaSmile size={20} />
      </button>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-14 right-0 z-50">
          <EmojiPicker
            theme="dark"
            onEmojiClick={(emojiData) =>
              setMessage(prev => ({ ...prev, text: prev.text + emojiData.emoji }))}
          />
        </div>
      )}
    </div>

    {/* Send Button */}
    <button
      type="submit"
      className={`w-12 h-12 flex items-center justify-center rounded-full ${
        message.text || message.imageUrl
          ? 'bg-[#E74C3C] hover:bg-[#C0392B]'
          : 'bg-gray-600 cursor-not-allowed'
      }`}
      disabled={!message.text && !message.imageUrl}
    >
      <IoMdSend size={20} className="text-white" />
    </button>
  </form>
</section>



      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <h1 className="text-5xl font-bold text-red-400 opacity-10 select-none">Qchatt</h1>
      </div>
    </div>
  );
};

export default RandomChatPage;
