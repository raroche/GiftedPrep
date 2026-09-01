<div align="center">

<img src="assets/img/favicon.svg" width="72" alt="">

# CurioZoo

**Screen time that makes you think.** A place for curious kids: real
mathematics, games that are actually puzzles, and practice for the tests
Florida districts use to screen for gifted programs.

no login · no tracking · no ads · nothing sent anywhere

</div>

---

## What this is

A free, single-page web app for a child who would rather work something out
than watch another video. It started as gifted-test practice and grew past it;
that practice is now one section among several, and more are planned.

Everything explains itself afterwards, in words a six-year-old can follow.

`app.js` is the shell: the theme, the router, one delegated listener and boot.
Each room owns its screen under `assets/js/screens/`, shared state lives in
`modules/shell.js`, and the rules a room needs live in `modules/` next to their
tests. The import graph runs one way — app imports screens, screens import
shell, shell imports neither — and `tools/archcheck.mjs` fails the build on a
cycle, because a cycle in ES modules does not fail at parse time; it hands you
`undefined` at call time, in one branch, on a route nobody clicked.

Sections are declared in one list, [`sections.js`](assets/js/modules/sections.js).
The home page, the room banners and `tools/roomcheck.mjs` all read from it, so
adding a section is an entry in that list and a module — not a new screen in
`index.html`, a new branch in the router and a new colour somewhere in the CSS.

Each room has its own colour from the palette and its own creature. The
creatures are all the logo wearing different ears: eight unrelated animal
drawings would look like clip art, whereas one shape in eight hats reads as a
family, and a child recognises the eyes from the top bar.

| Room | What it is |
|---|---|
| **Math Lab** | 86 topics and 609 exercises across grades 1–6. Real mathematics — primes, symmetry, graph colouring, the pigeonhole principle — not worksheets |
| **Fun and games** | Games for memorising. Name the Flag (250 flags) and Name the Country (242 outlines, type the answer in English or Spanish) |
| **Test Practice** | 1,576 questions in the shapes used by the CogAT, NNAT and OLSAT, grades 1–4 |

