# CogAT (Cognitive Abilities Test), Forms 7 and 8

Author: David F. Lohman, University of Iowa. Publisher: Riverside Insights.
Descends from the 1954 Lorge-Thorndike Intelligence Test.

## Primary sources

| Key | Document |
|---|---|
| SIG | [CogAT Form 7 Score Interpretation Guide (Lohman, 2013)](https://www.riversidedatamanager.com/BalancedManagement/DigitalResources/Baggage_Files/CogAT/CogAT_7_SIG_v.2-1_092220.pdf) |
| NORMS | [CogAT 7/8 2017 Norms and Score Conversions Guide (Lohman & Lakin)](https://onlinehelp.riversideinsights.com/Help/Elevate/assets/docs/CogAT_78_COMP_NandSC_Guide_091820.pdf) |
| PG | [CogAT Product Guide (subtest descriptions and timing)](https://www.setontesting.com/wpsetontesting/wp-content/uploads/2020/01/School-Info-File-CogAT.pdf) |
| SGT | [CogAT Form 7 — A Short Guide for Teachers (Riverside, 2013)](https://www.aacs.org/wp-content/uploads/2012/10/CogAT-A-Short-Guide-for-Teachers.pdf) |
| L2008 | [Lohman, Gambrell & Lakin (2008), extreme discrepancies in ability profiles](https://www.psychologie-aktuell.com/fileadmin/download/PschologyScience/2-2008/12_Lohmann.pdf) |

## Structure: 3 batteries, 9 subtests

| Verbal | Quantitative | Nonverbal |
|---|---|---|
| Picture / Verbal Analogies | Number Analogies | Figure Matrices |
| Sentence Completion | Number Puzzles | Paper Folding |
| Picture / Verbal Classification | Number Series | Figure Classification |

## Levels are named by age, not grade

| Level | Grade | Age |
|---|---|---|
| 5/6 | K | 5-6 |
| **7** | **1** | 6-7 |
| **8** | **2** | 7-8 |
| **9** | **3** | 8-9 |
| **10** | **4** | 9-10 |
| 11 | 5 | 10-11 |

## Items per subtest

| Subtest | 5/6 | 7 | 8 | 9 | 10+ |
|---|---|---|---|---|---|
| Picture/Verbal Analogies | 14 | 16 | 18 | 22 | 24 |
| Sentence Completion | 14 | 16 | 18 | 20 | 20 |
| Picture/Verbal Classification | 14 | 16 | 18 | 20 | 20 |
| Number Analogies | 14 | 16 | 18 | 18 | 18 |
| Number Puzzles | 10 | 12 | 14 | 16 | 16 |
| Number Series | 14 | 16 | 18 | 18 | 18 |
| Figure Matrices | 14 | 16 | 18 | 20 | 22 |
| Paper Folding | 10 | 12 | 16 | 16 | 16 |
| Figure Classification | 14 | 16 | 18 | 20 | 22 |
| **Battery totals V/Q/N** | 42/38/38 | 48/44/44 | 54/50/52 | 62/52/56 | 64/52/60 |
| **Total** | **118** | **136** | **156** | **170** | **176** |

Totals were read off the maximum raw score in NORMS Tables 1, 9 and 15.

> **Correction to a claim repeated across prep sites.** Paper Folding at Level 8
> is **16** items, not 14, so Level 8 totals **156**, not 154. Two official data
> points force this: NORMS sets the minimum-attempted floor for Level 8 Paper
> Folding at 8, and at Levels 5/6-8 that floor is always exactly half the item
> count; and the Level 8 Nonverbal maximum raw score of 52 only works as
> 18 + 18 + 16.

> **Form 8 is not shorter than Form 7.** The 2017 norms tables give identical
> raw-score ranges for both forms.

## The picture / text split happens at Level 9

PG: *"For Levels 5/6, 7, and 8 (kindergarten through grade 2) ... questions are
entirely pictorial. No reading is required of students in any subtest."* The one
exception is Sentence Completion, which the teacher reads aloud in English or
Spanish; the child answers by choosing a picture.

From Level 9 (grade 3) the Verbal and Quantitative batteries become text and
numeral based. **The Nonverbal battery never changes format.** The only shift
there: Paper Folding uses **cuts** at K-2 and **hole punches** at grades 3+.

Level 9 is deliberately a hybrid — some Number Analogies keep the matrix format,
some Number Series still use beads, and Figure Matrices stays 2x2 through
Level 11.

## Timing

- **Levels 5/6-8 are untimed and teacher-paced.** Roughly 107 min (L7) to
  122 min (L8) across three sittings, one battery per sitting.
- **Levels 9+ are fixed at 10 minutes per subtest, 90 minutes total.** Level 9
  therefore gives ~27 seconds per Verbal Analogies item. The jump from grade 2
  to grade 3 is a jump in time pressure as much as in content.

## Answer choices

| Levels | Choices |
|---|---|
| 5/6 - 8 (K-2) | **4** |
| 9 - 17/18 (grades 3+) | **5** |

The 5-option figure for upper levels is directly documented. The 4-option figure
for K-2 is derived from the NORMS "targeted score" (chance-level) thresholds:
under 3 choices the Level 8 Verbal chance mean would be 18, above the stated
threshold of 17, which is incoherent; under 4 choices every primary threshold
sits sensibly above chance.

## Scoring chain

`raw -> Universal Scale Score (USS) -> Standard Age Score (SAS) -> percentile / stanine`

- **No penalty for wrong answers.** Always guess.
- **SAS: mean 100, standard deviation 16, range 50-160.** Age-normed in
  one-month intervals by the scoring service.
- NORMS Table 37 is a pure normalised-score table: every value from SAS 100-137
  matches `Phi((SAS-100)/16)` rounded. Conversions can be computed directly.

| Percentile | SAS |
|---|---|
| 90th | no exact SAS (120 = 89th, 121 = 91st) |
| 95th | **126** |
| 96th | 128 |
| 97th | **129** |
| 98th | **132** |
| 99th | **135 and above** |

> SAS 124 is the **93rd** percentile, not the 95th — a common web error.
> SAS 137-160 all map to percentile 99, so the top 24 scale points carry no
> discriminating information.

**Composite** = the average of the three battery USS values, reconverted. A
**partial composite** does the same for any two batteries (VQ, VN, QN). Lohman
argues strongly for these: *"Requiring a high composite score for all three
batteries eliminates many of the most-able students."* The QN partial composite
is language-free and so is the fairest option for English learners.

## Ability profile

Format: `<median age stanine><A|B|C|E>[ (V/Q/N +/-) ]`, e.g. `9A`, `6E (N-)`.

- **A** = all scores the s**A**me (range under 10 SAS points)
- **B** = one score a**B**ove or **B**elow the other two (range 10-23)
- **C** = two scores **C**ontrast, one strength and one weakness (range 10-23)
- **E** = **E**xtreme, at least two scores differ by 24+ SAS points

There is no D profile; the letters are mnemonics and only four patterns exist.
A profiles never carry a suffix. "Relative" strength means relative to the
child's own other two batteries, not to the norm group.

Within the 10-23 band, the **rule of thirds** separates B from C: split the range
into three, and look at where the middle score falls. Top third or bottom third
gives B; middle third gives C.

Prevalence (SIG): at Levels 5/6-8, roughly A 50%, B 26%, C 12%, E 9%. Among
children with a median stanine of 9, about **60% have an uneven profile** — and
they are far more likely to have a relative weakness than a relative strength.

## Common child errors, by subtest

| Subtest | Dominant error | Strategy that fixes it |
|---|---|---|
| Verbal Analogies | Picking a word merely *associated* with the third term | Say the relation as a sentence, then substitute |
| Sentence Completion | Ignoring the connective (*unlike, although, but*) | Classify the sentence type, predict the blank before reading choices |
| Verbal Classification | Choosing the category name or the whole | Name the category aloud, test each option with "Is this a ___?" |
| Number Analogies | Fixing the rule from the first pair, which is deliberately ambiguous | Derive from pair 1, **verify against pair 2**, then apply |
| Number Puzzles | Performing the visible operator (`26 = ? + 9` answered 35) | Simplify each side, then isolate; or plug in each choice |
| Number Series | Assuming one constant difference | Write every consecutive difference; check for interleaved series |
| Figure Matrices | Spotting one transformation and stopping | Fixed checklist: shape / shading / size / orientation / count / position |
| Paper Folding | Wrong hole count; expecting straight rows after a diagonal fold | `layers x punches = holes`; unfold backwards one crease at a time |
| Figure Classification | A rule that fits only two of the three | Verify the rule against all three before eliminating |

## District cut scores actually in use

Real practice ranges from the 81st percentile (Prince George's County screening
gate) to SAS 132 / 98th percentile (Bellevue WA, Georgia K-2). Ohio uses SAS
127-128 statewide. There is no single national cutoff.
