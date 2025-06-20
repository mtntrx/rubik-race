
Goal is to make a two player, web-app phone game:
* Will be modeled after the physical game rubick-race
* rubik-race game play is described in ./rubik-race.pdf
* I'd like to have a node/express.js server host this game for 2 players
* minimum security.  players will just use a url like this:  https://host.com:3400/secret-key/match-id/player-name
* a match will be made up of many games continuing over potentiall long time periods (the server will need some non-volitile storage mech for this.  maybe sqlite?)
* a match will start when to clients hit the server with the right secret-key and the same match-id
* when a match starts, it will serve up an empty game board to both players
* when both player hit the ready button, it will populate the "scrambler" on the top half of the mobile screen
* it will also populate the randomized sliding pattern for both players (the exact same starting pattern)
* tiles will be moved by tapping a tile (any tile that is in the same row or column as the empty square)  When this is done, all tiles between the tapped tile and the empty square will move one place over filling the empty square and creating a new one.
* number of "moves" will be counted and displayed on both screens (a player will see their number of moves and their opponents)
* the winner will be the player that gets their pattern to match the "scrambler" -- the game ends here and waits for "ready" to be pressed by both players before starting a new game
* the total number of games won by each player will also be displayed
* a reset_all button will start everything over and resest games won to zero for both
* the match
