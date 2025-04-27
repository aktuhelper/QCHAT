import { createContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import { useRef } from "react"; // <-- Missing


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
//videocalling
  const [callIncoming, setCallIncoming] = useState(false);
  const [calling, setCalling] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [incomingCallFrom, setIncomingCallFrom] = useState(null);
  const [targetUser, setTargetUser] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const ringtoneRef = useRef(null);
  const [targetUserId, setTargetUserId] = useState(null);

  useEffect(() => {
    if (!socket || !userdata?._id) return;

    socket.emit("video-register", userdata._id);

    socket.on("video-registered", () => setIsRegistered(true));

    socket.on("video-incoming-call", ({ from, caller, offer }) => {
      if (!from || !caller || !offer) return;

      setIncomingCallFrom({
        from,
        username: caller.name,
        profilePic: caller.profile_pic,
        offer,
      });

      setCallIncoming(true);
      ringtoneRef.current?.play().catch((err) => console.warn("Ringtone error:", err));
      navigator.vibrate?.([500, 300, 500, 300]);
    });

    socket.on("video-call-answered", async ({ answer }) => {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
        stopRingtoneAndVibration();
        setCalling(false);
        setInCall(true);
      }
    });

    socket.on("video-call-declined", () => {
      alert("Call was declined.");
      stopRingtoneAndVibration();
      setCalling(false);
    });

    socket.on("video-ice-candidate", async ({ candidate }) => {
      if (candidate && peerConnection.current) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on("video-call-ended", () => {
      stopRingtoneAndVibration();
      endCall();
    });

    socket.on("video-call-error", ({ message }) => {
      alert(message);
      stopRingtoneAndVibration();
      setCalling(false);
    });

    return () => {
      socket.off("video-registered");
      socket.off("video-incoming-call");
      socket.off("video-call-answered");
      socket.off("video-call-declined");
      socket.off("video-ice-candidate");
      socket.off("video-call-ended");
      socket.off("video-call-error");
      stopRingtoneAndVibration();
      endCall();
    };
  }, [socket, userdata]);

  const stopRingtoneAndVibration = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    navigator.vibrate?.(0);
  };

  const getPeerTarget = () => (calling ? targetUserId : incomingCallFrom?.from);

  const getMedia = async () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStream.current = stream;
      localVideoRef.current.srcObject = stream;

      stream.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, stream);
      });
    } catch (error) {
      alert("Error accessing media devices. Check your settings.");
      console.error(error);
    }
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("video-ice-candidate", {
          to: getPeerTarget(),
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams?.length > 0) {
        const remoteStream = event.streams[0];
    
        const assignStream = () => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          } else {
            setTimeout(assignStream, 100); // Retry after short delay
          }
        };
    
        assignStream(); // Try to assign stream
      }
    };
    

    return pc;
  };

  const startCall = async () => {
    if (!isRegistered || !targetUserId) return;

    try {
      const response = await axios.get(`${backendUrl}/api/users/${targetUserId}`);
      setTargetUser(response.data);
      console.log("Fetched target user:", response.data);
    } catch (err) {
      console.error("Failed to fetch user info:", err);
      return;
    }

    peerConnection.current = createPeerConnection();
    await getMedia();

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    setCalling(true); // Only after fetching user

    socket.emit("video-call-user", {
      to: targetUserId,
      from: userdata._id,
      username: userdata.username,
      offer,
    });
  };

  const acceptCall = async () => {
    peerConnection.current = createPeerConnection();
    await getMedia();

    const offer = incomingCallFrom?.offer;
    if (!offer) return;

    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);

    socket.emit("video-answer-call", { to: incomingCallFrom?.from, answer });

    stopRingtoneAndVibration();
    setCallIncoming(false);
    setInCall(true);
    setIncomingCallFrom(null);
  };

  const declineCall = () => {
    socket.emit("video-decline-call", { to: incomingCallFrom?.from });
    stopRingtoneAndVibration();
    setCallIncoming(false);
    setIncomingCallFrom(null);
  };

  const endCall = () => {
    peerConnection.current?.close();
    peerConnection.current = null;

    localStream.current?.getTracks().forEach(track => track.stop());
    localStream.current = null;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    socket.emit("video-end-call", { to: getPeerTarget() });

    stopRingtoneAndVibration();
    setInCall(false);
    setCalling(false);
    setCallIncoming(false);
    setIncomingCallFrom(null);
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
        googleLogin,
        socket,
        onlineUsers,
        onlineUsersCount,
        chatUser,
        randomChatPartner,
        randomChatRoom,
        callIncoming,
        setCallIncoming,     // ✅ ADDED
        calling,
        setCalling,          // ✅ ADDED
        inCall,
        setInCall,           // ✅ ADDED
        incomingCallFrom,
        setIncomingCallFrom, // ✅ (optional but useful)
        targetUser,
        targetUserId,
        setTargetUserId,
        localVideoRef,
        remoteVideoRef,
        ringtoneRef,
        startCall,
        acceptCall,
        declineCall,
        endCall,
      }}
    >
      {props.children}
    </AppContent.Provider>
  );
};
