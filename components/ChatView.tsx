import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getChatResponse, getTextToSpeechAudio } from '../services/geminiService';
import { loadChatHistory, saveChatHistory, createNewChat } from '../services/firebaseService';
import type { Message, GroundingSource, Attachment } from '../types';
import { SpeakerIcon } from './icons/SpeakerIcon';
import { TrashIcon } from './icons/TrashIcon';
import { playAudio } from '../utils/audioUtils';
import { AnimatedAiIcon } from './icons/AnimatedAiIcon';
import { ReplyIcon } from './icons/ReplyIcon';
import { CloseIcon } from './icons/CloseIcon';
import { PaperclipIcon } from './icons/PaperclipIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { PreviewModal } from './PreviewModal';
import { CopyIcon } from './icons/CopyIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { CheckIcon } from './icons/CheckIcon';
import { MessageTimestamp } from './MessageTimestamp';
import { StopIcon } from './icons/StopIcon';

const SourceLink: React.FC<{ source: GroundingSource }> = ({ source }) => (
    <a
        href={source.uri}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-xs truncate bg-zinc-700 hover:bg-zinc-600 text-cyan-400 text-xs px-2 py-1 rounded-md transition-colors"
        title={source.uri}
    >
        {source.title || new URL(source.uri).hostname}
    </a>
);

const CodeBlock: React.FC<any> = ({ node, children, ...props }) => {
    const [isCopied, setIsCopied] = useState(false);

    const langExtMap: Record<string, string> = {
      python: 'py', javascript: 'js', typescript: 'ts', html: 'html', css: 'css',
      json: 'json', markdown: 'md', java: 'java', csharp: 'cs', cpp: 'cpp',
      ruby: 'rb', go: 'go', rust: 'rs', shell: 'sh', bash: 'sh',
    };
    const getFileExtension = (lang: string) => langExtMap[lang] || 'txt';
  
    const handleDownloadCode = useCallback((code: string, language: string) => {
        const extension = getFileExtension(language);
        const filename = `gemini-code.${extension}`;
        const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, []);

    const handleCopyCode = useCallback((codeToCopy: string) => {
        navigator.clipboard.writeText(codeToCopy).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2500);
        }).catch(err => console.error("Failed to copy code:", err));
    }, []);
    
    const codeNode = node?.children?.[0];
    if (codeNode && codeNode.tagName === 'code') {
        const className = codeNode.properties?.className || [];
        const language = className[0]?.replace('language-', '') || '';
        const code = codeNode.children?.[0]?.value || '';

        if (code) {
            return (
                <div className="relative group my-2">
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-zinc-800/80 backdrop-blur-sm text-zinc-400 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {language && <span className="text-xs mr-2 px-1 font-sans">{language}</span>}
                        <button
                            onClick={() => handleCopyCode(code)}
                            className="p-1.5 hover:bg-zinc-700 rounded"
                            title="คัดลอกโค้ด"
                        >
                            {isCopied ? <CheckIcon /> : <CopyIcon />}
                        </button>
                        <button
                            onClick={() => handleDownloadCode(code, language)}
                            className="p-1.5 hover:bg-zinc-700 rounded"
                            title="ดาวน์โหลดไฟล์"
                        >
                            <DownloadIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <pre className="bg-zinc-900 text-zinc-200 p-4 pt-10 rounded-md whitespace-pre-wrap break-words" {...props}>
                        {children}
                    </pre>
                </div>
            );
        }
    }
    return <pre className="bg-zinc-900 text-zinc-200 p-4 rounded-md my-2 whitespace-pre-wrap break-words" {...props}>{children}</pre>;
};

