# Chess Club: the lessons, level by level

Content spec for `data/chess/level1.json`, `level2.json`, `level3.json`.
Source: `03-curriculum.md` (Steps Method, ChessKid, Story Time Chess, Lichess).
Every FEN and move line below was re-checked with chess.js 1.4.0 on
2026-09-03 (see PROGRESS.md). Where a count is given, it is the real count.

Step types are defined in PLAN.md Phase 3. Shorthand used here:
- `say "..."` a line of text (read aloud)
- `show FEN mark{...} "caption"`
- `try FEN "ask" accept[uci...] hint"..."`
- `starhunt FEN piece=sq stars[sq...] par=n`
- `tap FEN "ask" answer[sq...] "why"`
- `quiz "ask" choices[...] answer "why"`
- `play game=id bot=n side=w|b goal"..."`
- `puzzle theme=x count=n maxRating=r`
- `game moves"..." notes{ply:"..."}`
- `done "praise line"`

Word caps for `say`: level 1 twelve words, level 2 twenty, level 3 thirty.
Every lesson ends with `done`. Stars: the runner averages step stars.

## Level file shape
```json
{
  "level": 1,
  "id": "pawn-camp",
  "name": "Pawn Camp",
  "blurb": "Meet the six pieces, one at a time, and win your first game.",
  "band": "No rating yet",
  "lessons": [ { "id": "l1-board", "name": "The Board", "emoji": "🗺️",
                 "big": "Every square has a name.", "piece": null,
                 "minutes": 4, "steps": [ ... ] } ]
}
```
`piece` is set on the six piece lessons (rook, bishop, queen, king, knight,
pawn) and drives the caged-piece unlock on the level page.

Piece-lesson FENs put the kings on h1 and a8 so they never sit on the
piece's lines. With the kings on a1/h8 the bishop count drops to 12 and the
queen to 26, and chess.js will even list a king capture. Use these exactly.

---

## Level 1: Pawn Camp (15 lessons, no rating)
Order follows every major curriculum: rook first, knight late, pawn last of
the pieces, checkmate as late as possible. Each piece lesson has the same
shape so a child knows what comes next.

### l1-board · The Board · 🗺️ · "Every square has a name."
1. say "The board is a map. Each square has a letter and a number."
2. show start position, mark{ring:[e4]} "This is e4. Letter first, then number."
3. tap start position "Tap d5." answer[d5] "d is the fourth letter. 5 is the fifth row."
4. tap "Tap a1." answer[a1]; then "Tap h8." answer[h8]
5. quiz "Which corner is light on your right?" choices[h1, a1] answer h1 "White on the right."
6. say "Both sides start the same way. Queen on her own colour."
7. done "You can read the map now."

### l1-rook · The Rook · 🏰 · "Straight lines, as far as it likes."
FEN `k7/8/8/8/3R4/8/8/7K w - - 0 1` (rook d4 has 14 moves).
1. say "The rook is a castle tower. It runs in straight lines."
2. show FEN mark{dots: all 14 rook targets} "Up, down, left, right. It cannot jump."
3. try FEN "Move the rook to d7." accept[d4d7] hint "Straight up the d line."
4. starhunt `k7/8/8/8/8/8/8/R6K w - - 0 1` piece=a1 stars[a6, f6, f2] par=3
5. tap `k7/8/3p4/8/3R4/8/8/7K w - - 0 1` "Tap every square the rook can reach." answer[all rook targets; d7 and d8 are blocked by the pawn on d6, d6 itself is a capture] "It stops at the first piece. It can take that one."
6. play game=rookroad bot=0 goal "Reach the flag square in the fewest moves." (rookroad is a starhunt with obstacles: `k7/8/2p5/8/3R1p2/8/8/7K w - - 0 1`, stars[h4, d1, a4], no captures allowed, par=4)
7. done "You drove the rook straight to every star."