The gifted practice is built for **familiarization, not coaching** — a
distinction the research takes seriously, and so does this project. See
[the honest bit](#the-honest-bit-about-test-prep) below.

There is also a [**Parent Guide**](assets/js/modules/parents.js) inside the app:
what the tests are, what Florida actually requires, how the scores work, and an
evidence-based plan for the week before test day.

## Quick start

The repository root **is** the site. There is no build step and no dependencies.

```bash
git clone https://github.com/raroche/GiftedPrep.git
cd GiftedPrep
npm run serve
```

Then open <http://localhost:8765>.

> `npm run serve` runs `tools/serve.py`, which sends the **same
> Content-Security-Policy Netlify does**. Use it rather than
> `python3 -m http.server`. A plain server sends no CSP, and that gap once hid
> a real bug all the way to production: `style="..."` attributes are silently
> discarded under `style-src 'self'`, so the map-colouring grid collapsed and
> the results bars drew at zero width, while everything looked perfect locally.

Before pushing:

```bash
npm run verify
```

That parses every JS and JSON file, validates all 1,576 questions, runs the
duplicate and rule scanners, checks the Math Lab, **recomputes every
mathematical answer from first principles**, checks the flag data against the
image files, and runs the unit tests. Netlify runs the same command, so a
syntax error or a wrong answer fails the deploy instead of reaching a child.

### Deploying

Drag the folder onto [Netlify](https://app.netlify.com/drop), or connect the
repo — [`netlify.toml`](netlify.toml) is already configured with no build
command, a strict Content Security Policy, and a catch-all redirect for the hash
router. GitHub Pages, Cloudflare Pages and S3 all work the same way.

## Features

| | |
|---|---|
| **1,576 questions** | 31 categories across three tests, at least 17 per category per grade |
| **Grades 1–4** | Content and answer-choice counts match the real test level for each grade |
| **Read aloud** | Uses the device's built-in voice. Grades 1–2 are read aloud on the real tests too |
| **Review answered puzzles** | Arrows step back and forward over questions already answered, restoring the tiles and the explanation. Revisiting never changes the score |
| **Explanations** | Every question explains why the answer is right *and* why the tempting wrong one is wrong |
| **Strategy tips** | Each question carries the habit that prevents that specific mistake |
| **Pick a category** | Practice one puzzle type, one whole test, or a mix of all three |
| **iPad first** | Designed for a 1024×768 landscape iPad, works from 375 px up |
| **Light and dark** | Follows the system theme, with a manual override |
| **Nothing is collected** | No account, no analytics, no third-party requests, no telemetry. The only network traffic is the site fetching its own question files from its own domain. Progress lives in `localStorage` and is never uploaded |
| **Read-aloud stays on the device** | Voices are chosen device-first. Some browsers ship cloud-backed "Online" voices that send text to a server; those are used only if the device offers no voice of its own |
| **Parent Guide in Spanish** | A full translation, not a summary, behind a flag button on the guide. The child's screens stay English, matching the real tests |
| **Fun and games** | Games for memorising. Name the Flag (250 flags, vault of flags that no longer exist) and Name the Country (242 outlines, four choices or type it in English or Spanish, vault of shapes that look like other things) |
| **Math Lab** | A separate section for advanced maths, grades 1 to 6. 86 topics in two tracks: real mathematics (maps, bridges, primes, infinity, fractals, pi, three unsolved problems) and number skills |
| **Accessible** | WCAG AA contrast in both themes, full keyboard control, correct/incorrect never signalled by color alone |

Keyboard: <kbd>1</kbd>–<kbd>6</kbd> to answer, <kbd>Enter</kbd> for the next
question, <kbd>←</kbd> and <kbd>→</kbd> to look back over answered ones.

## What is covered

<details>
<summary><strong>CogAT</strong> — 9 subtests, 604 questions</summary>

| Battery | Categories |
|---|---|
| Verbal | Picture &amp; Word Analogies · Sentence Completion · Picture &amp; Word Sorting |
| Quantitative | Number Analogies · Number Puzzles · Number Series |
| Nonverbal | Figure Matrices · Paper Folding · Figure Sorting |

Grades 1–2 use Levels 7 and 8: pictures only, four answer choices, untimed.
Grades 3–4 use Levels 9 and 10: text and numerals, five choices, timed.
</details>

<details>
<summary><strong>NNAT</strong> — 4 item types, 247 questions</summary>

Pattern Completion · Reasoning by Analogy · Serial Reasoning ·
Spatial Visualization (grade 2 and up, matching the real level structure).

Five answer choices at every level, and only Pearson's five validated
color-blind-safe colors: black, white, yellow, blue and green.
</details>

<details>
<summary><strong>OLSAT</strong> — 18 item types, 725 questions</summary>

| Cluster | Categories |
|---|---|
| Verbal Comprehension | Following Directions · Opposites · Sentence Arrangement |
| Verbal Reasoning | Listening Riddles · Story Problems · Word Analogies · Word Odd One Out · Must Have · Word Matrix |
| Pictorial Reasoning | Odd One Out · Picture Analogies |
| Figural Reasoning | Shape Odd One Out · Shape Analogies · Pattern Matrix · Shape Series |
| Quantitative Reasoning | Number Series · Numeric Inference · Number Matrix |

The grade coverage follows Pearson's published scope and sequence, so the
listening types stop after grade 2 and the quantitative types do not start
until grade 3 — the same near-total break the real test has between Level C
and Level D.
</details>

## Fun and games

A section apart from both the test practice and the Math Lab, for games and
memorising.

**Name the Flag.** Every flag in the world, 250 of them. Choose 10, 25, 50 or
all, then how they come: mixed up, by continent, or alphabetically. Wrong
answers are drawn from the same continent, so "which of these four is Chad" is
a real question rather than a giveaway.

Name every flag in a round without one mistake and a vault opens: sixteen flags
of countries that no longer exist, from the Soviet Union to the plain green
flag Libya flew for 34 years. One is shown, and the wrong answers are chosen to
be genuinely tempting. The Ottoman flag is offered against Turkey, Tunisia and
Azerbaijan, which all use a crescent and star.

**Name the Country.** The same shape of game with country outlines instead of
flags, and one real difference: answer from four choices, or **type the name**,
which is much harder. A typed answer is accepted in English and Spanish and
under the names people actually use, so USA, US, United States, The United
States and Estados Unidos are all the same answer, and Holland, Burma, UK and
Côte d'Ivoire spelled without its accents all count. Those name lists are taken
from a dataset rather than written by hand, and a checker proves no two
countries can be named by the same typed string. Getting it wrong by naming a
different real country says which one you named.

A perfect round opens a vault of countries famous for looking like something
else: Italy the boot, Chile the ribbon, Croatia the boomerang, Australia the
scruffy dog. The question there is what the shape resembles, not which country
it is, so the vault is a different puzzle rather than more of the same.

Flags and outlines are bundled in the repository rather than loaded from a CDN,
because the site's own Content-Security-Policy is `img-src 'self'` and a remote
image would be blocked. Outlines are injected inline rather than used as an
`<img>`, since an `<img>` cannot inherit the page colour and these files are a
single silhouette that would otherwise be black on a black page. Country flags come from [flag-icons](https://github.com/lipis/flag-icons)
(MIT), names and regions from the world-countries dataset, and the historical
flags from Wikimedia Commons, where every one used here is public domain.
Country outlines come from [mapsicon](https://github.com/djaiss/mapsicon) by
Regis Freyd. It carries no standard licence: its terms are "do what you want
with them as long as you mention me" and no reselling, so it is credited here
and in the data file. `tools/flagcheck.mjs` and `tools/shapecheck.mjs` check
the join: every country has a real image file, every bundled image is used, no
two countries share a name or a typed answer, and every vault answer matches
the picture it is shown against.

## Math Lab

Separate from the test practice. The screening tests measure reasoning, and
this measures nothing at all: it is a place for a child who finds grade-level
maths easy to go deeper.

Grades 1 to 6 are written: 86 topics and 609 exercises.

Grade 2's big ideas are a proof the child can see rather than take on
trust (odd numbers stacking into squares), a genuinely unsolved problem
they can play with today (the Collatz 3n+1 chain), binary reached through
doubling, the fact that perimeter and area are independent, Fibonacci
counted off a real flower, rotational symmetry, the multiplication
principle, and which flat shapes fold into a cube. Sources and the cut
list are in [`docs/research/math-wonders.md`](docs/research/math-wonders.md).

Grade 3 opens up what multiplication and fractions make possible: primes found
with the sieve of Eratosthenes, infinity compared by pairing rather than
counting, Pascal's triangle, the Lo Shu magic square, fair division by cut and
choose, perfect numbers and the odd-perfect question still open after 2,000
years, probability written as a fraction, and why any four-sided shape tiles a
floor.

Grade 6 has Gauss's pairing trick, the mutilated chessboard where a colouring
argument proves an impossibility outright, why a negative times a negative has
to be positive, Goldbach's conjecture from 1742, the birthday problem solved by
counting pairs rather than people, Thales measuring a pyramid by its shadow,
why an hour has 60 minutes, and function machines the child can experiment on.

Grade 5 goes past the tests, since the screening only covers grades 1 to 4.
It has pi found with a piece of string rather than handed over, the
subtraction game where a child who spots the rule can beat any adult who has
not, the square-cube law and why there are no giant ants, powers of ten,
clock arithmetic, Cantor's argument that there are no more fractions than
whole numbers, the Monty Hall doors played twenty times because nothing else
convinces anyone, and Pythagoras shown as three squares that fit.

Grade 4 closes several loops on purpose. The Sierpinski triangle turns out to
be grade 3's Pascal triangle with the odd numbers shaded, which nobody expects.
Euler's V - E + F = 2 explains the cube numbers counted back in grade 2. The
golden ratio comes out of grade 2's Fibonacci. The rest: repeating decimals and
why 0.999... is exactly 1, the triangle angle sum proved with scissors, endless
halves adding to 1, the Caesar shift, and why adding digits tells you about
dividing by 3.

Sixteen topics in two tracks. Each is a short illustrated lesson followed by
puzzles taken one at a time.

**Big ideas** — real mathematics, chosen to be the kind that makes a child want
to keep going:

| # | Topic | The idea | Wow |
|---|---|---|---|
| 1 | Four Colours | Colour any map so bordering countries differ | Four is always enough. It took 124 years to prove |
| 2 | One Line, No Lifting | Which shapes draw in one stroke | Count the odd corners and you can predict it |
| 3 | The Bees' Secret | Which shapes tile with no gaps | Hexagons hold the most honey for the least wax |
| 4 | Snowflakes and Mirrors | Mirror lines and symmetry | A snowflake always has exactly six arms |
| 5 | The Twisted Loop | A Möbius band | Cut it down the middle and it does not fall apart |
| 6 | Socks in the Dark | The pigeonhole principle | Three socks is enough whether the drawer holds 10 or 10,000 |
| 7 | The Tower | Tower of Hanoi | 1, 3, 7, 15, 31 — double it and add one |
| 8 | Handshakes | Counting pairs | Three problems that look different are the same problem |

**Number skills** — the grade 1 curriculum done deeper:

| # | Topic | The idea |
|---|---|---|
| 9 | Ten Frames | Read a quantity in one look instead of counting |
| 10 | Number Bonds | One part-whole picture gives four facts |
| 11 | Doubles, Odd and Even | An even number IS a double; an odd one is a double plus 1 |
| 12 | The Balance | `=` means "same as", so `4 + 5 = 6 + 3` is fine |
| 13 | Missing Numbers | The unknown can hide in any position |
| 14 | Tens and Ones | Adding 10 moves only the tens digit |
| 15 | Equal Groups | Skip counting and arrays, the honest start of multiplication |
| 16 | Patterns and Shapes | Find the rule, including one that grows |

The big ideas are not invented. Zvonkin's *Math from Three to Seven* is a
session-by-session journal of a research mathematician running a circle for
four to seven year olds; his actual sessions include the Möbius band, the Tower
of Hanoi, topology, snowflakes and four colours. The logician Joel David
Hamkins taught graph colouring, chromatic numbers, Eulerian paths and the
Seven Bridges of Königsberg to **seven-year-olds**, and a girl in that class
told him afterwards she wanted to be a mathematician. Both are cited in
[`docs/research/math-wonders.md`](docs/research/math-wonders.md).

Seven exercise types, so it never reads as a worksheet: tap a picture, type a
number, decide true or false, build a ten frame or an array by tapping, colour
a map in and have it checked, work one out **on paper** and come back with the
answer, or hunt for as many answers as you can find.

Several of the big-idea exercises want scissors, coins or a pencil rather than
a screen, and say so. Cutting a Möbius band in half is the point of that
topic, and no animation replaces holding the thing.

Topic four is the one that matters most. Most children read `=` as "write the
answer here" and will call `4 + 5 = 6 + 3` wrong. That misconception is well
documented and is the main obstacle to algebra later. Fixing it at six is free.

Choices behind the number topics are in [`docs/research/math-grade1.md`](docs/research/math-grade1.md),
including the Florida benchmark each one sits on and where it reaches past it.

## The honest bit about test prep

This project takes a position, and it is worth stating plainly.

- **Familiarization gains are real but small and front-loaded.** A meta-analysis
  of 122 studies puts the first-exposure effect at about **0.27 SD** — roughly
  four IQ points — dropping to 0.15 and then 0.10 on later retests.
- **Brief format orientation is the *smallest* coaching effect.** Extended
  drill-and-practice produces the largest. The comfortable end is also the
  low-yield end.
- **Coaching gains are largely test-specific.** They inflate the score without
  inflating the reasoning the programme will actually demand.
- **The CogAT publisher's own concern is inequality, not preparation.** Riverside
  Insights notes that practice correlates with family income and reduces
  diversity in gifted programmes, and recommends schools give the free official
  materials to *every* child.
- **The clearest documented harm is an anxious parent drilling a child.** In 438
  first and second graders, children of math-anxious parents learned
  significantly less across the year — but **only when those parents helped
  frequently with homework**. Anxious and hands-off showed no effect at all.

So the app is built for one short session, not a course. It holds enough
variety that a random set never repeats itself, and the Parent Guide says plainly
that the useful dose is one sitting, then stop.

**No real test items appear anywhere in this project.** Every question was
written from scratch to match formats described in published manuals and
district documents. All the sources are in [`docs/research/`](docs/research/).

## Research

The question bank is built on primary sources, not on prep-site folklore. The
notes record every claim's origin, and every place the sources contradict each
other.

| Document | Covers |
|---|---|
| [`florida-gifted.md`](docs/research/florida-gifted.md) | Rule 6A-6.03019, Plan A vs Plan B, and what the district survey shows |
| [`florida-districts.md`](docs/research/florida-districts.md) | Screener, screening grade, cut score and Plan B criteria for the **20 largest Florida districts** |
| [`cogat.md`](docs/research/cogat.md) | Nine subtests, level-to-grade mapping, item counts, timing, SAS scoring, ability profiles |
| [`nnat-olsat.md`](docs/research/nnat-olsat.md) | NNAT3 item types and palette rules, OLSAT-8 scope and sequence, NAI and SAI scoring |
| [`difficulty-model.md`](docs/research/difficulty-model.md) | How grade and difficulty are assigned, and the distractor recipe |
| [`parent-science.md`](docs/research/parent-science.md) | Evidence on prepping, test anxiety, sleep, food and praise |

A few corrections to claims that circulate widely and are wrong:

- CogAT Paper Folding at Level 8 is **16** items, not 14, so Level 8 totals
  **156**, not 154.
- The NNAT's NAI has a standard deviation of **16**, not 15.
- SAS 124 is the **93rd** percentile, not the 95th.
- The CogAT E-profile threshold is **24** SAS points, not 12.
- NNAT and OLSAT level-to-grade tables **diverge from Level D**. A shared lookup
  table will be wrong for one of them.
- Florida screening cut scores range from **107 (Duval) to 122 (Manatee)** — a
  full standard deviation. There is no single Florida threshold.
- Florida has **no decimal benchmark at all in grade 3**, and multiplication
  facts are memorised in **grade 4**, not grade 3.
- An **anticlockwise quarter turn is harder than a half turn** for a child.
  Direction beats magnitude.
- A six-year-old reliably holds about **two** items in working memory, not three.
  That caps grade 1-2 items at two simultaneous rules.

## Project layout

```
GiftedPrep/
├── index.html                  the whole app shell, one section per screen
├── netlify.toml                deploy config; no build command
├── manifest.webmanifest
├── assets/
│   ├── css/design-system.css   tokens, components, light + dark, print
│   ├── img/                    favicon, touch icon, social card
│   │   ├── flags/              250 country flags plus 16 historical ones
│   │   └── shapes/             242 country outlines
│   └── js/
│       ├── app.js              state, router, event wiring
│       └── modules/
│           ├── data.js         loads and caches the question bank
│           ├── quiz.js         session engine (pure logic, no DOM)
│           ├── figures.js      declarative spec → inline SVG
│           ├── speech.js       read aloud via the Web Speech API
│           ├── storage.js      localStorage with a memory fallback
│           ├── charts.js       results ring and bars
│           ├── icons.js        inline SVG icon set
│           ├── parents.js      the Parent Guide
│           ├── mathlab.js      Math Lab lessons and exercise engine
│           ├── flags.js        the flag game
│           ├── shapes.js       the country outline game
│           ├── sections.js     the rooms, and the creature that fronts each
│           └── shell.js        shared state and DOM helpers
│
│       screens/                one file per room
│           ├── gifted.js       test practice: pickers, questions, results
│           ├── math.js         the Math Lab lessons and every exercise type
│           ├── fun.js          the games hub, flags and country shapes
│           └── parents.js      the Parent Guide screen
├── data/
│   ├── manifest.json           tests, grades, category index
│   ├── cogat/  nnat/  olsat/   one JSON file per category
│   ├── math/                   Math Lab topics, one file per grade
│   └── fun/                    flag game data: countries, continents, past flags
├── docs/research/              the sources behind every question
└── tools/
    ├── validate.mjs            checks the whole bank
    ├── mathcheck.mjs           checks the Math Lab data
    ├── mathverify.mjs          recomputes every Math Lab answer from scratch
    ├── flagcheck.mjs           checks the flag data against the image files
    ├── shapecheck.mjs          checks the outline data and typed-answer names
    ├── roomcheck.mjs           checks the room registry against CSS and creatures
    ├── archcheck.mjs           checks the import layering and finds cycles
    ├── palette.mjs             builds the palette and proves every contrast ratio
    ├── mkicon.py               rasterises the app icon (no dependencies)
    ├── serve.py                dev server with the production CSP
    └── _authoring.py           helpers used to write the JSON by hand
```

## Adding or editing questions

Questions are plain JSON. A text question:

```json
{
  "id": "cogat-pa-g3-1",
  "grade": 3,
  "difficulty": 2,
  "prompt": "Peach is to fruit as lily is to —",
  "choices": [
    { "id": "a", "text": "flower" },
    { "id": "b", "text": "iris" }
  ],
  "answer": "a",
  "explanation": "A peach is a kind of fruit. A lily is a kind of flower...",
  "strategy": "Say it as a sentence. A peach is a type of fruit..."
}
```

Pictures are described, not drawn. [`figures.js`](assets/js/modules/figures.js)
turns a compact spec into themed inline SVG, so the JSON stays diffable and one
fix corrects every question at once:

```json
"figure": {
  "kind": "matrix", "rows": 2, "cols": 2,
  "alt": "Top row: a white circle, then a blue circle...",
  "cells": [
    { "shapes": [{ "s": "circle", "c": "blue", "f": "outline" }] },
    { "shapes": [{ "s": "circle", "c": "blue" }] },
    { "shapes": [{ "s": "square", "c": "blue", "f": "outline" }] },
    { "missing": true }
  ]
}
```

Figure kinds: `single` `series` `matrix` `sets` `analogy` `paperfold`
`barchart` `pictograph` `balance` `numberline` `table`.
Shape attributes: `s` shape, `c` color, `f` fill, `n` count 1–9, `r` rotation,
`z` scale, `x`/`y` position.

After any edit:

```bash
node tools/validate.mjs      # everything, or pass a filename fragment
node tools/dupcheck.mjs      # two choices that draw the same picture
node tools/rulecheck.mjs     # the key disobeying its own example
```

`validate.mjs` covers all three. It checks that every answer id matches a
choice, that the choice count matches the real test for that grade, that NNAT
items stay inside Pearson's palette, that every figure renders, that grade-1 and
grade-2 prompts stay short enough to be read aloud once, and two things that are
easy to get wrong and impossible to see in a diff:

- **No two choices may draw the same picture.** Comparing the raw specs is not
  enough — a plus turned 90° is a different spec but an identical image, because
  a plus is four-fold symmetric. `tools/_symmetry.*` records the rotational
  symmetry of every shape so the check compares what the child actually sees.
- **The key must obey the rule its own example demonstrates.** If A becomes B by
  one rule, C must become the answer by that same rule.

After editing a generator, rebuild and re-verify with:

```bash
tools/build.sh
```

## Accessibility

- WCAG AA contrast for every text pair, in both themes, with the measured ratios
  written next to the palette in the stylesheet.
- Correct and incorrect are signalled by **icon, text label, border weight and
  border style** as well as color.
- Every interactive element has a visible focus ring and a touch target of at
  least 64 px.
- `prefers-reduced-motion` neutralises all animation.
- Figures carry plain-language `alt` text, which is also what the read-aloud
  voice speaks.

## Not affiliated

GiftedPrep is an independent project made by a parent. It is not affiliated
with, endorsed by, or derived from Riverside Insights (CogAT), Pearson (NNAT,
OLSAT), the Florida Department of Education, or any school district. CogAT is a
trademark of Riverside Assessments, LLC. NNAT and OLSAT are trademarks of NCS
Pearson, Inc.

Nothing here reproduces secure test content. If you believe something does,
please open an issue and it will be removed.

## Contributing

Issues and pull requests are welcome, particularly:

- corrections to the research notes, with a source
- new questions that follow the documented formats
- district-specific information about Florida screening practice
- translations

Please run `node tools/validate.mjs` before opening a pull request.

## License

[MIT](LICENSE).
