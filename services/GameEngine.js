class GameEngine {
    constructor() {
        this.colors = ['red', 'blue', 'green', 'yellow', 'orange', 'white'];
        this.boardSize = 5;
        this.scramblerSize = 3;
    }

    isValidMove(board, tilePosition) {
        const emptyIndex = board.indexOf('empty');
        const emptyRow = Math.floor(emptyIndex / this.boardSize);
        const emptyCol = emptyIndex % this.boardSize;
        const tileRow = Math.floor(tilePosition / this.boardSize);
        const tileCol = tilePosition % this.boardSize;
        
        return (emptyRow === tileRow) || (emptyCol === tileCol);
    }

    executeMove(board, tilePosition) {
        if (!this.isValidMove(board, tilePosition)) {
            throw new Error('Invalid move');
        }

        const newBoard = [...board];
        const emptyIndex = board.indexOf('empty');
        const emptyRow = Math.floor(emptyIndex / this.boardSize);
        const emptyCol = emptyIndex % this.boardSize;
        const tileRow = Math.floor(tilePosition / this.boardSize);
        const tileCol = tilePosition % this.boardSize;

        if (emptyRow === tileRow) {
            const start = Math.min(emptyCol, tileCol);
            const end = Math.max(emptyCol, tileCol);
            const direction = emptyCol < tileCol ? 1 : -1;
            
            for (let i = 0; i < end - start; i++) {
                const currentPos = emptyRow * this.boardSize + emptyCol + (i * direction);
                const nextPos = emptyRow * this.boardSize + emptyCol + ((i + 1) * direction);
                newBoard[currentPos] = newBoard[nextPos];
            }
            newBoard[tilePosition] = 'empty';
        } else if (emptyCol === tileCol) {
            const start = Math.min(emptyRow, tileRow);
            const end = Math.max(emptyRow, tileRow);
            const direction = emptyRow < tileRow ? 1 : -1;
            
            for (let i = 0; i < end - start; i++) {
                const currentPos = (emptyRow + (i * direction)) * this.boardSize + emptyCol;
                const nextPos = (emptyRow + ((i + 1) * direction)) * this.boardSize + emptyCol;
                newBoard[currentPos] = newBoard[nextPos];
            }
            newBoard[tilePosition] = 'empty';
        }

        return newBoard;
    }

    checkWin(playerBoard, scramblerPattern) {
        const centerStart = this.boardSize + 1;
        const centerPositions = [
            centerStart, centerStart + 1, centerStart + 2,
            centerStart + this.boardSize, centerStart + this.boardSize + 1, centerStart + this.boardSize + 2,
            centerStart + (2 * this.boardSize), centerStart + (2 * this.boardSize) + 1, centerStart + (2 * this.boardSize) + 2
        ];

        for (let i = 0; i < this.scramblerSize * this.scramblerSize; i++) {
            if (playerBoard[centerPositions[i]] !== scramblerPattern[i]) {
                return false;
            }
        }
        return true;
    }

    getBoardState(board) {
        return {
            board: [...board],
            emptyIndex: board.indexOf('empty'),
            validMoves: this.getValidMoves(board)
        };
    }

    getValidMoves(board) {
        const validMoves = [];
        const emptyIndex = board.indexOf('empty');
        const emptyRow = Math.floor(emptyIndex / this.boardSize);
        const emptyCol = emptyIndex % this.boardSize;

        for (let i = 0; i < board.length; i++) {
            if (board[i] !== 'empty' && this.isValidMove(board, i)) {
                validMoves.push(i);
            }
        }

        return validMoves;
    }

    getCenterGrid(board) {
        const centerStart = this.boardSize + 1;
        return [
            board[centerStart], board[centerStart + 1], board[centerStart + 2],
            board[centerStart + this.boardSize], board[centerStart + this.boardSize + 1], board[centerStart + this.boardSize + 2],
            board[centerStart + (2 * this.boardSize)], board[centerStart + (2 * this.boardSize) + 1], board[centerStart + (2 * this.boardSize) + 2]
        ];
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    arraysEqual(a, b) {
        return Array.isArray(a) && Array.isArray(b) && 
               a.length === b.length && 
               a.every((val, i) => val === b[i]);
    }
}

module.exports = GameEngine;