import React from 'react';
import { ChatView } from './components/ChatView';

const App: React.FC = () => {
  return (
    <div className="h-screen bg-transparent text-zinc-200 font-mono overflow-hidden">
      <main className="h-full">
        <ChatView />
      </main>
    </div>
  );
};

export default App;