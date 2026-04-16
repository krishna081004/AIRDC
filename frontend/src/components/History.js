import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './History.css';

const classColors = {
  Normal: '#2ecc71',
  Pneumonia: '#e44d2e',
  Tuberculosis: '#f1c40f'
};

const History = ({ isOpen, onClose, history }) => {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="history-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.aside
            className="history-drawer"
            initial={{ x: -360 }}
            animate={{ x: 0 }}
            exit={{ x: -360 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="history-header">
              <h3>Prediction History</h3>
              <button className="history-close-btn" onClick={onClose}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M2 2L16 16M16 2L2 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="history-list">
              {history.length === 0 ? (
                <div className="history-empty">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ opacity: 0.3, marginBottom: '12px' }}>
                    <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M20 12V22L26 26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <p>No predictions yet</p>
                  <span>Classify an X-ray to see your history here</span>
                </div>
              ) : (
                history.map((item, index) => (
                  <motion.div
                    key={item.timestamp}
                    className="history-item"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="history-item-thumb">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt="X-ray" />
                      ) : (
                        <div className="history-item-placeholder">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                            <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
                            <path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="history-item-info">
                      <span
                        className="history-item-class"
                        style={{ color: classColors[item.class] || '#0095ff' }}
                      >
                        {item.class}
                      </span>
                      <span className="history-item-confidence">
                        {(item.confidence * 100).toFixed(1)}% confidence
                      </span>
                      <span className="history-item-time">{formatTime(item.timestamp)}</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {history.length > 0 && (
              <div className="history-footer">
                <span className="history-count">{history.length} prediction{history.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default History;
