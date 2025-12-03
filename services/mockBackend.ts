
import { Account, CharacterSummary, ClassType, Entity, GameConfig, GameMap, LobbyMessage, User } from '../types';
import { generateDefaultWorld, DEFAULT_CONFIG } from '../constants';

const DB_NAME = 'LegendsOfGeminiDB';
const DB_VERSION = 3;
const STORE_ACCOUNTS = 'accounts';
const STORE_WORLD = 'world';
const STORE_CONFIG = 'config';
const STORE_LOBBY = 'lobby_chat';

const KEY_WORLD_DATA = 'world_data';
const KEY_CONFIG_DATA = 'game_config';

let REMOTE_URL = 'https://mjaystudios.com/log_online.js'; // Default to user server

// --- HELPER: PASSWORD HASHING ---
const hashPassword = async (password: string) => {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- INDEXED DB LOGIC (LOCAL MODE) ---
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_ACCOUNTS)) db.createObjectStore(STORE_ACCOUNTS, { keyPath: 'username' });
      if (!db.objectStoreNames.contains(STORE_WORLD)) db.createObjectStore(STORE_WORLD);
      if (!db.objectStoreNames.contains(STORE_CONFIG)) db.createObjectStore(STORE_CONFIG);
      if (!db.objectStoreNames.contains(STORE_LOBBY)) db.createObjectStore(STORE_LOBBY, { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
  });
};

const localGetAccount = async (username: string): Promise<Account | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_ACCOUNTS, 'readonly');
    const store = transaction.objectStore(STORE_ACCOUNTS);
    const request = store.get(username);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const localSaveAccount = async (account: Account & { password?: string }) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_ACCOUNTS, 'readwrite');
    const store = transaction.objectStore(STORE_ACCOUNTS);
    const request = store.put(account);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const localGetAllAccounts = async (): Promise<Account[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_ACCOUNTS, 'readonly');
        const store = transaction.objectStore(STORE_ACCOUNTS);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const localGetWorldData = async (): Promise<Record<string, GameMap> | null> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_WORLD, 'readonly');
        const store = transaction.objectStore(STORE_WORLD);
        const request = store.get(KEY_WORLD_DATA);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const localSaveWorldData = async (data: Record<string, GameMap>) => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_WORLD, 'readwrite');
        const store = transaction.objectStore(STORE_WORLD);
        const request = store.put(data, KEY_WORLD_DATA);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const localGetConfig = async (): Promise<GameConfig | null> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_CONFIG, 'readonly');
        const store = transaction.objectStore(STORE_CONFIG);
        const request = store.get(KEY_CONFIG_DATA);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const localSaveConfig = async (config: GameConfig) => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_CONFIG, 'readwrite');
        const store = transaction.objectStore(STORE_CONFIG);
        const request = store.put(config, KEY_CONFIG_DATA);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// --- REMOTE API UTILS ---
