import { calculateTileStatus } from './calculateTileStatus.js';
import { revealNeighbours } from './revealNeighbours.js';
import { checkWin, sendWSEveryone } from '../util/commonFunctions.js';

export function revealCell(game, x, y) {
    // If they messed with their css, don't update the tile for them, too bad
    if (game.cellsRevealed.has([x, y].join())) { // Early return for chording
        return;
    }
    const cellID = y * game.columns + x;
    console.log("User revealed a cell, game.cellID: ", cellID);
    if (game.minePlacements.has(cellID) && !game.firstClick) {
        sendWSEveryone(game.wsPlayers, {type: "revealAllMines", minePlacements: Array.from(game.minePlacements), deathCellID: cellID});
        game.lost = true;
        
        // Find misflags and send to clients
        const misFlags = []; // Pushing to const is not functional but who cares
        for (const flagCoordinate of game.flaggedIDs) {
            const [x, y] = flagCoordinate.split(",").map(e => parseInt(e));
            const cellID = y * game.columns + x;
            if (!game.minePlacements.has(cellID)) {
                misFlags.push([x, y].join());
            }
        }
        sendWSEveryone(game.wsPlayers, {type: "revealMisflags", misFlags})
        
        // Early return because the game is lost
        return;
    }
    if (game.minePlacements.has(cellID) && game.firstClick) { // First click was a mine
        game.minePlacements.delete(cellID);
        let newMine;
        while (game.minePlacements.size < game.mines) { // Generate a mine in a different place
            newMine = Math.floor(Math.random() * (game.rows * game.columns));
            if (newMine !== cellID) {
                game.minePlacements.add(newMine); // Try to add the new mine (could still be duplicate)
            }
        }
    }
    
    if (game.firstClick) {
        game.startTime = new Date().getTime(); // Time in milliseconds
    }
    
    const tileStatus = calculateTileStatus(game, x, y); // Guaranteed not to be a bomb
    sendWSEveryone(game.wsPlayers, {type: "revealCell", id: "cell" + x + "_" + y, tileStatus});
    game.cellsRevealed.add([x, y].join()); // adds a comma in between
    if (tileStatus === 0) {
        revealNeighbours(game, x, y);
    }
    checkWin(game);
    console.log("size of game.cellsRevealed: ", game.cellsRevealed.size);
    game.firstClick = false;
}