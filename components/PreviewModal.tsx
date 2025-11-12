import React from 'react';
import type { Attachment } from '../types';
import { CloseIcon } from './icons/CloseIcon';

interface PreviewModalProps {
  attachment: Attachment;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ attachment, onClose }) => {
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
      <div className="relative max-w-4xl max-h-[90vh] bg-zinc-900 rounded-lg p-2 shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute -top-4 -right-4 bg-zinc-700 hover:bg-red-600 text-white rounded-full p-2 z-10 transition-transform hover:scale-110"
          aria-label="Close preview"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
        {attachment.type.startsWith('image/') ? (
          <img 
            src={attachment.dataUrl} 
            alt={attachment.name} 
            className="max-w-full max-h-[85vh] object-contain rounded"
          />
        ) : attachment.type.startsWith('video/') ? (
          <video 
            src={attachment.dataUrl} 
            controls 
            autoPlay
            className="max-w-full max-h-[85vh] object-contain rounded"
          />
        ) : null}
        <p className="text-center text-zinc-400 mt-2 text-sm truncate">{attachment.name}</p>
      </div>
    </div>
  );
};