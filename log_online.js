/* log_online.cjs - CommonJS module for Express server */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
// Using a smaller limit for robustness
app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));

// IMPORTANT: On Render, this database.json file is stored locally in the
// container's ephemeral storage, meaning data will be reset on restarts/deploys.
// For persistent storage, you would need to use a service like MongoDB or PostgreSQL.
const DATA_FILE = 'database.json';
let db = { accounts: {}, world: {}, lobby: [], config: {} };

// Attempt to load existing database file
if (fs.existsSync(DATA_FILE)) {
    try {
        db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
        console.error("Error loading database.json, starting with empty DB.", e);
    }
}

const saveDb = () => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
    } catch (e) {
        console.error("Error saving database.json.", e);
    }
}

// --- API Endpoints ---

// Registration
app.post('/auth/register', (req, res) => {
    const { username, password } = req.body;
    if (db.accounts[username]) return res.json({ success: false, error: 'Username taken' });
    db.accounts[username] = { username, password, characters: [], lastSeen: Date.now() };
    saveDb();
    res.json({ success: true, user: { username } });
});

// Login
app.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
    const acc = db.accounts[username];
    if (!acc || acc.password !== password) return res.json({ success: false, error: 'Invalid credentials' });
    acc.lastSeen = Date.now();
    saveDb();
    res.json({ success: true, user: { username } });
});

// Heartbeat to track online users
app.post('/heartbeat', (req, res) => {
    const { username } = req.body;
    if (db.accounts[username]) db.accounts[username].lastSeen = Date.now();
    res.json({ success: true });
});

// Lobby status (chat and online users)
app.get('/lobby', (req, res) => {
    const now = Date.now();
    // Consider users active if they've sent a heartbeat in the last 30 seconds
    const online = Object.values(db.accounts)
        .filter(a => now - a.lastSeen < 30000)
        .map(a => a.username);
    res.json({ messages: db.lobby.slice(-50), online });
});

// Post to lobby chat
app.post('/lobby', (req, res) => {
    const { sender, text } = req.body;
    // Basic validation
    if (!sender || !text) return res.json({ success: false, error: 'Missing sender or text' });

    db.lobby.push({ id: Date.now(), sender, text, timestamp: Date.now() });
    // Keep lobby chat limited to 100 messages
    if(db.lobby.length > 100) db.lobby.shift(); 
    saveDb();
    res.json({ success: true });
});

// Get world data
app.get('/world', (req, res) => res.json(db.world || {}));
// Save world data
app.post('/world', (req, res) => {
    db.world = req.body;
    saveDb();
    res.json({ success: true });
});

// Save character data
app.post('/character', (req, res) => {
    const { username, character } = req.body;
    const acc = db.accounts[username];
    if (acc) {
        const idx = acc.characters.findIndex(c => c.id === character.id);
        if (idx !== -1) acc.characters[idx] = character;
        else acc.characters.push(character);
        saveDb();
    }
    res.json({ success: true });
});

// Get character list for a user
app.get('/characters/:username', (req, res) => {
    res.json(db.accounts[req.params.username]?.characters || []);
});

// Use the PORT provided by the environment (e.g., Render), or default to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`RPG Server running on port ${PORT}`));
