

import { useEffect } from 'react';

function Modal({ isOpen, onClose, children }) {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event) => {
            event.stopPropagation();
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [isOpen]);

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