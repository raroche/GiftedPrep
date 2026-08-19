# Writing questions for GiftedPrep

Read this before adding questions. Then read the category file you are editing,
and the matching section of [`research/`](research/).

## The rule that matters most

**Never reproduce a real test item.** Nothing secure or copyrighted goes in this
repository. Published manuals and district handouts describe *formats*; that is
what we copy. Every question is written from scratch to fit a documented format.
If you find an item on a prep site, do not paste it — read it, work out the
format rule it demonstrates, and write a different question that exercises the
same rule.

## Where a question lives

One JSON file per category, listed in `data/manifest.json`. Append to the
existing `questions` array. Never edit or reorder questions that are already
there — other files reference their ids.

## Question shape

```json
{
  "id": "cogat-fm-g1-6",
  "grade": 1,
  "difficulty": 3,
  "prompt": "Two things change across the top. Do both on the bottom.",
  "promptSpeech": "optional: how the read-aloud voice should say it",
  "figure": { ... },
  "choices": [
    { "id": "a", "text": "flower" },
    { "id": "b", "figure": { "shapes": [ ... ] }, "label": "a blue circle" }
  ],
  "answer": "a",
  "explanation": "Why the key is right AND why the tempting wrong one is wrong.",
  "strategy": "The habit that prevents this specific mistake."
}
```

- `id` continues the existing numbering for that category and grade.
- `difficulty` is 1 to 5 **within** the grade. It never changes the content
  ceiling, only how much reasoning is held at once. See
  [`research/difficulty-model.md`](research/difficulty-model.md).
- `label` on a choice is what the read-aloud voice and a screen reader say. Add
  it whenever the choice is a picture.

## Answer-choice counts are not negotiable

| Test | Grades 1-2 | Grades 3-4 |
|---|---|---|
| CogAT | 4 | 5 |
| NNAT | 5 | 5 |
| OLSAT | 4 | 5 |

The validator fails the build if these are wrong.

## Grade means content ceiling

| Grade | Numbers | Operations | Words | Reading |
|---|---|---|---|---|
| 1 | 0-20 | add and subtract within 20, skip count by 2, 5, 10 | concrete everyday nouns and verbs | **none** — pictures only, stem read aloud, 12 words or fewer |
| 2 | 0-100 | add and subtract within 100, equal groups, halves and quarters | concrete plus common abstract | **none** — pictures only, stem read aloud |
| 3 | 0-1000 | multiply and divide within 100, simple fractions | grade 3 academic words, simple prefixes | child reads |
| 4 | 0-10000 | multi-digit multiply and divide, equivalent fractions, decimals to hundredths | grade 4 academic words, prefixes and suffixes | child reads |

## Difficulty ladder

| Level | What changes |
|---|---|
| 1 | One rule. One attribute changes. Distractors obviously wrong. |
| 2 | One rule, plus a second attribute deliberately held **invariant**. |
| 3 | **Two rules at once**, e.g. rotate and recolour. |
| 4 | Two rules plus a near-miss distractor; or an ambiguous first pair that only the second pair resolves. |
| 5 | Three rules, or two rules on different cycles, or a rule applied **in reverse** from a known endpoint. |

Working memory is the binding constraint. A six-year-old holds about two or
three elements at once, a nine-year-old about four. Chaining a third
simultaneous transformation is what makes a grade-1 matrix hard — not using
bigger numbers.

## The distractor recipe

For an item governed by *n* rules:

1. Write **one distractor per rule** that obeys every rule *except* that one.
2. Add **one** that changes an attribute the stem held invariant.
3. Fill any remaining slot with a **near miss**: wrong rotation direction, count
   off by one, a mirror where a rotation was needed.

Reflection-instead-of-rotation is the most diagnostic spatial distractor. Use it
often.

## Ambiguity is a bug

A two-by-two picture matrix where the count goes 2 → 6 reads as both "add four"
and "times three". If *both* answers appear in the choices, the question has two
right answers and is broken. Either make the rule unambiguous, or make sure only
one reading appears among the choices. The validator cannot catch this. You must.

## Explanations

Two sentences minimum. The first says why the key is right. The second names the
tempting wrong choice and says why it fails. Write for the child, not the parent:
short sentences, ordinary words, one idea per sentence. Say "take away", not
"subtract", at grades 1 and 2.

The `strategy` line is the transferable habit, not a restatement of the answer.
Good: *"Count the jump between the first two, then check it is the same jump to
the third."* Bad: *"The answer is seven."*

## Figures

Pictures are described, not drawn. `assets/js/modules/figures.js` turns the spec
into themed inline SVG. Read the comment block at the top of that file for the
full reference; the short version:

**Kinds:** `single` `series` `matrix` `sets` `analogy` `paperfold` `barchart`
`pictograph` `balance` `numberline` `table`

**Shape:** `{ "s": shape, "c": colour, "f": fill, "n": count, "r": rotation, "z": scale, "x": 0-100, "y": 0-100 }`

- `s` — one of the 40 names in `SHAPE_NAMES`. Run
  `node --input-type=module -e "const m=await import('./assets/js/modules/figures.js'); console.log(m.SHAPE_NAMES.join(' '))"`
- `c` — `blue red green yellow purple orange teal pink grey ink`
- `f` — `solid outline stripesh stripesv stripesd dots grid halfleft halfright halftop halfbottom`
- `n` — 1 to 9, laid out in a tidy cluster
- `z` — 0.15 to 1.6

Always give the figure an `alt` describing it in plain words. That text is what
the read-aloud voice speaks and what a screen reader announces, so it has to be
enough to answer the question by ear where the question allows it.

### NNAT has a hard palette limit

NNAT items may use **only** `blue`, `green`, `yellow`, `grey` and `ink` (grey and
ink stand in for white and black). Pearson validated exactly those five for
colour-blind accessibility. The validator enforces this.

**No question, on any test, may be answerable by colour alone.** Always pair
colour with shape, count, position or orientation.

### Picture items for grades 1 and 2

Use emoji in a `text` cell for real-world pictures: `{ "text": "🐦" }`. They ship
with every device, need no network and scale cleanly. Pick emoji that are
unmistakable at a glance and that do not depend on fine detail.

## Writing the file

`tools/_authoring.py` has helpers that make hand-writing the JSON readable:

```python
import sys; sys.path.insert(0, 'tools')
from _authoring import *

new = [
  q("cogat-fm-g1-6", 1, 2, "Finish the bottom row.",
    mat(2, 2, [cell(sh("circle","blue")), cell(sh("circle","blue","n",2)),
               cell(sh("square","green")), MISS],
        "Top row: one blue circle, then two. Bottom row: one green square, then an empty box."),
    [ch("a", sh("square","green","n",2)), ch("b", sh("square","green")),
     ch("c", sh("square","green","n",3)), ch("d", sh("circle","blue","n",2))],
    "a", "One becomes two going across...", "Count both boxes on the top row first."),
]

import json
d = json.load(open('data/cogat/figure-matrices.json'))
d['questions'] += new
write(d, 'data/cogat/figure-matrices.json')
```

`sh()` takes the shape and colour, then alternating key/value pairs:
`sh("circle", "blue", "f", "outline", "z", 0.5)`.

## Always finish by validating

```bash
node tools/validate.mjs cogat/figure-matrices
```

Pass a filename fragment to check only your own file. No arguments checks
everything. It verifies answer ids, choice counts per grade, palette compliance,
that every figure renders, that grade 1-2 prompts stay short enough to be read
aloud once, and that no two questions in a category are identical.

**Fix every error before you finish.** A red validator means the question does
not ship.
