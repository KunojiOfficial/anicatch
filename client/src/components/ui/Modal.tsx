import React from 'react';

interface ModalProps {
    children: React.ReactNode;
    onClose: () => void;
}

export default function Modal({ children, onClose }: ModalProps) {
    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
            <div className="bg-gray-900 border-2 border-gray-700 p-5 rounded-lg shadow-lg z-10">
                <button className="absolute top-0 right-0 m-2 text-gray-700" onClick={onClose}>
                    &times;
                </button>
                {children}
            </div>
        </div>
    );
}