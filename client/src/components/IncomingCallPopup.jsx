import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContent } from '../context/AppContext';
import styles from './IncomingCallPopup.module.css';

const IncomingCallPopup = () => {
  const {
    callIncoming,
    incomingCallFrom,
    declineCall, // ✅ Use context's decline logic
    acceptCall,  // ✅ Use context's accept logic (handles peer connection etc.)
  } = useContext(AppContent);

  const navigate = useNavigate();

  const handleAccept = async () => {
    await acceptCall(); // 👈 This calls the logic defined in AppContext
    // Navigate to the video call page
    navigate(`/videoCall/${incomingCallFrom?.from}`);
  };

  // Early return if there is no incoming call
  if (!callIncoming || !incomingCallFrom) return null;

  return (
    <div className={styles.incomingCall}>
      <div className={styles.callerInfo}>
        <img
          src={incomingCallFrom.profilePic || "/default-profile.png"}
          alt="Caller"
          className={styles.callerImage}
          onError={(e) => { e.target.src = "/default-profile.png"; }}  // Fallback to default image
        />
        <p>📞 Incoming call from <strong>{incomingCallFrom.username}</strong></p>
      </div>
      <div className={styles.buttonGroup}>
        <button onClick={declineCall} className={`${styles.button} ${styles.declineBtn}`}>
          Decline
        </button>
        <button onClick={handleAccept} className={`${styles.button} ${styles.acceptBtn}`}>
          Accept
        </button>
      </div>
    </div>
  );
};

export default IncomingCallPopup;
