import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContent } from '../context/AppContext';
import styles from './IncomingCallPopup.module.css';

const IncomingCallPopup = () => {
  const [mediaPermissions, setMediaPermissions] = useState(false); // Track media permissions

  const {
    callIncoming,
    incomingCallFrom,
    declineCall, 
    acceptCall, 
  } = useContext(AppContent);

  const navigate = useNavigate();

  const checkMediaPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setMediaPermissions(true);
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately after checking
    } catch (err) {
      setMediaPermissions(false);
      alert("You need to grant permission to use your camera and microphone.");
    }
  };

  const handleAccept = async () => {
    await acceptCall();
    navigate(`/videoCall/${incomingCallFrom?.from}`);
  };

  if (!callIncoming || !incomingCallFrom) return null;

  return (
    <div className={styles.incomingCall}>
      <div className={styles.callerInfo}>
        <img
          src={incomingCallFrom.profilePic || "/default-profile.png"}
          alt="Caller"
          className={styles.callerImage}
          onError={(e) => { e.target.src = "/default-profile.png"; }}
        />
        <p>📞 Incoming call from <strong>{incomingCallFrom.username}</strong></p>
      </div>
      <div className={styles.buttonGroup}>
        <button onClick={declineCall} className={`${styles.button} ${styles.declineBtn}`}>
          Decline
        </button>
        <button 
          onClick={async () => {
            await checkMediaPermissions();
            if (mediaPermissions) handleAccept();
          }} 
          className={`${styles.button} ${styles.acceptBtn}`}
        >
          Accept
        </button>
      </div>
    </div>
  );
};

export default IncomingCallPopup;
