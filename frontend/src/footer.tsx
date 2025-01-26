import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="flex justify-center items-center p-4 bg-gray-800 text-gray-200">
            <a
                href="https://docs.google.com/forms/d/1Awp-xcvc1-22xQlTTgwKFoGz8G3-VD6YmBKXmnxtI3g/viewform?edit_requested=true"
                target="_blank"
                rel="noopener noreferrer"
                className="ll-btn"
            >
                Anna palautetta
            </a>
        </footer>
    );
};

export default Footer;