const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(true);
  const isInitialMount = useRef(true);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uncensoredMode, setUncensoredMode] = useState<'off' | 'polite' | 'vulgar'>('off');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [previewingAttachment, setPreviewingAttachment] = useState<Attachment | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const TEXT_LENGTH_LIMIT = 700;

  const getReplyHeaderText = (replier: 'user' | 'ai', repliedTo: 'user' | 'ai'): string => {
    if (replier === 'user') {
        return repliedTo === 'ai' ? 'คุณตอบกลับ AI' : 'คุณตอบกลับตัวเอง';
    }
    if (repliedTo === 'user') {
        return 'AI ตอบกลับคุณ';
    }
    return 'AI ตอบกลับตัวเอง';
  };
  
  const MarkdownComponents = React.useMemo(() => ({
      pre: CodeBlock,
      code: ({ node, inline, className, children, ...props }) => {
          if (inline) {
              return <code className="bg-zinc-700 text-cyan-300 px-1 py-0.5 rounded" {...props}>{children}</code>;
          }
          return <code className={className} {...props}>{children}</code>;
      },
      p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
      strong: ({ node, ...props }) => <strong className="font-bold text-cyan-400" {...props} />,
  }), []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Effect for initializing chat from Firebase on first load
  useEffect(() => {
    const initializeChat = async () => {
        setIsChatLoading(true);
        try {
            let storedChatId = localStorage.getItem('gemini-pro-toolbox-current-chat-id');
            
            if (storedChatId) {
                const loadedMessages = await loadChatHistory(storedChatId);
                if (loadedMessages.length > 0) {
                    setMessages(loadedMessages);
                    setChatId(storedChatId);
                } else {
                    storedChatId = null; // History is empty/corrupt, create a new chat
                }
            } 
            
            if (!storedChatId) {
                const newChatId = await createNewChat();
                setChatId(newChatId);
                localStorage.setItem('gemini-pro-toolbox-current-chat-id', newChatId);
                const initialMessages = await loadChatHistory(newChatId);
                setMessages(initialMessages);
            }
        } catch (error) {
            console.error("Failed to initialize chat:", error);
            setMessages([{ id: 'error-initial', sender: 'ai', text: "ไม่สามารถโหลดประวัติการแชทได้ กรุณารีเฟรชหน้า", timestamp: new Date().toISOString() }]);
        } finally {
            setIsChatLoading(false);
        }
    };
    initializeChat();
  }, []);

  // Effect to save history to Firebase when messages change
  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
    }
    if (chatId && messages.length > 0 && !isChatLoading) {
        saveChatHistory(chatId, messages).catch(error => {
            console.error("Failed to save chat history to Firebase:", error);
        });
    }
  }, [messages, chatId, isChatLoading]);


  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [input]);

  const handlePaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    const items = event.clipboardData?.items;
    if (!items) return;
  
    const newAttachments: Attachment[] = [];
    let textToInsert = '';
  
    const processFile = async (file: File): Promise<Attachment | null> => {
        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const base64Data = dataUrl.split(',')[1];
    
            let fileName = file.name;
            if (file.name === 'pasted_text.txt') {
                const existingTxtCount = [...attachments, ...newAttachments].filter(a => a.name.startsWith('pasted_text')).length;
                if (existingTxtCount > 0) {
                    fileName = `pasted_text${existingTxtCount + 1}.txt`;
                }
            }
    
            return { name: fileName, type: file.type, dataUrl, base64Data };
        } catch (error) {
            console.error("Error processing file:", error);
            return null;
        }
    };
  
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
                const attachment = await processFile(file);
                if (attachment) newAttachments.push(attachment);
            }
        } else if (item.kind === 'string' && item.type.startsWith('text/plain')) {
            const pastedText = await new Promise<string>(resolve => item.getAsString(resolve));
            if (pastedText) {
                if (pastedText.length > TEXT_LENGTH_LIMIT) {
                    const blob = new Blob([pastedText], { type: 'text/plain' });
                    const file = new File([blob], 'pasted_text.txt', { type: 'text/plain' });
                    const attachment = await processFile(file);
                    if (attachment) newAttachments.push(attachment);
                } else {
                    textToInsert = pastedText;
                }
            }
        }
    }
  
    if (newAttachments.length > 0) {
        setAttachments(prev => {
            const updated = [...prev, ...newAttachments];
            if (updated.length > 5) {
                alert("คุณสามารถแนบไฟล์ได้สูงสุด 5 ไฟล์");
                return updated.slice(0, 5);
            }
            return updated;
        });
    }
  
    if (textToInsert) {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        
        setInput(currentText => {
            return currentText.substring(0, start) + textToInsert + currentText.substring(end);
        });

        setTimeout(() => {
            if (textareaRef.current) {
                const newCursorPosition = start + textToInsert.length;
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursorPosition;
            }
        }, 0);
    }
  };
  

  const handleSend = async () => {
    if ((input.trim() === '' && attachments.length === 0) || isLoading) return;
    
    const userMessage: Message = { 
        id: Date.now().toString(), 
        sender: 'user', 
        text: input, 
        replyTo: replyingTo,
        attachments: attachments,
        timestamp: new Date().toISOString(),
    };
    
    const historyForApi = messages;
    setMessages(prev => [...prev, userMessage]);
    
    setInput('');
    setReplyingTo(null);
    setAttachments([]);
    setIsLoading(true);

    try {
      const { responseText, sources } = await getChatResponse(
          input,
          historyForApi,
          replyingTo ? userMessage : undefined,
          attachments,
          uncensoredMode
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: responseText,
        sources: sources,
        replyTo: replyingTo ? userMessage : undefined,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting chat response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const stopCurrentAudio = useCallback(() => {
    if (currentAudioSourceRef.current) {
      currentAudioSourceRef.current.stop();
      currentAudioSourceRef.current.onended = null;
      currentAudioSourceRef.current = null;
    }
    setPlayingAudioId(null);
  }, []);

  const handleAudioControl = useCallback(async (message: Message) => {
    if (playingAudioId === message.id) {
      stopCurrentAudio();
      return;
    }
    
    stopCurrentAudio();

    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioContext = audioContextRef.current;

    setPlayingAudioId(message.id);
    try {
        const audioData = message.audioData || await getTextToSpeechAudio(message.text);
        if (!message.audioData) {
            setMessages(prev => prev.map(m => m.id === message.id ? {...m, audioData} : m));
        }
        
        const sourceNode = await playAudio(audioData, audioContext);
        currentAudioSourceRef.current = sourceNode;

        sourceNode.onended = () => {
          if (currentAudioSourceRef.current === sourceNode) {
            currentAudioSourceRef.current = null;
            setPlayingAudioId(null);
          }
        };

    } catch (error) {
        console.error("Error playing audio:", error);
        stopCurrentAudio();
    }
  }, [playingAudioId, stopCurrentAudio]);

  const handleNewChat = async () => {
    setIsChatLoading(true);
    setReplyingTo(null);
    setAttachments([]);
    try {
        const newChatId = await createNewChat();
        setChatId(newChatId);
        localStorage.setItem('gemini-pro-toolbox-current-chat-id', newChatId);
        const initialMessages = await loadChatHistory(newChatId);
        setMessages(initialMessages);
    } catch (error) {
        console.error("Failed to create new chat:", error);
        setMessages([{ id: 'error-new-chat', sender: 'ai', text: "ไม่สามารถเริ่มแชทใหม่ได้", timestamp: new Date().toISOString() }]);
    } finally {
        setIsChatLoading(false);
    }
  };

  const processAndSetFiles = async (files: File[]) => {
      const newAttachments: Attachment[] = [];
      for (const file of files) {
          if (attachments.length + newAttachments.length >= 5) {
              alert("คุณสามารถแนบไฟล์ได้สูงสุด 5 ไฟล์");
              break;
          }
          const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
          });
          const base64Data = dataUrl.split(',')[1];
          newAttachments.push({
              name: file.name,
              type: file.type,
              dataUrl,
              base64Data
          });
      }
      setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files) {
          processAndSetFiles(Array.from(files));
      }
      event.target.value = '';
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    setAttachments(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
          return;
      }
      setIsDraggingOver(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
          processAndSetFiles(Array.from(files));
      }
  };


  return (
    <div 
        className="relative flex flex-col h-full bg-transparent"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
    >
        {isDraggingOver && (
            <div className="absolute inset-0 bg-zinc-900/80 border-4 border-dashed border-cyan-500 rounded-lg flex items-center justify-center z-10 pointer-events-none">
                <p className="text-2xl font-bold text-white">วางไฟล์ที่นี่</p>
            </div>
        )}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {isChatLoading && (
            <div className="flex items-center justify-center h-full">
                <div className="animate-pulse flex items-center gap-3">
                    <AnimatedAiIcon />
                    <span className="text-zinc-400">กำลังโหลดประวัติการแชท...</span>
                </div>
            </div>
        )}
        {!isChatLoading && messages.map((msg) => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'ai' && <AnimatedAiIcon />}
             <div className={`flex items-end gap-2 group ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex flex-col max-w-[85%] md:max-w-lg lg:max-w-2xl`}>
                  <div className={`inline-block px-4 py-3 rounded-lg break-words ${msg.sender === 'user' ? 'bg-cyan-600 rounded-br-none self-end' : 'bg-zinc-800 rounded-bl-none self-start'}`}>
                    {msg.replyTo && (
                       <div className="mb-2 p-2 border-l-2 border-zinc-600 bg-zinc-900/50 rounded text-sm">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                              <ReplyIcon className="w-3.5 h-3.5" />
                              <span>{getReplyHeaderText(msg.sender, msg.replyTo.sender)}</span>
                          </div>
                          <p className="text-xs text-zinc-300 mt-1 line-clamp-1" title={msg.replyTo.text}>
                              {msg.replyTo.text}
                          </p>
                      </div>
                    )}
                    {msg.attachments && msg.attachments.length > 0 && (
                         <div className="mb-2 inline-grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {msg.attachments.map((att, index) => (
                              <div 
                                key={index} 
                                className="relative w-24 h-24 rounded-md overflow-hidden bg-zinc-700 cursor-pointer group"
                                onClick={() => (att.type.startsWith('image/') || att.type.startsWith('video/')) && setPreviewingAttachment(att)}
                              >
                                {att.type.startsWith('image/') ? (
                                  <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover hover:opacity-80 transition-opacity" />
                                ) : att.type.startsWith('video/') ? (
                                  <div className="relative w-full h-full">
                                    <video src={att.dataUrl} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                       <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"></path></svg>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-xs text-zinc-300 p-2" title={att.name}>
                                      <DocumentTextIcon className="w-10 h-10 text-zinc-400 mb-1 flex-shrink-0" />
                                      <span className="truncate w-full text-center">{att.name}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                    )}
                    {msg.text && (
                      <div className="text-white">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className={`mt-2 pt-2 space-y-2 ${msg.sender === 'user' ? 'self-end' : 'self-start'}`}>
                        <h4 className="text-xs font-semibold text-zinc-400">แหล่งข้อมูล:</h4>
                        <div className="flex flex-wrap gap-2">
                            {msg.sources.map((source, index) => <SourceLink key={index} source={source} />)}
                        </div>
                    </div>
                  )}
                  {msg.sender === 'ai' && (
                    <div className="mt-2 flex items-center gap-2 self-start">
                        <button 
                            onClick={() => handleAudioControl(msg)} 
                            className="text-zinc-500 hover:text-zinc-200 transition-colors" 
                            title={playingAudioId === msg.id ? 'หยุดเล่น' : 'เล่นเสียง'}
                        >
                            {playingAudioId === msg.id ? <StopIcon /> : <SpeakerIcon />}
                        </button>
                        <button onClick={() => setReplyingTo(msg)} className="text-zinc-500 hover:text-zinc-200 transition-colors" title="ตอบกลับ">
                            <ReplyIcon />
                        </button>
                    </div>
                  )}
                </div>
                {msg.timestamp && <MessageTimestamp timestamp={msg.timestamp} />}
            </div>
            {msg.sender === 'user' && <div className="w-8 h-8 rounded-full bg-zinc-700 flex-shrink-0 self-end"></div>}
          </div>
        ))}
        {isLoading && (
            <div className="flex items-end gap-3 justify-start">
                <AnimatedAiIcon />
                <div className="max-w-lg lg:max-w-2xl px-4 py-3 rounded-lg bg-zinc-800 rounded-bl-none flex items-center">
                    <div className="animate-pulse flex space-x-2">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                        <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                        <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 md:p-4 bg-zinc-950/70 backdrop-blur-sm border-t border-zinc-800">
        <div className="max-w-4xl mx-auto">
            <div className="mb-2 flex justify-center">
                <div className="flex items-center space-x-1 bg-zinc-800/50 p-1 rounded-lg shadow-md">
                    <button 
                        onClick={handleNewChat} 
                        className="p-2 text-zinc-400 hover:bg-zinc-700 hover:text-white rounded transition-colors duration-200"
                        aria-label="แชทใหม่"
                        title="แชทใหม่"
                    >
                        <TrashIcon />
                    </button>
                    <div className="flex items-center border-l border-zinc-700 ml-1 pl-1">
                        <button 
                            onClick={() => setUncensoredMode('off')}
                            className={`px-3 py-1.5 text-xs rounded transition-colors ${uncensoredMode === 'off' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-700'}`}
                            title="โหมดปกติ"
                        >
                            ปกติ
                        </button>
                        <button 
                            onClick={() => setUncensoredMode('polite')}
                            className={`px-3 py-1.5 text-xs rounded transition-colors ${uncensoredMode === 'polite' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:bg-zinc-700'}`}
                             title="โหมดไร้ขีดจำกัด (สุภาพ)"
                        >
                            ไร้ขีดจำกัด (สุภาพ)
                        </button>
                        <button 
                            onClick={() => setUncensoredMode('vulgar')}
                            className={`px-3 py-1.5 text-xs rounded transition-colors ${uncensoredMode === 'vulgar' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:bg-zinc-700'}`}
                            title="โหมดไร้ขีดจำกัด (หยาบ)"
                        >
                           ไร้ขีดจำกัด (หยาบ)
                        </button>
                    </div>
                </div>
            </div>
          {attachments.length > 0 && (
            <div className="mb-2 p-2 bg-zinc-800 rounded-md">
              <div className="flex items-center gap-2 overflow-x-auto">
                {attachments.map((att, index) => (
                  <div key={index} className="relative flex-shrink-0">
                    <button onClick={() => handleRemoveAttachment(index)} className="absolute -top-1 -right-1 bg-zinc-700 rounded-full p-0.5 text-white hover:bg-red-500" aria-label={`ลบ ${att.name}`}>
                      <CloseIcon className="w-3 h-3"/>
                    </button>
                    {att.type.startsWith('image/') ? (
                      <img src={att.dataUrl} alt={att.name} className="w-16 h-16 rounded object-cover" />
                    ) : att.type.startsWith('video/') ? (
                      <div className="w-16 h-16 bg-zinc-900 rounded flex items-center justify-center">
                        <video src={att.dataUrl} className="h-full" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-zinc-900 rounded flex items-center justify-center p-2 text-center" title={att.name}>
                          <DocumentTextIcon className="w-8 h-8 text-zinc-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {replyingTo && (
            <div className="mb-2 p-2 bg-zinc-800 rounded-md flex justify-between items-center text-sm">
                <div className="flex-1 overflow-hidden">
                    <p className="text-xs text-zinc-400">กำลังตอบกลับ:</p>
                    <p className="text-white truncate" title={replyingTo.text}>
                        {replyingTo.text}
                    </p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1 rounded-full hover:bg-zinc-600" aria-label="ยกเลิกการตอบกลับ">
                    <CloseIcon className="w-4 h-4" />
                </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" multiple className="hidden" />
            <div className="flex-1 flex items-end bg-zinc-900 rounded-md border border-zinc-700 focus-within:border-cyan-500 transition-colors">
                <button onClick={() => fileInputRef.current?.click()} className="p-3 text-zinc-400 hover:text-white" title="แนบไฟล์">
                    <PaperclipIcon />
                </button>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="ถามอะไรก็ได้เกี่ยวกับเว็บ..."
                  className="w-full flex-1 bg-transparent text-white placeholder-zinc-500 focus:outline-none max-h-[16rem] py-3 pr-3 resize-none overflow-y-auto"
                  rows={1}
                />
            </div>
            <button
              onClick={handleSend}
              disabled={isLoading || (input.trim() === '' && attachments.length === 0)}
              className="ml-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
            >
              ส่ง
            </button>
          </div>
        </div>
      </div>
       {previewingAttachment && (
        <PreviewModal 
          attachment={previewingAttachment}
          onClose={() => setPreviewingAttachment(null)}
        />
      )}
    </div>
  );
};