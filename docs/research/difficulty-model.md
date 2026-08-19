# How GiftedPrep assigns grade and difficulty

Every question carries two independent numbers.

## `grade` — 1 to 4

This maps to the real test level the child would sit, and it controls the
**content** the question is allowed to use.

| App grade | CogAT level | NNAT level | OLSAT level | Reading |
|---|---|---|---|---|
| 1 | Level 7 | Level B | Level B | **None.** Pictures only; stem is read aloud |
| 2 | Level 8 | Level C | Level C | **None.** Pictures only; stem is read aloud |
| 3 | Level 9 | Level D | Level D | Child reads words and numerals |
| 4 | Level 10 | Level D | Level E | Child reads words and numerals |

Content ceilings, so a question never asks for maths or vocabulary a child has
not met yet:

| Grade | Number range | Operations | Vocabulary |
|---|---|---|---|
| 1 | 0-20 | add and subtract within 20; counting; skip counting by 2, 5, 10 | concrete everyday nouns and verbs; Dolch pre-primer to grade 1 |
| 2 | 0-100 | add and subtract within 100; equal groups; halves and quarters | concrete plus common abstract words; Dolch grade 2 |
| 3 | 0-1000 | multiply and divide within 100; simple fractions | grade 3 academic words; simple prefixes |
| 4 | 0-10000 | multi-digit multiply, divide, equivalent fractions, decimals to hundredths | grade 4 academic words; prefixes and suffixes |

Stem length is capped too: grade 1 and 2 stems stay under about 12 words and
one clause, because at those levels a proctor reads the item **once**.

## `difficulty` — 1 to 5, *within* a grade

Difficulty never changes the content ceiling. It changes how much reasoning the
child has to hold at once. This is the lever the real tests use, and it is what
makes an item hard without making it unfair.

| Level | What changes |
|---|---|
| **1** | One rule. One attribute changes. Distractors are obviously wrong. |
| **2** | One rule, but a second attribute is present and deliberately **invariant** — the child must notice what stays the same. |
| **3** | **Two rules at once** (e.g. rotate *and* recolour). One distractor omits each rule. |
| **4** | Two rules plus a near-miss distractor that differs only slightly from the key; or an ambiguous first pair that only the second pair resolves. |
| **5** | Three rules, or two rules on different periods, or a rule that must be applied **in reverse** from a known endpoint. |

Why this ladder and not "bigger numbers": working memory is the binding
constraint. A 6-year-old can reliably hold about 2 to 3 elements at once; a
9-year-old about 4. Chaining a third simultaneous transformation is what makes
a matrix item hard for a first grader, not using the number 47 instead of 7.

## Distractor recipe

Taken directly from how the published items are built. For an item governed by
*n* rules:

- write **one distractor per rule** that applies every rule **except** that one
- add **one distractor** that changes an attribute the stem held invariant
- fill any remaining slot with a **near-miss** on the key (wrong rotation
  direction, count off by one, mirror instead of rotation)

Reflection-instead-of-rotation is the single most diagnostic distractor in
spatial items and should appear often.

## Answer-choice counts

Set to match the real tests, from [`cogat.md`](cogat.md) and
[`nnat-olsat.md`](nnat-olsat.md):

| Test | Grades 1-2 | Grades 3-4 |
|---|---|---|
| CogAT | 4 | 5 |
| NNAT | 5 | 5 |
| OLSAT | 4 | 5 |

## Colour rules

NNAT questions use **only black, white, yellow, blue and green**, because that
is Pearson's validated colour-blind-safe palette. No question in the app, on any
test, is answerable by hue alone — colour is always paired with shape, count,
position or orientation.
