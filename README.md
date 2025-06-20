# Rubik's Race

A real-time, competitive two-player sliding puzzle game based on the physical Rubik's Race board game. Players race to match a scrambled 3x3 pattern using a 5x5 sliding tile puzzle on their mobile devices.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Play the game:**
   - Player 1: Open `http://localhost:3400/abc123/match-001/player1`
   - Player 2: Open `http://localhost:3400/abc123/match-001/player2`

## Game Rules

- **Objective**: Match the center 3x3 area of your 5x5 puzzle to the target scrambler pattern
- **Movement**: Tap any tile in the same row or column as the empty space to slide tiles
- **Winning**: First player to match the target pattern wins the game
- **Match**: Multiple games can be played with win tracking

## Features

- ✅ Real-time multiplayer gameplay
- ✅ Mobile-optimized touch interface
- ✅ Persistent match sessions with SQLite
- ✅ Move counting and win tracking
- ✅ WebSocket-based real-time communication
- ✅ Responsive design for all screen sizes

## URL Structure

```
http://localhost:3400/{secretKey}/{matchId}/{playerName}
```

- `secretKey`: Authentication key (default: "abc123", "test123")
- `matchId`: Unique match identifier
- `playerName`: Player's display name

## Environment Variables

- `PORT`: Server port (default: 3400)
- `DB_PATH`: SQLite database path (default: ./matches.db)
- `SECRET_KEYS`: Comma-separated list of valid secret keys

## Game Flow

1. Two players join a match with matching secret key and match ID
2. Both players click "Ready" to start a game
3. Server generates identical scrambler pattern and starting puzzle
4. Players race to match the target pattern
5. First to match wins the game
6. Match continues with win tracking until reset

## Development

The game is built with:
- **Backend**: Node.js, Express.js, Socket.IO, SQLite3
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Real-time**: WebSocket communication
- **Database**: SQLite for match persistence

## Architecture

```
├── server.js              # Main Express server
├── database/
│   ├── schema.sql         # Database schema
│   └── database.js        # SQLite operations
├── services/
│   ├── GameEngine.js      # Core game logic
│   ├── PatternGenerator.js # Pattern creation
│   └── MatchManager.js    # Match lifecycle
└── public/
    ├── index.html         # Game client
    ├── game.js           # Client-side logic
    ├── styles.css        # UI styling
    └── manifest.json     # PWA manifest
```

## API Endpoints

- `GET /:secretKey/:matchId/:playerName` - Game client
- `GET /health` - Server health check
- `GET /api/match/:secretKey/:matchId/stats` - Match statistics

## Socket Events

**Client to Server:**
- `join-match` - Join a match
- `ready` - Ready to start game
- `move` - Make a move
- `reset-match` - Reset match

**Server to Client:**
- `match-joined` - Confirm match join
- `game-start` - Start new game
- `move-update` - Move broadcast
- `game-won` - Game winner
- `match-reset` - Match reset

## License

ISC