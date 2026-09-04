# Getting a child ready for a US Chess tournament

Research for: "Create a section to prepare the child for a tournament using the
rules from the US Chess Federation, same as all the other platforms. Make it
fun and interactive. Do a deep research as well."

## The source

Everything here is from the **US Chess Federation's Official Rules of Chess,
7th edition, version 1-1-24**, read directly rather than from a summary. Rule
numbers below are quoted from that document, and the section in the app cites
them so a parent can check any answer.

The rulebook PDF is linked in the sources at the bottom. Chapters 9 to 14 —
the move, the touched piece, illegal positions, check, the decisive game and
the drawn game — are the ones a scholastic player meets.

## What was already there

One lesson, `l3-tournament`, eight steps. It is broadly right and it is not
US Chess: it says **"ask the arbiter"**, which is the FIDE word. US Chess has
a **Tournament Director**, a TD. A child who puts their hand up at a US
tournament asking for an arbiter is asking for somebody who is not there.

It also stops at touch-move, "I adjust", notation and handshakes. Nothing
about the clock, the flag, claiming a draw, what to do when a piece falls
over, or what actually happens on the day.

## Finding 1 — the rules a child actually needs, with numbers

These are the ones that decide games at scholastic events. Each is quoted or
closely paraphrased from the rulebook.

**Touching pieces**
- **10A** — a player *on the move* who **first** says they are adjusting
  (*j'adoube* or "I adjust") may straighten pieces. Say it first, not after.
- **10B** — deliberately touching a piece means moving it, if it can move.
  The rulebook's own TD TIP flags this as the commonest scholastic dispute.
- **10D** — if no touched piece has a legal move, the player is free.
- **10G** — let go on a legal square by accident and it stays there.
- **10H** — no penalty for touching a piece that is **off** the board. A child
  who picks up a queen to promote is not committed until it touches the square.
- **10J** — a touch-move claim must be made **before** you touch a piece
  yourself.

**When something goes wrong**
- **11A** — an illegal move found within the last ten moves: put the position
  back. Clocks are not adjusted.
- **11B** — found later than that: it stands, and the game goes on.
- **11D** — completing an illegal move by pressing the clock carries the
  standard penalty.
- **11C** — knocking pieces over is treated as an illegal move, and the player
  must put them back **on their own clock**.
- **11I** — spectators must not point out illegal moves. That includes parents.

**Check and mate**
- **12F** — **saying "check" is not required.** Children believe the opposite
  almost universally.
- **13A** — checkmate ends the game immediately, and anything after it,
  including a flag falling, is irrelevant.

**The clock**
- **5H / 5I** — you press the clock after moving; you may **stop** both clocks
  to make a claim or fetch the TD. The rulebook's TD TIP: stop the clock on
  **your own** time, not your opponent's.
- **13C1** — **only the players may call a flag.** Not the TD, not a spectator.
  A parent who points at a fallen flag can be disciplined, and their child's
  game can be affected.
- **13C5** — to claim a win on time: stop both clocks and say the claim.
- **13C13** — a player whose own flag has fallen cannot win on time.
- **14E** — you cannot win on time if you have only a lone king, or king and
  one minor piece, and no forced win. It is a draw.

**Draws**
- **14B1** — offer a draw **after you move and before you press the clock**.
- **14B5** — repeated offers can be penalised as annoying the opponent.
- **14C** — three occurrences of the same *position* — not "three checks", not
  "repetition of moves". Claimed only by the player **on the move** (14C3).
- **14C2** — how: write the move, do not play it, stop both clocks, state it.
- **14D** — insufficient material: K v K, K v K+B, K v K+N, K+B v K+B on the
  same colour.
- **14F** — fifty moves by each side with no capture and no pawn move.
- **A wrong claim costs two minutes** — 14C6 and 14F2 both add two minutes to
  the opponent.

**Notation**
- **15A** — you must write your moves down when each player has **30 minutes
  or more**. Under that, you need not.
- In time pressure — under five minutes left — neither player has to write.
  But then a draw claim becomes very hard to prove.

**Arriving**
- **13D** — more than **one hour** late, or after your time runs out,
  whichever comes first, and the game is lost.

## Finding 2 — how to present it: scenarios, not a rulebook

Nobody learns rules from a list of rules, and a child certainly does not. What
works, and what every other platform does, is **the situation first**:

> "You let go of your knight on a square. Then you see it loses your queen.
> What now?"

Pick an answer, find out, and *then* see the rule number. The rule becomes the
explanation for something that already happened, which is how the Chess Club
teaches everything else — `l2-scholar` and `l3-patterns` both work this way.

The rule number matters even though a child will not read it: it is there so a
parent, a coach or a TD can check the app is not making things up.

## Finding 3 — the day itself is half the fear

Rules are the easy part. What a first-timer actually worries about is not
knowing what happens: where to stand, how to find the board, what the pairing
sheet is, whether to shake hands, who to tell when you have won.

That is a walkthrough, not a quiz, and it belongs first.

## What this becomes

`data/chess/tournament.json`, and a route at `#/chess/tournament`:

1. **The day** — arriving, the pairing sheet, finding your board, colours,
   the handshake, playing, reporting the result, waiting for the next round.
2. **Five drill sets**, each a run of scenarios with a score at the end:
   *Touching pieces*, *The clock*, *When it goes wrong*, *Draws and endings*,
   *Being a good opponent*.
3. **What to bring** — the kit list.

Every drill carries its rule number.

## Sources

- [US Chess Federation's Official Rules of Chess, 7th edition (chapters 1-2, 9-11), v1-1-24 — the primary source, read directly](https://new.uschess.org/sites/default/files/media/documents/us-chess-rule-book-online-only-edition-chapters-1-2-9-10-11-2024.pdf)
- [US Chess rulebook, chapter 1 (alternative posting)](https://new.uschess.org/sites/default/files/media/documents/us-chess-rule-book-online-only-edition-chp-1-8-24-20.pdf)
- [Just the Rules: Optional Notation? — US Chess](https://new.uschess.org/news/just-rules-optional-notation-quiz)
- [Touch-move Rule — Judit Sztaray, Chess.com](https://www.chess.com/blog/JuditSztaray/touch-move-rule-the-one-that-creates-good-content)
- [Understanding Chess Tournament Rules (IU13, scholastic handout)](https://www.iu13.org/wp-content/uploads/2020/10/Understanding_Chess_Tournament_Rules.pdf)
- [How Chess Tournaments Work — Chess Tournament Guide](https://chesstournamentguide.com/tournament-guide/how-chess-tournaments-work/)
