# Teaching chess to children aged 5-12: what works and what keeps them coming back

Research notes for designing a web-app chess curriculum. Every claim is tied to a source in the Sources section; numbers in brackets refer to that list.

## 1. Established curricula and how they sequence things

### Dutch Steps Method (Stappenmethode, Brunia & van Wijgerden)

Step 1 has 15 lessons in this order: board and pieces; moves of the pieces; attacking and capturing; the pawn; defending; check and getting out of check; mate (1); mate (2); castling; profitable exchange; twofold attack; draw; mating with the queen; en passant; notation [1]. Step 1 is designed for ages 9+ and targets roughly a 800 rating; Steps 2-6 climb to about 2100 [1][3]. For ages 6-9 the same material is split into two "Stepping Stones" workbooks with bigger diagrams (six per page), almost no text, fewer pieces per position, "choose the safe route" exercises, and a re-ordered sequence: castling is moved between the two mate lessons and the twofold attack is pushed later and simplified [2].

Why this order? The authors deliberately postpone checkmate "as long as possible" and report that "practice has shown that this approach works perfectly" [1]. The trainer's manual explains the underlying theory: beginners have an empty long-term chess memory and must rely on working memory (4-7 items, ~30 seconds), so unguided play teaches wrong things alongside right ones; instruction, workbook practice and play are all necessary, and "Steps kids" out-played play-only children after one year [2]. Piece moves are taught "in the order of the difficulty they create for the students", starting with the rook [2]. The manual warns against rushing Step 1 in three months and recommends a full year, with lots of play (initially mini-games) even before all rules are known, because board vision ("is a piece hanging?") must be automatic before tactics like the double attack are worth teaching; one child may need 300 games, another 1000 [2]. Each lesson follows a fixed template: orientation and prior knowledge, acquisition (introduction, concepts, instruction, summary), practice (reminders, workbook, playing formats) and testing [2]. The manual also observes that for children capturing, not mating, is the real aim of the game at first ("Yes, but I've got your queen") - a hint that early goals should be capture-based [2].

### ChessKid

ChessKid's lesson ladder is Pawn -> Knight -> Bishop -> Rook -> Queen -> King. Pawn level (6 lessons): Meet the Rook, Bishop, Queen, King, Pawn, Knight - i.e., rook first, knight last, pawn fifth. Knight level: check, checkmate, stalemate. Bishop level: help needed for checkmate, king+queen mate, "rook roller". Rook level: castling, special pawn moves, back-rank mates, first moves (opening principles). Queen level (9 lessons): hanging pieces, counting, double attack, fork, pin, skewer, discovered attack, king+rook mate, "your opponent". King level: 41 lessons on phases of the game, passed pawns, opposition, endgames and strategy [4]. Every level requires three things: watch the intro video, pass test questions, and earn stars via puzzles or Fast Chess games [5]. The Classroom Planner's beginner track uses one lesson per week starting at Pawn 1, with each unit as a mini lesson plan plus optional activities [6].

### Lichess Learn

Lichess Learn (lichess.org/learn) is organised as categories -> stages -> levels. Stage order from the source code: Chess pieces (rook, bishop, queen, king, knight, pawn); Fundamentals (capture, protection, combat, check in one, out of check, checkmate in one); Intermediate (board setup, castling, en passant, stalemate); Advanced (piece value, check in two) [7]. Lichess describes it as "arranged sequentially from easier to harder" and deliberately gamified so learning is "more than just a dry recitation of rules"; each stage is played on a live board where wrong moves are corrected in real time, and levels are scored with stars [8][9]. Note the same "rook first, knight last, rules-of-check before board setup" ordering as ChessKid and the Steps method.

### Story Time Chess / Chess at Three (ages 3-8)

Every piece becomes a character with a backstory: pawns are the King's children who "love to race", knights Clip and Clop "gallop, gallop and step to the side", bishops are trapeze artists performing "The Great Diagonal", the queens are a best-friend-to-everyone and an architect [10]. One piece is introduced per story, and the book's 8 chapters each end with a mini-game - early ones non-competitive (racing pawns across the board), later ones competitive, covering attack, defence and evasion [10][11]. Classes run 45-60 minutes, opening with a story that introduces the concept, then practice games and skill activities [11]. The stated rationale is emotional engagement: characters make rules "fun, memorable, and emotionally engaging" [11]. One limitation from a parent review: a seven-year-old finished knowing the moves but without strategic depth [10]. Level 2 and 3 expansions add strategy and tactics [12].

