const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './matches.db';

let db = null;

function getDatabase() {
    if (!db) {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err);
            } else {
                console.log('Connected to SQLite database');
            }
        });
    }
    return db;
}

async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const database = getDatabase();
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        database.exec(schema, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

function createMatch(id, secretKey, player1Name, player2Name = null) {
    return new Promise((resolve, reject) => {
        const database = getDatabase();
        const query = `
            INSERT OR REPLACE INTO matches (id, secret_key, player1_name, player2_name, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        
        database.run(query, [id, secretKey, player1Name, player2Name], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
    });
}

function getMatch(matchId) {
    return new Promise((resolve, reject) => {
        const database = getDatabase();
        const query = 'SELECT * FROM matches WHERE id = ?';
        
        database.get(query, [matchId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

function updateMatch(matchId, updates) {
    return new Promise((resolve, reject) => {
        const database = getDatabase();
        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const query = `UPDATE matches SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        const values = [...Object.values(updates), matchId];
        
        database.run(query, values, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes);
            }
        });
    });
}

function createGame(matchId, gameNumber, scramblerPattern, startingPattern) {
    return new Promise((resolve, reject) => {
        const database = getDatabase();
        const query = `
            INSERT INTO games (match_id, game_number, scrambler_pattern, starting_pattern, started_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        
        database.run(query, [
            matchId, 
            gameNumber, 
            JSON.stringify(scramblerPattern), 
            JSON.stringify(startingPattern)
        ], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
    });
}

function updateGame(gameId, updates) {
    return new Promise((resolve, reject) => {
        const database = getDatabase();
        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const query = `UPDATE games SET ${setClause} WHERE id = ?`;
        const values = [...Object.values(updates), gameId];
        
        database.run(query, values, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes);
            }
        });
    });
}

function getGamesByMatch(matchId) {
    return new Promise((resolve, reject) => {
        const database = getDatabase();
        const query = 'SELECT * FROM games WHERE match_id = ? ORDER BY game_number';
        
        database.all(query, [matchId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function createPlayerSession(socketId, matchId, playerName) {
    return new Promise((resolve, reject) => {
        const database = getDatabase();
        const query = `
            INSERT OR REPLACE INTO player_sessions (socket_id, match_id, player_name, connected_at, last_seen)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        
        database.run(query, [socketId, matchId, playerName], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
    });
}

function removePlayerSession(socketId) {
    return new Promise((resolve, reject) => {
        const database = getDatabase();
        const query = 'DELETE FROM player_sessions WHERE socket_id = ?';
        
        database.run(query, [socketId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes);
            }
        });
    });
}

function getActivePlayersForMatch(matchId) {
    return new Promise((resolve, reject) => {
        const database = getDatabase();
        const query = 'SELECT * FROM player_sessions WHERE match_id = ?';
        
        database.all(query, [matchId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

module.exports = {
    initializeDatabase,
    createMatch,
    getMatch,
    updateMatch,
    createGame,
    updateGame,
    getGamesByMatch,
    createPlayerSession,
    removePlayerSession,
    getActivePlayersForMatch
};