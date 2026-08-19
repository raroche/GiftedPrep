<div align="center">

<img src="assets/img/favicon.svg" width="72" alt="">

# GiftedPrep

**Friendly practice for the CogAT, NNAT and OLSAT — the group tests Florida
districts use to screen children for gifted programs.**

1,576 questions · grades 1–4 · no login · no tracking · works offline

</div>

---

## What this is

A free, single-page web app where a child in grades 1 to 4 can meet the *kinds*
of questions used on gifted screening tests before they meet them for real.
Every question explains itself afterwards, in words a six-year-old can follow.

It is built for **familiarization, not coaching** — a distinction the research
takes seriously, and so does this project. See
[the honest bit](#the-honest-bit-about-test-prep) below.

There is also a [**Parent Guide**](assets/js/modules/parents.js) inside the app:
what the tests are, what Florida actually requires, how the scores work, and an
evidence-based plan for the week before test day.

## Quick start

The repository root **is** the site. There is no build step and no dependencies.

```bash
git clone https://github.com/rolandaroche/GiftedPrep.git
cd GiftedPrep
python3 -m http.server 8765
```

Then open <http://localhost:8765>.

> A small web server is needed because the app loads its questions with `fetch`,
> and browsers block that on `file://` URLs. Any static server will do.

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
| **Explanations** | Every question explains why the answer is right *and* why the tempting wrong one is wrong |
| **Strategy tips** | Each question carries the habit that prevents that specific mistake |
| **Pick a category** | Practice one puzzle type, one whole test, or a mix of all three |
| **iPad first** | Designed for a 1024×768 landscape iPad, works from 375 px up |
| **Light and dark** | Follows the system theme, with a manual override |
| **Nothing leaves the device** | No account, no analytics, no network calls at all. Progress lives in `localStorage` |
| **Accessible** | WCAG AA contrast in both themes, full keyboard control, correct/incorrect never signalled by color alone |

Keyboard: press <kbd>1</kbd>–<kbd>6</kbd> to answer, <kbd>Enter</kbd> for the
next question.

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
| [`florida-gifted.md`](docs/research/florida-gifted.md) | Rule 6A-6.03019, Plan A vs Plan B, which instrument each district uses |
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
- Florida has **no decimal benchmark at all in grade 3**, and multiplication
  facts are memorised in **grade 4**, not grade 3.
- An **anticlockwise quarter turn is harder than a half turn** for a child.
  Direction beats magnitude.
- A six-year-old reliably holds about **two** items in working memory, not three.
  That caps grade 1-2 items at two simultaneous rules.

## Project layout

```
GiftedPrep/
├── index.html                  the whole app shell, five screens
├── netlify.toml                deploy config; no build command
├── manifest.webmanifest
├── assets/
│   ├── css/design-system.css   tokens, components, light + dark, print
│   ├── img/                    favicon, touch icon, social card
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
│           └── parents.js      the Parent Guide
├── data/
│   ├── manifest.json           tests, grades, category index
│   ├── cogat/  nnat/  olsat/   one JSON file per category
├── docs/research/              the sources behind every question
└── tools/
    ├── validate.mjs            checks the whole bank
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
node tools/validate.mjs
```

It checks that every answer id matches a choice, that the choice count matches
the real test for that grade, that NNAT items stay inside Pearson's palette,
that every figure renders, and that grade-1 and grade-2 prompts stay short
enough to be read aloud once.

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
