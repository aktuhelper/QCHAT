import React, { useContext, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AppContent } from "../context/AppContext";
import styles from './VideoCall.module.css';

const VideoCall = () => {
  const { socket, userdata } = useContext(AppContent);
  const { targetUserId } = useParams();

  const [callIncoming, setCallIncoming] = useState(false);
  const [calling, setCalling] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [incomingCallFrom, setIncomingCallFrom] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);

  useEffect(() => {
    if (!socket || !userdata?._id) return;

    console.log("Registering user with ID:", userdata._id);
    socket.emit("video-register", userdata._id);

    socket.on("video-registered", ({ userId }) => {
      console.log(`✅ Successfully registered user ${userId}`);
      setIsRegistered(true);
    });

    socket.on("video-incoming-call", async ({ from, username, offer }) => {
      setIncomingCallFrom({ from, username, offer });
      setCallIncoming(true);
    });

    socket.on("video-call-answered", async ({ answer }) => {
      console.log("Call answered, setting remote description...");
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
      setCalling(false);
      setInCall(true);
    });

    socket.on("video-call-declined", () => {
      alert("Call was declined.");
      setCalling(false);
    });

    socket.on("video-ice-candidate", async ({ candidate }) => {
      if (candidate) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on("video-call-ended", () => {
      endCall();
    });

    socket.on("video-call-error", ({ message }) => {
      alert(message);
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
    };
  }, [socket, userdata]);

  const getPeerTarget = () => calling ? targetUserId : incomingCallFrom?.from;

  const getMedia = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStream.current = stream;
    localVideoRef.current.srcObject = stream;
    stream.getTracks().forEach((track) => peerConnection.current.addTrack(track, stream));
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
      console.log("Received remote track:", event);
      if (remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    return pc;
  };

  const startCall = async () => {
    if (!isRegistered) {
      console.warn("User not registered yet. Try again shortly.");
      return;
    }

    if (!targetUserId) {
      alert("No target user specified.");
      return;
    }

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

    setCallIncoming(false);
    setInCall(true);
    setIncomingCallFrom(null);
  };

  const declineCall = () => {
    socket.emit("video-decline-call", { to: incomingCallFrom.from });
    setCallIncoming(false);
    setIncomingCallFrom(null);
  };

  const endCall = () => {
    if (peerConnection.current) peerConnection.current.close();
    if (localStream.current) localStream.current.getTracks().forEach(track => track.stop());

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    socket.emit("video-end-call", { to: getPeerTarget() });

    setInCall(false);
    setCalling(false);
    setCallIncoming(false);
    setIncomingCallFrom(null);
  };

  return (
    <div className={styles.videoCallContainer}>
      <div className={styles.videos}>
        <video ref={localVideoRef} autoPlay muted className={styles.localVideo} />
        <video ref={remoteVideoRef} autoPlay className={styles.remoteVideo} />
      </div>

      <div className={styles.controls}>
        {!inCall && !calling && (
          <button onClick={startCall} className={`${styles.button} ${styles.callBtn}`} disabled={!isRegistered}>
            Start Call
          </button>
        )}

        {callIncoming && incomingCallFrom && (
          <div className={styles.incomingCall}>
            <p>📞 Incoming call from <strong>{incomingCallFrom.username}</strong></p>
            <button onClick={declineCall} className={`${styles.button} ${styles.declineBtn}`}>Decline</button>
            <button onClick={acceptCall} className={`${styles.button} ${styles.acceptBtn}`}>Accept</button>
          </div>
        )}

        {(inCall || calling) && (
          <button onClick={endCall} className={`${styles.button} ${styles.endCallBtn}`}>End Call</button>
        )}
      </div>
    </div>
  );
};

export default VideoCall;
