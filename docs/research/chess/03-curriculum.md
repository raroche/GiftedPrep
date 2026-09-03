# Kids' Chess Curriculum: Content Spec for a Three-Level App

Research date: 2026-09-03. This document specifies *what* a kids' chess curriculum should teach at three levels, in a form an app can be built from: numbered lessons, one verified example position (FEN) per lesson, a skill check, free data sources, rating-band definitions, and the age-appropriate framing used by ChessKid, Story Time Chess and the Steps Method.

Every FEN below was validated with python-chess (legal position, side to move, and where claimed, the mate / fork / pin / stalemate was confirmed by search). Move sequences were replayed to confirm the stated outcome.

---

## 0. How the big curricula structure this

Three established programs anchor the level design:

| Program | Structure | Notes for an app |
|---|---|---|
| **Steps Method (Stappenmethode, NL)** | 6 Steps. Step 1 (15 lessons) ends at ~800, Step 2 ~1400, Step 3 ~1600. Step 1 = board, moves, attacking/capturing, pawn, defending, check, mate (1)(2), castling, profitable exchange, twofold attack, draw, mating with the queen, en passant, notation. Step 2 = activity, double attack (queen), pin, elimination of the defence, "3 golden rules" (opening), mate in two, double attack (R/B/N/K), mating with the rook, discovered attack, defending against mate, intermediate move. Step 3 = completing the opening, discovered/double check, attacking a pinned piece, mate after gaining access, square of the pawn, eliminating the defence, defending against double attack, mini-plans, draws, x-ray, defending against a pin, mobility, key squares, threats. | Deliberately delays checkmate ("learning how to mate is postponed as long as possible") in favour of attacking/capturing/defending. Workbook style: 12 positions per page, one theme per page. "Stepping Stones" variants for ages 5–9 use large diagrams and almost no text. |
| **ChessKid** | Levels named Pawn → Knight → Bishop → Rook → Queen → King → Super King. Pawn: meet each piece (6). Knight: check / checkmate / stalemate. Bishop: helper mates, K+Q mate, "Rook Roller" (two-rook ladder). Rook: castling, promotion & en passant, back-rank mates, "First Moves" 1–2 (opening principles). Queen: hanging pieces, learning to count, double attack, fork, pin, skewer, discovered attack, K+R mate, "Your Opponent!". King (41 lessons): phases of the game, passed pawns, opposition, when to check/trade, piling on pins, open files, remove & destroy, deflection & decoy, attraction, smothered mate, strong/weak pawns, outposts, bishops vs knights, zugzwang, planning, rooks on the 7th, ways to draw, attacking the castled king, batteries, pawn chains, colour weaknesses. | ChessKid's 43 puzzle themes map almost 1:1 onto Lichess themes (see Section 5). Mini-lesson names are playful: "Hungry Hungry Bishop", "Pawn Traffic Jam", "Diagonal Lunch", "Rook Roller", "Cat and Mouse", "Great Escape". |
| **Story Time Chess** | Ages 3+; each piece is a character with a story that encodes its move: King Shaky (afraid of grass, so he only takes one small step), Bea and Bop the bishops (circus performers who move on slants), knights that "gallop, gallop and step to the side", pawns are the King's kids who love to race and can't turn back, rooks are "castle" pieces that run straight. Story → drill → Crown Card mini-game. | Best model for Level 1, ages 4–7: one piece per session, story first, then a single-piece mini-game. |
| **Susan Polgar (free 62-page guide; "Learn Chess the Right Way" books)** | History, notation, check & checkmate, opening principles, tactics. Book 1 is entirely one-move checkmates ("Must-know Checkmates"), organized by mating piece; Book 2 = winning material (fork, pin, discovery, skewer, decoy). | Validates the "mate-in-1 by piece, then by tactic" drill ordering used in Level 1–2 below. |

Design conclusion: Level 1 ≈ Steps 1 + ChessKid Pawn–Bishop; Level 2 ≈ Step 2 + ChessKid Rook–Queen; Level 3 ≈ Step 3 (and bits of 4) + ChessKid King level.

---

## 1. Rating bands: what 600 vs 1000 actually means

There is no exact conversion between pools; treat everything as ±100–150.

**US Chess (over-the-board, Elo).** Provisional/unrated → ~600 after the first 1–3 tournaments. 600–1000 is "where most elementary-age beginners start"; movement from 600 to 900 is often quick with monthly play. Around 1000 a child knows basic tactics, common mates, opening principles and simple endgames, and pieces "still hang, but not every ten moves". 1000–1400 is typical after 1–3 years of serious play (section wins, state placements). 1400–1800 = strong scholastic player, usually coached. US Chess runs ~50–100 points above FIDE for the same player. Note the "beginner boom" effect: a 500 Chess.com blitz player now maps to roughly 925 US Chess, because online pools are flooded with new adult players while OTB scholastic pools are not.

**Chess.com** starts new accounts at 1200 (rapid) and is the *lowest* scale. **Lichess** (Glicko-2) starts at 1500 and sits ~100–500 points above Chess.com at the low end, converging around 2200.

ChessGoals cross-platform table (≈20k players), Chess.com blitz as the base:

