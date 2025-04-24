import React, { useContext, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AppContent } from "../context/AppContext";
import { FiPhone } from "react-icons/fi";
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

    socket.emit("video-register", userdata._id);

    socket.on("video-registered", ({ userId }) => {
      setIsRegistered(true);
    });

    socket.on("video-incoming-call", async ({ from, username, offer }) => {
      setIncomingCallFrom({ from, username, offer });
      setCallIncoming(true);
    });

    socket.on("video-call-answered", async ({ answer }) => {
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
      endCall(); // clean on unmount
    };
  }, [socket, userdata]);

  const getPeerTarget = () => calling ? targetUserId : incomingCallFrom?.from;

  const getMedia = async () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
    }

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStream.current = stream;
    localVideoRef.current.srcObject = stream;

    stream.getTracks().forEach(track => {
      if (peerConnection.current) {
        peerConnection.current.addTrack(track, stream);
      }
    });
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
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
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

    setInCall(false);
    setCalling(false);
    setCallIncoming(false);
    setIncomingCallFrom(null);
  };

  return (
    <div className={styles.videoCallContainer}>
      <div className={styles.videos}>
        <video ref={remoteVideoRef} autoPlay className={styles.remoteVideo} />
        <video ref={localVideoRef} autoPlay muted className={styles.localVideo} />
      </div>

      {callIncoming && incomingCallFrom && (
        <div className={styles.incomingCall}>
          <p>📞 Incoming call from <strong>{incomingCallFrom.username}</strong></p>
          <button onClick={declineCall} className={`${styles.button} ${styles.declineBtn}`}>Decline</button>
          <button onClick={acceptCall} className={`${styles.button} ${styles.acceptBtn}`}>Accept</button>
        </div>
      )}

      {(inCall || calling) && (
        <div className={styles.controls}>
          <button onClick={endCall} className={`${styles.button} ${styles.endCallBtn}`}>End Call</button>
        </div>
      )}

      {!inCall && !calling && (
        <button
          onClick={startCall}
          className={styles.floatingButton}
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
