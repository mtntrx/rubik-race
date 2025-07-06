const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const MatchManager = require('./services/MatchManager');
const { initializeDatabase } = require('./database/database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3400;
const DEBUG_LEVEL = parseInt(process.env.DEBUG_LEVEL) || 0;
const SECRET_KEYS = process.env.SECRET_KEYS ? process.env.SECRET_KEYS.split(',') : ['abc123', 'test123'];

// Debug logging helper
function debugLog(level, message, data = null) {
    if (DEBUG_LEVEL >= level) {
        const timestamp = new Date().toISOString();
        console.log(`[DEBUG:${level}] ${timestamp} - ${message}`);
        if (data && DEBUG_LEVEL >= 6) {
            console.log('  Data:', JSON.stringify(data, null, 2));
        }
    }
}

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const matchManager = new MatchManager(io);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/match/:secretKey/:matchId/stats', async (req, res) => {
    const { secretKey, matchId } = req.params;
    
    if (!SECRET_KEYS.includes(secretKey)) {
        return res.status(403).json({ error: 'Invalid secret key' });
    }
    
    try {
        const stats = await matchManager.getMatchStats(matchId);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve match stats' });
    }
});

app.get('/play/:secretKey/:matchId/:playerName', (req, res) => {
    const { secretKey, matchId, playerName } = req.params;
    
    // Skip if this looks like a static file request
    if (playerName.includes('.')) {
        debugLog(5, `Static file request - skipping game route`, { secretKey, matchId, playerName, ip: req.ip });
        return res.status(404).send('File not found');
    }
    
    debugLog(5, `Game access attempt`, { secretKey, matchId, playerName, ip: req.ip });
    
    if (!SECRET_KEYS.includes(secretKey)) {
        debugLog(5, `Invalid secret key access denied`, { secretKey, ip: req.ip });
        return res.status(403).send('Invalid secret key');
    }
    

    if (!matchId || !playerName) {
        debugLog(5, `Missing parameters in game access`, { secretKey, matchId, playerName, ip: req.ip });
        return res.status(400).send('Missing match ID or player name');
    }
    
    debugLog(6, `Game access granted`, { secretKey, matchId, playerName, ip: req.ip });
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    debugLog(5, `Socket connection established`, { socketId: socket.id, remoteAddress: socket.handshake.address });
    
    socket.on('join-match', async (data) => {
        debugLog(5, `Player attempting to join match`, { socketId: socket.id, data });
        try {
            await matchManager.handleJoinMatch(socket, data);
            debugLog(6, `Player successfully joined match`, { socketId: socket.id, matchId: data.matchId, playerName: data.playerName });
        } catch (error) {
            debugLog(5, `Join match error`, { socketId: socket.id, error: error.message, data });
            socket.emit('error', { message: error.message });
        }
    });
    
    socket.on('ready', async () => {
        debugLog(5, `Player ready signal received`, { socketId: socket.id });
        try {
            await matchManager.handlePlayerReady(socket);
            debugLog(6, `Player ready processed successfully`, { socketId: socket.id });
        } catch (error) {
            debugLog(5, `Player ready error`, { socketId: socket.id, error: error.message });
            socket.emit('error', { message: error.message });
        }
    });
    
    socket.on('move', async (data) => {
        debugLog(6, `Player move received`, { socketId: socket.id, data });
        try {
            await matchManager.handlePlayerMove(socket, data);
            debugLog(7, `Player move processed successfully`, { socketId: socket.id, tilePosition: data.tilePosition });
        } catch (error) {
            debugLog(5, `Player move error`, { socketId: socket.id, error: error.message, data });
            socket.emit('error', { message: error.message });
        }
    });
    
    socket.on('reset-match', async () => {
        debugLog(5, `Match reset requested`, { socketId: socket.id });
        try {
            await matchManager.handleMatchReset(socket);
            debugLog(6, `Match reset completed`, { socketId: socket.id });
        } catch (error) {
            debugLog(5, `Match reset error`, { socketId: socket.id, error: error.message });
            socket.emit('error', { message: error.message });
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        debugLog(5, `Socket disconnection`, { socketId: socket.id });
        matchManager.handleDisconnect(socket);
    });
});

getRandomMatchName = () => {
    // random name will be 4 lowercase letters
    // it will be a  consonant, vowel, consonant, vowel
    const constonants = 'bcdfghjklmnpqrstvwxz';
    const vowels = 'aeiou';
    let randomName = '';
    randomName += constonants[Math.floor(Math.random() * constonants.length)];
    randomName += vowels[Math.floor(Math.random() * vowels.length)];
    randomName += constonants[Math.floor(Math.random() * constonants.length)];
    randomName += vowels[Math.floor(Math.random() * vowels.length)];
    return randomName;
}

async function startServer() {
    try {
        await initializeDatabase();
        console.log('Database initialized');
        
        server.listen(PORT, () => {
            tmpMatchName = getRandomMatchName();
            console.log(`Rubik's Race server running on port ${PORT}`);
            console.log(`Access game at:`);
            console.log(`http://localhost:${PORT}/play/${SECRET_KEYS[0]}/${tmpMatchName}/p1`);
            console.log(`http://localhost:${PORT}/play/${SECRET_KEYS[0]}/${tmpMatchName}/p2`);
            debugLog(5, `Server started successfully`, { port: PORT, debugLevel: DEBUG_LEVEL });
            if (DEBUG_LEVEL >= 5) {
                console.log(`DEBUG_LEVEL is set to ${DEBUG_LEVEL} - Enhanced logging enabled`);
                console.log('Debug levels: 5=basic connectivity, 6=detailed events, 7=move tracking');
            }
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();