| Chess.com blitz | Chess.com rapid | Lichess blitz | US Chess |
|---|---|---|---|
| 600 | 905 | 1160 | 1000 |
| 800 | 1085 | 1290 | 1150 |
| 1000 | 1255 | 1425 | 1285 |
| 1200 | 1420 | 1555 | 1415 |
| 1400 | 1580 | 1685 | 1540 |
| 1600 | 1730 | 1820 | 1655 |

**Recommended app bands** (state which scale you mean in the UI; "Chess.com-like" is what parents most often quote):

- **Level 1 — no rating.** Child can't yet complete a legal game unaided.
- **Level 2 — ~200–600 (Chess.com rapid) ≈ 800–1200 Lichess ≈ unrated–800 US Chess.** Games are decided by one-move blunders and hanging pieces. Lichess puzzle ratings 400–900.
- **Level 3 — 600+ (Chess.com) ≈ 1200–1500 Lichess ≈ 800–1200 US Chess.** Two-move tactics, first positional ideas, real endgames. Lichess puzzle ratings 900–1500.

Typical progression (CircleChess parent guides): kids start competing at 5–7; a structured beginner goes from unrated/sub-600 to 800–1000 US Chess in 6–12 months; 1200–1500 is realistic within 1–3 years; ~1000 after one year is strong for an under-10.

---

## 2. Level 1 — Absolute beginner (no rating)

Framing: one piece per session, story first, then a mini-game with only that piece (Story Time Chess / ChessKid "Meet the …"). Following the Steps Method, teach *attack, capture, defend* before checkmate. Positions without kings are fine for mini-games but the app's engine must allow king-less boards (python-chess and chess.js will parse them; `is_valid()` will be false).