const apiCall = async (endpoint: string, method: string, body?: any) => {
    if (!REMOTE_URL) throw new Error("No remote server configured");
    try {
        const res = await fetch(`${REMOTE_URL}${endpoint}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error("API Call failed:", e);
        throw new Error("Network Error");
    }
}

// --- MAIN EXPORTED SERVICE ---

export const MockBackend = {
  setServerUrl: (url: string) => {
      REMOTE_URL = url.replace(/\/$/, ""); // Remove trailing slash
  },

  isRemote: () => !!REMOTE_URL,

  login: async (username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    const hashedPassword = await hashPassword(password);
    
    if (REMOTE_URL) {
        try {
            const res = await apiCall('/auth/login', 'POST', { username, password: hashedPassword });
            return res;
        } catch (e) { return { success: false, error: 'Cannot connect to server. Ensure Node script is running.' }; }
    } else {
        try {
            const account = await localGetAccount(username);
            if (!account) return { success: false, error: 'User not found. Please register.' };
            // @ts-ignore
            if (account.password !== hashedPassword) return { success: false, error: 'Invalid password' };
            await MockBackend.heartbeat(username);
            return { success: true, user: { username } };
        } catch (e) { return { success: false, error: 'Database connection error' }; }
    }
  },

  register: async (username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    const hashedPassword = await hashPassword(password);

    if (REMOTE_URL) {
        try {
            const res = await apiCall('/auth/register', 'POST', { username, password: hashedPassword });
            return res;
        } catch (e) { return { success: false, error: 'Cannot connect to server' }; }
    } else {
        try {
            const existing = await localGetAccount(username);
            if (existing) return { success: false, error: 'Username taken' };
            await localSaveAccount({ username, password: hashedPassword, characters: [], lastSeen: Date.now() });
            return { success: true, user: { username } };
        } catch (e) { return { success: false, error: 'Database error' }; }
    }
  },
  
  heartbeat: async (username: string) => {
      if (REMOTE_URL) {
           apiCall('/heartbeat', 'POST', { username }).catch(() => {});
      } else {
          try {
              const account = await localGetAccount(username);
              if (account) {
                  account.lastSeen = Date.now();
                  await localSaveAccount(account);
              }
          } catch (e) { /* ignore */ }
      }
  },
  
  getRealOnlinePlayers: async (): Promise<string[]> => {
      if (REMOTE_URL) {
          try {
              const res = await apiCall('/lobby', 'GET');
              return res.online || [];
          } catch (e) { return []; }
      } else {
          try {
              const accounts = await localGetAllAccounts();
              const now = Date.now();
              return accounts.filter(a => a.lastSeen && (now - a.lastSeen < 30000)).map(a => a.username);
          } catch (e) { return []; }
      }
  },

  sendLobbyMessage: async (sender: string, text: string) => {
      if (REMOTE_URL) {
          await apiCall('/lobby', 'POST', { sender, text });
      } else {
          const db = await openDB();
          return new Promise<void>((resolve, reject) => {
              const tx = db.transaction(STORE_LOBBY, 'readwrite');
              const store = tx.objectStore(STORE_LOBBY);
              store.add({ sender, text, timestamp: Date.now() });
              tx.oncomplete = () => resolve();
              tx.onerror = () => reject();
          });
      }
  },

  getLobbyMessages: async (): Promise<LobbyMessage[]> => {
      if (REMOTE_URL) {
          try {
              const res = await apiCall('/lobby', 'GET');
              return res.messages || [];
          } catch (e) { return []; }
      } else {
          const db = await openDB();
          return new Promise((resolve, reject) => {
              const tx = db.transaction(STORE_LOBBY, 'readonly');
              const store = tx.objectStore(STORE_LOBBY);
              const request = store.getAll();
              request.onsuccess = () => {
                  const msgs = request.result as LobbyMessage[];
                  resolve(msgs.sort((a,b) => a.timestamp - b.timestamp).slice(-50));
              };
              request.onerror = () => reject();
          });
      }
  },

  getCharacters: async (username: string): Promise<CharacterSummary[]> => {
    if (REMOTE_URL) {
        try {
            const chars = await apiCall(`/characters/${username}`, 'GET');
            return chars.map((c: Entity) => ({ id: c.id, name: c.name, level: c.level, class: c.class }));
        } catch (e) { return []; }
    } else {
        const account = await localGetAccount(username);
        if (!account) return [];
        return account.characters.map(c => ({ id: c.id, name: c.name, level: c.level, class: c.class || ClassType.WARRIOR }));
    }
  },

  loadCharacter: async (username: string, charId: string): Promise<Entity | null> => {
    if (REMOTE_URL) {
        try {
            const chars = await apiCall(`/characters/${username}`, 'GET');
            return chars.find((c: Entity) => c.id === charId) || null;
        } catch (e) { return null; }
    } else {
        const account = await localGetAccount(username);
        if (!account) return null;
        return account.characters.find(c => c.id === charId) || null;
    }
  },

  createCharacter: async (username: string, character: Entity): Promise<boolean> => {
    character.id = `char_${username}_${Date.now()}`;
    if (REMOTE_URL) {
        try {
            await apiCall('/character', 'POST', { username, character });
            return true;
        } catch (e) { return false; }
    } else {
        const account = await localGetAccount(username) as Account & { password?: string };
        if (!account) return false;
        account.characters.push(character);
        await localSaveAccount(account);
        return true;
    }
  },

  saveCharacterProgress: async (username: string, character: Entity) => {
     if (REMOTE_URL) {
         apiCall('/character', 'POST', { username, character }).catch(() => {});
     } else {
         const account = await localGetAccount(username) as Account & { password?: string };
         if (!account) return;
         const idx = account.characters.findIndex(c => c.id === character.id);
         const charWithLoc = { ...character, lastSeen: Date.now() };
         if (idx !== -1) account.characters[idx] = charWithLoc;
         else account.characters.push(charWithLoc);
         account.lastSeen = Date.now(); 
         await localSaveAccount(account);
     }
  },

  saveWorldState: async (maps: Record<string, GameMap>) => {
      if (REMOTE_URL) apiCall('/world', 'POST', maps).catch(() => {});
      else await localSaveWorldData(maps);
  },

  getWorldState: async (): Promise<Record<string, GameMap>> => {
      let existing;
      if (REMOTE_URL) {
          try {
              existing = await apiCall('/world', 'GET');
          } catch(e) { existing = null; }
      }
      else existing = await localGetWorldData();
      
      if (existing && Object.keys(existing).length > 0) return existing;
      
      const defaultWorld = generateDefaultWorld();
      if (REMOTE_URL) apiCall('/world', 'POST', defaultWorld).catch(() => {});
      else await localSaveWorldData(defaultWorld);
      return defaultWorld;
  },
  
  saveConfig: async (config: GameConfig) => {
      // Config is currently local only for dev convenience, 
      // but if you want global server config, we would POST it here.
      await localSaveConfig(config); 
  },

  getConfig: async (): Promise<GameConfig> => {
      const saved = await localGetConfig();
      if (!saved) {
          await localSaveConfig(DEFAULT_CONFIG);
          return DEFAULT_CONFIG;
      }
      
      const merged: GameConfig = {
          ...DEFAULT_CONFIG,
          ...saved,
          classStats: { ...DEFAULT_CONFIG.classStats, ...(saved.classStats || {}) },
          skills: { ...DEFAULT_CONFIG.skills, ...(saved.skills || {}) },
          customTiles: saved.customTiles || DEFAULT_CONFIG.customTiles
      };
      
      return merged;
  },

  getGhosts: async (currentMapId: string, currentCharacterId: string): Promise<Entity[]> => {
      const ghosts: Entity[] = [];
      if (!REMOTE_URL) {
          const accounts = await localGetAllAccounts();
          const now = Date.now();
          accounts.forEach(acc => {
              if (acc.lastSeen && (now - acc.lastSeen < 30000)) {
                  acc.characters.forEach(char => {
                      if (char.id !== currentCharacterId && char.pos) ghosts.push(char);
                  });
              }
          });
      }
      // For remote ghosts, we would need a GET /ghosts endpoint or similar
      return ghosts;
  },

  getAccountNames: async (): Promise<string[]> => {
      try {
          const accounts = await localGetAllAccounts();
          return accounts.map(a => a.username);
      } catch (e) { return []; }
  },

  // Stubbing out export/import to keep internal API consistent but unused by UI
  exportData: async (): Promise<string> => { return "" },
  importData: async (json: string): Promise<boolean> => { return false }
};
