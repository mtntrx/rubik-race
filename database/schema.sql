-- Matches table
CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    secret_key TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    player1_name TEXT,
    player2_name TEXT,
    player1_wins INTEGER DEFAULT 0,
    player2_wins INTEGER DEFAULT 0,
    current_game_id INTEGER,
    status TEXT DEFAULT 'waiting' -- waiting, playing, finished
);

-- Games table (individual games within a match)
CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id TEXT NOT NULL,
    game_number INTEGER NOT NULL,
    scrambler_pattern TEXT NOT NULL,
    starting_pattern TEXT NOT NULL,
    winner_name TEXT,
    player1_moves INTEGER DEFAULT 0,
    player2_moves INTEGER DEFAULT 0,
    started_at DATETIME,
    finished_at DATETIME,
    FOREIGN KEY (match_id) REFERENCES matches(id)
);

-- Player sessions (for real-time connection tracking)
CREATE TABLE IF NOT EXISTS player_sessions (
    socket_id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);