# Chess room: what the research says, in one page

Read this first. The four long reports (01 to 04) hold the sources. This page
holds the decisions. Date: 2026-09-03.

## The one idea
Kids stay when they **play more than they read**, when **every move gets an
answer at once**, and when **rewards mark real skill and never go down**.
Every design choice below comes from that.

## Teaching order (all big curricula agree)
Board -> one piece at a time (rook, bishop, queen, king, knight, pawn last) ->
capture -> protect -> check -> out of check -> mate in one -> stalemate ->
castling, en passant, promotion -> piece values -> basic mates -> tactics ->
opening principles -> endgames. **Delay checkmate.** Early wins are captures
and races, not mates. (01-pedagogy: Steps Method, ChessKid, Lichess Learn, CSC.)

## Lesson shape
- One concept per lesson. 3 to 5 minutes for ages 5 to 8. Up to 10 for 9 to 12.
- Show, do not tell. A live board that corrects a wrong move at once beats a
  paragraph. Text stays under two short lines per screen; read aloud on.
- Every lesson ends in a mini-game the child can win.
- Talk less than 25% of the time (CSC caps teacher talk at 15 of 60 minutes).

## Mini-game ladder (the engagement engine)
1. Star hunt: one piece collects stars in the fewest moves (Lichess Learn).
2. Pawn Wars: pawns only, first to the far side wins.
3. Capture the Flag: all pieces, no kings, no check rules.
4. Piece vs pawns: queen vs 8 pawns, rook vs 5, bishop vs 3, knights vs 3.
5. Safe route mazes: move one piece past enemy attacks to a target.
6. Solo Chess: every move must capture; last piece standing.
7. King Hunt: army vs lone king. Only after check is taught.
8. Mate-in-one race with a low cap. Puzzle Rush style rush only after that.

## Rewards that work (and the ones that hurt)
Use:
- 1 to 3 stars per lesson, based on performance (fewer moves, no hints).
- A star total that only goes up. Losing a game still earns a star for playing.
- Free the pieces: each piece is caged until its lesson is done (Magnus' Kingdom).
- Earned-only cosmetics: board colours, piece sets, mascot hats. No currency.
- "Days practised" and a weekly goal, not a fragile daily streak. No lives.
- Short, skippable celebration. Words praise the process tied to the result
  ("You found the fork on the first try"), never "you are smart" (Dweck).
- Level badges: Pawn -> Knight -> Bishop -> Rook -> Queen -> King (ChessKid).
Avoid: leaderboards, hearts, timers on beginners, ads, buyable anything,
long unskippable animations, walls of text (Prodigy and Chess Universe are
the cautionary tales).

## Bot
Kids quit when they lose too much. Target a 60 to 70% child win rate.
Ladder: random mover -> "grabs anything" -> one-ply that hangs pieces on
purpose -> shallow search with a blunder rate. Move up after two wins in a
row, down after two losses. Start far below 300 Elo. Maia and Stockfish are
too strong at the bottom and too heavy; not for v1.

## Tech (fits the strict CSP, works offline, works in a WebView)
- Rules: vendor `chess.js` 1.4.0 ESM file (BSD-2, 107 KB, one file).
- Board: hand-rolled SVG, tap-tap and drag with Pointer Events, `<use>` pieces,
  classes only, no inline styles.
- Pieces: cburnett SVGs from Wikimedia Commons (BSD-3 / CC BY-SA 3.0, credit
  in the app). No Staunty, Merida, Alpha (licence problems).
- Bot: ~200-line negamax with piece-square tables in a Web Worker. No WASM, no
  CSP change.
- Puzzles: Lichess DB (CC0) filtered to ~2,000 puzzles by theme and rating,
  shipped as small JSON per theme. Openings: Lichess chess-openings TSV (CC0).
- Progress: one object under the existing `giftedprep.v1` storage key.
- Touch: squares at least 44 px. Board has `role="grid"`, labelled cells, and
  an `aria-live` move announcer. Colour plus shape for every highlight.
  Respect `prefers-reduced-motion`.

## The three levels
See 03-curriculum.md for the lesson list. In short:
- **Level 1, Pawn Camp (no rating):** board, six pieces as characters,
  capture, check, mate, special moves, values, one sample game. Mini-games
  throughout. Ends with a full game against the softest bot.
- **Level 2, Knight School (about 200 to 600):** opening rules, three named
  openings, the six basic tactics, the three basic mates, hanging pieces,
  endgame basics, "checks, captures, threats" before every move.
- **Level 3, Queen's Guild (600+):** deeper tactics, calculation habit, plans
  (open files, outposts, pawn structure), a real repertoire, rook and pawn
  endgames, attacking the king, notation, clocks, tournament manners.
