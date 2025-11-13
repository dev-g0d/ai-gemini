import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import firebaseConfig from '../firebaseConfig';
import type { Message } from '../types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CHATS_COLLECTION = 'chats';

export const loadChatHistory = async (chatId: string): Promise<Message[]> => {
    const docRef = doc(db, CHATS_COLLECTION, chatId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        const messagesFromDb = data.messages || [];

        // Create a map for efficient lookup of messages by ID
        const messageMap = new Map<string, Message>();
        const messagesWithTimestamp: Message[] = messagesFromDb.map((msg: any) => {
            const fullMessage: Message = {
                ...msg,
                timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate().toISOString() : new Date().toISOString()
            };
            messageMap.set(fullMessage.id, fullMessage);
            return fullMessage;
        });
        
        // Reconstruct the nested 'replyTo' object from 'replyToId'
        const reconstructedMessages = messagesWithTimestamp.map(msg => {
            const rawMsg = msg as any; // To access replyToId
            if (rawMsg.replyToId) {
                const repliedToMessage = messageMap.get(rawMsg.replyToId);
                if (repliedToMessage) {
                    // Create a new object to avoid direct mutation
                    const newMsg: Message = { ...msg, replyTo: repliedToMessage };
                    delete (newMsg as any).replyToId;
                    return newMsg;
                }
            }
            return msg;
        });

        return reconstructedMessages;
    } else {
        console.warn("Chat document not found:", chatId);
        return [];
    }
};

export const saveChatHistory = async (chatId: string, messages: Message[]): Promise<void> => {
    const docRef = doc(db, CHATS_COLLECTION, chatId);

    // Deep clone and purify to remove any non-serializable data from React state objects.
    const plainMessages = JSON.parse(JSON.stringify(messages));

    const messagesToStore = plainMessages.map((msg: any) => {
        // Ensure msg is a valid object.
        if (typeof msg !== 'object' || msg === null) {
            return null;
        }

        const cleanMessage: { [key: string]: any } = {};

        // Process each field with explicit checks and safe fallbacks.
        cleanMessage.id = typeof msg.id === 'string' ? msg.id : String(Date.now());
        cleanMessage.sender = msg.sender === 'user' || msg.sender === 'ai' ? msg.sender : 'ai';
        cleanMessage.text = typeof msg.text === 'string' ? msg.text : '';
        cleanMessage.timestamp = msg.timestamp ? new Date(msg.timestamp) : new Date();

        // Flatten 'replyTo' to 'replyToId'
        if (typeof msg.replyTo === 'object' && msg.replyTo !== null && typeof msg.replyTo.id === 'string') {
            cleanMessage.replyToId = msg.replyTo.id;
        }

        // Process 'attachments' array with robust sanitization
        if (Array.isArray(msg.attachments)) {
            const sanitizedAttachments = msg.attachments
                .map((att: any) => {
                    if (typeof att === 'object' && att !== null && typeof att.dataUrl === 'string' && att.dataUrl) {
                        return {
                            name: typeof att.name === 'string' ? att.name : 'file',
                            type: typeof att.type === 'string' ? att.type : 'application/octet-stream',
                            dataUrl: att.dataUrl,
                        };
                    }
                    return null; // Invalid attachment format
                })
                .filter(Boolean); // Remove nulls (invalid attachments)

            if (sanitizedAttachments.length > 0) {
                cleanMessage.attachments = sanitizedAttachments;
            }
        }

        // Process 'sources' array with robust sanitization
        if (Array.isArray(msg.sources)) {
            const sanitizedSources = msg.sources
                .map((source: any) => {
                    if (typeof source === 'object' && source !== null && typeof source.uri === 'string' && source.uri) {
                        return {
                            title: typeof source.title === 'string' ? source.title : '',
                            uri: source.uri,
                        };
                    }
                    return null; // Invalid source format
                })
                .filter(Boolean); // Remove nulls (invalid sources)

            if (sanitizedSources.length > 0) {
                cleanMessage.sources = sanitizedSources;
            }
        }

        return cleanMessage;
    }).filter(Boolean); // Remove any messages that were invalid entirely.
    
    await setDoc(docRef, { messages: messagesToStore }, { merge: true });
};


export const createNewChat = async (): Promise<string> => {
    const initialMessage: Message = {
        id: 'initial-firebase',
        sender: 'ai',
        text: "สวัสดี! ฉันคือผู้ช่วยของคุณ",
        timestamp: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, CHATS_COLLECTION), {
        messages: [{...initialMessage, timestamp: new Date(initialMessage.timestamp)}],
        createdAt: new Date(),
    });
    return docRef.id;
};
