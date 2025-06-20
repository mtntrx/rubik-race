# Claude Development Notes - Rubik's Race

## Project Overview
This is a real-time multiplayer sliding puzzle game built with Express.js, Socket.IO, and SQLite. Players race to match a 3x3 pattern in the center of their 5x5 sliding puzzle.

## Quick Development Setup
```bash
npm install
npm start
# Server runs on http://localhost:3400
# Test URLs: 
# - http://localhost:3400/abc123/match-001/player1
# - http://localhost:3400/abc123/match-001/player2
```

## Key Architecture Decisions Made

### Database Design
- **SQLite** chosen for simplicity and portability
- **Three tables**: `matches`, `games`, `player_sessions`
- **Match persistence** allows players to reconnect and continue
- **Game history** tracked for statistics

### Game Logic Structure
- **GameEngine.js**: Core move validation, win detection, board manipulation
- **PatternGenerator.js**: Creates valid scrambler patterns (max 4 of any color) and starting puzzles
- **MatchManager.js**: Orchestrates multiplayer sessions, WebSocket events

### Frontend Approach
- **Mobile-first design** with touch controls
- **Real-time updates** via Socket.IO events
- **5x5 grid** with center 3x3 highlighted for win condition
- **Responsive layout** handles portrait/landscape orientations

## Important Implementation Details

### Move Validation Logic
```javascript
// Valid moves: same row OR same column as empty space
isValidMove(board, tilePosition) {
    const emptyIndex = board.indexOf('empty');
    const emptyRow = Math.floor(emptyIndex / 5);
    const emptyCol = emptyIndex % 5;
    const tileRow = Math.floor(tilePosition / 5);
    const tileCol = tilePosition % 5;
    return (emptyRow === tileRow) || (emptyCol === tileCol);
}
```

### Win Condition
- Must match **center 3x3 area** (positions 6,7,8,11,12,13,16,17,18) to scrambler pattern
- NOT the entire 5x5 board

### Pattern Generation Rules
- Scrambler: 3x3 grid, max 4 tiles of any single color
- Starting puzzle: Contains exactly the scrambler colors + remaining colors to total 24 tiles + 1 empty
- Scrambled via random valid moves to ensure solvability

## Socket.IO Event Flow
```
Client → Server:     join-match, ready, move, reset-match
Server → Client:     match-joined, game-start, move-update, game-won, match-reset
```

## Common Development Tasks

### Adding New Features
1. **Server-side**: Update MatchManager.js for new events
2. **Client-side**: Add event handlers in game.js
3. **Database**: Add columns/tables in schema.sql if needed
4. **UI**: Update HTML/CSS for new interface elements

### Testing Locally
- Use different browser tabs/windows for multiple players
- Check browser console for WebSocket connection status
- Database file `matches.db` created automatically on first run

### Database Queries
- Match data: `SELECT * FROM matches WHERE id = ?`
- Game history: `SELECT * FROM games WHERE match_id = ? ORDER BY game_number`
- Active players: `SELECT * FROM player_sessions WHERE match_id = ?`

## Current Limitations & Future Enhancements

### Known Areas for Improvement
1. **No player reconnection handling** - if player disconnects mid-game, game pauses
2. **No spectator mode** - only 2 players per match
3. **No game replay/history viewing** in UI
4. **Limited error recovery** for network issues
5. **No match expiration/cleanup** for old inactive matches

### Potential Features to Add
- [ ] Spectator mode for additional viewers
- [ ] Game replay system with move history
- [ ] Tournament bracket system
- [ ] AI opponent for single-player mode
- [ ] Custom puzzle sizes (4x4, 6x6)
- [ ] Time-based challenges
- [ ] Player statistics dashboard
- [ ] Match sharing via QR codes

### Performance Considerations
- Currently handles ~50 concurrent matches efficiently
- Database operations are synchronous but fast for SQLite
- WebSocket events are lightweight JSON messages
- Frontend renders entire board on each move (could optimize for partial updates)

## Development Commands
```bash
npm start          # Start production server
npm run dev        # Start development server (same as start)
node server.js     # Direct server execution
```

## File Structure Quick Reference
```
├── server.js                 # Main entry point
├── database/
│   ├── schema.sql           # Database structure
│   └── database.js          # Query functions
├── services/
│   ├── GameEngine.js        # Core game logic
│   ├── PatternGenerator.js  # Pattern creation
│   └── MatchManager.js      # Match orchestration
├── public/
│   ├── index.html          # Game UI
│   ├── game.js             # Client logic
│   ├── styles.css          # Mobile-responsive styling
│   └── manifest.json       # PWA config
└── matches.db              # SQLite database (auto-created)
```

## Environment Variables Used
- `PORT=3400` (default)
- `DB_PATH=./matches.db` (default)
- `SECRET_KEYS=abc123,test123` (default)

This should provide enough context for efficient future development sessions!