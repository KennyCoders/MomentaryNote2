// src/components/ConfirmationModal.jsx
import React, { useEffect } from 'react';
import './ConfirmationModal.css';

function ConfirmationModal({ isOpen, onClose, onConfirm, message }) {

    useEffect(() => {
        const originalOverflow = document.body.style.overflow;

        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.body.style.overflow = originalOverflow || 'unset';
        };
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
