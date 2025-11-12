import React, { useState, useRef, useEffect, useCallback } from 'react';
import { startLiveSession, stopLiveSession } from '../services/geminiService';
import { MicIcon } from './icons/MicIcon';
import { AnimatedAiIcon } from './icons/AnimatedAiIcon';

const PLACEHOLDER_TEXT = "คลิก 'เริ่มการสนทนา' เพื่อเริ่มต้น...";

export const LiveConversationView: React.FC = () => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [displayText, setDisplayText] = useState<string>(PLACEHOLDER_TEXT);
    // FIX: 'LiveSession' is not an exported member of '@google/genai'. Replaced with 'any'.
    const sessionRef = useRef<any | null>(null);
    const isNewModelTurnRef = useRef(true);
    const [error, setError] = useState<string | null>(null);

    const handleTranscriptionUpdate = useCallback((sender: 'user' | 'model', text: string, isFinal: boolean) => {
        // เราจะแสดงผลเฉพาะคำพูดของ AI เท่านั้น
        if (sender === 'model') {
            if (isNewModelTurnRef.current) {
                // นี่คือข้อความส่วนแรกของเทิร์นใหม่จาก AI
                setDisplayText(text);
                isNewModelTurnRef.current = false;
            } else {
                // นี่คือข้อความส่วนถัดมา ให้ต่อท้ายของเดิม
                setDisplayText(prev => prev + text);
            }
        }
    }, []);

    const handleTurnComplete = useCallback((userInput: string, modelOutput: string) => {
        // เทิร์นการสนทนาเสร็จสมบูรณ์แล้ว เทิร์นถัดไปของ AI จะเป็นการเริ่มใหม่
        isNewModelTurnRef.current = true;
        // `modelOutput` คือข้อความที่สมบูรณ์สุดท้ายของเทิร์น
        // ควรตั้งค่าข้อความที่แสดงเป็นเวอร์ชันสุดท้ายนี้ เพื่อแก้ไขความคลาดเคลื่อนเล็กน้อยจากการสตรีม
        if (modelOutput) {
            setDisplayText(modelOutput);
        }
    }, []);

    const handleStart = async () => {
        setIsConnecting(true);
        setError(null);
        setDisplayText("กำลังเชื่อมต่อ...");
        isNewModelTurnRef.current = true;
        
        try {
            const session = await startLiveSession({
                onTranscriptionUpdate: handleTranscriptionUpdate,
                onTurnComplete: handleTurnComplete,
                onError: (e) => {
                    console.error("Live session error:", e);
                    setError("เกิดข้อผิดพลาดระหว่างเซสชัน");
                    handleStop();
                },
                onClose: () => {
                    console.log("Live session closed.");
                    handleStop();
                },
            });
            sessionRef.current = session;
            setIsSessionActive(true);
            setDisplayText("กำลังฟัง...");
        } catch (err) {
            console.error('Failed to start session:', err);
            setError("ไม่สามารถเริ่มเซสชันได้ โปรดตรวจสอบว่าได้อนุญาตให้เข้าถึงไมโครโฟนแล้ว");
            setDisplayText(PLACEHOLDER_TEXT);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleStop = () => {
        if (sessionRef.current) {
            stopLiveSession(sessionRef.current);
            sessionRef.current = null;
        }
        setIsSessionActive(false);
        setIsConnecting(false);
        setDisplayText(PLACEHOLDER_TEXT);
    };
    
    // Cleanup on component unmount
    useEffect(() => {
        return () => {
            if (sessionRef.current) {
                stopLiveSession(sessionRef.current);
            }
        };
    }, []);

    const buttonState = isConnecting ? 'กำลังเชื่อมต่อ...' : isSessionActive ? 'หยุดการสนทนา' : 'เริ่มการสนทนา';
    const onButtonClick = isSessionActive ? handleStop : handleStart;

    return (
        <div className="flex flex-col h-full bg-slate-950 text-white p-4 sm:p-6 md:p-8">
            <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-bold">สนทนาสด</h2>
                <p className="text-slate-400 mt-2">พูดคุยกับ Gemini แบบเรียลไทม์ ขับเคลื่อนโดย Native Audio API</p>
            </div>
            
            <div className="flex-grow flex flex-col items-center justify-center text-center -mt-16 space-y-8">
                <AnimatedAiIcon className="w-32 h-32 md:w-40 md:h-40" />

                <div className="w-full max-w-3xl min-h-[120px] p-4 md:p-6 bg-slate-800 rounded-xl shadow-lg flex items-center justify-center">
                    <p className="text-xl md:text-2xl font-medium text-slate-100 leading-relaxed">
                        {displayText}
                    </p>
                </div>
            </div>
            
            <div className="text-center">
                 {error && <p className="text-red-400 mb-4">{error}</p>}
                <button
                    onClick={onButtonClick}
                    disabled={isConnecting}
                    className={`px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-base md:text-lg transition-all duration-300 flex items-center justify-center mx-auto shadow-lg
                        ${isSessionActive ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30'}
                        disabled:bg-slate-600 disabled:cursor-not-allowed disabled:shadow-none`}
                >
                    <MicIcon className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
                    {buttonState}
                </button>
            </div>
        </div>
    );
};