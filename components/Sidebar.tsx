import React from 'react';
import type { Tool } from '../types';
import { ChatIcon } from './icons/ChatIcon';
import { ImageIcon } from './icons/ImageIcon';
import { EditIcon } from './icons/EditIcon';
import { MicIcon } from './icons/MicIcon';

interface SidebarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  isMobileMenuOpen: boolean;
  closeMobileMenu: () => void;
}

const ToolButton: React.FC<{
    toolName: Tool;
    label: string;
    activeTool: Tool;
    children: React.ReactNode;
    onClick: () => void;
}> = ({ toolName, label, activeTool, children, onClick }) => {
    const isActive = activeTool === toolName;
    return (
        <button
            onClick={onClick}
            title={label}
            className={`flex items-center w-full py-3 text-sm font-medium transition-colors duration-200 border-l-4 overflow-hidden
                justify-start pl-5
                md:justify-center md:pl-0 md:group-hover:justify-start md:group-hover:pl-5
                ${isActive
                    ? 'border-emerald-500 bg-slate-800 text-white'
                    : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
        >
            {children}
            <span className="whitespace-nowrap pl-4 md:hidden md:group-hover:inline">{label}</span>
        </button>
    );
};


export const Sidebar: React.FC<SidebarProps> = ({ activeTool, setActiveTool, isMobileMenuOpen, closeMobileMenu }) => {
  
  const handleToolClick = (tool: Tool) => {
    setActiveTool(tool);
    closeMobileMenu();
  };

  return (
    <aside 
        className={`bg-slate-900 flex-shrink-0 flex flex-col border-r border-slate-700 h-full z-30 group
            fixed md:relative transition-all duration-300 ease-in-out
            ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'} md:translate-x-0
            md:w-16 md:hover:w-64
        `}
    >
       <div className="overflow-y-auto overflow-x-hidden">
        <div className="pt-4 mb-6 flex items-center justify-center h-[2.5rem]">
            <h1 className="font-bold text-slate-50 whitespace-nowrap text-xl">
                <span className="md:hidden md:group-hover:inline">{`DEV/g0d`}</span>
                <span className="hidden md:inline md:group-hover:hidden">{`DG`}</span>
            </h1>
        </div>
        <nav className="w-full space-y-2">
            <ToolButton toolName="chat" label="แชท AI" activeTool={activeTool} onClick={() => handleToolClick('chat')}>
                <ChatIcon />
            </ToolButton>
            <ToolButton toolName="image-generator" label="สร้างรูปภาพ" activeTool={activeTool} onClick={() => handleToolClick('image-generator')}>
                <ImageIcon />
            </ToolButton>
            <ToolButton toolName="image-editor" label="แก้ไขรูปภาพ" activeTool={activeTool} onClick={() => handleToolClick('image-editor')}>
                <EditIcon />
            </ToolButton>
            <ToolButton toolName="live-conversation" label="สนทนาสด" activeTool={activeTool} onClick={() => handleToolClick('live-conversation')}>
                <MicIcon />
            </ToolButton>
        </nav>
       </div>
    </aside>
  );
};