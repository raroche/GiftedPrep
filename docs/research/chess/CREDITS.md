# Chess Club: what we did not make ourselves

Everything listed here is redistributed under a licence that allows it, and
every file lives in this repository rather than being fetched from someone
else's server. The site makes no third-party requests, so an offline iPad and
a school network behave the same as a home one.

## The rules

**chess.js 1.4.0** by Jeff Hlywa, BSD 2-Clause.
`assets/js/vendor/chess.js`, taken verbatim from
<https://cdn.jsdelivr.net/npm/chess.js@1.4.0/dist/esm/chess.js>.
Upstream: <https://github.com/jhlywa/chess.js>.
The copyright notice sits inside the file and must stay there.

It generates legal moves, validates them, reads and writes FEN and PGN, and
decides check, checkmate, stalemate, the fifty-move rule and repetition. It
is not the bot: the bot is ours, in `assets/js/modules/chessbot.js`.

## The pieces

**cburnett** by Colin M.L. Burnett, from Wikimedia Commons. The set is
multi-licensed GFDL / CC BY-SA 3.0 / GPLv2+ / **BSD 3-Clause**, and it is the
BSD 3-Clause option we rely on, which asks for the copyright notice and no
endorsement claim. Files:
<https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces>
(`Chess_klt45.svg` and its eleven siblings).

The drawings are in `assets/js/modules/chesspieces.js` as SVG symbols. Two
changes were made and no others: the XML wrapper was removed so each drawing
could become a `<symbol>`, and every `style="fill:#fff; ..."` attribute was
rewritten as ordinary SVG attributes (`fill="#fff"`). That second change is
not cosmetic. The site sends `style-src 'self'` with no `unsafe-inline`, and
under that policy a browser deletes `style` attributes without saying
anything, so the original files would have drawn twelve black silhouettes in
production and looked perfect on a local server.

Copyright (c) Colin M.L. Burnett. Neither the name of the author nor the
names of contributors are used to endorse this project.

## The puzzles

**Lichess puzzle database**, CC0 (public domain dedication).
<https://database.lichess.org/>

The full dump is about six million puzzles and is not in this repository.
`tools/build_puzzles.mjs` filters a locally downloaded copy down to a few
thousand suitable for children and writes `data/chess/puzzles/*.json`. The
dump date used is recorded at the top of each generated file.

## The openings

**lichess-org/chess-openings**, CC0.
<https://github.com/lichess-org/chess-openings>

A few dozen named openings are taken from the TSV files and stored as move
lists in `data/chess/openings.json`.

## Everything else

The board, the bot, the lessons, the mini-games, the artwork around the board
and every word a child reads were written for this project.
