# Rubik's Race - Complete Game Specification

## 1. Project Overview

### 1.1 Game Description
A real-time, competitive two-player sliding puzzle game based on the physical Rubik's Race board game. Players race to match a scrambled 3x3 pattern in the center 9 squares using a 5x5 sliding tile puzzle on their mobile devices.

### 1.2 Technical Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+), WebSocket client
- **Backend**: Node.js, Express.js, Socket.IO
- **Database**: SQLite3 for persistent match storage
- **Platform**: Mobile-optimized web application
- **Deployment**: Single server instance with HTTPS

### 1.3 Key Features
- Real-time multiplayer gameplay
- Persistent match sessions
- Move counting and comparison
- Win/loss tracking across multiple games
- Mobile-responsive design
- URL-based simple authentication

## 2. Game Mechanics

### 2.1 Game Board
- **Scrambler Pattern**: A 3x3 fully populated grid with 6 possible colors, never more than 4 of any single color (red, blue, green, yellow, orange, white)
- **Player grid**: each player has a 5x5 sliding puzzle with 24 colored tiles and 1 empty space
- **Tiles**: 6 distinct colors (red, blue, green, yellow, orange, white)
- **Movement**: Tap any tile in the same row/column as empty space to slide tiles
- **Objective**: Arrange tiles to match the target "scrambler" pattern

### 2.2 Game Flow
1. **Match Initialization**: Two players join with right server-wide secret-key and any matching secret-key
2. **Game Setup**: Empty board displayed to both players
3. **Ready Phase**: Both players click "Ready" to start
4. **Pattern Generation**: Identical scrambler pattern and starting puzzle shown to both
5. **Race Phase**: Players compete to match the target pattern
6. **Win Condition**: First player to match the 3x3 scrambler pattern with their CENTER 9 squares (3x3) in their player grid (5x5) wins the game
7. **Match Continuation**: Winner declared, players can start next game
8. **Match Persistence**: Games and wins tracked until reset

### 2.3 Scoring System
- **Move Counter**: Track individual moves for each player
- **Match Wins**: Track Cumulative games wins across all games in a match
- **Real-time Display**: Show both players' move counts in a game and win totals for the match

## 3. User Interface Design

### 3.1 Mobile Layout (Portrait)
```
┌─────────────────────────┐
│  P1: 12 moves | P2: 8   │  ← Move counters
│    P1: 3 wins | P2: 2   │  ← Game wins
├─────────────────────────┤
│      SCRAMBLER          │  ← Target pattern (top 1/3)
│    [3x3 colored grid]   │
├─────────────────────────┤
│     GAME BOARD          │  ← Player's puzzle (bottom 2/3)
│   [5x5 sliding puzzle]  │
├─────────────────────────┤
│ [READY] [RESET_ALL]     │  ← Control buttons
└─────────────────────────┘
```

### 3.2 UI Components
- **Status Bar**: Move counters and win tallies for both players
- **Scrambler Display**: Static 3x3 grid showing target pattern
- **Game Board**: Interactive 5x5 sliding puzzle
- **Control Panel**: Ready button and Reset All button
- **Connection Status**: Indicator for opponent connection

