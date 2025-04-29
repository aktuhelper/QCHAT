import React, { useContext, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AppContent } from "../context/AppContext";
import { FiPhone } from "react-icons/fi";
import styles from "./VideoCall.module.css";

const VideoCall = () => {
  const { targetUserId: paramId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const {
    socket,
    userdata,
    callIncoming,
    calling,
    inCall,
    incomingCallFrom,
    targetUser,
    localVideoRef,
    remoteVideoRef,
    localStream,
    startCall,
    endCall,
    setTargetUserId,
    acceptCall,
    attachMediaToRefs,
    remoteStream,
  } = useContext(AppContent);

  const isAccepting = new URLSearchParams(location.search).get("accepting") === "true";

  // Set target user ID from route
  useEffect(() => {
    if (paramId) {
      setTargetUserId(paramId);
    }
  }, [paramId, setTargetUserId]);

  // Accept the call if accepting query flag is true
  useEffect(() => {
    if (isAccepting && callIncoming && incomingCallFrom) {
      acceptCall();
    }
  }, [isAccepting, callIncoming, incomingCallFrom]);

  // Attach streams to video elements
  useEffect(() => {
    if (localStream?.current || remoteStream?.current) {
      attachMediaToRefs();
    }
  }, [localStream?.current, remoteStream?.current]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  if (!userdata._id || !socket) return <div>Loading...</div>;

  const handleEndCall = () => {
    endCall();
    navigate(-1);
  };

  return (
    <div className={styles.videoCallContainer}>
      {(callIncoming || calling || inCall) && (
        <div className={styles.callHeader}>
          {calling && targetUser && (
            <div className={styles.callingInfo}>
              <img
                src={targetUser.profile_pic || "/default-profile.png"}
                alt="Target User"
                className={styles.profilePic}
                onError={(e) => (e.target.src = "/default-profile.png")}
              />
              <p>📞 Calling to {targetUser.name || "Target User"}</p>
            </div>
          )}
        </div>
      )}

      <div className={styles.videos}>
        <video ref={remoteVideoRef} autoPlay className={styles.remoteVideo} />
        <video ref={localVideoRef} autoPlay muted className={styles.localVideo} />
      </div>

      {(inCall || calling) && (
        <div className={styles.endCallContainer}>
          <button onClick={handleEndCall} className={styles.endCallButton}>
            End Call
          </button>
        </div>
      )}

      {!inCall && !calling && (
        <button onClick={startCall} className={styles.startCallButton} title="Start Call">
          <FiPhone size={24} />
        </button>
      )}
    </div>
  );
};

export default VideoCall;
