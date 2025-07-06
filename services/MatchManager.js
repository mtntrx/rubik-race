const GameEngine = require('./GameEngine');
const PatternGenerator = require('./PatternGenerator');
const {
    createMatch,
    getMatch,
    updateMatch,
    createGame,
    updateGame,
    getGamesByMatch,
    createPlayerSession,
    removePlayerSession,
    getActivePlayersForMatch
} = require('../database/database');

class MatchManager {
    constructor(io) {
        this.io = io;
        this.gameEngine = new GameEngine();
        this.patternGenerator = new PatternGenerator();
        this.activeMatches = new Map();
        this.playerSockets = new Map();
    }

    async handleJoinMatch(socket, data) {
        const { secretKey, matchId, playerName } = data;
        
        if (!secretKey || !matchId || !playerName) {
            throw new Error('Missing required parameters');
        }

        let match = await getMatch(matchId);
        
        if (!match) {
            await createMatch(matchId, secretKey, playerName);
            match = await getMatch(matchId);
        } else {
            if (match.secret_key !== secretKey) {
                throw new Error('Invalid secret key for match');
            }
            
            if (!match.player1_name) {
                await updateMatch(matchId, { player1_name: playerName });
            } else if (!match.player2_name && match.player1_name !== playerName) {
                await updateMatch(matchId, { player2_name: playerName });
            } else if (match.player1_name !== playerName && match.player2_name !== playerName) {
                throw new Error('Match is full');
            }
        }

        // Check if this is a reconnection to an active game
        const matchState = this.activeMatches.get(matchId);
        const isReconnectionToActiveGame = matchState && matchState.gameInProgress && 
            (match.player1_name === playerName || match.player2_name === playerName);

        await createPlayerSession(socket.id, matchId, playerName);
        
        this.playerSockets.set(socket.id, {
            matchId,
            playerName,
            secretKey,
            ready: false
        });

        socket.join(matchId);
        
        const updatedMatch = await getMatch(matchId);
        const activePlayers = await getActivePlayersForMatch(matchId);
        
        socket.emit('match-joined', {
            match: updatedMatch,
            playerName,
            activePlayers: activePlayers.length
        });

        if (updatedMatch.player1_name && updatedMatch.player2_name) {
            socket.to(matchId).emit('opponent-joined', {
                opponentName: playerName,
                activePlayers: activePlayers.length
            });
        }

        if (!this.activeMatches.has(matchId)) {
            this.activeMatches.set(matchId, {
                match: updatedMatch,
                currentGame: null,
                playerStates: new Map(),
                gameInProgress: false
            });
        }

        // If reconnecting to active game, reset the game
        if (isReconnectionToActiveGame) {
            await this.handleReconnectionGameReset(matchId, playerName);
        }
    }

    async handlePlayerReady(socket) {
        const playerInfo = this.playerSockets.get(socket.id);
        if (!playerInfo) {
            throw new Error('Player not in match');
        }

        const { matchId } = playerInfo;
        const matchState = this.activeMatches.get(matchId);
        
        if (!matchState) {
            throw new Error('Match not found');
        }

        playerInfo.ready = true;
        
        const allPlayers = Array.from(this.playerSockets.values())
            .filter(p => p.matchId === matchId);
        
        const readyPlayers = allPlayers.filter(p => p.ready);
        
        if (readyPlayers.length === 2 && allPlayers.length === 2) {
            await this.startNewGame(matchId);
        } else {
            socket.to(matchId).emit('player-ready', {
                playerName: playerInfo.playerName,
                readyCount: readyPlayers.length,
                totalPlayers: allPlayers.length
            });
        }
    }

    async startNewGame(matchId) {
        const matchState = this.activeMatches.get(matchId);
        const match = await getMatch(matchId);
        
        if (!match || !match.player1_name || !match.player2_name) {
            throw new Error('Match not ready');
        }

        const games = await getGamesByMatch(matchId);
        const gameNumber = games.length + 1;
        
        const { scrambler, startingPuzzle } = this.patternGenerator.generateGamePatterns();
        
        const gameId = await createGame(matchId, gameNumber, scrambler, startingPuzzle);
        
        await updateMatch(matchId, { 
            current_game_id: gameId,
            status: 'playing'
        });

        matchState.currentGame = {
            id: gameId,
            gameNumber,
            scrambler,
            startingPuzzle,
            playerStates: new Map([
                [match.player1_name, { board: [...startingPuzzle], moves: 0 }],
                [match.player2_name, { board: [...startingPuzzle], moves: 0 }]
            ])
        };
        
        matchState.gameInProgress = true;
        
        Array.from(this.playerSockets.values())
            .filter(p => p.matchId === matchId)
            .forEach(p => p.ready = false);

        this.io.to(matchId).emit('game-start', {
            gameNumber,
            scrambler,
            startingPuzzle,
            match: await getMatch(matchId)
        });
    }

