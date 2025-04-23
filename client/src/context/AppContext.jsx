import { createContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { io } from "socket.io-client";

// Function to base64 URL decode
const base64UrlDecode = (base64Url) => {
  // Replace base64 URL-safe characters
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  // Pad with '=' to make it a valid base64 string
  base64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  // Decode the base64 string into a string
  const decoded = atob(base64);
  return decoded;
};

// Function to decode JWT
const decodeJwt = (token) => {
  if (!token) return null;
  
  // Split token into parts
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  // Decode the payload part (the second part of the JWT)
  const payload = parts[1];
  const decodedPayload = base64UrlDecode(payload);
  
  // Parse the JSON string to an object
  return JSON.parse(decodedPayload);
};

export const AppContent = createContext();

export const AppContextProvider = (props) => {
  axios.defaults.withCredentials = true;
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [socket, setSocket] = useState(null);
  const [isLoggedin, setIsLoggedin] = useState(undefined);
  const [userdata, setUserdata] = useState({
    name: "",
    email: "",
    profile_pic: "",
    _id: "",
  });
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);
  const [chatUser, setChatUser] = useState(null);
  const [randomChatPartner, setRandomChatPartner] = useState(null);
  const [randomChatRoom, setRandomChatRoom] = useState(null);

  const getAuthState = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/auth/isauth`);
      if (data.success) {
        setIsLoggedin(true);
        await getUserData();
      } else {
        setIsLoggedin(false);
        setUserdata({ name: "", email: "", profile_pic: "", _id: "" });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Authentication failed");
    }
  };

  const getUserData = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/user/data`);
      if (data.success) {
        setUserdata(data.user); // Save user data into context
        setupSocketConnection(data.user._id);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };

  const setupSocketConnection = (userId) => {
    if (!userId || socket) return;

    const socketConnection = io(backendUrl, { query: { userId } });

    socketConnection.on("connect", () => {
      socketConnection.emit("user-online", userId);
    });

    socketConnection.on("disconnect", () => {
      socketConnection.emit("user-offline", userId);
    });

    socketConnection.on("onlineUsers", (onlineUsersList) => {
      setOnlineUsers(new Set(onlineUsersList));
      setOnlineUsersCount(onlineUsersList.length);
    });

    socketConnection.on("message-user", (payload) => {
      setChatUser(payload);
    });

    socketConnection.on("random-chat-start", ({ chatRoomId, partner }) => {
      setRandomChatRoom(chatRoomId);
      setRandomChatPartner(partner);
    });

    socketConnection.on("random-chat-ended", () => {
      setRandomChatRoom(null);
      setRandomChatPartner(null);
    });

    setSocket(socketConnection);
  };

  useEffect(() => {
    getAuthState();

    return () => {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    };
  }, []);

  useEffect(() => {
    if (userdata._id) {
      setupSocketConnection(userdata._id);
    }
  }, [userdata]);

  const googleLogin = async (credential) => {
    try {
      // Decode the token using custom decodeJwt function
      const decoded = decodeJwt(credential);
      const { name, email, picture } = decoded;

      // Only update userdata if name and profile_pic are not set in the database
      if (!userdata.name || !userdata.profile_pic) {
        setUserdata({
          name: name || userdata.name, // Use existing name if not from Google
          email,
          profile_pic: picture || userdata.profile_pic, // Use existing profile_pic if not from Google
          _id: decoded.sub, // Use the 'sub' as the unique user ID
        });
      }

      // Now send token to backend for authentication
      const { data } = await axios.post(`${backendUrl}/api/auth/google-login`, { token: credential }, { withCredentials: true });

      if (data.success) {
        setIsLoggedin(true);
        toast.success(`Welcome ${name}!`);
        await getUserData(); // Fetch user data
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Google login failed.");
    }
  };

  return (
    <AppContent.Provider
      value={{
        backendUrl,
        isLoggedin,
        setIsLoggedin,
        userdata,
        setUserdata,
        getUserData,
        googleLogin, // Expose google login to other components
        socket,
        onlineUsers,
        onlineUsersCount,
        chatUser,
        randomChatPartner,
        randomChatRoom,
      }}
    >
      {props.children}
    </AppContent.Provider>
  );
};