### Magnus' Kingdom of Chess (now also Kahoot! Learn Chess: DragonBox)

An adventure/RPG in which the player starts as a lone king (one step any direction), collects keys to free caged pieces one at a time, and must switch to the right piece for the terrain (knight to hop a gap, bishop to attack diagonally). Rule "cards" scattered through the map teach check, checkmate and strategy in context; battles start on tiny boards and grow to full 8x8 games across six worlds, ending with a complete game [13][14]. A reviewer's 5-year-old needed help but was engaged enough to demand real games afterwards; the 11-year-old progressed smoothly [13].

### Chess.com Solo Chess

A single-player capture puzzle: every move must capture, no piece may capture more than twice (it turns black after two), and if a king is present it must be the last piece standing; difficulty rises by adding pieces [15]. It is a pure piece-movement and visualisation drill that needs no opponent and no knowledge of check, which makes it a good post-"how pieces move" activity.

### Chess in Schools and Communities (CSC, UK)

A 30-lesson whole-class curriculum for KS2 (ages 7-11), three terms of ten lessons, each with a lesson plan, worksheet and handout, and all diagrams available as Lichess studies [16][17]. The EEF evaluation describes the sequence: taught piece by piece, visualisation of moves required from lesson 2, check and checkmate introduced by lesson 10, complete games by the end of term 1; tutors are told to talk no more than 15 minutes before children practise in pairs on a shared set [18]. Lesson 12 ("The Value of the Pieces") shows the template: starter recap, Socratic explanation (ask children to guess and justify values), two demo positions, worksheet plus paired games with a specific job ("count who is ahead on points"), plenary, and an optional "Chess Maths" game [19]. CSC later added a Kahoot! quiz per lesson, using chess diagrams as answer options so non-readers can take part [20].

### US Chess "Chess in Education" and FIDE

US Chess's CIE committee curates K-5 / 6-8 / 9-12 resources and frames chess as an educational tool with deliberate transfer to maths, literacy and other subjects rather than as a competitive pipeline [21][22]. FIDE's "Learning in Play" guide (144 pages) follows the same "children learn through play" philosophy with 150+ cross-curricular activity ideas [23].

### Susan Polgar

Her free 62-page curriculum (USCF-approved, requested by 20,000+ coaches) covers history of chess, notation, check and checkmate, opening principles and tactics, and stresses "no take-backs ... think before you move"; lesson goals start with exciting kids about the game and its history [24][25].

**Consensus sequence across curricula:** board -> pieces one at a time (rook first, knight last, pawn late because of its many special rules) -> capture/attack -> defence -> check -> checkmate -> stalemate/draws -> castling and en passant -> piece values and profitable exchanges -> basic mates (K+Q, K+R) -> tactics (hanging pieces, fork, pin, skewer) -> opening principles -> endgames. Checkmate is consistently delayed until movement and capture are fluent.

## 2. Mini-games and the stage they fit

- **Pawn Wars / Pawn Battle** (pawns only; first to promote or capture all wins). Universally the first game; kids as young as 4-5 can play it, and classrooms of seven-year-olds "start with pawns" [26][27]. Acorn's version keeps promotion off and en passant out at first [28]. Little Chess Champs rates it Beginner (5-8) [29].
- **Capture the Flag** (ChessKid: all pieces minus kings; win by promoting a pawn, capturing everything, or mate). Recommended right after pawns because "the pawn is the most tricky to learn" and it lets children play a full-board game without the pressure of check rules [30][31].
- **King & Pawn War**, then **Tom and Jerry / Queen vs 8 pawns**, **Rook vs 5 pawns**, **Bishop vs 3 pawns**, **2 Knights vs 3 pawns**: "pawns vs a piece" games introduce one piece's power at a time and naturally teach forks and double attacks [28][29][30].
- **Mazes and "choose the safe route"**: move a single piece through enemy attacks to a target square - Acorn Chess uses these as intermediate drills; the Steps Stepping Stones use the same idea on paper [2][28].
- **Solo Chess / Pawn Mower**: capture-every-move puzzles for visualisation, no opponent needed [15][28].
- **King Hunt** (full army vs lone king, or the "parachute" variant where you add a piece each turn but it must give check): teaches checkmate patterns; Little Chess Champs places it last (11+), and it should follow, not precede, the check lesson [26][29].
- **Checkmate-in-one races / Puzzle Duel / Puzzle Rush**: ChessKid's Puzzle Duel is a 2-minute head-to-head puzzle race [32]. Chess.com's Puzzle Rush (5 minutes, 3 strikes) is reported as discouraging for true beginners who get only 1-3 right, so it should be introduced only after mate-in-one is solid and with a low difficulty cap [33].
- **Setup races** (rebuild the starting position fastest) and **Kahoot-style diagram quizzes** for the whole-class or app-review slot [20][28].

