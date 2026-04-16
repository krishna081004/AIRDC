import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './ImageUploader.css';

const UploadIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 32V16M24 16L18 22M24 16L30 22" stroke="url(#upload-grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 32C8 36.4183 11.5817 40 16 40H32C36.4183 40 40 36.4183 40 32" stroke="url(#upload-grad)" strokeWidth="2.5" strokeLinecap="round"/>
    <defs>
      <linearGradient id="upload-grad" x1="8" y1="16" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00d4ff"/>
        <stop offset="1" stopColor="#7E57C2"/>
      </linearGradient>
    </defs>
  </svg>
);

const ImageUploader = ({ onFileSelect, onPredict, loading, file }) => {
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreview(null);
    }
  }, [file]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === 'image/png' || droppedFile.type === 'image/jpeg')) {
      onFileSelect(droppedFile);
    }
  };

  return (
    <motion.div
      className="uploader-card glass-card"
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 50, damping: 20 }}
    >
      <div className="uploader-content">
        <div
          className={`image-preview-area ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {preview ? (
            <div className="image-preview-container">
              <img src={preview} alt="X-Ray Preview" className="image-preview" />
              <button className="change-image-btn" onClick={() => onFileSelect(null)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
          ) : (
            <>
              <input type="file" id="file-upload" onChange={handleFileChange} accept="image/png, image/jpeg" />
              <label htmlFor="file-upload" className="file-label">
                <motion.div
                  className="upload-icon-wrapper"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                >
                  <UploadIcon />
                </motion.div>
                <span className="upload-text-main">Drop your X-Ray here</span>
                <span className="upload-text-sub">or click to browse • PNG, JPEG</span>
              </label>
            </>
          )}
        </div>

        <motion.button
          onClick={onPredict}
          disabled={!file || loading}
          className="predict-button"
          whileHover={!loading && file ? { scale: 1.02 } : {}}
          whileTap={!loading && file ? { scale: 0.98 } : {}}
        >
          {loading ? (
            <div className="loader-dots">
              <span className="loader-dot" style={{ animationDelay: '0s' }}></span>
              <span className="loader-dot" style={{ animationDelay: '0.15s' }}></span>
              <span className="loader-dot" style={{ animationDelay: '0.3s' }}></span>
            </div>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px' }}>
                <path d="M9 3H5C3.89543 3 3 3.89543 3 5V9M15 3H19C20.1046 3 21 3.89543 21 5V9M21 15V19C21 20.1046 20.1046 21 19 21H15M3 15V19C3 20.1046 3.89543 21 5 21H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Classify Image
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ImageUploader;