### 3.3 Visual Design
- **Tile Colors**: Primary and secondary colors (pure red #ff0000, blue #0000ff, green #00ff00, yellow #ffff00, orange #ff8000, white #ffffff)
- **Touch Targets**: Minimum 44px for mobile accessibility
- **Animations**: Smooth tile sliding transitions (200ms)
- **Responsive**: Auto-scale for different screen sizes
- **Visual Feedback**: Clean tiles without borders, winner celebration
- **Game Board**: Fixed 5x5 grid with square tiles (300px x 300px on desktop, 250px x 250px on mobile)

## 4. Server Architecture

### 4.1 Core Components
```
├── server.js              # Main Express server
├── routes/
│   ├── game.js           # Game route handlers
│   └── match.js          # Match management
├── models/
│   ├── Match.js          # Match data model
│   ├── Game.js           # Individual game model
│   └── Player.js         # Player session model
├── services/
│   ├── GameEngine.js     # Core game logic
│   ├── PatternGenerator.js # Scrambler pattern creation
│   └── MatchManager.js   # Match lifecycle management
├── database/
│   ├── schema.sql        # Database schema
│   └── database.js       # SQLite connection/queries
└── public/
    ├── index.html        # Game client
    ├── game.js          # Client-side game logic
    └── styles.css       # UI styling
```

### 4.2 Socket.IO Events
```javascript
// Client to Server
'join-match'     // Player joins match with credentials
'ready'          // Player ready to start game
'move'           // Player makes a move
'reset-match'    // Request match reset

// Server to Client
'match-joined'   // Confirm match join
'opponent-joined' // Notify opponent connected
'game-start'     // Send scrambler + starting positions
'move-update'    // Broadcast move to opponent
'game-won'       // Announce winner
'match-reset'    // Confirm match reset
'error'          // Error messages
```

## 5. Database Schema

### 5.1 Tables
```sql
-- Matches table
CREATE TABLE matches (
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
CREATE TABLE games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id TEXT NOT NULL,
    game_number INTEGER NOT NULL,
    scrambler_pattern TEXT NOT NULL, -- JSON array of target pattern
    starting_pattern TEXT NOT NULL,  -- JSON array of starting puzzle
    winner_name TEXT,
    player1_moves INTEGER DEFAULT 0,
    player2_moves INTEGER DEFAULT 0,
    started_at DATETIME,
    finished_at DATETIME,
    FOREIGN KEY (match_id) REFERENCES matches(id)
);

-- Player sessions (for real-time connection tracking)
CREATE TABLE player_sessions (
    socket_id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 6. API Endpoints

### 6.1 HTTP Routes
```javascript
// Main game client
GET /:secretKey/:matchId/:playerName
  → Serve game client with embedded credentials

// Health check
GET /health
  → Server status

// Match statistics (optional)
GET /api/match/:secretKey/:matchId/stats
  → Return match statistics as JSON
```

### 6.2 URL Structure
```
https://host.com:3400/abc123/match-001/alice
https://host.com:3400/abc123/match-001/bob
```

## 7. Game Logic Implementation

### 7.1 Pattern Generation
```javascript
// Scrambler Pattern Generator
function generateScrambler() {
    // Create random 3x3 pattern with 6 colors; fully populated
    const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'white'];
    const pattern = [...colors, 'empty'];
    return shuffleArray(pattern);
}

// Starting Position Generator  
function generateStartingPuzzle(scrambler) {
    // Ensure puzzle start has exactly 4 of each color and one empty square (24+1 = 25 or 5x5)
    let puzzle = [...scrambler];
    do {
        puzzle = performRandomMoves(puzzle, 20 + Math.floor(Math.random() * 30));
    } while (arraysEqual(puzzle, scrambler));
    return puzzle;
}
```

### 7.2 Move Validation
```javascript
function isValidMove(board, tilePosition) {
    const emptyIndex = board.indexOf('empty');
    const emptyRow = Math.floor(emptyIndex / 5);
    const emptyCol = emptyIndex % 5;
    const tileRow = Math.floor(tilePosition / 5);
    const tileCol = tilePosition % 5;
    
    // Valid if same row OR same column as empty space
    return (emptyRow === tileRow) || (emptyCol === tileCol);
}

