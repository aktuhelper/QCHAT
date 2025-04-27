import React, { useContext, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppContent } from "../context/AppContext";
import { FiPhone } from "react-icons/fi";
import styles from "./VideoCall.module.css";

const VideoCall = () => {
  const { targetUserId: paramId } = useParams();
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
    remoteStream,
    ringtoneRef,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    setTargetUserId,
  } = useContext(AppContent);

  useEffect(() => {
    if (paramId) {
      setTargetUserId(paramId);
    }
  }, [paramId, setTargetUserId]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, remoteVideoRef]);

  if (!userdata._id || !socket) return <div>Loading...</div>;

  const handleEndCall = () => {
    endCall();
    navigate(-1); // Navigate back to the previous page after ending the call
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
                onError={(e) => {
                  e.target.src = "/default-profile.png";
                }}
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
        <button
          onClick={startCall}
          className={styles.startCallButton}
          title="Start Call"
        >
          <FiPhone size={24} />
        </button>
      )}
    </div>
  );
};

export default VideoCall;