### l1-bishop · The Bishop · 🎪 · "Slanted lines. It keeps its colour forever."
FEN `k7/8/8/8/3B4/8/8/7K w - - 0 1` (13 moves).
1. say "Bea and Bop are circus bishops. They walk on slanted ropes."
2. show FEN mark{dots: 13 targets} "Only diagonals. This bishop lives on dark squares forever."
3. try FEN "Move the bishop to g7." accept[d4g7]
4. starhunt `k7/8/8/8/8/8/8/2B4K w - - 0 1` piece=c1 stars[f4, b8, h2] par=4 (all dark squares)
5. quiz `k7/8/8/8/3B4/8/8/7K w - - 0 1` "Can this bishop ever reach e4?" choices[Yes, No] answer No "e4 is light. This bishop only walks dark squares."
6. play game=hungrybishop: bishop must capture 5 pawns on its colour: `k7/8/1p3p2/8/3B4/8/1p3p2/6pK w - - 0 1` style, chessgames.js builds it; goal "Eat all five." par=5
7. done "Five pawns, one hungry bishop."

### l1-queen · The Queen · 👑 · "Rook and bishop in one."
FEN `k7/8/8/8/3Q4/8/8/7K w - - 0 1` (27 moves).
1. say "The queen can go straight or slanted. Any distance."
2. show FEN mark{dots: 27} "Straight like a rook. Slanted like a bishop."
3. try "Move the queen to h8." accept[d4h8]
4. starhunt `k7/8/8/8/8/8/8/3Q3K w - - 0 1` piece=d1 stars[d6, g3, a4] par=3
5. tap FEN "Tap 3 squares the queen can NOT reach." answer[any of the 36 non-targets; accept any three] "The queen never jumps like a knight."
6. play game=queenvspawns bot=1 side=w goal "Take every pawn before one gets to the end." FEN `k7/pppppppp/8/8/8/8/8/3Q3K w - - 0 1` loaded with skipValidation is NOT needed here (kings present).
7. done "The queen went everywhere you asked."

### l1-knight · The Knight · 🐴 · "Gallop, gallop, step to the side."
FEN `7k/8/2p1p3/1p3p2/3N4/1p3p2/2p1p3/K7 w - - 0 1` (the knight attacks exactly the 8 pawns).
1. say "The knight jumps. Two steps, then one to the side."
2. show `k7/8/8/8/3N4/8/8/7K w - - 0 1` mark{dots: 8, arrows: [[d4,e6]]} "It is the only piece that can jump over others."
3. try "Jump to f5." accept[d4f5] hint "Two right, one up."
4. tap FEN "Tap all 8 pawns it can take." answer[c6, e6, b5, f5, b3, f3, c2, e2] "Every jump changes colour. Dark to light, light to dark."
5. starhunt (Knight Adventure) FEN above, capture all 8 pawns, par=8 (each capture counts as a star; stars: 3 if 8 moves, 2 if 10, else 1)
6. play game=knightsvspawns bot=1 side=w FEN `k7/1ppp4/8/8/8/8/8/1NN4K w - - 0 1` goal "Stop the three pawns."
7. done "Gallop, gallop, step. You have the hardest piece down."

### l1-pawn · The Pawn · 🧒 · "Forward one. Eats sideways. Never back."
FEN `7k/8/8/8/8/2p1p3/3P4/K7 w - - 0 1` (d2 pawn: d3, d4, dxc3, dxe3).
1. say "Pawns are the king's kids. They race forward and never turn back."
2. show FEN mark{dots:[d3,d4], ring:[c3,e3]} "One step. Two from home. It eats slanted."
3. tap FEN "Tap every square this pawn can go." answer[d3, d4, c3, e3] "Forward to move. Sideways to eat."
4. try FEN "Take the pawn on e3." accept[d2e3]
5. play game=pawnwars bot=0 side=w FEN `8/pppppppp/8/8/8/8/PPPPPPPP/8 w - - 0 1` (skipValidation) goal "Get one pawn to the far side first." Win three times across visits for 3 stars; the runner grants stars for this visit's result.
6. say "At the far side a pawn becomes a queen. More on that soon."
7. done "The pawn race is yours."

