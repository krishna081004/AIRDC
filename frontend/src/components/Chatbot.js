import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { knowledgeBase } from '../chat/knowledgeBase';
import './Chatbot.css';

const ChatBubbleIcon = () => (
    <span style={{ fontSize: '28px', lineHeight: 1 }}>🧑🏻‍⚕️</span>
);

const TypingIndicator = () => (
    <div className="chat-message bot typing-indicator">
        <span className="typing-dot"></span>
        <span className="typing-dot"></span>
        <span className="typing-dot"></span>
    </div>
);

const Chatbot = ({ prediction }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [context, setContext] = useState('default');
    const [locationInput, setLocationInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef(null);

    // Auto-scroll to latest message
    const scrollToBottom = () => {
        setTimeout(() => {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };
    useEffect(scrollToBottom, [messages, isTyping]);

    // Reset chat when a new diagnosis is received
    useEffect(() => {
        if (prediction) {
            const newContext = prediction.class.toLowerCase();
            setContext(newContext);
            setIsTyping(true);
            setMessages([]);
            setTimeout(() => {
                setIsTyping(false);
                setMessages([{ from: 'bot', text: knowledgeBase[newContext]?.greeting }]);
            }, 800);
        } else {
            setContext('default');
            setMessages([]);
            setIsOpen(false);
        }
    }, [prediction]);

    // Handle clicking a predefined question button
    const handleQuickReply = (reply) => {
        setMessages(prev => [...prev, { from: 'user', text: reply.question }]);
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            setMessages(prev => [...prev, { from: 'bot', text: reply.answer }]);
        }, 600);
    };
    
    // Handle the "Find a doctor" button click
    const handleFindDoctor = () => {
        setMessages(prev => [
            ...prev,
            { from: 'user', text: "Find a doctor near me" }
        ]);
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            setMessages(prev => [
                ...prev,
                { from: 'bot', text: "Of course. Please type your city or area in the input box below and press 'Send'." }
            ]);
        }, 500);
    };

    // Handle location form submission
    const handleLocationSubmit = (e) => {
        e.preventDefault();
        if (!locationInput) return;

        const specialistMap = {
            pneumonia: "Pulmonologist",
            tuberculosis: "Infectious Disease Specialist",
            normal: "General Practitioner"
        };

        const specialist = specialistMap[context] || "doctor";
        const query = encodeURIComponent(`${specialist} near ${locationInput}`);
        const link = `https://www.google.com/maps/search/?api=1&query=${query}`;
        
        const userMessage = { from: 'user', text: locationInput };
        const botMessage = { from: 'bot', text: <a href={link} target="_blank" rel="noopener noreferrer">Click here to find a {specialist.toLowerCase()}</a> };
        
        setMessages(prev => [...prev, userMessage]);
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            setMessages(prev => [...prev, botMessage]);
        }, 500);
        setLocationInput('');
    };

    return (
        <>
            <motion.div
                className={`floating-chat-button ${prediction && !isOpen ? 'notify' : ''}`}
                onClick={() => setIsOpen(true)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
            >
                <ChatBubbleIcon />
            </motion.div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="chat-window"
                        initial={{ y: 100, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 100, opacity: 0, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                    >
                        <div className="chat-header">
                            <div className="chat-header-info">
                                <div className="chat-header-dot"></div>
                                <h3>AI Health Assistant</h3>
                            </div>
                            <button onClick={() => setIsOpen(false)} aria-label="Close chat">×</button>
                        </div>

                        <div className="chat-body">
                            {messages.map((msg, index) => (
                                <motion.div
                                    key={index}
                                    className={`chat-message ${msg.from}`}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    {msg.text}
                                </motion.div>
                            ))}
                            {isTyping && <TypingIndicator />}
                            <div ref={chatEndRef} />
                        </div>
                        
                        <div className="chat-footer">
                            <AnimatePresence>
                                {context !== 'default' && (
                                    <motion.div
                                        className="quick-replies"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1, transition: {delay: 0.15} }}
                                        exit={{ height: 0, opacity: 0 }}
                                    >
                                        {knowledgeBase[context]?.questions.map((q, i) =>
                                            <button key={i} onClick={() => handleQuickReply(q)}>{q.question}</button>
                                        )}
                                        <button onClick={handleFindDoctor}>📍 Find a doctor near me</button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <form className="location-form" onSubmit={handleLocationSubmit}>
                                <input
                                    type="text"
                                    value={locationInput}
                                    onChange={(e) => setLocationInput(e.target.value)}
                                    placeholder="Enter location to find a doctor..."
                                />
                                <button type="submit">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Chatbot;