import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Accordion.css';

const Accordion = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="accordion-item">
            <motion.header
                className="accordion-header"
                onClick={() => setIsOpen(!isOpen)}
            >
                {title}
                <motion.div
                    className="accordion-icon"
                    animate={{ rotate: isOpen ? 180 : 0 }}
                >
                    <svg width="12" height="12" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </motion.div>
            </motion.header>
            <AnimatePresence>
                {isOpen && (
                    <motion.section
                        className="accordion-content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                    >
                        {children}
                    </motion.section>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Accordion;