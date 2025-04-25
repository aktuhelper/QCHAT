import React, { useContext, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AppContent } from "../context/AppContext";
import { FiPhone } from "react-icons/fi";
import styles from "./VideoCall.module.css";

const VideoCall = () => {
  const { socket, userdata } = useContext(AppContent);
  const { targetUserId } = useParams();

  const [callIncoming, setCallIncoming] = useState(false);
  const [calling, setCalling] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [incomingCallFrom, setIncomingCallFrom] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [interactionUnlocked, setInteractionUnlocked] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const ringtoneRef = useRef(null); // 🔔 ringtone ref

  useEffect(() => {
    if (!socket || !userdata?._id) return;

    socket.emit("video-register", userdata._id);

    socket.on("video-registered", ({ userId }) => {
      setIsRegistered(true);
    });

    socket.on("video-incoming-call", async ({ from, caller, offer }) => {
      setIncomingCallFrom({ from, username: caller.name, profilePic: caller.profile_pic, offer });
      setCallIncoming(true);
  
      // 🔊 Play ringtone
      ringtoneRef.current?.play().catch((err) => console.warn("Ringtone play error:", err));
  
      // 📳 Start vibration
      if (navigator.vibrate) {
        navigator.vibrate([500, 300, 500, 300]);
      }
    });

    socket.on("video-call-answered", async ({ answer }) => {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
      stopRingtoneAndVibration();
      setCalling(false);
      setInCall(true);
    });

    socket.on("video-call-declined", () => {
      alert("Call was declined.");
      stopRingtoneAndVibration();
      setCalling(false);
    });

    socket.on("video-ice-candidate", async ({ candidate }) => {
      if (candidate) {
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
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
  };

  const getPeerTarget = () => calling ? targetUserId : incomingCallFrom?.from;

  const getMedia = async () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStream.current = stream;
      localVideoRef.current.srcObject = stream;

      stream.getTracks().forEach(track => {
        if (peerConnection.current) {
          peerConnection.current.addTrack(track, stream);
        }
      });
    } catch (error) {
      console.error("Error accessing media devices:", error);
      if (error.name === "NotReadableError") {
        alert("Camera is already in use by another application. Please close other apps using the camera.");
      } else {
        alert("An error occurred while trying to access your camera and microphone. Please check your device settings.");
      }
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
      if (event.streams && event.streams.length > 0) {
        const remoteStream = event.streams[0];
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
          setTimeout(() => {
            remoteVideoRef.current?.play().catch((error) => {
              console.error("Error playing remote video:", error);
            });
          }, 100);
        }
      }
    };

    return pc;
  };

  const startCall = async () => {
    if (!isRegistered || !targetUserId) return;

    peerConnection.current = createPeerConnection();
    await getMedia();

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
    peerConnection.current = createPeerConnection();
    await getMedia();

    const offer = incomingCallFrom.offer;
    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);

    socket.emit("video-answer-call", { to: incomingCallFrom.from, answer });

    stopRingtoneAndVibration();
    setCallIncoming(false);
    setInCall(true);
    setIncomingCallFrom(null);
  };

  const declineCall = () => {
    socket.emit("video-decline-call", { to: incomingCallFrom.from });
    stopRingtoneAndVibration();
    setCallIncoming(false);
    setIncomingCallFrom(null);
  };

  const endCall = () => {
    if (peerConnection.current) {
      peerConnection.current.onicecandidate = null;
      peerConnection.current.ontrack = null;
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }

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
    <div className={styles.videoCallContainer}>
      {/* 🔔 Ringtone element */}
      <audio ref={ringtoneRef} src="/sound/ringtone.mp3" loop preload="auto" />

      <div className={styles.videos}>
        <video ref={remoteVideoRef} autoPlay className={styles.remoteVideo} />
        <video ref={localVideoRef} autoPlay muted className={styles.localVideo} />
      </div>

      {callIncoming && incomingCallFrom && (
        <div className={styles.incomingCall}>
          <div className={styles.callerInfo}>
            <img
              src={incomingCallFrom.profilePic || "/default-profile.png"}
              alt="Caller"
              className={styles.callerImage}
              onError={(e) => {
                e.target.src = "/default-profile.png";
              }}
            />
            <p>📞 Incoming call from <strong>{incomingCallFrom.username}</strong></p>
          </div>
          <div className={styles.buttonGroup}>
            <button onClick={declineCall} className={`${styles.button} ${styles.declineBtn}`}>Decline</button>
            <button onClick={acceptCall} className={`${styles.button} ${styles.acceptBtn}`}>Accept</button>
          </div>
        </div>
      )}

      {(inCall || calling) && (
        <div className={styles.endCallContainer}>
          <button onClick={endCall} className={styles.endCallButton}>End Call</button>
        </div>
      )}

      {!inCall && !calling && (
        <button
          onClick={startCall}
          className={styles.startCallButton}
          disabled={!isRegistered}
          title="Start Call"
        >
          <FiPhone size={24} />
        </button>
      )}
    </div>
  );
};

export default VideoCall;
