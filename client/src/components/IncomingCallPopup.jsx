import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContent } from '../context/AppContext';
import styles from './IncomingCallPopup.module.css';

const IncomingCallPopup = () => {
  const {
    callIncoming,
    incomingCallFrom,
    declineCall,
  } = useContext(AppContent);

  const navigate = useNavigate();

  const handleAccept = () => {
    if (incomingCallFrom?.from) {
      navigate(`/videoCall/${incomingCallFrom.from}?accepting=true`);
    }
  };

  // No popup if there's no incoming call
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
        <p>📞 Incoming call from <strong>{incomingCallFrom.username || "Unknown Caller"}</strong></p>
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
