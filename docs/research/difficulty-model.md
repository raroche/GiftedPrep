# How GiftedPrep assigns grade and difficulty

Every question carries two independent numbers. `grade` fixes the **content**
ceiling. `difficulty` fixes how much **reasoning** is held at once. They move
independently, and that separation is the whole model: a question is never made
harder by using bigger numbers or rarer words, only by asking the child to hold
more in mind.

## `grade` — 1 to 4

Maps to the real test level the child would sit.

| App grade | CogAT level | NNAT level | OLSAT level | Reading |
|---|---|---|---|---|
| 1 | Level 7 | Level B | Level B | **None.** Pictures only; stem read aloud |
| 2 | Level 8 | Level C | Level C | **None.** Pictures only; stem read aloud |
| 3 | Level 9 | Level D | Level D | Child reads words and numerals |
| 4 | Level 10 | Level D | Level E | Child reads words and numerals |

### Maths ceilings, from the Florida B.E.S.T. standards

Florida grades its own expectations in four tiers, and **the verb in the
benchmark is load-bearing**: *explore* means never ask for a bare answer,
*procedural reliability* means any method is fine, *procedural fluency* means the
standard algorithm is fair game, and *recall with automaticity* is the only tier
where a timed fact is appropriate.

| Grade | Add and subtract | Multiply and divide | Fractions | Decimals | Place value |
|---|---|---|---|---|---|
| **1** | sums to 10 **memorised**; to 20 with reliability | — | **halves and fourths, words only, no notation** | none | to 100; count to 120 |
| **2** | to 20 **memorised**; within 100 with reliability | repeated addition, arrays, **totals to 25** | halves, thirds, fourths, **words only** | none | to 1,000 |
| **3** | multi-digit, **standard algorithm** | **explore**, then reliability; products to 144 | **notation `a/b` starts here**; compare same numerator *or* same denominator only | **none at all** | to 10,000 |
| **4** | multi-digit | **facts to 12 memorised**; 2-digit x 2-digit algorithm | generate equivalents; add and subtract **like denominators** | **all decimal work starts here**, to hundredths | to 1,000,000; round to 10,000 |

Ten things that must never appear:

1. Grade 1: a bare two-digit plus two-digit sum.
2. Grades 1-2: any `a/b` fraction notation.
3. Grades 1-2: **a letter standing for an unknown**. Florida requires "any symbol
   other than a letter" until grade 3.
4. Grades 1-2: money written with a decimal point.
5. Grade 2: a required vertical algorithm, or a timed two-digit sum.
6. **Grade 3: any decimal.** Florida has no decimal benchmark in grade 3 at all.
7. Grade 3: a timed or memorised times-table answer.
8. Grade 3: comparing two fractions that differ in both numerator and denominator.
9. Grade 4: long division, or adding unlike denominators.
10. Any grade: rounding beyond that grade's range.

### Words

| Grade | Vocabulary | Morphology |
|---|---|---|
| 1 | Dolch pre-primer to first grade; ~3,000-4,000 root meanings | **inflections only** (`-s`, `-ed`, `-ing`) |
| 2 | Dolch second and third grade; ~6,000 root meanings | base words **and affixes** (`un-`, `-ful`) |
| 3 | Fry 300-500; entry of the grades 3-6 band | **Greek and Latin roots start here** |
| 4 | Fry 500-1000; ~8,000 root meanings | roots, prefixes and suffixes applied |

The Academic Word List is a university corpus built by *excluding* the 2,000
most frequent words — the only words a grade 1-4 child has. **Do not draw from
it below grade 6.**

### Stem length

Two different constraints, because grades 1-2 hear the stem and grades 3-4 read
it.

| Grade | Constraint | Cap |
|---|---|---|
| 1-2 | **Auditory.** A proctor reads it once, with no repeat. | **16 words**, one clause |
| 3 | **Reading.** Flesch-Kincaid 3.5 at ~1.3 syllables/word | **11 words**; one 3-syllable word |
| 4 | Flesch-Kincaid 5.0 | **13 words**; two 3-syllable words |

The load-bearing ratio in Flesch-Kincaid is `11.8 / 0.39 = 30`: **one extra
syllable on the average word costs as much as thirty extra words of sentence
length**. Word choice, not sentence length, is the binding constraint.

FCRR's independence criterion caps it further — text is independent only when no
more than about one word in twenty is difficult. On a 20-word stem that is **at
most one hard word**.

## `difficulty` — 1 to 5, *within* a grade

| Level | What changes |
|---|---|
| **1** | One rule. One attribute changes. Distractors obviously wrong. |
| **2** | One rule, plus a second attribute deliberately held **invariant**. |
| **3** | **Two rules at once**. One distractor omits each. |
| **4** | Two or three rules plus a near miss; or an ambiguous first pair that only the second pair resolves. |
| **5** | Three rules, or two rules on different cycles, or a rule applied **in reverse** from a known endpoint. |

### The working-memory ceiling

This is the hard limit, and it is lower than intuition suggests.

