# Openings, tactics and mates: what to build and why

Research for the request: "Is there a place in the chess club where a player can
learn about famous openings, endings and strategies — Italian Game, King's
Gambit, Ruy Lopez, defences such as the Sicilian? Maybe a section for more
advanced players. With a fun section: mate in 3, in 4, in 5. Find at least 100
tactics to teach and the best way to present them."

## What is already there

Answering the question first, honestly. The Chess Club has 52 lessons, and
openings appear in four of them:

- `l2-opening` — the principles: centre, develop, castle.
- `l2-italian` — the Italian Game, four moves deep.
- `l2-london` — the London System as a "same house every game" setup.
- `l3-white` / `l3-black` — a tiny repertoire: one answer to each first move.

There is **no library of named openings**. Nothing about the Ruy Lopez, the
Sicilian, the French, the Caro-Kann, the King's Gambit, the Queen's Gambit or
the Scandinavian. There is no way to look one up.

Tactics are taught as twelve lessons and thirteen puzzle themes. There are
**no mate-in-3, -4 or -5** puzzles: the puzzle build caps every solution at
seven plies, which excludes them by construction.

So the answer to "is there a place" is: partly, and not the part that was
asked about.

## Finding 1 — principles first, lines second, and never a wall of moves

This is the one point every source agrees on, and it decides the shape of the
whole feature.

> "A child who understands why you take the centre will produce a reasonable
> move in a position they have never met. A child working from a memorised
> list will not."

The consistent coaching advice is: opening principles first; then ONE opening
as White and one or two as Black; then, and only then, named lines. Memorised
lines make a young player rigid — they play the moves and then have no idea
what to do on move nine.

**What that means here.** An openings library must not be a move dump. Every
opening gets:

1. **The first moves**, playable on the board, one at a time.
2. **The idea, in one sentence** — what this opening is trying to DO.
3. **When to choose it** — the honest answer, including "this one is sharp,
   leave it until later".
4. **The trap** — the mistake people actually make against it, and how to
   punish it. Traps are the part children remember, and they teach the idea
   sideways.
5. **How to meet it** — because half the time they will be on the other side.

Point 5 is the one most opening resources skip, and it is exactly what was
asked for ("how to protect against them").

## Finding 2 — traps are the way in

Teaching opening traps works for children who know the rules and are learning
the principles: they learn not to make the mistake, and they learn to punish
it. The best traps punish natural-looking moves — greedy captures, loose
development, a careless pin. The goal is understanding **why the losing move
looked tempting**, not remembering a sequence.

The Chess Club already proves this works: `l2-scholar` (beat the four-move
mate) and `l2-game` (the bait queen) are both trap lessons.

## Finding 3 — the opening set

From the coaching sources, and from the world-champion table the request
included, the set below covers what a child will actually meet. Order is by
how soon a child needs it, not by fashion.

**As White, after 1.e4 e5**
- Italian Game — already taught; keep it as the anchor.
- Ruy Lopez — the most-played first opening of nearly every world champion.
- Scotch Game — simple, open, good for a child who likes pieces out fast.
- King's Gambit — the romantic one. Historical, fun, and honestly risky.

**Defences to 1.e4**
- Sicilian — the most popular answer in the world. Sharp; flag it as such.
- French — solid, and it teaches pawn chains better than anything else.
- Caro-Kann — the safe one. Solves the light-squared bishop problem.
- Scandinavian — the easiest for a beginner to play well immediately.
- Petrov — the copycat defence, and a lesson in symmetry.

**Queen's pawn**
- Queen's Gambit — declined and accepted.
- Slav — the other solid answer.
- King's Indian — the counter-attacking one, for later.
- London System — already taught.

**Others worth knowing by name**
- English Opening — three world champions in the table used it.
- Réti — the newest of the champions' choices.
- Vienna Game — Steinitz's.
- Evans Gambit — Morphy's.

Sixteen openings plus the two already taught. Every opening in the request's
table is covered.

## Finding 4 — 100+ tactics, without inventing any of them

The Lichess puzzle database tags every puzzle with themes, and the theme list
is far larger than the thirteen currently used. Everything below is already in
the CC0 data the build script reads.

**Mate in N (5)** — mateIn1, mateIn2, **mateIn3, mateIn4, mateIn5**. The
requested "fun section" is three theme files away.

