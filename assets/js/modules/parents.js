/**
 * parents.js — The Parent Guide.
 *
 * Long-form content rather than logic. It lives in JavaScript so the whole app
 * stays a handful of static files with no build step, and so the score tables
 * can be generated from the manifest instead of typed twice.
 *
 * Every claim here traces to a source recorded in docs/research/. Where the
 * evidence is weak or has failed to replicate, the text says so. A guide that
 * overstates the science would be worse than no guide, because the one finding
 * that matters most is that an anxious parent drilling a child is the
 * combination that measurably does harm.
 */

import { escapeHtml } from './charts.js';

const callout = (kind, title, body) => `
  <div class="gp-callout gp-callout--${kind}">
    <p class="gp-callout__title">${title}</p>
    ${body}
  </div>`;

const day = (n, title, body) => `
  <div class="gp-timeline__item">
    <span class="gp-timeline__day">${n}</span>
    <div class="gp-timeline__body">
      <h3>${title}</h3>
      ${body}
    </div>
  </div>`;

const acc = (q, a) => `
  <details class="gp-accordion">
    <summary class="gp-accordion__trigger">${q}</summary>
    <div class="gp-accordion__panel">${a}</div>
  </details>`;

export function renderParentGuide(manifest) {
  /* Counted from the manifest rather than typed, so it cannot drift. */
  const total = (manifest?.categories || [])
    .reduce((n, c) => n + Object.values(c.counts || {}).reduce((a, b) => a + b, 0), 0);
  const gradeRows = (manifest?.grades || []).map((g) => `
    <tr>
      <td><strong>${escapeHtml(g.label)}</strong></td>
      <td>${escapeHtml(g.cogat)}</td>
      <td>${escapeHtml(g.nnat)}</td>
      <td>${escapeHtml(g.olsat)}</td>
      <td>${g.reading ? 'Child reads' : 'Read aloud, pictures only'}</td>
    </tr>`).join('');

  return `
<p class="gp-page-lede">
  This is the part of the site written for you rather than your child. It covers
  what these tests actually are, what the research says about preparing for them,
  and a calm plan for the week before. It is deliberately honest about where the
  evidence is thin.
</p>

${callout('info', 'The short version',
  `<p>Familiarity helps a little. Cramming helps less than people think, costs
   more than people expect, and the one thing research shows clearly does harm is
   an anxious parent running daily drills. Show your child the question types
   once so nothing is a surprise, protect their sleep, keep your own face calm on
   the morning, and then let it go.</p>`)}

<h2>What these tests are</h2>

<p>
  Florida districts screen children for gifted programs with a short group test,
  and then send the children who clear that gate for a full one-to-one
  evaluation with a school psychologist. The group test is only a doorway. It is
  not the test that decides anything.
</p>

<p>
  There is no single Florida test. Districts choose their own instrument, and
  most do not tell parents which one. The three most common across the country
  are the <strong>CogAT</strong>, the <strong>NNAT</strong> and the
  <strong>OLSAT</strong>, and this site covers all three, ${total.toLocaleString()} questions in
  all. Some Florida districts use something else entirely: Monroe County, for
  example, screens every second grader with Raven's 2.
</p>

<div class="gp-table-scroll">
<table>
  <thead><tr><th>Grade</th><th>CogAT</th><th>NNAT</th><th>OLSAT</th><th>How it is given</th></tr></thead>
  <tbody>${gradeRows}</tbody>
</table>
</div>

${callout('caution', 'The grade 2 to grade 3 cliff',
  `<p>All three tests change character between second and third grade. Pictures
   become words and numerals. Four answer choices become five. And the CogAT
   stops being untimed and teacher-paced, switching to a fixed ten minutes per
   section. A child who found grade 2 easy can find grade 3 genuinely hard, and
   nothing has gone wrong.</p>`)}

<h2>What Florida actually requires</h2>

<p>
  Eligibility is set by State Board of Education Rule 6A-6.03019. Under
  <strong>Plan A</strong> a child must show all three of the following:
</p>

<ol>
  <li>A score <strong>two standard deviations above the mean</strong> on an
      individually administered intelligence test. On a WISC-V that is
      <strong>130</strong>.</li>
  <li>A majority of the characteristics of gifted students, on a district
      checklist covering learning, motivation, creativity and leadership.</li>
  <li>Evidence of need for a special instructional programme.</li>
</ol>

<p>
  Districts may also run a <strong>Plan B</strong>, filed as Appendix C of their
  policies and audited by the state. Plan B typically lowers the intellectual
  bar to about <strong>115</strong> for children who are low income or English
  learners. Both Collier and Monroe counties have an approved Plan B.
</p>

<h3>What the twenty largest Florida districts actually use</h3>

<p>
  Every district's rules are filed with the state, and all twenty of the largest
  have now been read. The pattern:
</p>

<ul>
  <li><strong>The NNAT is the most common screener by far</strong> — nine of the
      twenty use a Naglieri test. Lee has moved to the newer <strong>NGAT</strong>
      and Miami-Dade names the <strong>NGAT-NV</strong>, so the Naglieri General
      Ability Test looks to be replacing the NNAT3 in Florida.</li>
  <li><strong>Grade 2 is the screening year</strong> in eleven districts.
      Miami-Dade screens in <strong>grade 1</strong>.</li>
  <li><strong>The cut score to move on varies by a full standard deviation</strong>,
      from Duval's <strong>107</strong> to Manatee's <strong>122</strong>. A child
      referred for full evaluation in Duval would be turned away in Manatee.</li>
  <li><strong>Five districts publish no group screener at all.</strong>
      Hillsborough screens from existing data, Marion uses a teacher rating scale,
      Sarasota screens only on referral, and Pasco publishes nothing.</li>
  <li><strong>Pasco operates no Plan B</strong>, so families there have no
      reduced-threshold pathway.</li>
</ul>

${callout('caution', 'Four districts limit how many times a child may be tested',
  `<p>This is the one rule that can catch a family out, and it is the only kind
   of testing rule any Florida district publishes.</p>
   <ul>
     <li><strong>St. Johns</strong> — the CogAT and the KBIT-2R may each be taken
         <strong>only once in a child's whole K-12 career</strong>.</li>
     <li><strong>Sarasota</strong> — not the same instrument within 12 months, and
         more than three screenings across a school career is discouraged.</li>
     <li><strong>Manatee</strong> — being screened with one test can bar a related
         test from being used for eligibility later.</li>
     <li><strong>Osceola</strong> — referral for evaluation at most once a year.</li>
   </ul>
   <p>If you are in one of these districts, it is worth knowing before you ask for
   a re-screen. Everywhere else, no attempt limit is published.</p>`)}

<p>
  <strong>No Florida district in the survey publishes any statement about test
  preparation at all.</strong> None endorses it, discourages it or forbids it.
  The attempt limits above are the only published constraints, and they work by
  limiting tries rather than by addressing preparation.
</p>

${callout('tip', 'Find out what your own district does',
  `<p>Every district's rules are public. Search the Florida Department of
   Education's policies repository at
   <a href="https://beessgsw.org/#/spp/institution/public/" rel="noopener">beessgsw.org</a>,
   open your district, and read Part III and Appendix C. Or simply ask the
   gifted or ESE coordinator at your child's school which screener they use and
   what the cut score is. Some districts publish it and some do not.</p>`)}

<h2>Does practicing actually help?</h2>

<p>
  Yes, a little, and much less than the internet suggests. The honest numbers:
</p>

<div class="gp-table-scroll">
<table>
  <thead><tr><th>What</th><th>Effect</th><th>Source</th></tr></thead>
  <tbody>
    <tr><td>Taking a similar test once before</td><td><strong>0.27 SD</strong>, about 4 IQ points</td><td>Scharfen &amp; Holling 2018, 122 studies</td></tr>
    <tr><td>A second retest</td><td>0.15 SD</td><td>same</td></tr>
    <tr><td>A third retest</td><td>0.10 SD</td><td>same</td></tr>
    <tr><td>Brief orientation to the format</td><td><strong>smallest</strong> of all coaching effects</td><td>Bangert-Drowns et al. 1983</td></tr>
    <tr><td>Extended drill-and-practice</td><td><strong>largest</strong> coaching effect</td><td>same</td></tr>
  </tbody>
</table>
</div>

<p>
  Read that table twice. The gain is <strong>front-loaded</strong>: almost all of
  it happens on the very first exposure and it shrinks fast. And the part that is
  ethically comfortable, showing a child the format, is also the part with the
  smallest effect. The large effects come from exactly the intensive drilling
  that creates the problems.
</p>

<p>
  There is a further catch. Score gains from coaching are largely
  <em>test-specific</em>. They are not gains in reasoning. So a coached score
  overstates the ability the programme will demand of your child every day.
</p>

${callout('info', 'What the CogAT publisher says',
  `<p>Riverside Insights, who publish the CogAT, are unusually direct about this.
   Their concern is not that children are prepared. It is that preparation is
   <strong>unequally distributed</strong>, correlates with family income, and
   reduces diversity in gifted programmes. Their proposed fix is not to ban
   practice but to <em>equalise</em> it, by giving every child the free official
   practice materials. A parent using publisher materials is doing what the
   publisher recommends schools do for everyone.</p>`)}

<h2>The line between familiarising and cramming</h2>

<div class="gp-table-scroll">
<table>
  <thead><tr><th>Familiarising — fine, low yield</th><th>Cramming — where the problems start</th></tr></thead>
  <tbody>
    <tr><td>Seeing each question type once so nothing is new</td><td>Drilling many items of each type repeatedly</td></tr>
    <tr><td>Practicing how to answer: tapping, not skipping</td><td>Teaching rule-sets for solving matrix puzzles</td></tr>
    <tr><td>Practicing listening to spoken directions</td><td>Memorising item types or leaked questions</td></tr>
    <tr><td>One short session, then stop</td><td>A multi-week prep course</td></tr>
    <tr><td>Explaining that some questions will be too hard</td><td>Training toward a target score</td></tr>
  </tbody>
</table>
</div>

<p>
  This site is built for the left-hand column. There are five questions per type
  per grade — enough to meet every format once, not enough to drill.
</p>

<h2>The one finding you should not skip</h2>

${callout('caution', 'An anxious parent plus frequent drilling is the harmful combination',
  `<p>Maloney and colleagues (2015, <em>Psychological Science</em>) studied 438
   first and second graders. Children of math-anxious parents learned
   <strong>significantly less</strong> across the school year and ended with more
   anxiety of their own — <strong>but only when those parents helped frequently
   with homework</strong>. When anxious parents helped less often, there was no
   effect at all.</p>
   <p>The transmission was emotional, not informational: it survived controls for
   how much math the parents actually knew. If you feel wound up about this
   test, the evidence says the most useful thing you can do is <em>less</em>, not
   more.</p>`)}

<p>
  There is a second finding worth knowing. In early elementary school, the
  children with the <strong>highest working memory</strong> are the ones whose
  performance collapses most under anxiety (Ramirez et al., 2016). The pressure
  you apply lands hardest on exactly the child you are hoping will test well.
</p>

<h2>The week before</h2>

<p>
  This plan is built around one strong finding: in 7-to-11-year-olds, a
  <strong>cumulative</strong> difference of well under an hour of sleep, spread
  across several nights, produced changes that <em>teachers who did not know
  which group a child was in</em> could see (Gruber et al., 2012). The week
  matters more than the night.
</p>

<div class="gp-timeline">
  ${day(7, 'Set the sleep schedule. Stop preparing.', `
    <ul>
      <li>Lock in one bedtime and one wake time for the whole week, weekend
          included. Ages 6 to 12 need <strong>9 to 12 hours</strong> a night.</li>
      <li><strong>Stop teaching new content now.</strong> The gains available are
          already banked.</li>
      <li>Honest gut check: if <em>you</em> feel anxious, this is the moment to
          reduce your involvement, not increase it.</li>
    </ul>`)}

  ${day(6, 'One familiarization session. Only one.', `
    <ul>
      <li>Do one short set on this site, or with your district's official
          practice material. Fifteen minutes is plenty.</li>
      <li>Tell your child explicitly that <strong>some questions will be too
          hard on purpose</strong>, because the test covers several ages at once.</li>
      <li>Practice the mechanics: tapping an answer, not leaving blanks, moving
          on when stuck.</li>
    </ul>`)}

  ${day(5, 'Teach belly breathing. Not on the day.', `
    <ul>
      <li>Five minutes, playful. One hand on the chest, one on the belly. Make
          the bottom hand move. Breathe out longer than you breathe in.</li>
      <li>Give them something to watch: a pinwheel, a feather, a toy on the
          tummy. Children breathe better with a visual than an instruction.</li>
      <li>Teach the version nobody can see: <em>smell the flower, blow out the
          candle</em>, five times.</li>
    </ul>
    <p class="gp-muted">Diaphragmatic breathing has the best evidence of the
    calming techniques for this age. Skip box breathing — the four-second hold is
    uncomfortable for young children.</p>`)}

  ${day(4, 'Move their body. Teach squeeze-and-let-go.', `
    <ul>
      <li>Ordinary active play. Park, bikes, running about.</li>
      <li>Robot then rag doll: squeeze fists tight, count to five, drop. Then
          shoulders to ears, hold, drop. Then scrunch the face, hold, release.</li>
    </ul>`)}

  ${day(3, 'Have the worry conversation once.', `
    <ul>
      <li>Ask once, openly: <em>is anything about Thursday on your mind?</em>
          Listen. Do not lecture, do not solve, do not raise it again daily.</li>
      <li>Introduce the reframe. When they say their tummy feels funny:
          <em>that fast feeling is your body getting ready — it does that before
          birthday parties too.</em></li>
    </ul>
    <p class="gp-muted">Do <strong>not</strong> use the popular
    "write down your worries" exercise. The famous 2011 study behind it failed a
    large preregistered replication, and it was tested on teenagers and college
    students, not on seven-year-olds.</p>`)}

  ${day(2, 'Take the logistics off your child.', `
    <ul>
      <li>Confirm the time, the place, the parking, what to bring. Write it down
          so you are not visibly stressed on the morning — children read parents'
          nonverbal signals accurately.</li>
      <li>Lay out clothes. Plan a breakfast they have eaten before and like.</li>
    </ul>`)}

  ${day(1, 'The night before: do less.', `
    <ul>
      <li><strong>No practice at all today.</strong> None.</li>
      <li>Normal dinner, normal evening, normal bedtime.
          <strong>Do not send them to bed early</strong> — a child lying awake for
          an hour is worse off than one on schedule.</li>
      <li>Screens off for the last hour.</li>
      <li>Say the sentence once, then let it go.</li>
    </ul>
    <p class="gp-muted">If they sleep badly, do not panic and do not let them see
    you panic. The studies that found real effects changed sleep across several
    nights. One rough night is not that.</p>`)}
</div>

<h2>The morning</h2>

<ol>
  <li><strong>Wake at the normal time.</strong> No early alarm to "get ready".</li>
  <li><strong>A breakfast they have eaten before.</strong> Eating breakfast rather
      than skipping it does help attention and memory that same morning. What is
      <em>in</em> it is far less settled than the internet claims — a review of 45
      studies concluded firm conclusions about composition cannot be drawn.
      Familiar beats optimised.</li>
  <li><strong>Water bottle. No caffeine of any kind.</strong> Researchers have
      concluded there is no established safe dose for children and no benefit.</li>
  <li><strong>No last-minute review.</strong> No flashcards in the car. Anxiety
      consumes exactly the working memory the test measures.</li>
  <li><strong>Check your own face and voice</strong> before you check theirs.</li>
  <li>Five slow breaths together in the car. A silly superhero pose if it makes
      you both laugh — as a ritual, not because it works.</li>
  <li><strong>Say the one sentence</strong>, then stop talking about the test.</li>
  <li>Arrive unhurried, but not so early they sit and stew.</li>
  <li><strong>Keep drop-off short and light.</strong> Long emotional goodbyes
      signal danger.</li>
  <li>Mention something ordinary and pleasant planned for afterwards, so the day
      has an ending that is not the test.</li>
</ol>

${callout('tip', 'The one sentence',
  `<p style="font-size:var(--gp-text-lg);font-weight:700">
   "However today goes, nothing changes about you or about us."</p>
   <p>Say it once. Do not repeat it — repetition turns reassurance into evidence
   that there is something to worry about.</p>`)}

<h2>What to say, and what not to</h2>

<p>
  Praising a child for <em>being</em> smart makes them more fragile when things
  get hard, not less. In children aged five and six, even <em>positive</em> praise
  aimed at who they are produced more helpless reactions than praise aimed at
  what they did (Kamins &amp; Dweck, 1999).
</p>

<h3>Before</h3>
<div class="gp-table-scroll">
<table>
  <thead><tr><th>Avoid</th><th>Try instead</th></tr></thead>
  <tbody>
    <tr><td>"You're so smart, you'll ace this."</td><td>"Just try each one. Some will be tricky — that's how it's built."</td></tr>
    <tr><td>"This is really important."</td><td>"It's a morning of puzzles. Then we'll get lunch."</td></tr>
    <tr><td>"Don't mess this up."</td><td>"Take your time and look carefully."</td></tr>
    <tr><td>"I know you'll get in."</td><td>"However it goes, we're good."</td></tr>
    <tr><td>"Remember everything we practiced!"</td><td>"You already know what it looks like. Nothing will surprise you."</td></tr>
    <tr><td>"Your cousin got in at your age."</td><td><em>(say nothing — do not introduce a comparison)</em></td></tr>
  </tbody>
</table>
</div>

<h3>After</h3>
<div class="gp-table-scroll">
<table>
  <thead><tr><th>Avoid</th><th>Try instead</th></tr></thead>
  <tbody>
    <tr><td>"Did you do well?"</td><td>"How did it feel?"</td></tr>
    <tr><td>"How many did you get right?"</td><td>"What was the funnest part?"</td></tr>
    <tr><td>"Was it easy for you?"</td><td>"Was there a tricky one? Tell me about it."</td></tr>
    <tr><td>"You're so smart."</td><td>"You kept going even when they got hard. That's the part I care about."</td></tr>
    <tr><td>"What if you don't get in?"</td><td><em>(do not raise it — answer only if they do)</em></td></tr>
  </tbody>
</table>
</div>

<p><strong>When they say "I think I got some wrong":</strong></p>
<blockquote>Good — that means the test was doing its job. It's <em>supposed</em> to
have questions that are too hard. If you'd got every single one, it would have
been the wrong test for you.</blockquote>

<p><strong>When they ask "did I do well?":</strong></p>
<blockquote>I have no idea, I wasn't in there! How did it <em>feel</em>?</blockquote>
<p class="gp-muted">
  Answer the feeling, not the score. Auditing their memory of the test teaches
  the exact ruminating habit that test anxiety is made of.
</p>

<h2>Understanding the scores</h2>

${acc('What is an SAS, an NAI or an SAI?', `
  <p>All three are the same kind of number: a score placed on a scale where
  <strong>100 is exactly average</strong> and the standard deviation is
  <strong>16</strong>. CogAT calls it the Standard Age Score (SAS), the NNAT calls
  it the Naglieri Ability Index (NAI), and the OLSAT calls it the School Ability
  Index (SAI).</p>
  <p><strong>Important:</strong> none of them is comparable to a Wechsler IQ,
  which uses a standard deviation of 15. An SAS of 132 is exactly 2 standard
  deviations up; a WISC 132 is 2.13. Do not map one onto the other.</p>
  <div class="gp-table-scroll">
  <table>
    <thead><tr><th>Score</th><th>Percentile</th><th>Stanine</th></tr></thead>
    <tbody>
      <tr><td>135 and above</td><td>99</td><td>9</td></tr>
      <tr><td>132</td><td>98</td><td>9</td></tr>
      <tr><td>129</td><td>97</td><td>9</td></tr>
      <tr><td>126</td><td>95</td><td>8</td></tr>
      <tr><td>120</td><td>89</td><td>8</td></tr>
      <tr><td>116</td><td>84</td><td>7</td></tr>
      <tr><td>100</td><td>50</td><td>5</td></tr>
    </tbody>
  </table>
  </div>
  <p class="gp-muted">A percentile is <strong>not</strong> a percentage correct.
  The 95th percentile means the child scored higher than 95% of children the same
  age, not that they got 95% of the questions right.</p>`)}

${acc('How much does a single score really tell you?', `
  <p>Less than the label suggests. Lohman and Korb (2006) tracked 6,321 students
  and found that only about <strong>40%</strong> of children in the top 3% in
  grade 3 were still in the top 3% in grade 4 — despite an extremely reliable
  test.</p>
  <p>On the NNAT the standard error is about <strong>6 points</strong>, so a 95%
  confidence interval is roughly <strong>±12</strong>. A child scoring 130 has a
  true score plausibly anywhere from 118 to 142. Retesting also inflates scores
  by about 3.8 points on average.</p>
  <p>This is the strongest possible argument for treating one screening result as
  one piece of information, which is also NAGC's published position: a single
  test at a single point in time should not decide identification.</p>`)}

${acc('What is a CogAT ability profile, like "8B (V+)"?', `
  <p>The <strong>number</strong> is the middle of the child's three battery
  stanines. The <strong>letter</strong> describes the shape:</p>
  <ul>
    <li><strong>A</strong> — all three scores are roughly the s<strong>A</strong>me.</li>
    <li><strong>B</strong> — one score is a<strong>B</strong>ove or <strong>B</strong>elow the other two.</li>
    <li><strong>C</strong> — two scores <strong>C</strong>ontrast: a strength and a weakness.</li>
    <li><strong>E</strong> — <strong>E</strong>xtreme, at least 24 points apart.</li>
  </ul>
  <p>There is no D. The suffix (V+, Q−, N+) marks the battery that stands out,
  relative to the child's <em>own</em> other scores, not to other children.</p>
  <p>Roughly <strong>60%</strong> of children who score at the very top have an
  uneven profile, and they are far more likely to have a relative weakness than a
  relative strength. An uneven profile is normal, not a warning sign.</p>`)}

${acc('What cut score will my district use?', `
  <p>There is no national standard, and the real spread is enormous. Published
  examples range from the 81st percentile as a screening trigger (Prince
  George's County, Maryland) to an SAS of 132 (Bellevue, Washington). Ohio uses
  127–128 statewide. Los Angeles qualifies a child at the 95th percentile on
  <em>any one</em> of Total, Verbal or Nonverbal.</p>
  <p>Ask your district. It is the only reliable answer.</p>`)}

<h2>Things this guide deliberately does not claim</h2>

<p>
  Several pieces of common test-prep advice do not survive contact with the
  research. They are left out on purpose:
</p>

<ul>
  <li><strong>"Write down your worries before the test."</strong> The source study
      failed a preregistered high-powered replication.</li>
  <li><strong>"Power posing boosts confidence and performance."</strong> The
      hormonal and performance claims do not replicate.</li>
  <li><strong>"A high-protein low-GI breakfast improves scores."</strong> Reviews
      state that firm conclusions about breakfast composition cannot be drawn.</li>
  <li><strong>"Sugar will make your child hyper."</strong> A <em>JAMA</em>
      meta-analysis of 23 studies found no effect on behavior or cognition. The
      documented effect was on <em>parents</em>: mothers told their child had
      eaten sugar — when the child had received a placebo — rated them as more
      hyperactive.</li>
  <li><strong>"The sleep two nights before matters most."</strong> Could not be
      verified in the pediatric literature.</li>
  <li><strong>A prevalence figure for test anxiety in grades 1–4.</strong> No
      defensible single number exists.</li>
</ul>

<h2>Sources</h2>

<p>
  Full research notes, with every claim linked to its source and every
  disagreement between sources recorded, are in the
  <code>docs/research/</code> folder of this project. The main ones:
</p>

<ul>
  <li><a href="https://www.riversidedatamanager.com/BalancedManagement/DigitalResources/Baggage_Files/CogAT/CogAT_7_SIG_v.2-1_092220.pdf" rel="noopener">CogAT Form 7 Score Interpretation Guide</a> (Lohman, Riverside Insights)</li>
  <li><a href="https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/nnat3/nnat3-manual-levels-a-d.pdf" rel="noopener">NNAT3 Manual, Levels A–D</a> (Pearson)</li>
  <li><a href="https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/olsat8/olsat8-overview-brochure.pdf" rel="noopener">OLSAT 8 Scope and Sequence</a> (Pearson)</li>
  <li><a href="https://files.eric.ed.gov/fulltext/EJ746292.pdf" rel="noopener">Lohman &amp; Korb (2006), "Gifted Today but Not Tomorrow?"</a></li>
  <li><a href="https://journals.sagepub.com/doi/abs/10.1177/0956797615592630" rel="noopener">Maloney et al. (2015), intergenerational effects of parents' math anxiety</a></li>
  <li><a href="https://jcsm.aasm.org/doi/10.5664/jcsm.5866" rel="noopener">AASM sleep duration consensus, endorsed by the AAP</a></li>
  <li><a href="https://www.nagc.org/identification" rel="noopener">NAGC on identification</a></li>
  <li><a href="https://beessgsw.org/#/spp/institution/public/" rel="noopener">Florida DOE district policies repository</a></li>
</ul>

${callout('info', 'A closing thought',
  `<p>Gifted identification is a doorway into a particular kind of schooling. It
   is not a measurement of your child's worth, their future, or how much they
   are loved, and the research shows it is far less stable than the label
   implies — roughly half of children at the very top one year are not there the
   next. Whatever happens, the most useful thing you can give your child this
   week is a calm parent.</p>`)}
`;
}

export default { renderParentGuide };
