
import React, { useState, useEffect, useRef } from 'react';
import { User, CharacterSummary, LobbyMessage } from '../types';
import { MockBackend } from '../services/mockBackend';

interface LobbyScreenProps {
  user: User;
  onPlay: (charId: string) => void;
  onCreateNew: () => void;
  onLogout: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({ user, onPlay, onCreateNew, onLogout }) => {
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlinePlayers, setOnlinePlayers] = useState<string[]>([]);
  
  const [chatMessages, setChatMessages] = useState<LobbyMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  // Initial Load
  useEffect(() => {
    const loadData = async () => {
      const chars = await MockBackend.getCharacters(user.username);
      setCharacters(chars);
      setLoading(false);
      // Heartbeat once on load
      MockBackend.heartbeat(user.username);
    };
    loadData();
  }, [user]);

  // Polling for Chat & Online Players (Real Local Multiplayer)
  useEffect(() => {
    const interval = setInterval(async () => {
        // 1. Heartbeat
        await MockBackend.heartbeat(user.username);

        // 2. Get Real Online Players
        const online = await MockBackend.getRealOnlinePlayers();
        setOnlinePlayers(online);

        // 3. Get Real Messages
        const msgs = await MockBackend.getLobbyMessages();
        // Only update if different to avoid jitter (simple check)
        setChatMessages(prev => {
            if (prev.length === 0 && msgs.length === 0) return prev;
            if (prev.length > 0 && msgs.length > 0 && prev[prev.length-1].id === msgs[msgs.length-1].id) return prev;
            return msgs;
        });

    }, 1000); // Poll every second
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
      if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages]);

  const handleSendChat = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim()) return;
      
      await MockBackend.sendLobbyMessage(user.username, chatInput);
      setChatInput('');
      
      // Immediate fetch update
      const msgs = await MockBackend.getLobbyMessages();
      setChatMessages(msgs);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-mono flex">
       {/* LEFT: CHARACTER SELECTION */}
       <div className="w-2/3 p-8 flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_#1f2937_0%,_#000000_100%)] z-0"></div>
          <div className="z-10 flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
              <div>
                  <h1 className="text-3xl font-bold text-yellow-500 uppercase tracking-widest">Select Character</h1>
                  <div className="text-gray-500 text-xs">Logged in as <span className="text-white font-bold">{user.username}</span></div>
              </div>
              <button onClick={onLogout} className="text-xs text-red-500 hover:text-red-400 uppercase border border-red-900 px-3 py-1 hover:bg-red-900/20">Log Out</button>
          </div>

          <div className="z-10 flex-1 grid grid-cols-2 gap-4 content-start overflow-y-auto pr-2">
              {loading ? <div className="text-gray-500">Loading souls...</div> : (
                  <>
                      {characters.map(char => (
                          <div key={char.id} className="bg-gray-800 border-2 border-gray-600 p-4 hover:border-yellow-500 hover:bg-gray-750 transition-all cursor-pointer group flex justify-between items-center" onClick={() => onPlay(char.id)}>
                              <div>
                                  <div className="font-bold text-lg text-white group-hover:text-yellow-400">{char.name}</div>
                                  <div className="text-xs text-gray-400 uppercase">{char.class} • Level {char.level}</div>
                              </div>
                              <button className="bg-green-700 text-white px-4 py-2 text-xs font-bold uppercase rounded opacity-0 group-hover:opacity-100 transition-opacity">Play</button>
                          </div>
                      ))}
                      
                      <button onClick={onCreateNew} className="bg-black/40 border-2 border-dashed border-gray-700 p-4 flex flex-col items-center justify-center text-gray-500 hover:text-white hover:border-gray-500 transition-all h-24">
                          <span className="text-2xl mb-1">+</span>
                          <span className="text-xs uppercase font-bold">Create New Character</span>
                      </button>
                  </>
              )}
          </div>
       </div>

       {/* RIGHT: LOBBY CHAT & ONLINE LIST */}
       <div className="w-1/3 bg-black border-l border-gray-700 flex flex-col z-20">
           <div className="p-4 bg-gray-800 border-b border-gray-700">
               <h2 className="text-sm font-bold text-gray-300 uppercase">Global Lobby</h2>
               <div className="text-[10px] text-green-500">{onlinePlayers.length} Online (Local DB)</div>
               <div className="flex flex-wrap gap-1 mt-1">
                  {onlinePlayers.map(p => <span key={p} className="text-[9px] bg-green-900 text-green-300 px-1 rounded">{p}</span>)}
               </div>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-black/50" ref={chatRef}>
               {chatMessages.map((msg) => (
                   <div key={msg.id} className="text-xs break-words">
                       <span className={`text-blue-400 font-bold`}>{msg.sender}:</span> <span className="text-gray-300">{msg.text}</span>
                   </div>
               ))}
               {chatMessages.length === 0 && <div className="text-gray-600 text-xs italic">No messages yet. Say hi!</div>}
           </div>

           <form onSubmit={handleSendChat} className="p-2 border-t border-gray-700 bg-gray-800">
               <input 
                 type="text" 
                 value={chatInput}
                 onChange={(e) => setChatInput(e.target.value)}
                 className="w-full bg-black border border-gray-600 p-2 text-xs text-white outline-none focus:border-blue-500"
                 placeholder="Global Chat..."
               />
           </form>
       </div>
    </div>
  );
};
