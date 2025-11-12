import React from 'react';

export const ResizeTextIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 13l5-8 5 8"/>
    <path d="M4.5 10h7"/>
    <path d="M16 17l2 2 2-2"/>
    <path d="M18 19V5"/>
    <path d="M16 7l2-2 2 2"/>
  </svg>
);