Coaches summarise the principle: mini-games "keep the board smaller, the goal clearer, and the emotional pressure lower than a full game", turning one skill at a time into a short, winnable challenge [27][28].

## 3. What the research says makes instruction stick

- **Dose and duration matter more than intensity.** Sala & Gobet's meta-analysis (24 studies, 40 effect sizes) found d = 0.38 for maths and 0.34 for cognitive ability, rising with training hours; 25-30 hours ("a lesson per week during the school year") is "probably the minimum threshold" [34][35]. The Steps manual independently says to plan a year for Step 1 [2].
- **But beware the placebo.** Almost no chess studies used active controls; the UK RCT of CSC (100 schools, 4,009 Year 5 pupils) found an effect of 0.01 on maths one year later [18][35]. So "chess makes kids smarter" is not a claim an app should lean on; "chess is a game kids love learning" is safer.
- **Talk less, play more.** In the same RCT, what pupils liked most was "playing games of chess with their friends", and what they liked least was tutors "talking too much" [18]. CSC caps tutor talk at 15 minutes per 60-minute lesson [18].
- **Spacing and retrieval practice** are the two techniques rated most effective across educational psychology (Dunlosky et al. 2013; Cepeda et al. 2006), demonstrated in primary classrooms [36][37][38]. Chessable's MoveTrainer applies this to chess, quizzing moves at expanding intervals and resetting on errors [39][40]; Duolingo's chess course also uses a spaced-repetition algorithm [41].
- **Immediate, kind feedback.** Lichess Learn corrects wrong moves in real time [9]; Dr. Wolf comments on every move, remembers mistakes and re-drills them, sometimes flipping the board so the learner discovers the error [42][43]. ChessTech notes this per-move feedback avoids information overload for beginners [43].
- **Stories and characters aid recall** through emotional engagement and familiar narrative structure, an effect Story Time Chess relies on and one supported by memory research and classroom storytelling studies [11][44][45].
- **Physical vs digital**: parent and coach guides converge on a hybrid - a physical set for peer play and longer study, apps for short, frequent tactical sessions and instant feedback; both stress that daily short practice between lessons is what makes ideas stick [46][47].
- **Gamification** (points, levels, badges) raises engagement and motivation in primary-school studies, but reviews attribute the effect to holistic design and novelty rather than any single mechanic, so rewards must be paired with real learning [48][49].

## 4. What ChessKid, Lichess and Duolingo-style apps actually do for retention

**ChessKid.** Stars are earned automatically for every activity (lessons, puzzles, Fast Chess, Slow Chess, bots, daily quests) and "are never lost or deducted; they only increase"; Gems are a separate cosmetic currency spent in the Avatar Shop and cannot be bought with money [50]. Fast Chess awards stars to the loser too ("you also earn Stars for just playing") and each correct puzzle earns 3 stars [51]. Customisable avatars are unlocked with stars/gems, and ChessKid explicitly ties self-expression to kids "stay[ing] excited about playing chess" [50][52]. Feature set: Fast and Slow Chess against friends, bots with chess personalities and a coaching mode, an unusually large puzzle library, Puzzle Duel (2-minute races), Puzzle Themes, Workouts (checkmate/endgame drills), Vision (notation/board-vision game), hundreds of videos with subtitles, and a separate Adventure app with 6 quests and 200+ mini-challenges for younger kids [32]. Levels give coaches a visible skill icon next to each student's name and a class overview page [5]. Gold membership unlocks unlimited puzzles and videos [51].

**Lichess Learn.** Piece-by-piece stages, each with several short levels played on a live board, star ratings per level, sequential unlocking from easy to hard, all free and ad-free [7][8][9].

