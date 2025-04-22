import axios from "axios";
import { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { io } from "socket.io-client";

export const AppContent = createContext();

export const AppContextProvider = (props) => {
  axios.defaults.withCredentials = true;
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [socket, setSocket] = useState(null);
  const [isLoggedin, setIsLoggedin] = useState(undefined);
  const [userdata, setUserdata] = useState(null);
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
        setUserdata(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Authentication failed");
    }
  };

  const getUserData = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/user/data`);
      if (data.success) {
        setUserdata(data.user);
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
    if (userdata) {
      setupSocketConnection(userdata._id);
    }
  }, [userdata]);

  return (
    <AppContent.Provider
      value={{
        backendUrl,
        isLoggedin,
        setIsLoggedin,
        userdata,
        setUserdata,
        getUserData,
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