### l1-king · The King · 🤴 · "One careful step. Never into danger."
FEN `4k3/8/8/8/8/8/2r5/4K3 w - - 0 1` (only Kd1 and Kf1 are legal).
1. say "King Shaky takes one small step. Any direction."
2. show `k7/8/8/8/3K4/8/8/8 w - - 0 1` mark{dots: 8} "One step. That is all."
3. say "He may never step onto a square an enemy can hit."
4. tap FEN "Tap the safe squares." answer[d1, f1] "The rook watches the whole second row."
5. quiz `4k3/8/8/8/8/8/2r5/4K3 w - - 0 1` "Can the king go to e2?" choices[Yes, No] answer No "The rook would take him."
6. play game=kingwalk (Capture the Flag): king walks from e1 to a flag on e8 past enemy rooks that may not be captured: `4k3/8/8/8/1r6/8/6r1/4K3 w - - 0 1` variant with flag square; bot=0; goal "Reach the flag without stepping into danger."
7. done "Shaky got home safe."

### l1-value · Attack, Take, Protect · 🍬 · "Every piece is worth points."
1. say "Pawn 1. Knight 3. Bishop 3. Rook 5. Queen 9."
2. show start position mark{} with a value bar drawn under the board (screen-side)
3. quiz "Which is worth more?" choices[Rook, Bishop] answer Rook "5 beats 3."
4. show `4k3/8/8/2r1b3/8/3N4/8/4K3 w - - 0 1` mark{arrows:[[d3,c5],[d3,e5]]} "The knight can take two things. Which is bigger?"
5. try same FEN "Take the bigger one." accept[d3c5] hint "The rook is 5. The bishop is 3."
6. say "A piece nobody protects is free candy. Look for it."
7. tap `r1bq1rk1/ppp2ppp/2n2n2/3pN3/8/8/PPPP1PPP/R1BQKB1R b KQ - 0 8` "Tap the white piece nobody protects." answer[e5] "The knight on e5 has no friends near it."
8. done "You count like a chess player now."

### l1-check · Check and the Three Escapes · 🚨 · "Run, block, or take."
FEN `4k3/8/8/8/8/1N6/3B4/r3K3 w - - 0 1` (legal: Ke2, Kf2, Bc1, Nc1, Nxa1).
1. say "Check means the king is under attack. You must fix it now."
2. show FEN mark{check: e1, arrows:[[a1,e1]]} "The rook hits the king. Three ways out."
3. try FEN "Run: move the king to safety." accept[e1e2, e1f2]
4. try FEN "Block: put something in the way." accept[d2c1, b3c1]
5. try FEN "Take: capture the rook." accept[b3a1]
6. puzzle theme=oneMove count=3 maxRating=700 (filter offline to "get out of check" positions; if the theme file has none, use three hand-made FENs)
7. done "Run, block, take. You know all three."

### l1-mate · Checkmate and Stalemate · 🏁 · "Trapped is a win. Frozen is a tie."
1. say "Checkmate: the king is in check and cannot escape. Game over."
2. show `7k/6Q1/5K2/8/8/8/8/8 b - - 0 1` mark{check: h8} "No run, no block, no take. Checkmate."
3. say "Stalemate: not in check, but no legal move at all. A tie."
4. show `7k/5Q2/5K2/8/8/8/8/8 b - - 0 1` "Nobody touches the king. He cannot move. Draw."
5. quiz with three boards "Mate, stalemate, or neither?" (three FENs: the two above and `7k/8/5K2/8/8/8/8/6Q1 b - - 0 1` which is neither) 
6. puzzle theme=mateIn1 count=5 maxRating=700
7. done "You can finish a game now."

### l1-castle · Castling · 🏯 · "The king runs home. The tower shuts the door."
FEN `r3k2r/pppqbppp/2npbn2/4p3/4P3/2NPBN2/PPPQBPPP/R3K2R w KQkq - 0 1`.
1. say "Once a game, the king jumps two squares and the rook hops over."
2. show FEN mark{arrows:[[e1,g1],[h1,f1]]} "Short castle. King to g1, rook to f1."
3. try FEN "Castle short." accept[e1g1] hint "Tap the king, then g1."
4. show FEN mark{arrows:[[e1,c1],[a1,d1]]} "Long castle goes the other way."
5. quiz "Can you castle out of check?" choices[Yes, No] answer No "Not in check, not through check, not into check."
6. quiz "Can you castle if the rook already moved?" choices[Yes, No] answer No "King and that rook must both be new."
7. done "Your king has a castle to hide in."

