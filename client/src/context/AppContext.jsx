import { createContext, useEffect, useState, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { io } from "socket.io-client";

const base64UrlDecode = (base64Url) => {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  base64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
  return atob(base64);
}; 

const decodeJwt = (token) => {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");
  return JSON.parse(base64UrlDecode(parts[1]));
};

export const AppContent = createContext();

export const AppContextProvider = (props) => {
  axios.defaults.withCredentials = true;
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [socket, setSocket] = useState(null);
  const [isLoggedin, setIsLoggedin] = useState(undefined);
  const [userdata, setUserdata] = useState({ name: "", email: "", profile_pic: "", _id: "" });
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);
  const [chatUser, setChatUser] = useState(null);
  const [randomChatPartner, setRandomChatPartner] = useState(null);
  const [randomChatRoom, setRandomChatRoom] = useState(null);

  const [callIncoming, setCallIncoming] = useState(false);
  const [calling, setCalling] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [incomingCallFrom, setIncomingCallFrom] = useState(null);
  const [targetUser, setTargetUser] = useState(null);
  const [targetUserId, setTargetUserId] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(null);
  const ringtoneRef = useRef(null);
  const pendingCandidates = useRef([]);

  const getAuthState = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/auth/isauth`);
      if (data.success) {
        setIsLoggedin(true);
        await getUserData(); // fetch data regardless of verification
      } else {
        setIsLoggedin(false);
        resetUserData();
      }
    } catch (error) {
      setIsLoggedin(false);
      resetUserData();
      toast.error(error.response?.data?.message || "Authentication failed");
    }
  };
  
  
  const getUserData = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/user/data`, {
        withCredentials: true,
      });
  
      if (data.success && data.user) {
        setUserdata(data.user);
        setupSocketConnection(data.user._id);
      } else {
        toast.error(data.message || "Failed to fetch user data.");
      }
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message;
  
      if (status !== 401) {
        toast.error(message || "Something went wrong");
      }
  
      setIsLoggedin(false);
      setUserdata(null);
    }
  };
  
  
  const resetUserData = () => {
    setUserdata({
      name: "",
      email: "",
      profile_pic: "",
      _id: "",
      isAccountverified: false,
    });
  };
  
  const setupSocketConnection = (userId) => {
    if (!userId || socket) return;
    const socketConnection = io(backendUrl, { query: { userId } });

    socketConnection.on("connect", () => socketConnection.emit("user-online", userId));
    socketConnection.on("disconnect", () => socketConnection.emit("user-offline", userId));

    socketConnection.on("onlineUsers", (users) => {
      setOnlineUsers(new Set(users));
      setOnlineUsersCount(users.length);
    });

    socketConnection.on("message-user", (payload) => setChatUser(payload));

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
    if (userdata?._id) setupSocketConnection(userdata?._id);
  }, [userdata?._id]);

  const googleLogin = async (credential) => {
    try {
      const decoded = decodeJwt(credential);
      const { name, email, picture, sub } = decoded;
  
      // Always send token to backend and let backend handle auth & user creation/updating
      const { data } = await axios.post(`${backendUrl}/api/auth/google-login`, { token: credential });
  
      if (data.success) {
        const user = {
          ...data.user,
          // Ensure these are explicitly marked for routing logic
          isGoogleAuthenticated: true,
          isAccountverified: true,
        };
  
        setUserdata(user);
        setIsLoggedin(true);
        setupSocketConnection(user._id);
      } else {
        toast.error(data.message || "Google login failed.");
      }
    } catch (err) {
      console.error("Google login error:", err);
      toast.error("Google login failed.");
    }
  };
  
  

  const waitForRef = async (ref, timeout = 2000) => {
    const interval = 100;
    for (let i = 0; i < timeout / interval; i++) {
      if (ref.current) return true;
      await new Promise((res) => setTimeout(res, interval));
    }
    return false;
  };

  const attachMediaToRefs = () => {
    if (localVideoRef.current && localStream.current) {
      localVideoRef.current.srcObject = localStream.current;
    }
    if (remoteVideoRef.current && remoteStream.current) {
      remoteVideoRef.current.srcObject = remoteStream.current;
    }
  };

  const flushPendingCandidates = async () => {
    while (pendingCandidates.current.length > 0) {
      const candidate = pendingCandidates.current.shift();
      await peerConnection.current?.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const stopRingtoneAndVibration = () => {
    try {
      ringtoneRef.current?.pause();
      ringtoneRef.current.currentTime = 0;
    } catch (e) {
      console.warn("Ringtone stop error:", e);
    }
  };

  const getPeerTarget = () => (calling ? targetUserId : incomingCallFrom?.from);

  const getMedia = async () => {
    try {
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
        localStream.current = null;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      const hasAudio = devices.some(device => device.kind === 'audioinput');

      if (!hasCamera || !hasAudio) {
        alert("No camera or microphone detected. Please connect them and refresh.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStream.current = stream;
      stream.getTracks().forEach(track => peerConnection.current?.addTrack(track, stream));
    } catch (error) {
      console.error("Media error:", error);
      alert("Access to camera/mic failed. Check permissions.");
    }
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.emit("video-ice-candidate", { to: getPeerTarget(), candidate });
      }
    };

    pc.ontrack = (event) => {
      remoteStream.current = event.streams?.[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream.current;
      }
    };

    return pc;
  };

  const startCall = async () => {
    if (!isRegistered || !targetUserId) return;

    try {
      const { data } = await axios.get(`${backendUrl}/api/users/${targetUserId}`);
      setTargetUser(data);
    } catch (err) {
      console.error("Fetch target user failed:", err);
      return;
    }

    peerConnection.current = createPeerConnection();
    await getMedia();
    await waitForRef(localVideoRef);
    attachMediaToRefs();

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    setCalling(true);

    socket.emit("video-call-user", {
      to: targetUserId,
      from: userdata._id,
      username: userdata.username,
      offer,
    });
  };

  const acceptCall = async () => {
    if (!incomingCallFrom?.offer) return;

    try {
      peerConnection.current = createPeerConnection();
      await getMedia();
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(incomingCallFrom.offer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      await waitForRef(localVideoRef);
      attachMediaToRefs();

      socket.emit("video-answer-call", { to: incomingCallFrom.from, answer });

      stopRingtoneAndVibration();
      setCallIncoming(false);
      setInCall(true);
      setIncomingCallFrom(null);
      flushPendingCandidates();
    } catch (err) {
      console.error("Accept call error:", err);
      alert("Failed to accept the call.");
    }
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

    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    remoteStream.current = null;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    socket.emit("video-end-call", { to: getPeerTarget() });

    stopRingtoneAndVibration();
    setInCall(false);
    setCalling(false);
    setCallIncoming(false);
    setIncomingCallFrom(null);
  };

  useEffect(() => {
    if (!socket || !userdata?._id) return;

    socket.emit("video-register", userdata._id);
    socket.on("video-registered", () => setIsRegistered(true));

    socket.on("video-incoming-call", ({ from, caller, offer }) => {
      if (!from || !caller || !offer) return;

      setIncomingCallFrom({ from, username: caller.name, profilePic: caller.profile_pic, offer });
      setCallIncoming(true);
      ringtoneRef.current?.play().catch(console.warn);
    });

    socket.on("video-call-answered", async ({ answer }) => {
      try {
        await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(answer));
        stopRingtoneAndVibration();
        setCalling(false);
        setInCall(true);
        flushPendingCandidates();
      } catch (err) {
        console.error("Failed to set remote description:", err);
      }
    });

    socket.on("video-call-declined", () => {
      alert("Call was declined.");
      stopRingtoneAndVibration();
      setCalling(false);
    });

    socket.on("video-ice-candidate", async ({ candidate }) => {
      if (candidate) {
        if (peerConnection.current?.remoteDescription) {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          pendingCandidates.current.push(candidate);
        }
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
  }, [socket, userdata?._id]);

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
        setCallIncoming,
        calling,
        setCalling,
        inCall,
        setInCall,
        incomingCallFrom,
        setIncomingCallFrom,
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
        getMedia,
        attachMediaToRefs
      }}
    >
      {props.children}
    </AppContent.Provider>
  );
};
