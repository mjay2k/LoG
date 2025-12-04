/* server.js - Run with 'node server.js' */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

const DATA_FILE = 'database.json';
let db = { accounts: {}, world: {}, lobby: [], config: {} };

if (fs.existsSync(DATA_FILE)) {
    db = JSON.parse(fs.readFileSync(DATA_FILE));
}

const saveDb = () => fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));

app.post('/auth/register', (req, res) => {
    const { username, password } = req.body;
    if (db.accounts[username]) return res.json({ success: false, error: 'Username taken' });
    db.accounts[username] = { username, password, characters: [], lastSeen: Date.now() };
    saveDb();
    res.json({ success: true, user: { username } });
});

app.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
    const acc = db.accounts[username];
    if (!acc || acc.password !== password) return res.json({ success: false, error: 'Invalid credentials' });
    acc.lastSeen = Date.now();
    saveDb();
    res.json({ success: true, user: { username } });
});

app.post('/heartbeat', (req, res) => {
    const { username } = req.body;
    if (db.accounts[username]) db.accounts[username].lastSeen = Date.now();
    res.json({ success: true });
});

app.get('/lobby', (req, res) => {
    const now = Date.now();
    const online = Object.values(db.accounts)
        .filter(a => now - a.lastSeen < 30000)
        .map(a => a.username);
    res.json({ messages: db.lobby.slice(-50), online });
});

app.post('/lobby', (req, res) => {
    const { sender, text } = req.body;
    db.lobby.push({ id: Date.now(), sender, text, timestamp: Date.now() });
    if(db.lobby.length > 100) db.lobby.shift();
    saveDb();
    res.json({ success: true });
});

app.get('/world', (req, res) => res.json(db.world || {}));
app.post('/world', (req, res) => {
    db.world = req.body;
    saveDb();
    res.json({ success: true });
});

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

app.get('/characters/:username', (req, res) => {
    res.json(db.accounts[req.params.username]?.characters || []);
});

app.listen(3000, () => console.log('RPG Server running on port 3000'));