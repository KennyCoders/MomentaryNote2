// src/components/ConfirmationModal.jsx
import React from 'react';
import './ConfirmationModal.css'; // We'll create this CSS file next

function ConfirmationModal({ isOpen, onClose, onConfirm, message }) {
    if (!isOpen) {
        return null;
    }

    // Prevent background scrolling when modal is open
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);


    return (
        <div className="modal-overlay" onClick={onClose}> {/* Close on overlay click */}
            <div className="modal-content" onClick={(e) => e.stopPropagation()}> {/* Prevent closing when clicking inside modal */}
                <p>{message}</p>
                <div className="modal-actions">
                    <button className="btn btn-primary modal-btn-confirm" onClick={onConfirm}>
                        Agree
                    </button>
                     <button className="btn btn-secondary modal-btn-cancel" onClick={onClose}>
                        Don't Agree
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmationModal;