class RubikRaceClient {
    constructor() {
        this.socket = null;
        this.gameState = {
            board: [],
            scrambler: [],
            playerName: '',
            matchId: '',
            secretKey: '',
            moves: 0,
            opponentMoves: 0,
            gameInProgress: false,
            ready: false
        };
        
        this.colors = ['red', 'blue', 'green', 'yellow', 'orange', 'white'];
        this.boardSize = 5;
        
        this.initializeFromURL();
        this.bindEvents();
        this.connectToServer();
        this.boardDrawnOnce = false;
        
        // Show inactive boards initially
        this.renderInactiveBoards();

        // setInterval(() => {
        //     let randomIndex = Math.floor(Math.random() * 25);
        //     while (  this.isValidMove(randomIndex) === false ) {
        //         randomIndex = Math.floor(Math.random() * 25);
        //     }
        //     this.makeMove(randomIndex);
        // }, 5000);
    }

    initializeFromURL() {
        const pathParts = window.location.pathname.split('/').filter(part => part);
        if (pathParts.length >= 4 && pathParts[0] === 'play') {
            // URL format: /play/secretKey/matchId/playerName
            this.gameState.secretKey = pathParts[1];
            this.gameState.matchId = pathParts[2];
            this.gameState.playerName = pathParts[3];
        } else if (pathParts.length >= 3) {
            // URL format: /secretKey/matchId/playerName  
            this.gameState.secretKey = pathParts[0];
            this.gameState.matchId = pathParts[1];
            this.gameState.playerName = pathParts[2];
        } else {
            this.showError('Invalid URL format. Expected: /play/secretKey/matchId/playerName or /secretKey/matchId/playerName');
        }
    }

    connectToServer() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateConnectionStatus(true);
            this.joinMatch();
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus(false);
        });

        this.socket.on('match-joined', (data) => {
            console.log('Match joined:', data);
            this.hideLoading();
            this.updateMatchInfo(data.match);
            this.showMessage(`Joined match as ${data.playerName}`);
        });

        this.socket.on('opponent-joined', (data) => {
            console.log('Opponent joined:', data);
            this.showMessage(`${data.opponentName} joined the match`);
        });

        this.socket.on('player-ready', (data) => {
            this.showMessage(`${data.playerName} is ready (${data.readyCount}/${data.totalPlayers})`);
        });

        this.socket.on('game-start', (data) => {
            console.log('Game started:', data);
            this.startGame(data);
        });

        this.socket.on('move-update', (data) => {
            console.log('Move update:', data);
            this.handleMoveUpdate(data);
        });

        this.socket.on('game-won', (data) => {
            console.log('Game won:', data);
            this.handleGameWon(data);
        });

        this.socket.on('match-reset', (data) => {
            console.log('Match reset:', data);
            this.handleMatchReset(data);
        });

        this.socket.on('game-reset-reconnection', (data) => {
            console.log('Game reset due to reconnection:', data);
            this.handleGameResetReconnection(data);
        });

        this.socket.on('player-disconnected', (data) => {
            this.showMessage(`${data.playerName} disconnected`);
        });

        this.socket.on('error', (data) => {
            console.error('Server error:', data);
            this.showError(data.message);
        });
    }

    joinMatch() {
        this.socket.emit('join-match', {
            secretKey: this.gameState.secretKey,
            matchId: this.gameState.matchId,
            playerName: this.gameState.playerName
        });
    }

    bindEvents() {
        document.getElementById('ready-btn').addEventListener('click', () => {
            this.toggleReady();
        });

        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetMatch();
        });

        document.getElementById('next-game-btn').addEventListener('click', () => {
            this.hideWinnerModal();
            this.gameState.ready = false;
            this.updateReadyButton();
            this.renderInactiveBoards();
        });

        document.getElementById('error-ok-btn').addEventListener('click', () => {
            this.hideError();
        });

    }

    toggleReady() {
        if (!this.gameState.gameInProgress) {
            this.gameState.ready = !this.gameState.ready;
            this.updateReadyButton();
            
            if (this.gameState.ready) {
                this.socket.emit('ready');
                this.showMessage('You are ready! Waiting for opponent...');
            }
        }
    }

    resetMatch() {
        if (confirm('Reset the entire match? This will clear all wins.')) {
            this.socket.emit('reset-match');
        }
    }

    startGame(data) {
        this.gameState.gameInProgress = true;
        this.gameState.ready = false;
        this.gameState.board = [...data.startingPuzzle];
        this.gameState.scrambler = [...data.scrambler];
        this.gameState.moves = 0;
        
        // Clear boards and render active game
        //this.clearBoard();
        this.updateMatchInfo(data.match);
        this.renderScrambler();
        this.renderBoardStatic();
        this.updateReadyButton();
        this.showMessage(`Game ${data.gameNumber} started! Match the pattern!`);
    }

    handleMoveUpdate(data) {
        console.log(`Move update received: ${data.playerName} made a move, I am ${this.gameState.playerName}`);
        if (data.playerName === this.gameState.playerName) {
            console.log('Updating MY board');
            const previousBoard = [...this.gameState.board];
            this.gameState.moves = data.moves;
            this.gameState.board = [...data.board];
            this.renderBoard(previousBoard); 
        } else {
            console.log('Updating opponent move count only');
            this.gameState.opponentMoves = data.moves;
        }
        this.updateMoveCounters();
    }

    handleGameWon(data) {
        this.gameState.gameInProgress = false;
        this.updateMatchInfo(data.match);
        
        const isWinner = data.winner === this.gameState.playerName;
        this.showWinnerModal(data.winner, isWinner, data.gameStats);
        
        if (isWinner) {
            this.showMessage('🎉 You won! Great job!');
        } else {
            this.showMessage(`${data.winner} won this round!`);
        }
        
        // Show inactive boards after game ends
        this.renderInactiveBoards();
    }

    handleMatchReset(data) {
        this.gameState.gameInProgress = false;
        this.gameState.ready = false;
        this.gameState.moves = 0;
        this.gameState.opponentMoves = 0;
        
        this.updateMatchInfo(data.match);
        this.updateReadyButton();
        this.clearBoard();
        this.renderInactiveBoards();
        this.showMessage('Match reset! Ready for a new game?');
    }

    handleGameResetReconnection(data) {
        this.gameState.gameInProgress = false;
        this.gameState.ready = false;
        this.gameState.moves = 0;
        this.gameState.opponentMoves = 0;
        
        this.updateMatchInfo(data.match);
        this.updateReadyButton();
        this.clearBoard();
        this.renderInactiveBoards();
        this.showMessage(data.message);
    }

    makeMove(tileIndex) {
        if (!this.gameState.gameInProgress || !this.isValidMove(tileIndex)) {
            return;
        }

        this.socket.emit('move', { tilePosition: tileIndex });
    }

    isValidMove(tileIndex) {
        const emptyIndex = this.gameState.board.indexOf('empty');
        const emptyRow = Math.floor(emptyIndex / this.boardSize);
        const emptyCol = emptyIndex % this.boardSize;
        const tileRow = Math.floor(tileIndex / this.boardSize);
        const tileCol = tileIndex % this.boardSize;
        
        return (emptyRow === tileRow) || (emptyCol === tileCol);
    }

    renderScrambler() {
        const scramblerGrid = document.getElementById('scrambler-grid');
        scramblerGrid.innerHTML = '';
        
        this.gameState.scrambler.forEach((color, index) => {
            const tile = document.createElement('div');
            tile.className = `scrambler-tile ${color}`;
            scramblerGrid.appendChild(tile);
        });
    }

    renderInactiveBoards() {
        this.renderInactiveScrambler();
        this.renderInactiveBoard();
    }

    renderInactiveScrambler() {
        const scramblerGrid = document.getElementById('scrambler-grid');
        scramblerGrid.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            const tile = document.createElement('div');
            tile.className = `scrambler-tile grey`;
            scramblerGrid.appendChild(tile);
        }
    }

    renderInactiveBoard() {
        const gameBoard = document.getElementById('game-board');
        gameBoard.innerHTML = '';
        for (let i = 0; i < 25; i++) {
            const tile = document.createElement('div');
            if (i === 24) {
                tile.className = 'game-tile empty';
            } else {
                tile.className = `game-tile grey inactive`;
            }
            tile.dataset.position = i;
            gameBoard.appendChild(tile);
        }
    }

    renderBoard(previousBoard = null) {
        const gameBoard = document.getElementById('game-board');
        this.renderBoardStatic();
    }
    
    renderBoardStatic() {
        const gameBoard = document.getElementById('game-board');
        const existingTiles = Array.from(gameBoard.children);

        this.gameState.board.forEach((tile, index) => {
            const tileElement = document.createElement('div');
            tileElement.className = `game-tile ${tile}`;
            tileElement.dataset.position = index;

            if (tile === 'empty') {
                tileElement.classList.add('empty');
            } else if ( this.isValidMove(index) ) {
                tileElement.addEventListener('click', () => this.makeMove(index));
            } 

            const existingTile = existingTiles.find( (el) => parseInt(el.dataset.position, 10) === index);

            if (existingTile) {
                gameBoard.replaceChild(tileElement, existingTile);
            } else {
                gameBoard.appendChild(tileElement);
            }

        });
    }


    isCenterTile(index) {
        const centerPositions = [6, 7, 8, 11, 12, 13, 16, 17, 18];
        return centerPositions.includes(index);
    }

    clearBoard() {
        const gameBoard = document.getElementById('game-board');
        const scramblerGrid = document.getElementById('scrambler-grid');
        gameBoard.innerHTML = '';
        scramblerGrid.innerHTML = '';
        
        // Clear game state arrays
        // this.gameState.board = [];
        // this.gameState.scrambler = [];
    }

    updateMatchInfo(match) {
        const player1Name = match.player1_name || 'Player 1';
        const player2Name = match.player2_name || 'Player 2';
        
        document.getElementById('player1-wins').textContent = `${player1Name}: ${match.player1_wins} wins`;
        document.getElementById('player2-wins').textContent = `${player2Name}: ${match.player2_wins} wins`;
        
        this.updateMoveCounters();
    }

    updateMoveCounters() {
        // Move counter elements removed from display, but keeping method for future use
        // Logic still tracks moves in gameState.moves and gameState.opponentMoves
    }

    updateReadyButton() {
        const readyBtn = document.getElementById('ready-btn');
        
        if (this.gameState.gameInProgress) {
            readyBtn.textContent = 'Game in Progress';
            readyBtn.disabled = true;
        } else if (this.gameState.ready) {
            readyBtn.textContent = 'Ready! Waiting...';
            readyBtn.disabled = true;
        } else {
            readyBtn.textContent = 'Ready to Play?';
            readyBtn.disabled = false;
        }
    }

    updateConnectionStatus(connected) {
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.status-text');
        
        if (connected) {
            statusIndicator.classList.add('connected');
            statusText.textContent = `Connected --  Match:"${this.gameState.matchId}"`;
        } else {
            statusIndicator.classList.remove('connected');
            statusText.textContent = 'Disconnected';
        }
    }

    showMessage(message) {
        const messageElement = document.getElementById('game-message');
        messageElement.textContent = message;
    }

    showWinnerModal(winner, isWinner, gameStats) {
        const modal = document.getElementById('winner-modal');
        const winnerText = document.getElementById('winner-text');
        const winnerStatsElement = document.getElementById('winner-stats');
        
        winnerText.textContent = isWinner ? 'You Win! 🎉' : `${winner} Wins!`;
        winnerText.style.color = isWinner ? '#2ecc71' : '#e74c3c';
        
        let statsHtml = `<div><strong>Game Statistics:</strong></div>`;
        if (gameStats && gameStats.size > 0) {
            gameStats.forEach((stats, playerName) => {
                statsHtml += `<div>${playerName}: ${stats.moves} moves</div>`;
            });
        }
        
        winnerStatsElement.innerHTML = statsHtml;
        modal.classList.remove('hidden');
    }

    hideWinnerModal() {
        document.getElementById('winner-modal').classList.add('hidden');
    }

    showError(message) {
        const modal = document.getElementById('error-modal');
        const errorMessage = document.getElementById('error-message');
        
        errorMessage.textContent = message;
        modal.classList.remove('hidden');
    }

    hideError() {
        document.getElementById('error-modal').classList.add('hidden');
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('game-container').classList.remove('hidden');
    }

}

document.addEventListener('DOMContentLoaded', () => {
    const client = new RubikRaceClient();
});