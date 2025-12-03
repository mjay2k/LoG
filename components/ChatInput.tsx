
import React, { useState } from 'react';

interface ChatInputProps {
  onSend: (text: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text);
      setText('');
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-gray-800 border-2 border-gray-500 text-white p-3 rounded-full shadow-xl hover:bg-gray-700 hover:border-yellow-500 transition-all"
        title="Chat"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
           <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <div className="bg-gray-900 border-2 border-gray-600 rounded shadow-2xl p-2">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input 
            autoFocus
            type="text" 
            value={text} 
            onChange={(e) => setText(e.target.value)}
            className="flex-1 bg-black border border-gray-700 text-white px-2 py-1 text-sm outline-none focus:border-yellow-500"
            placeholder="Say something..."
          />
          <button type="submit" className="bg-blue-700 text-white text-xs font-bold px-3 rounded hover:bg-blue-600">SEND</button>
          <button type="button" onClick={() => setIsOpen(false)} className="bg-red-900 text-gray-300 text-xs font-bold px-2 rounded hover:bg-red-700">X</button>
        </form>
      </div>
    </div>
  );
};