**Duolingo Chess.** Bite-sized lessons (~75% puzzles, the rest mini and full matches) guided by the character Oscar, who tutors, hints and reacts to good moves; scaffolded from "move your bishop here" to "find mate in two"; 15-minute adaptive matches against Oscar; spaced repetition; a goal of 1500 Elo [41][53]. Reviews say it is excellent for absolute beginners and useless beyond that [54].

**Chessable** turns books into interactive courses where you read a note, replay the move, and get quizzed on a spaced schedule [39][40]. **Chess Universe** is heavily gamified (daily quests, gold/gems, unlockable characters) but reviewers call its instruction "gamified repetition with little to zero actual instruction" - a cautionary example [55]. **Kahoot!** quizzes with diagram answers work well for whole-class review [20]. **Dr. Wolf** models the "coach who talks to you during play" pattern [42][43].

## 5. Session length, attention, and concepts per lesson

- A common child-development rule of thumb is 2-3 minutes of focused attention per year of age; sustained attention grows fast from 5-6 to 8-9 and plateaus through 11-12 [56].
- Coach guidance by age: ages 4-6 -> 5-10 (at most 10-15) focused minutes, pieces and captures via mini-games, no full games, no long explanations; ages 7-9 -> 10-20 (up to 30) minutes, basic mates, forks/pins, "is my piece safe?" habit; ages 10-12 -> 20-40 minutes best split into parts (up to 45 if motivated), two-move tactics, simple plans, one-lesson game reviews [57][58].
- Structured group programs: 30-45 minutes, 4-8 kids, hands-on; over 45 minutes leads to disengagement [56]. School programs with mixed activities run 45-60 minutes (Story Time Chess, CSC), but with talk capped at ~15 minutes [11][18].
- **One rule per session, revisited next time**, holds attention far better than a 30-minute sit-down lesson [56]. CSC introduces exactly one new idea per lesson with 3-5 new vocabulary words [19]; Steps subdivides themes further for 6-9-year-olds "to make what is being taught more accessible" [2]; ChessKid runs one lesson per week in its beginner track [6].
- Weekly volume: ages 7-9, 2-3 games and 5-10 simple puzzles; ages 10-12, 3-4 games and 10-15 puzzles spread across the week plus one reviewed moment per game; "consistency beats intensity" and sessions should end "while the child is still enjoying chess" - or, as one coach puts it, while they still want one more game [58][59].

## Design implications for a web app (summary)

1. Sequence: board -> rook, bishop, queen, king, knight, pawn (each with a solo drill and a mini-game) -> capture -> protect -> check -> out of check -> mate in one -> stalemate -> castling/en passant -> values -> basic mates -> tactics. Delay checkmate; make early goals capture- and race-based.
2. Every lesson = one concept, 5-10 minutes for ages 5-7, up to 20 for 8-12, ending in a playable mini-game.
3. Gate progress ChessKid-style (short explainer -> quiz -> earn stars by playing), with stars that never decrease and cosmetic-only spending.
4. Correct wrong moves instantly on a live board (Lichess/Dr. Wolf), and schedule spaced review of earlier stages (Chessable/Duolingo).
5. Wrap pieces in characters and stories for the youngest band, and add short, whole-family-friendly diagram quizzes for review.
6. Hold puzzle races back until mate-in-one is reliable, and cap difficulty so beginners score.

## Sources

