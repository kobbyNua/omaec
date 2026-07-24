

import { useEffect } from 'react';

function Modal({ isOpen, onClose, children }) {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                if (typeof onClose === 'function') {
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    const handleOverlayClick = () => {
        if (typeof onClose === 'function') {
            setTimeout(() => onClose(), 300);
        }
    };

    return (
        <div className="modal" role="dialog" aria-modal="true" onClick={handleOverlayClick}>
            <div className="modal-dialog">
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-body">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Modal