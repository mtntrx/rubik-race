const GameEngine = require('./GameEngine');

class PatternGenerator extends GameEngine {
    constructor() {
        super();
    }

    generateScrambler() {
        const pattern = [];
        const colorCounts = {};
        
        this.colors.forEach(color => colorCounts[color] = 0);
        
        for (let i = 0; i < this.scramblerSize * this.scramblerSize; i++) {
            let availableColors = this.colors.filter(color => colorCounts[color] < 4);
            
            if (availableColors.length === 0) {
                availableColors = [...this.colors];
            }
            
            const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];
            pattern.push(randomColor);
            colorCounts[randomColor]++;
        }
        
        return pattern;
    }

    generateStartingPuzzle(scramblerPattern) {
        const colorCounts = {};
        this.colors.forEach(color => colorCounts[color] = 0);
        
        scramblerPattern.forEach(color => {
            colorCounts[color]++;
        });
        
        const remainingTiles = [];
        this.colors.forEach(color => {
            const remaining = 4 - colorCounts[color];
            for (let i = 0; i < remaining; i++) {
                remainingTiles.push(color);
            }
        });
        
        const shuffledRemaining = this.shuffleArray(remainingTiles);
        
        const puzzle = new Array(this.boardSize * this.boardSize).fill(null);
        
        const centerPositions = [
            this.boardSize + 1, this.boardSize + 2, this.boardSize + 3,
            (2 * this.boardSize) + 1, (2 * this.boardSize) + 2, (2 * this.boardSize) + 3,
            (3 * this.boardSize) + 1, (3 * this.boardSize) + 2, (3 * this.boardSize) + 3
        ];
        
        for (let i = 0; i < scramblerPattern.length; i++) {
            puzzle[centerPositions[i]] = scramblerPattern[i];
        }
        
        let remainingIndex = 0;
        for (let i = 0; i < puzzle.length; i++) {
            if (puzzle[i] === null) {
                if (remainingIndex < shuffledRemaining.length) {
                    puzzle[i] = shuffledRemaining[remainingIndex];
                    remainingIndex++;
                } else {
                    puzzle[i] = 'empty';
                }
            }
        }
        
        return this.scramblePuzzle(puzzle, 50 + Math.floor(Math.random() * 100));
    }

    scramblePuzzle(puzzle, moves) {
        let currentPuzzle = [...puzzle];
        
        for (let i = 0; i < moves; i++) {
            const validMoves = this.getValidMoves(currentPuzzle);
            if (validMoves.length > 0) {
                const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
                try {
                    currentPuzzle = this.executeMove(currentPuzzle, randomMove);
                } catch (error) {
                    console.warn('Invalid move during scrambling:', error.message);
                }
            }
        }
        
        return currentPuzzle;
    }

    validatePattern(scramblerPattern) {
        if (!Array.isArray(scramblerPattern) || scramblerPattern.length !== 9) {
            return false;
        }
        
        const colorCounts = {};
        this.colors.forEach(color => colorCounts[color] = 0);
        
        for (const color of scramblerPattern) {
            if (!this.colors.includes(color)) {
                return false;
            }
            colorCounts[color]++;
            if (colorCounts[color] > 4) {
                return false;
            }
        }
        
        return true;
    }

    validatePuzzle(puzzle) {
        if (!Array.isArray(puzzle) || puzzle.length !== 25) {
            return false;
        }
        
        const colorCounts = {};
        this.colors.forEach(color => colorCounts[color] = 0);
        let emptyCount = 0;
        
        for (const tile of puzzle) {
            if (tile === 'empty') {
                emptyCount++;
            } else if (this.colors.includes(tile)) {
                colorCounts[tile]++;
            } else {
                return false;
            }
        }
        
        if (emptyCount !== 1) {
            return false;
        }
        
        for (const color of this.colors) {
            if (colorCounts[color] !== 4) {
                return false;
            }
        }
        
        return true;
    }

    generateGamePatterns() {
        const scrambler = this.generateScrambler();
        const startingPuzzle = this.generateStartingPuzzle(scrambler);
        
        if (!this.validatePattern(scrambler) || !this.validatePuzzle(startingPuzzle)) {
            throw new Error('Generated invalid patterns');
        }
        
        return {
            scrambler,
            startingPuzzle
        };
    }
}

module.exports = PatternGenerator;