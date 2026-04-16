import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import ParticleBackground from './components/ParticleBackground';
import ImageUploader from './components/ImageUploader';
import ResultDisplay from './components/ResultDisplay';
import Chatbot from './components/Chatbot';
import Features from './components/Features';
import History from './components/History';
import './App.css';

// Load history from localStorage
const loadHistory = () => {
  try {
    const saved = localStorage.getItem('medvision-history');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Save history to localStorage
const saveHistory = (history) => {
  try {
    localStorage.setItem('medvision-history', JSON.stringify(history));
  } catch {
    // Storage full or unavailable
  }
};

// Convert file to a small thumbnail data URL
const createThumbnail = (file) => {
  return new Promise((resolve) => {
    if (!file) { resolve(null); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 80;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

function App() {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gatekeeperRejection, setGatekeeperRejection] = useState(null);
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [history, setHistory] = useState(loadHistory);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Generate preview URL when file changes
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setImagePreview(null);
    }
  }, [file]);

  // Apply theme based on the diagnosis result
  useEffect(() => {
    document.body.classList.remove('theme-pneumonia', 'theme-tuberculosis', 'theme-normal');
    if (prediction) {
      document.body.classList.add(`theme-${prediction.class.toLowerCase()}`);
    }
  }, [prediction]);

  // Save to history whenever prediction changes
  const addToHistory = useCallback(async (result, imageFile) => {
    const thumbnail = await createThumbnail(imageFile);
    const entry = {
      class: result.class,
      confidence: result.confidence,
      probabilities: result.probabilities,
      thumbnail,
      timestamp: Date.now()
    };
    setHistory(prev => {
      const updated = [entry, ...prev].slice(0, 10); // Keep last 10
      saveHistory(updated);
      return updated;
    });
  }, []);

  // Handle the image classification process
  const handlePrediction = async () => {
    if (!file || loading) return;

    setLoading(true);
    setPrediction(null);
    setError('');
    setGatekeeperRejection(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://127.0.0.1:5000/predict', { 
        method: 'POST', 
        body: formData 
      });

      const data = await response.json();

      if (response.status === 422 && data.rejection_type === 'gatekeeper') {
        // Gatekeeper rejected the image — not a lung X-ray
        setGatekeeperRejection({
          message: data.error,
          confidence: data.gatekeeper?.confidence,
          predictedClass: data.gatekeeper?.predicted_class
        });
      } else if (!response.ok) {
        throw new Error(data.error || 'Server error! Please try again.');
      } else {
        setPrediction(data);
        addToHistory(data, file);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset state for a new classification
  const handleReset = () => {
    setFile(null);
    setImagePreview(null);
    setPrediction(null);
    setError('');
    setGatekeeperRejection(null);
  };

  return (
    <>
      <ParticleBackground />

      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-logo">M</div>
          <span className="navbar-title">MedVision</span>
        </div>
        <div className="navbar-actions">
          <button className="history-toggle-btn" onClick={() => setHistoryOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6V12L16 14"/>
            </svg>
            <span>History</span>
          </button>
        </div>
      </nav>

      {/* History Drawer */}
      <History isOpen={historyOpen} onClose={() => setHistoryOpen(false)} history={history} />

      {/* Main Content */}
      <div className="app-container">
        <header className="app-header">
          <div className="hero-pill">
            <span className="hero-pill-dot"></span>
            AI-Driven Respiratory Disease Classification
          </div>
          <h1>
            <span className="hero-title-line">MedVision</span>
            <span className="hero-title-sub">Diagnostic Assistant</span>
          </h1>
          <p className="hero-subtitle">
            Upload a chest X-ray and get instant AI-powered analysis with explainable heatmaps
          </p>
          <div className="hero-badges">
            <span className="hero-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
              MobileNetV2 Gatekeeper
            </span>
            <span className="hero-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              VGG16 Classifier
            </span>
            <span className="hero-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/></svg>
              Grad-CAM Explainability
            </span>
          </div>
        </header>

        <Features />

        <main>
          <ImageUploader 
            onFileSelect={setFile} 
            onPredict={handlePrediction} 
            loading={loading} 
            file={file} 
          />
          <AnimatePresence>
            {!loading && (prediction || error || gatekeeperRejection) && (
              <ResultDisplay 
                prediction={prediction} 
                error={error} 
                gatekeeperRejection={gatekeeperRejection}
                imagePreview={imagePreview}
                onReset={handleReset} 
              />
            )}
          </AnimatePresence>
        </main>

        <Chatbot prediction={prediction} />
      </div>
    </>
  );
}

export default App;