/**
 * chessbot.worker.js — the bot, thinking somewhere the page cannot feel it.
 *
 * A depth-four search takes long enough to stop the board animating, and a
 * frozen board reads as a broken app rather than as a bot thinking. This does
 * the work off the main thread and posts back one move.
 *
 * It is a module worker served from our own origin, so `worker-src 'self'`
 * already covers it and the site's Content-Security-Policy needs no change.
 * That is the whole reason the engine is a couple of hundred lines of
 * JavaScript rather than a WebAssembly build of a real one: Stockfish would
 * need 'wasm-unsafe-eval' added to script-src, seven megabytes of download,
 * and it still could not play weakly enough to be any fun for a beginner.
 *
 * There is no state here on purpose. Every message carries the position, so a
 * worker that is restarted or replaced loses nothing.
 */

import { chooseMove } from './../modules/chessbot.js';

self.onmessage = (ev) => {
  const { id, fen, level, seed } = ev.data || {};
  let uci = null;
  try {
    uci = chooseMove(fen, level, seed);
  } catch (err) {
    /* A thrown engine must not take the game down with it. The page falls
       back to thinking on the main thread when a move comes back empty. */
    uci = null;
  }
  self.postMessage({ id, uci });
};