    async handlePlayerMove(socket, data) {
        const playerInfo = this.playerSockets.get(socket.id);
        if (!playerInfo) {
            throw new Error('Player not in match');
        }

        const { matchId, playerName } = playerInfo;
        const { tilePosition } = data;
        
        const matchState = this.activeMatches.get(matchId);
        if (!matchState || !matchState.gameInProgress || !matchState.currentGame) {
            throw new Error('No active game');
        }

        const playerState = matchState.currentGame.playerStates.get(playerName);
        if (!playerState) {
            throw new Error('Player not in game');
        }

        try {
            const newBoard = this.gameEngine.executeMove(playerState.board, tilePosition);
            playerState.board = newBoard;
            playerState.moves++;

            const moveUpdate = {
                playerName,
                moves: playerState.moves,
                board: newBoard
            };

            console.log(`[MOVE DEBUG] Sending move-update for player: ${playerName}, socketId: ${socket.id}, matchId: ${matchId}`);
            console.log(`[MOVE DEBUG] Move data:`, JSON.stringify(moveUpdate, null, 2));

            await updateGame(matchState.currentGame.id, {
                [`${playerName === (await getMatch(matchId)).player1_name ? 'player1' : 'player2'}_moves`]: playerState.moves
            });

            this.io.to(matchId).emit('move-update', moveUpdate);

            if (this.gameEngine.checkWin(newBoard, matchState.currentGame.scrambler)) {
                await this.handleGameWin(matchId, playerName);
            }

        } catch (error) {
            socket.emit('error', { message: 'Invalid move' });
        }
    }

    async handleGameWin(matchId, winnerName) {
        const matchState = this.activeMatches.get(matchId);
        const match = await getMatch(matchId);
        
        if (!matchState || !matchState.currentGame) {
            return;
        }

        await updateGame(matchState.currentGame.id, {
            winner_name: winnerName,
            finished_at: new Date().toISOString()
        });

        const isPlayer1 = match.player1_name === winnerName;
        const updateData = isPlayer1 ? 
            { player1_wins: match.player1_wins + 1 } : 
            { player2_wins: match.player2_wins + 1 };

        await updateMatch(matchId, { ...updateData, status: 'waiting' });
        
        matchState.gameInProgress = false;
        matchState.currentGame = null;

        const updatedMatch = await getMatch(matchId);
        
        this.io.to(matchId).emit('game-won', {
            winner: winnerName,
            match: updatedMatch,
            gameStats: matchState.currentGame?.playerStates || new Map()
        });
    }

    async handleReconnectionGameReset(matchId, reconnectingPlayerName) {
        const matchState = this.activeMatches.get(matchId);
        if (!matchState) {
            return;
        }

        // Reset the game state
        matchState.gameInProgress = false;
        matchState.currentGame = null;
        matchState.playerStates.clear();

        // Update match status to waiting
        await updateMatch(matchId, {
            status: 'waiting',
            current_game_id: null
        });

        // Reset all player ready states
        Array.from(this.playerSockets.values())
            .filter(p => p.matchId === matchId)
            .forEach(p => p.ready = false);

        // Notify all players about the game reset
        this.io.to(matchId).emit('game-reset-reconnection', {
            message: `Game reset - ${reconnectingPlayerName} reconnected`,
            reconnectingPlayer: reconnectingPlayerName,
            match: await getMatch(matchId)
        });
    }

    async handleMatchReset(socket) {
        const playerInfo = this.playerSockets.get(socket.id);
        if (!playerInfo) {
            throw new Error('Player not in match');
        }

        const { matchId } = playerInfo;
        
        await updateMatch(matchId, {
            player1_wins: 0,
            player2_wins: 0,
            status: 'waiting',
            current_game_id: null
        });

        const matchState = this.activeMatches.get(matchId);
        if (matchState) {
            matchState.gameInProgress = false;
            matchState.currentGame = null;
        }

        Array.from(this.playerSockets.values())
            .filter(p => p.matchId === matchId)
            .forEach(p => p.ready = false);

        this.io.to(matchId).emit('match-reset', {
            match: await getMatch(matchId)
        });
    }

    async handleDisconnect(socket) {
        const playerInfo = this.playerSockets.get(socket.id);
        
        if (playerInfo) {
            await removePlayerSession(socket.id);
            this.playerSockets.delete(socket.id);
            
            const { matchId, playerName } = playerInfo;
            socket.to(matchId).emit('player-disconnected', { playerName });
        }
    }

    async getMatchStats(matchId) {
        const match = await getMatch(matchId);
        if (!match) {
            throw new Error('Match not found');
        }

        const games = await getGamesByMatch(matchId);
        const activePlayers = await getActivePlayersForMatch(matchId);

        return {
            match,
            games,
            activePlayers: activePlayers.length,
            totalGames: games.length
        };
    }
}

module.exports = MatchManager;