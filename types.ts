export type Tool = 'chat' | 'image-generator' | 'image-editor' | 'live-conversation';

export interface Attachment {
  name: string;
  type: string;
  dataUrl: string;
  base64Data: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  sources?: GroundingSource[];
  audioData?: Uint8Array;
  replyTo?: Message;
  attachments?: Attachment[];
  timestamp?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}