**Named mate patterns (20)** — anastasiaMate, arabianMate, backRankMate,
balestraMate, blindSwineMate, bodenMate, cornerMate, doubleBishopMate,
dovetailMate, epauletteMate, hookMate, killBoxMate, morphysMate, operaMate,
pillsburysMate, smotheredMate, swallowstailMate, triangleMate, vukovicMate.
Each is a shape with a name, which is exactly how `l3-patterns` says pattern
recognition works.

**Tactical motifs (~30)** — advancedPawn, attraction, capturingDefender,
clearance, defensiveMove, deflection, discoveredAttack, discoveredCheck,
doubleCheck, exposedKing, fork, hangingPiece, interference, intermezzo,
kingsideAttack, pin, promotion, queensideAttack, quietMove, sacrifice,
skewer, trappedPiece, underPromotion, xRayAttack, zugzwang, advantage,
crushing, equality, capturingDefender, collinearMove.

**Endgames (6)** — bishopEndgame, knightEndgame, pawnEndgame, queenEndgame,
queenRookEndgame, rookEndgame.

**Phase (3)** — opening, middlegame, endgame.

That is **60+ named ideas**, each with hundreds of real positions behind it,
and each position is a mistake a human actually made. Counting the individual
patterns a child meets — every distinct mating net, fork geometry and
endgame technique inside those themes — comfortably exceeds a hundred.

**The one blocker.** `tools/build_puzzles.mjs` sets `MAX_PLIES = 7` for every
theme. A mate in 4 needs 9 plies and a mate in 5 needs 11, so the current
filter silently excludes them. The cap has to become per-theme.

## Finding 5 — how to present it

Three surfaces, not one.

**A library you can look things up in.** Openings, browsable by name, with the
world-champion table's own framing: this is what Fischer played. Children like
knowing a thing has a history.

**A grouped tactics wall.** Thirteen flat cards already strains the page.
Sixty needs families: *Sharp tactics*, *Mating patterns*, *Mate in N*,
*Endgames*. Grouping is what makes a big library feel smaller.

**The mate-in-N ladder as the fun bit.** Mate in 1 is already there and easy.
Mate in 2 exists. Adding 3, 4 and 5 turns a scatter of themes into a ladder
with a top, which is a much better shape for a child than a longer list.

## What this becomes

- `data/chess/openings.json` — 16 openings, each with moves, idea, when to
  play it, a trap, and how to meet it.
- A new route, `#/chess/openings`, and a screen that replays a line move by
  move (the lesson player already has this: the `game` step type).
- Puzzle themes grown from 13 to ~40, grouped into families.
- `mateIn3`, `mateIn4`, `mateIn5` built with a per-theme ply cap.

## Sources

- [Memorizing Chess Openings vs. Understanding Principles — Chess.com](https://www.chess.com/blog/OnlineChessTeacher/memorizing-chess-openings-vs-understanding-principles)
- [Should young children learn chess openings? — chessed.me](https://www.chessed.me/blog/should-young-children-learn-chess-openings)
- [The 4 Golden Rules of Chess Openings — Chess Trainer](https://chesstrainer.org/resources/guides/chess-opening-principles)
- [The Best Chess Openings For Beginners — Chess.com](https://www.chess.com/article/view/the-best-chess-openings-for-beginners)
- [Three Great Chess Openings for Beginners — Silver Knights Chess Academy](https://chessacademy.com/blogs/openings/three-great-chess-openings-for-beginners)
- [A Famous Opening Trap — ChessKid](https://www.chesskid.com/learn/articles/a-famous-opening-trap)
- [Chess Traps Trainer — Chess Trap Guide](https://chesstrapguide.com/)
- [The Sicilian Defence — chesskids.org.uk (PDF)](http://www.chesskids.org.uk/grownups/sicilian06.pdf)
- [Caro-Kann Defense: Complete Opening Guide — TheChessWorld](https://thechessworld.com/articles/openings/caro-kann-defense-complete-opening-guide/)
- [French Defense — CHESS KLUB](https://chessklub.com/chess-openings/french-defense/)
- [Lichess puzzle theme definitions (source of the theme list)](https://raw.githubusercontent.com/lichess-org/lila/master/translation/source/puzzleTheme.xml)
