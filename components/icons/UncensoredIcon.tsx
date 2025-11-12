import React from 'react';

export const UncensoredIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
     <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
     <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"></path>
     <path d="M7 8.5l1.5 1.5"></path>
     <path d="M8.5 7l1.5 1.5"></path>
     <path d="M15.5 7l-1.5 1.5"></path>
     <path d="M17 8.5l-1.5 1.5"></path>
     <path d="M9 14h6a1 1 0 0 1 1 1v1a1 1 0 0 1 -1 1h-6a1 1 0 0 1 -1 -1v-1a1 1 0 0 1 1 -1z"></path>
  </svg>
);