| # | Lesson & concept | Kid framing | Example FEN | Skill check |
|---|---|---|---|---|
| 1 | **The board.** Files a–h, ranks 1–8, "white on the right", light/dark squares, naming a square. | The board is a map; every square has a street (letter) and house number (digit). | `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1` | Tap 10 named squares correctly in 30 s; set up the board from empty. |
| 2 | **The rook.** Straight lines, any distance, can't jump. | "Rook Road": a castle tower that runs along straight streets. | `7k/8/8/8/3R4/8/8/K7 w - - 0 1` | Highlight all 14 rook moves; "Rook Road" mini-game: reach 5 target squares in the fewest moves. |
| 3 | **The bishop.** Diagonals, stays on one colour forever. | Bea and Bop the circus bishops: each loves one colour and never steps off it ("Hungry Hungry Bishop"). | `7k/8/8/8/3B4/8/8/K7 w - - 0 1` | Highlight all 13 bishop moves; capture 5 pawns placed on its colour. |
| 4 | **The queen.** Rook + bishop. | The queen is the best friend of everyone: she can visit anyone in a straight line. | `7k/8/8/8/3Q4/8/8/K7 w - - 0 1` | Highlight all 27 queen moves from d4. |
| 5 | **The knight.** L-jump, can jump over pieces, always changes colour. | "Gallop, gallop, step to the side." The only horse that can jump the fence. | `7k/8/2p1p3/1p3p2/3N4/1p3p2/2p1p3/K7 w - - 0 1` (knight on d4 attacks exactly the 8 black pawns) | "Knight Adventure": capture all 8 pawns in 8 moves; knight tour of 12 marked squares. |
| 6 | **The pawn.** Forward 1 (2 from home), captures diagonally, never backwards. | The King's kids who love to race and can't turn round; they "eat sideways". | `7k/8/8/8/8/2p1p3/3P4/K7 w - - 0 1` (d2 pawn: d3, d4, dxc3, dxe3) | Pick all 4 legal pawn moves; **Pawn Game** (`8/pppppppp/8/8/8/8/PPPPPPPP/8 w - - 0 1`, first to the far side wins) — win 3 games vs the app. |
| 7 | **The king.** One step any direction; can never step onto an attacked square. | King Shaky is nervous: one careful step, and never into the "laser". | `4k3/8/8/8/8/8/2r5/4K3 w - - 0 1` (only Kd1 and Kf1 are legal) | Find the 2 safe squares; 5 "is this king move legal?" questions. |
| 8 | **Attack, capture, defend, value.** Piece values 1/3/3/5/9; "is it protected?"; a good trade vs a bad trade. | Pieces cost "points"; a knight is three pawns; never trade your bike for a skateboard. | `4k3/8/8/2r1b3/8/3N4/8/4K3 w - - 0 1` (Nxc5 wins 5, Nxe5 wins 3) | 10 "which capture is worth more?" and 10 "is this piece protected?" drills (Steps 1 "profitable exchange"). |
| 9 | **Check and the three escapes.** Move, block, capture. | The king shouts "help!"; you must answer right now — run, build a wall, or fight back. | `4k3/8/8/8/8/1N6/3B4/r3K3 w - - 0 1` (Ke2/Kf2 run, Bc1 blocks, Nxa1 captures) | Find all three kinds of escape; 10 puzzles "get out of check". |
| 10 | **Checkmate vs stalemate.** Mate = in check + no escape. Stalemate = not in check + no legal move = draw. | Checkmate is "the king is trapped"; stalemate is "the king is frozen but nobody is touching him" — a tie, so don't freeze him by accident. | Mate: `7k/6Q1/5K2/8/8/8/8/8 b - - 0 1`. Stalemate: `7k/5Q2/5K2/8/8/8/8/8 b - - 0 1` | 10 "mate, stalemate or neither?" cards; 10 mate-in-1 puzzles (Lichess `mateIn1`, rating < 700). |
| 11 | **Castling.** Both sides, all 4 conditions (not moved, not in/through/into check, empty between). | The king runs into his castle and the tower slides shut behind him. | `r3k2r/pppqbppp/2npbn2/4p3/4P3/2NPBN2/PPPQBPPP/R3K2R w KQkq - 0 1` (both sides can castle either way) | 8 "can White castle here?" questions covering each illegal case. |
| 12 | **Promotion and en passant.** | Pawn "graduates" at the far side; en passant = "you can't sneak past me, I'll tag you as you go by". | Promotion: `8/1P4k1/8/8/8/8/8/4K3 w - - 0 1`. En passant after 1.e4 Nf6 2.e5 d5: `rnbqkb1r/ppp1pppp/5n2/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3` (exd6 e.p.) | Promote in 3 puzzles; play the en passant capture correctly 3 times; explain why it only works "right away". |
| 13 | **Notation.** Reading and writing a move (Nf3, exd5, O-O, +, #). | Every move has a secret code. | Start position; write the moves of the Fool's Mate 1.f3 e5 2.g4 Qh4#. | Read 10 moves aloud; write 10 moves the app plays. |
| 14 | **Draws and how a game ends.** Stalemate, insufficient material, agreement, repetition (name it, don't drill it). | Some games end in a handshake. | `7k/8/8/8/8/8/8/K5B1 w - - 0 1` (K+B vs K: nobody can win) | Sort 6 positions into win/draw. |
| 15 | **Your first whole game, annotated.** Fool's Mate (2 moves) and Scholar's Mate (4 moves) as *warnings*, then a real classic. | "Let's read a story where every move has a reason." | Scholar's Mate final: `r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4`. Classic: Morphy's Opera Game (Paris 1858): 1.e4 e5 2.Nf3 d6 3.d4 Bg4 4.dxe5 Bxf3 5.Qxf3 dxe5 6.Bc4 Nf6 7.Qb3 Qe7 8.Nc3 c6 9.Bg5 b5 10.Nxb5 cxb5 11.Bxb5+ Nbd7 12.O-O-O Rd8 13.Rxd7 Rxd7 14.Rd1 Qe6 15.Bxd7+ Nxd7 16.Qb8+ Nxb8 17.Rd8# | Replay the game with the app asking "why?" at moves 7, 10, 16; then play a complete legal game vs the app with no illegal moves. |

**Level 1 mini-games (use throughout):** Pawn Game; Pawn Game + one rook each; Rook vs 3 pawns (`8/8/8/8/8/8/1p1p1p2/R7 w - - 0 1`, rook must stop every pawn); Knight Adventure; Rook Road; "Capture the Flag" (king walks to a target square without stepping into check); K+Q vs K "Cat and Mouse".

---

## 3. Level 2 — ~200–600 (Chess.com rapid) / 800–1200 Lichess

Framing: games at this level are decided by hanging pieces. The core skill is the *blunder check* ("before you move: what can they take? what can they check?"). Every lesson ends with puzzles pulled from the Lichess database filtered by theme and rating 400–900.

| # | Lesson & concept | Kid framing | Example FEN | Skill check |
|---|---|---|---|---|
| 1 | **Opening principles.** Centre pawn, knights before bishops, castle by move ~8, don't move the queen early, don't move the same piece twice. (Steps "3 golden rules"; ChessKid "First Moves".) | Wake up your team, put the king in his castle, connect the rooks. | After 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d3 d6 6.O-O O-O: `r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQ1RK1 w - - 2 7` | Score 10 opening positions "good / bad first 8 moves"; play 3 games where the app checks "castled by move 10?". |
| 2 | **The Italian Game (White).** 1.e4 e5 2.Nf3 Nc6 3.Bc4, then c3, d3, O-O, Re1, Nbd2 (Giuoco Pianissimo). | Aim your bishop at the f7 "weak spot", castle, then attack. | Same as above | Play the first 6 moves from memory 5 times vs varied replies (data: Lichess `chess-openings` C50–C54). |
| 3 | **The London System (White alternative).** 1.d4 d5 2.Bf4 Nf6 3.e3 e6 4.Nf3 c5 5.c3 Nc6 6.Nbd2 Bd6 7.Bg3 O-O 8.Bd3. | The same house every game: pawn d4, bishop f4, "pyramid" c3-e3. | `r1bq1rk1/pp3ppp/2nbpn2/2pp4/3P4/2PBPNB1/PP1N1PPP/R2QK2R b KQ - 6 8` | Reach the setup in 8 moves vs 3 different Black setups. |
| 4 | **Stopping Scholar's Mate (Black).** After 1.e4 e5 2.Qh5 Nc6 3.Bc4 play 3...g6 4.Qf3 Nf6. Against 2.Bc4 play 2...Nf6. Against 2.Bc4 Bc5 3.Qh5, play 3...Qe7. | The bully queen wants f7; put a pawn shield (g6) and a bodyguard (Nf6). | Threat position: `r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3`. Defended: `r1bqkb1r/pppp1p1p/2n2np1/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 2 5` | Defend correctly 5/5 times against both queen routes (Qh5 and Qf3); Lichess theme `attackingF2F7`. |
| 5 | **Hanging pieces & the blunder check.** Undefended piece = free. Ritual: *checks, captures, threats* for *both* sides before every move. | "Free candy!" Look for pieces nobody is holding hands with. | `r1bq1rk1/ppp2ppp/2n2n2/3pN3/8/8/PPPP1PPP/R1BQKB1R b KQ - 0 8` (Nxe5 wins a loose knight) | 15 Lichess `hangingPiece` puzzles rated < 800; 5 "spot my hanging piece before I move" positions. |
| 6 | **Counting.** Attackers vs defenders on one square; capture order lowest first. | Count the hands: if more of my hands are on the square, I can grab it. | `6k1/pp3ppp/5n2/3r4/7B/1B6/PP3PPP/6K1 w - - 0 1` (d5: 1 attacker, 1 defender — not yet takeable) | 10 "safe to capture?" drills. |
| 7 | **Fork / double attack.** Knight forks especially; the "family fork". | One piece, two victims: the fork is a "double dinner". | `r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1` (Nc7+ forks king and rook) | 15 Lichess `fork` puzzles rated 500–900. |
| 8 | **Pin.** Absolute (to the king) vs relative; a pinned piece is a sitting duck — pile up on it. | Pinned = "stuck in the mud"; attack it with a pawn. | `4k3/8/8/4n3/8/3P4/8/4RK2 w - - 0 1` (knight pinned; d4 wins it) | 15 Lichess `pin` puzzles rated 500–900. |
| 9 | **Skewer.** Big piece in front, little piece behind. | A pin in reverse: shove the king aside and eat what was behind him. | `1r6/8/8/4k3/8/8/8/4K1B1 w - - 0 1` (Bh2+ then Bxb8) | 15 Lichess `skewer` puzzles rated 500–900. |
| 10 | **Discovered attack & discovered check.** | Open the door: one piece steps aside and the one behind attacks. | `7k/4q3/8/8/3N4/8/1B6/6K1 w - - 0 1` (Nf5+ discovers check from b2 and hits the queen) | 15 Lichess `discoveredAttack` puzzles; 5 `doubleCheck`. |
| 11 | **Back-rank mate & the escape hatch.** | The king trapped behind his own pawn wall; make "luft" (a breathing hole) with h3/h6. | `6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1` (Re8#) | 15 Lichess `backRankMate` puzzles; 5 "does my king need an escape square?" positions. |
| 12 | **Removing the defender.** Capture or chase the guard, then take the guarded piece. | Get rid of the bodyguard first. | `6k1/pp3ppp/5n2/3r4/7B/1B6/PP3PPP/6K1 w - - 0 1` (Bxf6 removes the only defender of d5, then Bxd5) | 15 Lichess `capturingDefender` puzzles rated 600–1000. |
| 13 | **Two-rook "ladder" mate.** | Rook Roller / the escalator: rooks take turns pushing the king up the stairs. | `4k3/8/8/8/8/8/R7/1R2K3 w - - 0 1` (Ra7 then Rb8#) | Mate from 5 random K+2R positions in under 10 moves, no stalemate. |
| 14 | **King + Queen vs King.** Box method, never stalemate. | Shrink the box; the king comes to help; never let the queen touch the enemy king's "knight-jump" square unprotected. | Start: `8/8/8/4k3/8/8/8/4K2Q w - - 0 1`. Final: `4k3/4Q3/4K3/8/8/8/8/8 b - - 0 1` (mate) | Mate from 5 random positions in ≤ 15 moves, zero stalemates. |
| 15 | **King + Rook vs King.** | Box + opposition; the rook is the wall, the king is the bulldozer. | Start: `8/8/8/4k3/8/8/8/R3K3 w - - 0 1`. Final: `4k3/8/4K3/8/8/8/8/R7 w - - 0 1` (Ra8#) | Mate from 5 random positions in ≤ 20 moves. |
| 16 | **Passed pawns & the square rule.** | A passed pawn has "no traffic ahead"; draw the square from the pawn to the queening square — if the king can step in, he catches it. | `8/8/8/8/P4k2/8/8/K7 b - - 0 1` (Black to move steps into the square and catches the pawn; White to move would promote) | 10 "can the king catch it?" cards without moving pieces. |
| 17 | **King activity & the promotion race.** In the endgame the king is a fighting piece; count the moves. | The king takes off his crown and joins the fight. | Race: `k7/p7/8/8/8/8/7P/K7 w - - 0 1`. Outside passed pawn as a decoy: `8/4k1pp/8/P3K3/8/8/6PP/8 w - - 0 1` | 10 promotion-race puzzles (Lichess `pawnEndgame` + `promotion`, rating < 1000). |
| 18 | **Opposition (intro).** Kings facing with one square between; the side *not* to move has it. | A staring contest: whoever has to blink (move) loses the square. | `8/8/4k3/8/4K3/4P3/8/8 b - - 0 1` (White has the opposition) | 10 "who has the opposition?" cards. |
| 19 | **Annotated model game (Level 2).** Légal's Mate: 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6 5.Nxe5 Bxd1 6.Bxf7+ Ke7 7.Nd5# — shows pin, the "greedy capture" trap, and piece coordination. | "The queen was bait." | Final: `rn1q1bnr/ppp1kB1p/3p2p1/3NN3/4P3/8/PPPP1PPP/R1BbK2R b KQ - 2 7` | Explain why 5...Bxd1 lost; find the mate from move 6. |

---

## 4. Level 3 — 600+ (Chess.com) / 1200–1500 Lichess / 800–1200 US Chess

Framing: "think like a coach": every move gets a checks-captures-threats scan for both sides, and games get a plan. Puzzles: Lichess rating 900–1500, length `short`/`long`.

| # | Lesson & concept | Kid framing | Example FEN | Skill check |
|---|---|---|---|---|
| 1 | **Calculation habit: CCT.** List every check, capture and threat (yours *and* theirs) before choosing; calculate forcing lines to the end. | "Checks, captures, threats — say it out loud." | `r5k1/5ppp/8/1Q6/8/8/5PPP/4R1K1 w - - 0 1` (1.Re8+ Rxe8 2.Qxe8#) | 10 mate-in-2 (Lichess `mateIn2`, 900–1300) with the app requiring the full list of checks first. |
| 2 | **Deflection.** Drag a defender away from its job. | "Hey, look over here!" | `3r2k1/3q1ppp/8/8/Q7/8/5PPP/4R1K1 w - - 0 1` (1.Qxd7! Rxd7 2.Re8#) | 15 Lichess `deflection` puzzles 900–1400. |
| 3 | **Decoy / attraction.** Lure a piece (often the king) onto a bad square. | Bait on the hook. | `3q2k1/5pp1/8/4N3/8/8/6P1/6KR w - - 0 1` (1.Rh8+! Kxh8 2.Nxf7+ and Nxd8) | 15 Lichess `attraction` puzzles. |
| 4 | **Zwischenzug (in-between move).** Before recapturing, is there a stronger check or threat? | "Wait — first *this*." | `r1bqk2r/pp1p1ppp/2B2n2/2b1p3/4P3/8/PPPP1PPP/RNBQK1NR b KQkq - 0 5` (instead of ...bxc6, first 1...Bxf2+!, then ...bxc6) | 15 Lichess `intermezzo` puzzles. |
| 5 | **Overloading.** One defender with two jobs. | The babysitter watching two kids can't catch both. | `3r2k1/4qppp/8/4b3/8/8/1Q3PPP/3R2K1 w - - 0 1` (Qe7 guards d8 and e5: 1.Rxd8+ Qxd8 2.Qxe5) | 10 puzzles (ChessKid "Overloading"; Lichess has no separate tag — filter `deflection` + `capturingDefender`). |
| 6 | **X-ray.** Attacking or defending *through* an enemy piece. | Superman vision. | Petrosian–Ree 1971 after 8.Qb3: `r1bqk2r/pppp1ppp/8/8/1b6/1Q6/PP1P1PPP/R1B1KBNR w KQkq - 0 9` (schematic from Wikipedia's description: queen b3 x-rays b7 through the bishop on b4; 9.a3 wins material) | 10 Lichess `xRayAttack` puzzles. |
| 7 | **Clearance.** Vacate a square/line with tempo so another piece can use it. | Get out of the way — loudly (with check). | `7k/5ppp/7Q/q3N3/8/8/1B6/6K1 w - - 0 1` (1.Nxf7+! clears the long diagonal, 2.Qxg7#) | 10 Lichess `clearance` puzzles. |
| 8 | **Interference.** Sacrifice a piece *between* attacker and defender. | Slam a door between the bodyguard and the VIP. | After Wikipedia's Diagram A: `2kr1b2/ppp4p/6p1/4PN2/8/7P/P2qQPP1/4R1K1 w - - 0 1` (1.Nd6+! cuts the d8-rook's defence of the queen on d2: 1...Bxd6 or 1...cxd6 2.Qxd2 wins the queen; best is 1...Rxd6 2.exd6 Qxe2 3.Rxe2 Bxd6 and Black has only knight+pawn for the rook) | 8 Lichess `interference` puzzles. |
| 9 | **Positional: outposts, open files, rooks on the 7th.** | An outpost is a knight's "treehouse" no pawn can reach; an open file is a highway for rooks. | Outpost: `r2qr1k1/pp3ppp/8/3Np3/8/8/PP3PPP/R2Q1RK1 w - - 0 1`. Rook to the 7th: `2r3k1/pp3ppp/8/8/8/8/PP3PPP/3R2K1 w - - 0 1` (Rd7) | Mark the outposts / open files in 10 positions; 10 `rookEndgame` puzzles. |
| 10 | **Pawn structure & weak squares.** Isolated, doubled, backward pawns; holes; colour complexes; bishop pair. | Pawns are the skeleton — bones that can't move back. Two bishops = "scissors" that cut both colours. | IQP: `r1bq1rk1/pppnbppp/5n2/3p2B1/3P4/2N1PN2/PP3PPP/R2QKB1R w KQ - 0 8`. Bishop pair vs knights: `2n1kn2/pp3ppp/8/8/8/8/PP3PPP/2B1KB2 w - - 0 1` | Label pawn weaknesses in 10 structures; play 3 games from the bishop-pair position vs the engine. |
| 11 | **Opening repertoire (White): 1.e4.** vs 1...e5: Italian (2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d3 d6 6.O-O O-O 7.Re1; vs 3...Nf6 4.d3 Bc5 5.c3). vs 1...c5: 2.Nc3 Nc6 3.Bc4 (or 3.f4, Grand Prix-style) e6 4.Nf3 d5 5.Bb3. vs 1...e6: 2.d4 d5 3.exd5 exd5 4.Nf3 Bd6 5.Bd3 (Exchange French). vs 1...c6: 2.d4 d5 3.exd5 cxd5 4.Bd3 Nc6 5.c3 Nf6 6.Bf4 (Exchange Caro-Kann). vs 1...d5: 2.exd5 Qxd5 3.Nc3 Qa5 4.d4 Nf6 5.Nf3 Bf5 6.Bc4. | "Same plan every game: bishop to c4/d3, castle, rook to e1, then attack." | Italian after 7.Re1: `r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQR1K1 b - - 3 7` | Play each line from memory 3×; explorer stats from Lichess opening explorer (lichess.org/analysis, "database" tab, filter ratings 1000–1400). |
| 12 | **Opening repertoire (Black).** vs 1.e4: 1...e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d3 d6 6.O-O O-O (mirror the Italian); vs 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 (Ruy Lopez, Closed); vs 2.Qh5/2.Bc4 the Scholar's-mate defences from Level 2; vs the Fried Liver (4.Ng5) play 4...d5 5.exd5 Na5. vs 1.d4: 1...d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Nf3 Nbd7 7.Rc1 c6 (QGD Orthodox); vs London: 1...d5 2.Bf4 c5 3.e3 Nc6 4.c3 Qb6. | "Copy the plan, know the three traps." | QGD after 7...c6: `r1bq1rk1/pp1nbppp/2p1pn2/3p2B1/2PP4/2N1PN2/PP3PPP/2RQKB1R w K - 0 8` | Same drill as lesson 11; 10 `opening`-phase puzzles from the Italian/QGD (`OpeningTags` column). |
| 13 | **King & pawn endgames: opposition and key squares.** Key squares of a pawn on rank 2–4 = the three squares two ranks ahead; on rank 5–6, six squares. King in front on the 6th rank always wins; king in front with the pawn behind, wrong side to move, draws. | "The key squares are the doors — if your king gets in, the pawn queens." | Won: `4k3/8/4K3/4P3/8/8/8/8 w - - 0 1` (1.Kd6 Kd8 2.e6 Ke8 3.e7 Kf7 4.Kd7). Drawn: `4k3/8/8/4K3/4P3/8/8/8 b - - 0 1` (1...Ke7! 2.Kd5 Kd7 3.e5 Ke7 4.e6 Ke8 5.Kd6 Kd8 6.e7+ Ke8 7.Ke6 stalemate). Key squares for e4-pawn: `4k3/8/8/8/4P3/8/8/4K3 w - - 0 1` (d6, e6, f6) | 15 Lichess `pawnEndgame` puzzles 1000–1400; convert 5 K+P vs K wins, hold 5 draws vs engine. |
| 14 | **Rook endgames: Lucena, Philidor, rook behind the passed pawn.** | Lucena = "build a bridge" (rook on the 4th shields the king). Philidor = "third-rank fence, then check from behind". Rooks belong *behind* passed pawns. | Lucena: `1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1` (1.Rd1+ Ke7 2.Rd4 Ra1 3.Kc7 Rc1+ 4.Kb6 Rb1+ 5.Kc6 Rc1+ 6.Kb5 Rb1+ 7.Rb4). Philidor (White defends): `8/8/8/8/4pk2/R7/7r/4K3 w - - 0 1` (rook stays on the 3rd rank until ...e3, then Ra8 and check from behind). Rook behind passer: `r5k1/8/8/8/P7/8/8/R5K1 w - - 0 1` | Win Lucena 5/5 vs engine; hold Philidor 5/5; 15 Lichess `rookEndgame` puzzles. |
| 15 | **Attacking the castled king.** Greek-gift Bxh7+, opening lines, bringing pieces to the attack, f2/f7 attacks. | Three attackers beat two defenders; "the bishop sacrifice on h7 is a doorbell". | `r1bq1rk1/ppp2ppp/2n1p3/3pP3/1b1P4/2NB1N2/PP3PPP/R1BQK2R w KQ - 0 9` (1.Bxh7+ Kxh7 2.Ng5+ Kg8 3.Qh5 Re8 4.Qxf7+ Kh8 5.Qh5+ Kg8 6.Qh7+ Kf8 7.Qh8+ Ke7 8.Qxg7#; 2...Kh6 3.Nxf7+ discovered check wins the queen) | 15 Lichess `kingsideAttack` + `sacrifice` puzzles 1000–1400. |
| 16 | **Basic checkmate patterns library.** Smothered, Anastasia, Arabian, Boden, hook, dovetail, Morphy's/Opera mate. | Name the pattern, see it faster. | Opera Game final position (Level 1 lesson 15) | 3 puzzles per named pattern from Lichess mate-theme tags. |
| 17 | **Planning & "how to think about a whole game".** Evaluate: king safety, material, activity, pawn structure; pick a plan (attack the king / win a weak pawn / trade into a won ending); when to trade (ahead → trade pieces, not pawns); when to check. | "A plan is a sentence: *I will … because …*." | Any Level 3 model game; recommended: Opera Game and Capablanca's simple-plan games. | Annotate 3 own games with a one-sentence plan every 5 moves; app-assisted review flags every hanging piece. |
| 18 | **Draws, tournament rules, notation, clocks, etiquette.** Threefold repetition, 50-move rule, insufficient material, stalemate; touch-move & "adjust"; write every move (required for all K-5/K-6 players at US Chess nationals since 2025-26); draw offer only on your own move after moving and before pressing the clock; stop the clock and raise your hand for a TD; shake hands; no talking; typical scholastic time controls G/25 d5 and G/30 d5 locally, G/60–G/90 d5 at nationals; "d5" = 5-second delay before your clock runs. | "Touch it, move it. Write it, then press the clock." | (no board) | Score 20 rule questions; keep a complete scoresheet for one 30-move game. |

---

## 5. Free data sources and how to use them

**Lichess puzzle database (CC0).** `https://database.lichess.org/lichess_db_puzzle.csv.zst` — 6.06 M puzzles (2026-08-02 export). Columns: `PuzzleId, FEN, Moves, Rating, RatingDeviation, Popularity, NbPlays, Themes, GameUrl, OpeningTags, DailyDate`. Important mechanics: `FEN` is the position *before* the opponent's move; apply the first UCI move in `Moves` to get the position the child sees; the remaining moves are the solution (all "only moves" except mate-in-1 alternatives). `Rating` is Glicko-2 from real solves; `Popularity` is −100..100. Filter recipe (pandas): `df[df.Themes.str.contains(r'\bfork\b') & df.Rating.between(500, 900) & (df.Popularity > 70) & (df.NbPlays > 100)]`. Themes are space-separated; the full tag list is in `lila/translation/source/puzzleTheme.xml` and on lichess.org/training/themes. Tags used above: `mateIn1/2/3`, `fork`, `pin`, `skewer`, `discoveredAttack`, `doubleCheck`, `backRankMate`, `hangingPiece`, `capturingDefender`, `deflection`, `attraction`, `intermezzo`, `clearance`, `interference`, `xRayAttack`, `zugzwang`, `sacrifice`, `kingsideAttack`, `attackingF2F7`, `promotion`, `underPromotion`, `enPassant`, `castling`, `pawnEndgame`, `rookEndgame`, `queenEndgame`, `smotheredMate`, `anastasiaMate`, `arabianMate`, `bodenMate`, `hookMate`, `dovetailMate`, `opening/middlegame/endgame`, `oneMove/short/long/veryLong`, `master`. Lowest ratings in the DB are ~400–600, so Level 1 mate-in-1 sets should filter `mateIn1` + `oneMove` + `Rating < 700`. Also mirrored on Hugging Face (`Lichess/chess-puzzles`) in Parquet.

**Lichess openings (CC0).** `github.com/lichess-org/chess-openings` — `a.tsv`…`e.tsv` by ECO volume; columns `eco, name, pgn` (+ `uci`, `epd` in `dist/`); regenerate with `pip install chess && make`. Also on Kaggle and Hugging Face. Use `epd` to name the opening of any position in the app. The **Lichess opening explorer** (lichess.org/analysis → Database) and its public API give move-frequency and win-rate per rating band — useful to show a child "what people your level play here".

**Other CC0 Lichess data**: full game PGN dumps by month and 394 M Stockfish evaluations (JSONL) if you want engine-verified positions.

---

## 6. Age-appropriate explanation patterns (cheat sheet)

- **Piece stories (Story Time Chess, ages 3–7):** King Shaky (one nervous step; "afraid of grass"), Bea & Bop the circus bishops (slanted tightropes, each keeps its colour), knights "gallop, gallop, step to the side", pawns are the king's racing kids who never turn back, rooks run the straight castle walls. Story → drill → mini-game.
- **ChessKid (ages 6–12):** level names are pieces; lesson names are jokes ("Hungry Hungry Bishop", "Pawn Traffic Jam", "Rook Roller", "Cat and Mouse", "Great Escape", "Remove & Destroy"); every lesson = 2-min video + 5 interactive drills + puzzles; a fork is "a double attack by a single unit".
- **Steps Method (ages 6+, serious):** minimal words, one theme per page of 12 diagrams; "attack, capture, defend" before mate; recap box ("reminder") at the top of each page; teach *defending against* each tactic right after teaching it (Step 2 "defending against mate", Step 3 "defending against a double attack / a pin").
- **Polgar:** one-move checkmates sorted by mating piece before any tactic; "no take-backs — think before you move".
- **Universal metaphors that tested well across sources:** piece values as "points/candy", hanging piece = "free candy", pin = "stuck in the mud", skewer = "shish-kebab", back rank = "trapped behind your own wall, make a breathing hole", opposition = "staring contest, whoever blinks loses", square rule = "draw the box", outpost = "treehouse", open file = "highway", passed pawn = "no traffic ahead", CCT = "checks, captures, threats — say it out loud".

---

## 7. Sources

- Lichess open database (puzzles, games, openings; CC0): https://database.lichess.org/
- Lichess puzzle themes list: https://lichess.org/training/themes
- Lichess puzzle-theme source file: https://github.com/lichess-org/lila/blob/master/translation/source/puzzleTheme.xml
- Lichess forum, puzzle DB column meanings: https://lichess.org/forum/lichess-feedback/lichess-puzzle-database--meanings-of-the-columns
- Lichess puzzles on Hugging Face: https://huggingface.co/datasets/Lichess/chess-puzzles
- lichess-org/chess-openings (CC0 TSV): https://github.com/lichess-org/chess-openings
- Kaggle mirror of chess-openings: https://www.kaggle.com/datasets/lichess/chess-openings/data
- ChessKid: complete guide to all lessons: https://www.chesskid.com/learn/articles/lessons-guide-all-levels-topics
- ChessKid lessons hub: https://www.chesskid.com/learn/lessons
- ChessKid puzzles by theme: https://www.chesskid.com/learn/articles/chess-puzzles-by-theme
- Steps Method overview: https://www.stappenmethode.nl/en/the-steps.php
- Steps Method Step 1: https://www.stappenmethode.nl/en/step1.php
- Steps Method Step 2: https://www.stappenmethode.nl/en/step2.php
- Steps Method Step 3: https://www.stappenmethode.nl/en/step3.php
- Chess-Steps (English publisher): https://www.chess-steps.com/
- Story Time Chess review (Dad Suggests): https://www.dadsuggests.com/home/story-time-chess
- Story Time Chess review (Meeple Mountain): https://www.meeplemountain.com/reviews/story-time-chess/
- Susan Polgar Foundation free curriculum: https://susanpolgarfoundation.org/free-curriculum/
- Polgar, Learn Chess the Right Way Book 1 excerpt: https://lauren-moreno-ctja.squarespace.com/s/book1excerpt.pdf
- ChessGoals rating comparison: https://chessgoals.com/rating-comparison/
- CircleChess, USCF rating for kids parent guide: https://circlechess.com/blog/uscf-chess-rating-for-kids-complete-parent-guide-2026
- CircleChess, improving USCF rating as a beginner kid: https://circlechess.com/blog/how-to-improve-uscf-chess-rating-as-a-beginner-kid-2026
- Lichess forum, Lichess-to-USCF converter: https://lichess.org/forum/general-chess-discussion/lichess-to-uscf-rating-converter
- Attacking Chess, what's a good USCF rating: https://www.attackingchess.com/whats-a-good-uscf-rating-a-look-at-the-real-numbers/
- Wikipedia, Scholar's mate: https://en.wikipedia.org/wiki/Scholar%27s_mate
- ChessAtlas, best openings for beginners: https://chessatlas.net/blog/opening-guides/best-chess-openings-for-beginners-5-simple-systems-that-actually-work
- Wikipedia, Lucena position: https://en.wikipedia.org/wiki/Lucena_position
- Wikipedia, Philidor position: https://en.wikipedia.org/wiki/Philidor_position
- Wikipedia, Key square: https://en.wikipedia.org/wiki/Key_square
- Wikipedia, X-ray (chess): https://en.wikipedia.org/wiki/X-ray_(chess)
- Wikipedia, Interference (chess): https://en.wikipedia.org/wiki/Interference_(chess)
- Old School Chess, king and pawn endgames (FENs for opposition / square rule): https://oldschoolchess.com/learn/endgames/king-and-pawn-endgames
- Chess.com, square rule: https://www.chess.com/terms/square-rule-chess
- Acorn Chess mini-games: https://acornchess.com/minigames
- Little Chess Champs mini-games: https://www.littlechesschamps.com/mini-games
- Minichess UK, learning the Pawn Game: https://minichess.uk/2018/09/18/learning-the-pawn-game-1/
- Wisconsin Scholastic Chess Federation tournament rules: https://www.wisconsinscholasticchess.org/tournaments/tournament-rules/
- US Chess 2025-26 National Scholastic Regulations (PDF): https://new.uschess.org/sites/default/files/media/documents/us-chess-scholastic-regulations-2025-2026-2026.01.22-v2.1.pdf
- Cincinnati Scholastic Chess, essential tournament rules: https://www.chesscincinnati.com/wp-content/uploads/Essential-Rules-of-Tournament-Chess.pdf
- Wikipedia, Time control: https://en.wikipedia.org/wiki/Time_control
