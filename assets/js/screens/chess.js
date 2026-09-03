/**
 * screens/chess.js — the Chess Club room.
 *
 * Three levels: Pawn Camp (the pieces and the rules), Knight School (openings,
 * tactics and the basic mates) and Queen's Guild (600+). The research behind
 * the design and the build plan live in docs/research/chess/.
 *
 * For now the room is a sign on the door. Routing, the screen and the back
 * link are wired so the home tile is a real link and the link checker is
 * happy; the lessons land in the steps set out in docs/research/chess/PLAN.md.
 */

import { paintRoomHead } from './gifted.js';
import { showScreen } from './../modules/shell.js';

/** Route target: #/chess, later #/chess/<level>, #/chess/<level>/<lesson> */
export function renderChess() {
  paintRoomHead('chess', 'cz-chess-pic');
  showScreen('chess');
}
