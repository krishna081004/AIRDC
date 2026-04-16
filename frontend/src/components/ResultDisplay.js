import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { diseaseInfo } from '../data/diseaseInfo';
import Accordion from './Accordion';
import './ResultDisplay.css';

const StatusIcon = ({ type }) => {
  if (type === 'normal') {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="13" stroke="#2ecc71" strokeWidth="2"/>
        <path d="M9 14L12.5 17.5L19 11" stroke="#2ecc71" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="13" stroke={type === 'pneumonia' ? '#e44d2e' : '#f1c40f'} strokeWidth="2"/>
      <path d="M14 9V15" stroke={type === 'pneumonia' ? '#e44d2e' : '#f1c40f'} strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="14" cy="19" r="1.5" fill={type === 'pneumonia' ? '#e44d2e' : '#f1c40f'}/>
    </svg>
  );
};

const ProbabilityBar = ({ label, value, color, delay }) => {
  const percent = (value * 100).toFixed(1);
  return (
    <div className="prob-bar-row">
      <div className="prob-bar-label">
        <span className="prob-bar-name">{label}</span>
        <span className="prob-bar-value">{percent}%</span>
      </div>
      <div className="prob-bar-track">
        <motion.div
          className="prob-bar-fill"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, delay, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

const classColors = {
  Normal: '#2ecc71',
  Pneumonia: '#e44d2e',
  Tuberculosis: '#f1c40f'
};

// --- GRAD-CAM HEATMAP VIEWER ---
const GradCAMViewer = ({ originalImage, heatmapImage, predictedClass }) => {
  const [opacity, setOpacity] = useState(0.6);

  if (!heatmapImage || !originalImage) return null;

  const accentColor = classColors[predictedClass] || '#6c63ff';

  const interpretations = {
    Pneumonia: {
      high: "These bright regions indicate areas where the AI detected patterns consistent with pneumonia — such as opacities, consolidations, or infiltrates in the lung fields.",
      low: "These darker regions appeared normal to the AI — clear lung tissue with no significant abnormalities detected."
    },
    Tuberculosis: {
      high: "These bright regions highlight areas where the AI identified features associated with tuberculosis — such as cavities, nodules, or fibrotic changes typically seen in the upper lung zones.",
      low: "These darker regions did not show significant TB-related patterns — the lung tissue in these areas appeared relatively unaffected."
    },
    Normal: {
      high: "These bright regions are the areas the AI focused on most to confirm the lungs are healthy — typically clear lung fields with normal vascular markings.",
      low: "These regions contributed less to the AI's decision — they may include non-lung areas like the mediastinum or diaphragm borders."
    }
  };

  return (
    <motion.div 
      className="gradcam-section"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
    >
      <div className="gradcam-header">
        <div className="gradcam-title-row">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="3" stroke={accentColor} strokeWidth="1.5"/>
          </svg>
          <h3 className="gradcam-title">AI Focus Map <span className="gradcam-badge">Grad-CAM</span></h3>
        </div>
        <p className="gradcam-description">
          Highlighted regions show where the AI focused to make its diagnosis.
          <span className="gradcam-legend"> Red = high attention, Blue = low attention.</span>
        </p>
      </div>

      <div className="gradcam-viewer">
        <div className="gradcam-image-container">
          <img 
            src={originalImage} 
            alt="Original X-ray" 
            className="gradcam-img gradcam-original"
          />
          <img 
            src={heatmapImage} 
            alt="Grad-CAM heatmap overlay" 
            className="gradcam-img gradcam-overlay"
            style={{ opacity: opacity }}
          />
        </div>

        <div className="gradcam-labels">
          <span className="gradcam-label-left">Original</span>
          <span className="gradcam-label-right">Heatmap</span>
        </div>

        <div className="gradcam-slider-container">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="gradcam-slider"
            style={{
              '--slider-progress': `${opacity * 100}%`,
              '--accent-color': accentColor
            }}
          />
          <div className="gradcam-slider-label">
            Overlay: <strong>{Math.round(opacity * 100)}%</strong>
          </div>
        </div>
      </div>

      {/* Interpretation Card */}
      <div className="gradcam-interpretation">
        <div className="gradcam-interp-row">
          <span className="gradcam-dot gradcam-dot-high"></span>
          <div>
            <strong className="gradcam-interp-label">High Attention (Red/Yellow)</strong>
            <p className="gradcam-interp-text">{interpretations[predictedClass]?.high}</p>
          </div>
        </div>
        <div className="gradcam-interp-row">
          <span className="gradcam-dot gradcam-dot-low"></span>
          <div>
            <strong className="gradcam-interp-label">Low Attention (Blue/Dark)</strong>
            <p className="gradcam-interp-text">{interpretations[predictedClass]?.low}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ResultDisplay = ({ prediction, error, gatekeeperRejection, imagePreview, onReset }) => {
  // --- GATEKEEPER REJECTION STATE ---
  if (gatekeeperRejection) {
    return (
      <motion.div 
        className="result-card glass-card gatekeeper-rejection" 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 70, damping: 20 }}
      >
        <div className="gatekeeper-icon">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <path d="M28 4L6 14V26C6 39.2 15.4 51.4 28 54C40.6 51.4 50 39.2 50 26V14L28 4Z" 
                  stroke="url(#shield-grad)" strokeWidth="2.5" fill="rgba(255,152,0,0.08)"/>
            <path d="M22 28L26 32L34 24" stroke="#ff9800" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0"/>
            <path d="M21 21L35 35M35 21L21 35" stroke="#ff9800" strokeWidth="2.5" strokeLinecap="round"/>
            <defs>
              <linearGradient id="shield-grad" x1="6" y1="4" x2="50" y2="54" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ff9800"/>
                <stop offset="1" stopColor="#f44336"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h2 className="gatekeeper-title">Image Verification Failed</h2>
        <p className="gatekeeper-message">{gatekeeperRejection.message}</p>

        {gatekeeperRejection.confidence && (
          <div className="gatekeeper-confidence">
            <span className="gatekeeper-conf-label">Gatekeeper Confidence</span>
            <span className="gatekeeper-conf-value">
              {(gatekeeperRejection.confidence * 100).toFixed(1)}%
            </span>
          </div>
        )}

        <div className="gatekeeper-hint">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>Only valid chest / lung X-ray images are accepted for disease classification.</span>
        </div>

        <button onClick={onReset} className="reset-button gatekeeper-reset-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: '6px' }}>
            <path d="M1 4V10H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3.51 15A9 9 0 1 0 5.64 5.64L1 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Upload a Different Image
        </button>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div className="result-card glass-card error" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="error-icon">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="#e44d2e" strokeWidth="2"/>
            <path d="M14 14L26 26M26 14L14 26" stroke="#e44d2e" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h2>{error}</h2>
        <button onClick={onReset} className="reset-button">Try Again</button>
      </motion.div>
    );
  }

  if (!prediction) return null;

  const { 'class': predictedClass, confidence, probabilities, gradcam } = prediction;
  const confidencePercent = (confidence * 100).toFixed(2);
  const classKey = predictedClass.toLowerCase();
  const infoData = diseaseInfo[classKey];

  return (
    <motion.div
      className="result-card glass-card"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 70, damping: 20 }}
    >
      {/* Header */}
      <div className="result-header">
        <StatusIcon type={classKey} />
        <h2 className="result-title">Analysis Complete</h2>
      </div>

      {/* Main Prediction */}
      <motion.div
        className="prediction-highlight"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
      >
        <span className={`prediction-class ${classKey}`}>{predictedClass}</span>
      </motion.div>

      <p className="confidence-text">
        Confidence: <strong>{confidencePercent}%</strong>
      </p>

      {/* Grad-CAM Heatmap Viewer */}
      <GradCAMViewer 
        originalImage={imagePreview} 
        heatmapImage={gradcam} 
        predictedClass={predictedClass}
      />

      {/* Probability Bars */}
      {probabilities && (
        <div className="probability-section">
          <h3 className="prob-section-title">Model Output Distribution</h3>
          {Object.entries(probabilities).map(([className, prob], i) => (
            <ProbabilityBar
              key={className}
              label={className}
              value={prob}
              color={classColors[className]}
              delay={0.3 + i * 0.15}
            />
          ))}
        </div>
      )}

      {/* Disease Info Accordion */}
      {infoData && (
        <div className="info-accordion-container">
          {infoData.sections.map((section, index) => (
            <Accordion key={index} title={section.title}>
              <p>{section.content}</p>
            </Accordion>
          ))}
        </div>
      )}

      <button onClick={onReset} className="reset-button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: '6px' }}>
          <path d="M1 4V10H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3.51 15A9 9 0 1 0 5.64 5.64L1 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Classify Another Image
      </button>
    </motion.div>
  );
};

export default ResultDisplay;