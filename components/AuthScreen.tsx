
import React, { useState, useEffect } from 'react';
import { MockBackend } from '../services/mockBackend';
import { User } from '../types';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<string[]>([]);
  
  // DEFAULT TO ONLINE MODE AS REQUESTED
  const [useRemote, setUseRemote] = useState(true);
  const [serverUrl, setServerUrl] = useState('https://mjaystudios.com/log_online.js');

  // Load existing accounts on mount to show the user that data is detected
  useEffect(() => {
    MockBackend.getAccountNames().then(names => setSavedAccounts(names));
  }, []);
  
  useEffect(() => {
      if (useRemote) MockBackend.setServerUrl(serverUrl);
      else MockBackend.setServerUrl('');
  }, [useRemote, serverUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        const res = await MockBackend.register(username, password);
        if (res.success && res.user) onLogin(res.user);
        else setError(res.error || 'Registration failed');
      } else {
        const res = await MockBackend.login(username, password);
        if (res.success && res.user) onLogin(res.user);
        else setError(res.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Check connection to server script.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 font-mono relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a202c_0%,_#000000_100%)]"></div>
      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

      <div className="z-10 w-full max-w-md bg-gray-900 border-4 border-gray-700 p-8 shadow-2xl relative">
        <h1 className="text-4xl text-center text-yellow-500 mb-2 font-bold tracking-widest uppercase text-shadow">Legends of Gemini</h1>
        <p className="text-center text-gray-500 text-xs mb-8 uppercase tracking-[0.2em]">Isometric Online RPG</p>

        {/* SERVER SETTINGS TOGGLE */}
        <div className="flex justify-center mb-6">
            <div className="bg-gray-800 p-1 rounded-full flex gap-2 border border-gray-600">
                <button 
                  onClick={() => setUseRemote(false)}
                  className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${!useRemote ? 'bg-green-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    Secure Local
                </button>
                <button 
                  onClick={() => setUseRemote(true)}
                  className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${useRemote ? 'bg-blue-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    Online Server
                </button>
            </div>
        </div>

        {useRemote && (
            <div className="mb-6">
                <label className="block text-blue-400 mb-1 text-xs uppercase font-bold">Server URL</label>
                <input 
                  type="text" 
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="w-full bg-blue-900/20 border-2 border-blue-600 p-2 text-white focus:border-blue-400 outline-none text-xs"
                  placeholder="http://your-server-ip:3000"
                />
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-400 mb-1 text-xs uppercase font-bold">Username</label>
            <input 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black border-2 border-gray-600 p-3 text-white focus:border-yellow-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1 text-xs uppercase font-bold">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border-2 border-gray-600 p-3 text-white focus:border-yellow-500 outline-none transition-colors"
            />
          </div>

          {error && <div className="text-red-500 text-xs font-bold text-center bg-red-900/20 p-2 border border-red-900">{error}</div>}

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-4 text-xl font-bold uppercase tracking-widest border-2 transition-all 
              ${loading ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed' : 'bg-yellow-700 border-yellow-500 text-white hover:bg-yellow-600 hover:scale-[1.02]'}
            `}
          >
            {loading ? 'Processing...' : (isRegistering ? 'Create Account' : (useRemote ? 'Connect' : 'Enter World'))}
          </button>
        </form>

        <div className="mt-6 text-center border-b border-gray-700 pb-4 mb-4">
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-gray-400 text-xs uppercase underline hover:text-white"
          >
            {isRegistering ? 'Back to Login' : 'New Player? Create Account'}
          </button>
        </div>

        {/* SAVED ACCOUNTS LIST (ONLY IN LOCAL MODE) */}
        {!useRemote && savedAccounts.length > 0 && !isRegistering && (
             <div className="mb-6 bg-black/40 p-3 border border-gray-700 rounded">
                 <h3 className="text-[10px] text-green-500 uppercase font-bold mb-2">Saved Accounts Detected:</h3>
                 <div className="flex flex-wrap gap-2">
                     {savedAccounts.map(name => (
                         <span 
                            key={name} 
                            onClick={() => setUsername(name)}
                            className="bg-gray-800 text-gray-300 text-xs px-2 py-1 cursor-pointer hover:bg-gray-700 border border-gray-600"
                         >
                             {name}
                         </span>
                     ))}
                 </div>
             </div>
        )}
      </div>
      
      <div className="absolute bottom-4 text-gray-700 text-[10px] uppercase">
        v1.1.3 • {useRemote ? 'NETWORK MODE' : 'SECURE LOCAL MODE (SHA-256)'}
      </div>
    </div>
  );
};
