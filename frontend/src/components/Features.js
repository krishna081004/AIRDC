import React from 'react';
import { motion } from 'framer-motion';
import './Features.css';

const IconBrain = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.5 2 6 4.5 6 7.5C6 9.5 7 11 8 12C7 13 6 14.5 6 16.5C6 19.5 8.5 22 12 22C15.5 22 18 19.5 18 16.5C18 14.5 17 13 16 12C17 11 18 9.5 18 7.5C18 4.5 15.5 2 12 2Z" stroke="url(#brain-grad)" strokeWidth="1.5"/>
    <path d="M12 2V22" stroke="url(#brain-grad)" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8.5 7H6M15.5 7H18M8.5 17H6M15.5 17H18" stroke="url(#brain-grad)" strokeWidth="1.5" strokeLinecap="round"/>
    <defs>
      <linearGradient id="brain-grad" x1="6" y1="2" x2="18" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00d4ff"/><stop offset="1" stopColor="#7E57C2"/>
      </linearGradient>
    </defs>
  </svg>
);

const IconTheme = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="5" stroke="url(#theme-grad)" strokeWidth="1.5"/>
    <path d="M12 2V4M12 20V22M2 12H4M20 12H22M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07M19.07 4.93L17.66 6.34M6.34 17.66L4.93 19.07" stroke="url(#theme-grad)" strokeWidth="1.5" strokeLinecap="round"/>
    <defs>
      <linearGradient id="theme-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f1c40f"/><stop offset="1" stopColor="#e44d2e"/>
      </linearGradient>
    </defs>
  </svg>
);

const IconChat = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 11.5C21 16.75 16.97 21 12 21C10.67 21 9.41 20.7 8.27 20.17L3 21L4.39 16.88C3.52 15.37 3 13.5 3 11.5C3 6.25 7.03 2 12 2C16.97 2 21 6.25 21 11.5Z" stroke="url(#chat-grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 10.5H8.01M12 10.5H12.01M16 10.5H16.01" stroke="url(#chat-grad)" strokeWidth="2" strokeLinecap="round"/>
    <defs>
      <linearGradient id="chat-grad" x1="3" y1="2" x2="21" y2="21" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2ecc71"/><stop offset="1" stopColor="#00d4ff"/>
      </linearGradient>
    </defs>
  </svg>
);

const IconPin = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.134 2 5 5.134 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.134 15.866 2 12 2Z" stroke="url(#pin-grad)" strokeWidth="1.5"/>
    <circle cx="12" cy="9" r="2.5" stroke="url(#pin-grad)" strokeWidth="1.5"/>
    <defs>
      <linearGradient id="pin-grad" x1="5" y1="2" x2="19" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#e44d2e"/><stop offset="1" stopColor="#f1c40f"/>
      </linearGradient>
    </defs>
  </svg>
);

const featureList = [
  {
    icon: <IconBrain />,
    title: "Advanced AI Analysis",
    description: "Upload a chest X-ray image. Our VGG16 deep learning model analyzes it to detect signs of Pneumonia, Tuberculosis, or classifies it as Normal."
  },
  {
    icon: <IconTheme />,
    title: "Dynamic Visual Feedback",
    description: "The entire interface theme shifts color to reflect your diagnosis — red for Pneumonia, yellow for TB, green for Normal — giving you instant visual feedback."
  },
  {
    icon: <IconChat />,
    title: "AI Health Assistant",
    description: "After a diagnosis, a contextual chatbot activates to answer questions about the detected condition, offering curated medical information."
  },
  {
    icon: <IconPin />,
    title: "Find a Specialist",
    description: "The chatbot maps your diagnosis to the right medical specialist and helps you find one nearby via Google Maps integration."
  }
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 }
  }
};

const cardVariants = {
  hidden: { y: 40, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 80, damping: 20 }
  }
};

const Features = () => {
  return (
    <motion.section
      className="features-section"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.h2
        className="features-title"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        How It Works
      </motion.h2>
      <div className="features-grid">
        {featureList.map((feature, index) => (
          <motion.div key={index} className="feature-card glass-card" variants={cardVariants}>
            <div className="feature-icon">{feature.icon}</div>
            <h3 className="feature-card-title">{feature.title}</h3>
            <p className="feature-card-description">{feature.description}</p>
            <div className="feature-card-number">{String(index + 1).padStart(2, '0')}</div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
};

export default Features;