Reynolds et al. (2022), longitudinal, nationally representative, 3,550-9,020
children per age band, gives digit span backward at two criteria. The
**longest-ever-correct** column is the child's best trial; the **75-80% correct**
column is what they manage *reliably*. For an item a child must solve first time
under test conditions, only the reliable column is meaningful — and it runs
**0.6 to 0.8 digits lower**.

| App grade | Age | Reliable span | Chunk capacity | **Max simultaneous rules** |
|---|---|---|---|---|
| 1 | 6-7 | 1.96 - 2.35 | ~2.0 | **2** |
| 2 | 7-8 | 2.35 - 2.65 | ~2.5 | **2** |
| 3 | 8-9 | 2.65 - 2.96 | ~2.5-3 | **3** |
| 4 | 9-10 | 2.96 - 3.22 | ~3 | **3** |

Beyond these counts the item stops measuring reasoning and starts measuring
memory. Children under about seven also do not spontaneously rehearse, so a
grade-1 item gets no rehearsal support at all.

At grades 1 and 2 difficulty 5 therefore cannot come from a third rule. It comes
from **distractor similarity**, which the evidence supports as a lever in its own
right.

### Rotation, in measured order

Blum & Holling's IMak difficulty parameters, higher meaning harder:

| Transformation | Difficulty |
|---|---|
| 90 degrees **clockwise** | 0.82 |
| Reflection | 1.14 |
| 180 degrees | 1.23 |
| 90 degrees **anticlockwise** | **1.55** |

Two things here are counter-intuitive and both are acted on in the bank:
**direction beats magnitude** — an anticlockwise quarter turn is harder than a
half turn — and **reflection sits between the rotations**, so it is a
difficulty-4 lever, not a difficulty-5 one.

| Grade | Rotations allowed |
|---|---|
| 1 | 90 clockwise only |
| 2 | 90 clockwise, 180 |
| 3 | 90 clockwise, 180 |
| 4 | all, including 270 and reflection |

**45 degrees is never used.** It appears in no published rule taxonomy, and a
child cannot verify it against a grid.

### The irrelevant invariant

Primi (2001) manipulated four sources of complexity orthogonally and found
**perceptual organisation had the strongest effect** — stronger than the amount
of information. Wang & Su found items built with a distracting attribute became
"much more difficult". This is the cheapest, most content-neutral lever there is,
and it is what difficulty level 2 exists to use.

## The distractor recipe

For an item governed by *n* rules:

1. **One distractor per rule** that obeys every rule *except* that one.
2. **One** that changes an attribute the stem held invariant.
3. Fill remaining slots with a **near miss**.

**Split rule 3 by modality.** For *figural* items a near miss is objectively
wrong — the wrong rotation direction, a count off by one — and it sharpens the
item. For *verbal* items "near" means "arguably also correct", and Ludewig et al.
(2023), on 924 fourth-graders, found that a distractor's **degree of synonymy
with the key damages discrimination** while mere semantic relatedness helps. So
for words the rule is **semantically related but categorically excluded**, never
a weak synonym of the answer.

A distractor chosen by fewer than 5% of children is doing no work. Three
functioning options is psychometrically optimal; the bank uses four and five to
match the real tests, but only about three of them carry real difficulty.

## Ambiguity is a bug, not a difficulty lever

If two different rules both fit the stem and **both their answers appear among
the choices**, the item has two correct answers. The validator cannot catch this.
Either make the rule unambiguous, or ensure only one reading appears in the
options.

## Colour

NNAT items use only **blue, green, yellow, black and white** — Pearson's
validated colour-blind-safe set, enforced by `tools/validate.mjs`. On every test,
**no question is answerable by colour alone**: colour is always paired with
shape, count, position or orientation.

## Sources

Florida B.E.S.T. [Mathematics](https://cpalmsmediaprod.blob.core.windows.net/uploads/docs/standards/best/ma/mathbeststandardsfinal.pdf)
and [ELA](https://cpalmsmediaprod.blob.core.windows.net/uploads/docs/standards/best/la/elabeststandardsfinal.pdf) ·
[Hasbrouck & Tindal (2017) fluency norms](https://www.brtprojects.org/wp-content/uploads/2017/10/TechRpt_1702ORFNorms_Fini.pdf) ·
[Reynolds et al. (2022), working memory development](https://twu.edu/media/documents/woodcock-institute/ReynoldsWM.pdf) ·
[Cowan (2010), The Magical Mystery Four](https://journals.sagepub.com/doi/abs/10.1177/0963721409359277) ·
[Blum & Holling (2018), IMak](https://pmc.ncbi.nlm.nih.gov/articles/PMC6087760/) ·
[Primi (2001), complexity of geometric inductive reasoning](https://www.sciencedirect.com/science/article/abs/pii/S0160289601000678) ·
[Ludewig et al. (2023), plausible but incorrect options](https://journals.sagepub.com/doi/10.1177/07342829231167892) ·
[Kuperman et al. (2012), age-of-acquisition ratings](https://link.springer.com/article/10.3758/s13428-012-0210-4) ·
[Biemiller, Which Words Are Worth Teaching](https://onlit.org/wp-content/uploads/2023/08/Biemiller.pdf)