function executeMove(board, tilePosition) {
    const newBoard = [...board];
    const emptyIndex = board.indexOf('empty');
    // Slide all tiles between tilePosition and empty space
    // Return new board state
}
```

### 7.3 Win Detection
```javascript
function checkWin(playerBoard, scramblerPattern) {
    return arraysEqual(playerBoard, scramblerPattern);
}
```

## 8. Real-time Communication Flow

### 8.1 Match Joining Sequence
```
Player 1 connects → Server creates/joins match → Wait for Player 2
Player 2 connects → Server notifies both players → Match ready
```

### 8.2 Game Sequence
```
Both players click Ready → Server generates patterns → Game starts
Player makes move → Server validates → Broadcast to opponent
Win detected → Server announces winner → Update match stats
```

### 8.3 Error Handling
- Connection drops: Pause game, wait for reconnection
- Invalid moves: Reject with error message
- Server restart: Restore match state from database

## 9. Security Considerations

### 9.1 Authentication
- Secret key validation for match access
- No user registration or sensitive data storage
- URL-based session management

### 9.2 Input Validation
- Sanitize all player inputs
- Validate move coordinates
- Rate limiting for move frequency

## 10. Development Phases

### Phase 1: Core Infrastructure
- [ ] Express server setup with Socket.IO
- [ ] SQLite database schema implementation
- [ ] Basic routing and match management
- [ ] WebSocket connection handling

### Phase 2: Game Engine
- [ ] Pattern generation algorithms
- [ ] Move validation and board state management
- [ ] Win condition detection
- [ ] Game flow orchestration

### Phase 3: Client Interface
- [ ] Mobile-responsive HTML/CSS layout
- [ ] Interactive game board with touch controls
- [ ] Real-time UI updates via WebSocket
- [ ] Visual feedback and animations

### Phase 4: Integration & Testing
- [x] End-to-end game flow testing
- [x] Multi-device testing
- [x] Performance optimization
- [x] Error handling and recovery

### Phase 5: Polish & Deployment
- [x] UI/UX improvements (Fixed game board layout and tile colors)
- [x] Cross-browser compatibility (Fixed static file paths)
- [ ] Production deployment setup
- [ ] Performance monitoring

## Recent Updates (June 2025)

### Visual Improvements Completed
- **Fixed Game Board Layout**: Resolved issue where 5x5 puzzle was rendering as vertical strip instead of proper grid
- **Updated Tile Colors**: Changed to pure primary/secondary colors for better visual clarity
- **Removed Tile Borders**: Eliminated distracting yellow/gold borders from valid moves and red borders from center tiles
- **Static File Loading**: Fixed relative path issues causing CSS/JS files to 404 when accessed via game URLs

### Technical Fixes
- **CSS Grid Layout**: Set explicit dimensions (300px x 300px desktop, 250px x 250px mobile) to prevent flex-grow distortion
- **Static Middleware**: Confirmed proper Express static file serving from /public directory
- **Independent Player Boards**: Verified move handling logic correctly isolates player board updates
- **Debugging**: Added console logging to track move updates and player board independence

## 11. Technical Requirements

### 11.1 Performance
- < 100ms move response time
- Support 50+ concurrent matches
- Graceful handling of connection drops
- Efficient database queries

### 11.2 Compatibility
- Modern mobile browsers (iOS Safari, Chrome Android)
- Touch-first interface design
- Responsive to screen sizes 320px - 768px width
- WebSocket support required

### 11.3 Scalability
- Stateless server design for horizontal scaling
- Database connection pooling
- Memory management for active matches
- Match cleanup after inactivity

## 12. Testing Strategy

### 12.1 Unit Tests
- Game logic functions (move validation, win detection)
- Pattern generation algorithms
- Database operations

### 12.2 Integration Tests
- WebSocket communication flow
- Match lifecycle management
- Database persistence

### 12.3 End-to-End Tests
- Complete game scenarios
- Multi-player interactions
- Error condition handling
- Mobile device testing

## 13. Deployment Configuration

### 13.1 Server Requirements
- Node.js 16+ 
- 2GB RAM minimum
- HTTPS certificate for WebSocket security
- Port 3400 open for external access

### 13.2 Environment Variables
```bash
PORT=3400
DB_PATH=./matches.db
SECRET_KEYS=comma,separated,list
MAX_MATCHES=100
MATCH_TIMEOUT_HOURS=24
```

### 13.3 Process Management
- PM2 for process management
- Log rotation and monitoring
- Automatic restart on crashes
- Health check endpoints

This specification provides a comprehensive foundation for implementing the Rubik's Race web game with all the features outlined in your base specification.
