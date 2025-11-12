import React from 'react';

interface MessageTimestampProps {
  timestamp: string;
}

export const MessageTimestamp: React.FC<MessageTimestampProps> = ({ timestamp }) => {
  if (!timestamp) return null;

  const date = new Date(timestamp);
  
  const time = date.toLocaleTimeString('th-TH', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok'
  });

  const fullDateTime = date.toLocaleString('th-TH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok'
  });

  return (
    <div 
        className="text-xs text-zinc-500 mb-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
        title={fullDateTime}
    >
      {time}
    </div>
  );
};