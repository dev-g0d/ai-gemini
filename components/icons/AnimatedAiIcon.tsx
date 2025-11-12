import React from 'react';

const DevGodIcon: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 4L26 9.33V20L16 25.33L6 20V9.33L16 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M11 13C11 12.4477 11.4477 12 12 12H13C13.5523 12 14 12.4477 14 13V14C14 14.5523 13.5523 15 13 15H12C11.4477 15 11 14.5523 11 14V13Z" fill="#22d3ee"/>
        <path d="M18 13C18 12.4477 18.4477 12 19 12H20C20.5523 12 21 12.4477 21 13V14C21 14.5523 20.5523 15 20 15H19C18.4477 15 18 14.5523 18 14V13Z" fill="#22d3ee"/>
        <path d="M16 28V25" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M16 4V1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
);


export const AnimatedAiIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <div className={`${className} relative flex-shrink-0 flex items-center justify-center`}>
    <style>{`
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
      .spinning-circle {
        animation: spin 15s linear infinite;
      }
    `}</style>
    <svg className="spinning-circle w-full h-full absolute" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle
        className="text-cyan-500"
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeDasharray="18 18" 
        strokeLinecap="round"
      />
    </svg>
    <div className="w-1/2 h-1/2 text-zinc-400">
        <DevGodIcon />
    </div>
  </div>
);