### l1-special · Promotion and En Passant · 🎓 · "A pawn can grow up."
1. show `8/1P4k1/8/8/8/8/8/4K3 w - - 0 1` "A pawn that reaches the far side becomes any piece."
2. try same FEN "Make a queen." accept[b7b8q] (the board's promotion picker appears)
3. say "En passant: a pawn that jumps two can be caught as it passes."
4. show `rnbqkb1r/ppp1pppp/5n2/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3` mark{arrows:[[e5,d6]], ring:[d5]} "The d pawn jumped past. Catch it on d6, right away."
5. try same FEN "Catch it." accept[e5d6]
6. quiz "Can you do it next turn instead?" choices[Yes, No] answer No "Only right away."
7. done "Two secret moves, both yours."

### l1-notation · The Secret Code · 🔤 · "Every move has a name."
1. say "A move is the piece letter and the square. Nf3 means knight to f3."
2. show start position, then `game moves"f3 e5 g4 Qh4#" notes{1:"Pawn to f3.", 2:"Pawn to e5.", 3:"Pawn to g4. A bad idea.", 4:"Queen to h4. Checkmate in two moves!"}`
3. quiz "What does Bxe5 mean?" choices[Bishop takes on e5, Bishop to e5, Both bishops] answer "Bishop takes on e5" "x means takes."
4. quiz "What is O-O?" choices[Short castle, Two zeros, Queen move] answer "Short castle"
5. try start position "Play Nf3." accept[g1f3]
6. done "You can read chess like a book."

### l1-draws · How a Game Ends · 🤝 · "Some games end in a handshake."
1. say "A game ends by checkmate, or by a draw."
2. show `7k/8/8/8/8/8/8/K5B1 w - - 0 1` "One bishop can never checkmate. Draw."
3. say "Draws: stalemate, not enough pieces, both agree, same position three times."
4. quiz "King and bishop against king. Who wins?" choices[White, Black, Nobody] answer Nobody
5. quiz "Stalemate is..." choices[A win, A draw] answer "A draw"
6. done "Now you know every way a game can end."

### l1-firstgame · Your First Real Game · ♟️ · "Every move has a reason."
1. say "First, a trap to know. The four-move mate."
2. game moves "e4 e5 Bc4 Nc6 Qh5 Nf6 Qxf7#" notes{5:"The queen and bishop both look at f7.", 6:"Black did not see it.", 7:"Checkmate. We will learn to stop this in Knight School."}
3. say "Now a famous game. Paris, 1858. Watch the white pieces work together."
4. game moves "e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#" notes{13:"Two attacks at once: f7 and b7.", 19:"White gives a knight to open the b file.", 31:"The queen is given away on purpose.", 33:"Checkmate with a rook and a bishop."} (note keys are ply numbers, 1-based)
5. play game=full bot=0 side=w goal "Play a whole game. Every move legal. Win or lose, you finish."
6. done "You played real chess. Knight School is open."

Level 1 mini-game variants needed in chessgames.js: rookroad, hungrybishop,
queenvspawns, knightsvspawns, pawnwars, kingwalk, full. Plus rookvs3pawns
(`8/8/8/8/8/8/1p1p1p2/R7 w - - 0 1`, skipValidation) as a free game on the
hub.

---

## Level 2: Knight School (19 lessons, about 200 to 600)
Every tactic lesson: say, show the idea, try it once, then a puzzle set from
the theme file. Puzzle ratings 400 to 900. The blunder check is the core
habit and gets repeated at the top of every lesson from l2-hanging on.

| id | name | emoji | big | key FEN / line | puzzle |
|---|---|---|---|---|---|
| l2-opening | Wake Up the Team | ☀️ | Centre, knights, castle. | show after 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d3 d6 6.O-O O-O `r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQ1RK1 w - - 2 7`; quiz three "good or bad opening" boards; play full bot=1 goal "Castle by move 10." | none |
| l2-italian | The Italian Game | 🍕 | Bishop looks at f7. | try the first six white moves in order vs the bot replying 1...e5 2...Nc6 3...Bc5 4...Nf6 5...d6 6...O-O; game shows the line to 7.Re1 | none |
| l2-london | The London System | 🏠 | The same house every game. | line 1.d4 d5 2.Bf4 Nf6 3.e3 e6 4.Nf3 c5 5.c3 Nc6 6.Nbd2 Bd6 7.Bg3 O-O 8.Bd3; FEN `r1bq1rk1/pp3ppp/2nbpn2/2pp4/3P4/2PBPNB1/PP1N1PPP/R2QK2R b KQ - 6 8` | none |
| l2-scholar | Stop the Bully Queen | 🛡️ | Shield g6, bodyguard Nf6. | threat `r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3`, try accept[g7g6]; then after 4.Qf3 try accept[g8f6]; quiz "vs 2.Bc4 play?" answer Nf6 | attackingF2F7 x5 |
| l2-hanging | Free Candy | 🍭 | Checks, captures, threats. Every move. | `r1bq1rk1/ppp2ppp/2n2n2/3pN3/8/8/PPPP1PPP/R1BQKB1R b KQ - 0 8` try accept[c6e5]; tap "your own hanging piece" boards x3 | hangingPiece x10, max 800 |
| l2-count | Count the Hands | ✋ | More attackers than defenders? | `6k1/pp3ppp/5n2/3r4/7B/1B6/PP3PPP/6K1 w - - 0 1` quiz "Is Bxd5 safe?" answer No "One attacker, one defender. You lose the bishop." | none; 8 hand-made count boards |
| l2-fork | The Fork | 🍴 | One piece, two victims. | `r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1` try accept[b5c7] | fork x12, 500-900 |
| l2-pin | Stuck in the Mud | 🪤 | A pinned piece cannot move. Pile on. | `4k3/8/8/4n3/8/3P4/8/4RK2 w - - 0 1` try accept[d3d4] | pin x12 |
| l2-skewer | The Kebab | 🍢 | Big piece in front, little one behind. | `1r6/8/8/4k3/8/8/8/4K1B1 w - - 0 1` try accept[g1h2] then accept[h2b8] | skewer x12 |
| l2-discovered | Open the Door | 🚪 | One piece moves, another attacks. | `7k/4q3/8/8/3N4/8/1B6/6K1 w - - 0 1` try accept[d4f5] | discoveredAttack x10, doubleCheck x3 |
| l2-backrank | The Back Rank | 🧱 | Trapped behind your own wall. Make a hole. | `6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1` try accept[e1e8]; quiz "Which pawn move makes a hole?" answer h3 | backRankMate x10 |
| l2-defender | Remove the Guard | 🥷 | Take the bodyguard first. | `6k1/pp3ppp/5n2/3r4/7B/1B6/PP3PPP/6K1 w - - 0 1` try accept[h4f6] then after gxf6 accept[b3d5] | capturingDefender x10, 600-1000 |
| l2-ladder | The Rook Roller | 🪜 | Two rooks push the king up the stairs. | `4k3/8/8/8/8/8/R7/1R2K3 w - - 0 1`; play game=twoRooksMate bot=0 side=w goal "Checkmate in under 10 moves. No stalemate." from 3 random K+2R FENs | none |
| l2-kq | Queen Box | 📦 | Shrink the box. King helps. Never stalemate. | start `8/8/8/4k3/8/8/8/4K2Q w - - 0 1`; show the final `4k3/4Q3/4K3/8/8/8/8/8 b - - 0 1`; play game=kqMate bot=0 goal "Mate in under 15 moves." | none |
| l2-kr | Rook Wall | 🧱 | The rook is the wall. The king pushes. | start `8/8/8/4k3/8/8/8/R3K3 w - - 0 1`; final `4k3/8/4K3/8/8/8/8/R7 w - - 0 1` Ra8#; play game=krMate bot=0 goal "Mate in under 20 moves." | none |
| l2-passed | Draw the Box | 📐 | Can the king catch the pawn? | `8/8/8/8/P4k2/8/8/K7 b - - 0 1` quiz "Black to move. Does the king catch it?" answer Yes; same FEN white to move answer No | promotion x5, max 900 |
| l2-kingfight | The King Fights | 🥊 | In the endgame the king comes out. | race `k7/p7/8/8/8/8/7P/K7 w - - 0 1` play game=full from FEN bot=1; decoy `8/4k1pp/8/P3K3/8/8/6PP/8 w - - 0 1` show | pawnEndgame x6, max 1000 |
| l2-opposition | The Staring Contest | 👀 | Whoever must move, loses the square. | `8/8/4k3/8/4K3/4P3/8/8 b - - 0 1` quiz "Who has the opposition?" answer White; 6 more quiz boards | none |
| l2-game | The Bait Queen | 🎣 | Greedy captures lose games. | game moves "e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6 Nxe5 Bxd1 Bxf7+ Ke7 Nd5#" notes{9:"The knight is pinned. Or is it?",10:"Black grabs the queen. Greedy.",13:"Checkmate. Three small pieces beat a queen."}; then play full bot=2 | mateIn2 x5, max 900 |

---

## Level 3: Queen's Guild (18 lessons, 600+)
Puzzle ratings 900 to 1500. Every tactic lesson starts with the CCT ritual:
before the child moves, the screen asks them to tap every check, capture and
threat (a `tap` step with multi-select), then the `try`.

| id | name | emoji | big | key FEN / line | puzzle |
|---|---|---|---|---|---|
| l3-cct | Say It Out Loud | 🗣️ | Checks, captures, threats. Every move. | `r5k1/5ppp/8/1Q6/8/8/5PPP/4R1K1 w - - 0 1` tap every square that gives check answer[e8, b8] (Re8+ and Qb8+; Qb3 is not check, f7 blocks); then try accept[e1e8]; line Re8+ Rxe8 Qxe8# | mateIn2 x10, 900-1300 |
| l3-deflection | Look Over Here | 👉 | Drag the guard away. | `3r2k1/3q1ppp/8/8/Q7/8/5PPP/4R1K1 w - - 0 1` try accept[a4d7]; line Qxd7 Rxd7 Re8# | deflection x12 |
| l3-decoy | Bait on the Hook | 🪝 | Lure the king to a bad square. | `3q2k1/5pp1/8/4N3/8/8/6P1/6KR w - - 0 1` try accept[h1h8]; line Rh8+ Kxh8 Nxf7+ then Nxd8 | attraction x12 |
| l3-zwischenzug | Wait, First This | ⏸️ | Before you take back, is there a check? | `r1bqk2r/pp1p1ppp/2B2n2/2b1p3/4P3/8/PPPP1PPP/RNBQK1NR b KQkq - 0 5` try accept[c5f2] | intermezzo x10 |
| l3-overload | The Busy Babysitter | 👶 | One defender, two jobs. | `3r2k1/4qppp/8/4b3/8/8/1Q3PPP/3R2K1 w - - 0 1` try accept[d1d8]; line Rxd8+ Qxd8 Qxe5 | deflection + capturingDefender x10 |
| l3-xray | X-ray Eyes | 🩻 | Attack through a piece. | `r1bqk2r/pppp1ppp/8/8/1b6/1Q6/PP1P1PPP/R1B1KBNR w KQkq - 0 9` try accept[a2a3] "The queen sees b7 through the bishop." | xRayAttack x8 |
| l3-clearance | Out of the Way | 🧹 | Empty a line with check. | `7k/5ppp/7Q/q3N3/8/8/1B6/6K1 w - - 0 1` try accept[e5f7]; then Qxg7# | clearance x8 |
| l3-interference | Slam the Door | 🚪 | A piece between guard and VIP. | `2kr1b2/ppp4p/6p1/4PN2/8/7P/P2qQPP1/4R1K1 w - - 0 1` try accept[f5d6] | interference x6 |
| l3-outposts | Treehouses and Highways | 🌳 | Outposts, open files, the 7th rank. | outpost `r2qr1k1/pp3ppp/8/3Np3/8/8/PP3PPP/R2Q1RK1 w - - 0 1` tap the outpost answer[d5]; rook 7th `2r3k1/pp3ppp/8/8/8/8/PP3PPP/3R2K1 w - - 0 1` try accept[d1d7] | rookEndgame x8 |
| l3-pawns | Bones That Cannot Move Back | 🦴 | Isolated, doubled, backward. The bishop pair. | IQP `r1bq1rk1/pppnbppp/5n2/3p2B1/3P4/2N1PN2/PP3PPP/R2QKB1R w KQ - 0 8` tap the isolated pawn answer[d4]; play full from `2n1kn2/pp3ppp/8/8/8/8/PP3PPP/2B1KB2 w - - 0 1` bot=3 | none |
| l3-white | Your White Openings | ⚪ | Same plan every game. | Italian to 7.Re1 `r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQR1K1 b - - 3 7`; try-sequences vs 1...e5, 1...c5 (2.Nc3 Nc6 3.Bc4), 1...e6 (exchange), 1...c6 (exchange), 1...d5 (2.exd5); data from `openings.json` | opening-tag puzzles x6 |
| l3-black | Your Black Openings | ⚫ | Copy the plan. Know the three traps. | vs 1.e4: Italian mirror, Ruy Lopez closed to 7...d6, Fried Liver 4...d5 5.exd5 Na5; vs 1.d4: QGD to 7...c6 `r1bq1rk1/pp1nbppp/2p1pn2/3p2B1/2PP4/2N1PN2/PP3PPP/2RQKB1R w K - 0 8`; vs London 2...c5 3.e3 Nc6 4.c3 Qb6 | opening-tag puzzles x6 |
| l3-kp | Key Squares | 🔑 | Get the king in front. | won `4k3/8/4K3/4P3/8/8/8/8 w - - 0 1` (Kd6 Kd8 e6 Ke8 e7 Kf7 Kd7); drawn `4k3/8/8/4K3/4P3/8/8/8 b - - 0 1` (line ends in stalemate); tap key squares of `4k3/8/8/8/4P3/8/8/4K3 w - - 0 1` answer[d6,e6,f6]; play kpEndgame vs bot=4 both sides | pawnEndgame x10, 1000-1400 |
| l3-rook | Bridges and Fences | 🌉 | Lucena, Philidor, rook behind the pawn. | Lucena `1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1` game line Rd1+ Ke7 Rd4 Ra1 Kc7 Rc1+ Kb6 Rb1+ Kc6 Rc1+ Kb5 Rb1+ Rb4; Philidor `8/8/8/8/4pk2/R7/7r/4K3 w - - 0 1` play defend vs bot=4; `r5k1/8/8/8/P7/8/8/R5K1 w - - 0 1` quiz "Where does the rook belong?" answer Behind the pawn | rookEndgame x10 |
| l3-attack | Ring the Doorbell | 🔔 | Bxh7+ and the pieces that follow. | `r1bq1rk1/ppp2ppp/2n1p3/3pP3/1b1P4/2NB1N2/PP3PPP/R1BQK2R w KQ - 0 9` try accept[d3h7]; game line Bxh7+ Kxh7 Ng5+ Kg8 Qh5 Re8 Qxf7+ Kh8 Qh5+ Kg8 Qh7+ Kf8 Qh8+ Ke7 Qxg7# | kingsideAttack + sacrifice x10, 1000-1400 |
| l3-patterns | Name the Mate | 🏷️ | See it faster when it has a name. | show one board each: smothered, Anastasia, Arabian, Boden, hook, dovetail, Opera (from the puzzle files' mate-theme tags; pick the lowest-rated example per theme at build time) | smotheredMate, anastasiaMate, arabianMate, bodenMate, hookMate, dovetailMate x2 each |
| l3-plan | A Plan Is a Sentence | 📝 | I will ... because ... | replay the Opera game with a plan prompt every 5 moves (quiz choices); then play full bot=3 with a "what is your plan?" quiz at move 10 | none |
| l3-tournament | Touch It, Move It | 🏆 | Rules, notation, clocks, manners. | 20-question quiz set: touch move, adjust, draw offers, threefold, 50 moves, clock delay "d5", raise your hand, shake hands, write every move | none |

## Data files this needs
- `data/chess/puzzles/<theme>.json` for every theme named above (Phase 5).
- `data/chess/openings.json`: the lines in l2-italian, l2-london, l3-white,
  l3-black as `{ id, name, side, moves: [uci...], fen }`, taken from the
  CC0 chess-openings TSV.
- `data/chess/solo.json`: 10 Solo Chess positions (hand-made, checked).
- Random K+2R, K+Q, K+R start positions are generated at runtime by
  chessgames.js (kings at least two files apart, side to move not in check).