1. https://www.stappenmethode.nl/en/step1.php
2. https://www.stappenmethode.nl/en/lp/en_lp_h1.pdf (Step 1 trainer's manual, Brunia & van Wijgerden)
3. https://nextlevelchess.com/steps-method-explained/
4. https://www.chesskid.com/learn/articles/lessons-guide-all-levels-topics
5. https://www.chesskid.com/learn/articles/new-chesskid-feature-release-levels
6. https://www.chesskid.com/learn/articles/how-to-use-the-chesskid-classroom-planner
7. https://raw.githubusercontent.com/lichess-org/lila/master/ui/learn/src/stage/list.ts
8. https://lichess.org/@/lichess/blog/something-for-the-beginners/V5EX3CgA
9. https://lichess.org/learn and https://nextlevelchess.com/lichess-101-a-comprehensive-grandmaster-guide-3/
10. https://www.meeplemountain.com/reviews/story-time-chess/
11. https://www.storytimechess.com/faq
12. https://www.prnewswire.com/news-releases/story-time-learning-adds-new-story-time-chess-level-2-and-3-game-expansions-on-demand-video-lessons-to-its-award-winning-learning-system-301683466.html
13. https://geekdad.com/2018/07/magnus-kingdom-turns-chess-into-an-adventure-game/
14. https://play.google.com/store/apps/details?id=com.kahoot.chess&hl=en_US
15. https://support.chess.com/article/289-what-is-solo-chess-how-do-i-play
16. https://www.chessinschools.co.uk/csc-curriculum-lessons
17. https://chess.co.uk/products/chess-in-schools-and-communities-curriculum
18. https://files.eric.ed.gov/fulltext/ED581100.pdf (EEF, Chess in Schools evaluation, 2016)
19. https://static1.squarespace.com/static/66a0db373ce1973b3928072a/t/67b31ba39261f75b2d1b0441/1739791268498/CSC+Curriculum+-+Lesson+12.pdf
20. https://www.chesstech.org/2021/because-kids-love-quizzes/
21. https://new.uschess.org/cie-charter
22. https://chessineducation.org/introduction-to-chess-in-education/
23. https://eduarchive.fide.com/learning-in-play-a-guide-to-chess-teaching-in-schools/
24. https://susanpolgarfoundation.org/free-curriculum/
25. https://www.chess-game-strategies.com/kids-chess-guide-susan-polgars-free-chess-training-guide-curriculum/
26. https://www.chessworld.net/chessclubs/openingguide/fun-chess-activities-for-kids.asp
27. https://www.chess.com/forum/view/scholastic-chess/mini-chess-games
28. https://acornchess.com/minigames
29. https://www.littlechesschamps.com/mini-games
30. https://www.chesskid.com/article/view/walk-before-you-run
31. https://masterchess.org/blogs/news/more-mini-games-for-beginners-and-their-parents
32. https://www.chesskid.com/learn/articles/complete-guide-to-chesskid
33. https://www.chess.com/forum/view/for-beginners/puzzle-rush-for-true-beginners
34. https://www.sciencedirect.com/science/article/pii/S1747938X16300112 (Sala & Gobet 2016 meta-analysis)
35. https://pmc.ncbi.nlm.nih.gov/articles/PMC5322219/ (Sala & Gobet 2017, state of the art)
36. https://www.yorku.ca/ncepeda/publications/CPVWR2006.html (Cepeda et al. 2006)
37. https://www.researchgate.net/publication/290511665_Spaced_Repetition_Promotes_Efficient_and_Effective_Learning_Policy_Implications_for_Instruction
38. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12372469/ (retrieval practice in primary schools)
39. https://www.chessable.com/movetrainer/
40. https://support.chessable.com/en/articles/9043598-how-does-the-spaced-repetition-scheduling-work
41. https://blog.duolingo.com/chess-course
42. https://apps.apple.com/us/app/learn-chess-with-dr-wolf/id1353041020
43. https://www.chesstech.org/2020/teaching-through-play/
44. https://www.edutopia.org/article/neuroscience-narrative-and-memory/
45. https://journals.sagepub.com/doi/10.1177/21582440241271267
46. https://kaabilkids.com/blog/daily-chess-practice-routine-for-kids/
47. https://shop.worldchess.com/blogs/news/best-chess-app-for-kids
48. https://journals.sagepub.com/doi/10.1177/10468781241237389
49. https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2024.1466926/full
50. https://support.chesskid.com/en/articles/12552532-how-do-stars-and-gems-work-on-chesskid
51. https://www.uscfsales.com/blogs/chess-technology/chesskid-the-complete-guide
52. https://www.chesskid.com/learn/articles/chesskid-customizable-avatars-are-here
53. https://duolingo.fandom.com/wiki/Chess
54. https://davidwilliamrosales.com/2025/08/18/duolingo-chess-review/
55. https://apps.apple.com/us/app/chess-universe-play-online/id1487204900?see-all=reviews&platform=ipad
56. https://shop.worldchess.com/blogs/news/how-to-teach-kids-chess
57. https://www.chessworld.net/chessclubs/openingguide/chess-for-kids-age-guide.asp
58. https://www.chessworld.net/chessclubs/openingguide/kids-chess-learning-plan.asp
59. https://circlechess.com/blog/online-chess-classes-for-5-year-old/
